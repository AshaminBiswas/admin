// Dynamic API Base URL — default to local backend or production fallback
export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "https://prc-backend-6sw7.onrender.com/api/v1";

const ADMIN_TOKEN_KEY = "prc_admin_access_token";
const ADMIN_REFRESH_TOKEN_KEY = "prc_admin_refresh_token";
const ADMIN_USER_SESSION_KEY = "prc_admin_user_session";
const ADMIN_TOKEN_EXPIRY_KEY = "prc_admin_token_expiry";
const ADMIN_SESSION_START_KEY = "prc_admin_session_start";

// Session duration: 60 minutes max lifetime. 10 minutes idle logout. Proactive refresh at 59 minutes.
export const MAX_SESSION_MS = 60 * 60 * 1000; // 60 min hard cap
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 min inactivity timeout
export const PROACTIVE_REFRESH_MS = 59 * 60 * 1000; // 59 min

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getAdminRefreshToken(): string | null {
  return localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY);
}

export function getStoredAdminUser(): any | null {
  try {
    const raw = localStorage.getItem(ADMIN_USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Returns ms elapsed since this login session started. */
export function getSessionAgeMs(): number {
  const start = localStorage.getItem(ADMIN_SESSION_START_KEY);
  if (!start) return 0;
  return Math.max(0, Date.now() - parseInt(start, 10));
}

/** Returns true if current session has reached 60 minutes lifetime. */
export function isSessionExpired(): boolean {
  const start = localStorage.getItem(ADMIN_SESSION_START_KEY);
  if (!start) return false;
  return getSessionAgeMs() >= MAX_SESSION_MS;
}

/** Returns ms until the stored access token expires. Negative = already expired. */
export function getTokenExpiresInMs(): number {
  const expiry = localStorage.getItem(ADMIN_TOKEN_EXPIRY_KEY);
  if (!expiry) return MAX_SESSION_MS; // assume fresh if unknown
  return parseInt(expiry, 10) - Date.now();
}

export function setAdminTokens(accessToken: string, refreshToken: string, user?: any) {
  if (accessToken) {
    localStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
    // Record when this access token was issued — 60-min TTL
    localStorage.setItem(ADMIN_TOKEN_EXPIRY_KEY, String(Date.now() + MAX_SESSION_MS));
  }
  if (refreshToken) localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
  if (user) {
    localStorage.setItem(ADMIN_USER_SESSION_KEY, JSON.stringify(user));
  }
  if (!localStorage.getItem(ADMIN_SESSION_START_KEY)) {
    localStorage.setItem(ADMIN_SESSION_START_KEY, String(Date.now()));
  }
}

export function clearAdminTokens() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_SESSION_KEY);
  localStorage.removeItem(ADMIN_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(ADMIN_SESSION_START_KEY);
}

// ─── Access Token Refresh Queue & Lock ────────────────────────────────────────
let isRefreshingToken = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// ─── Core Refresh Function ─────────────────────────────────────────────────────
export async function refreshAdminToken(refreshToken: string): Promise<{
  success: boolean;
  data?: { accessToken: string; refreshToken: string };
  accessToken?: string;
  refreshToken?: string;
}> {
  const body = JSON.stringify({ refreshToken });
  const headers = { "Content-Type": "application/json" };

  // Try primary (local or configured) URL first
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers,
      body,
    });
    if (res.ok) return await res.json();
  } catch {
    // fall through to production
  }

  // Fallback to production Render URL
  try {
    const prodRes = await fetch(
      "https://prc-backend-6sw7.onrender.com/api/v1/auth/refresh-token",
      { method: "POST", headers, body }
    );
    if (prodRes.ok) return await prodRes.json();
  } catch {
    // network failure
  }

  return { success: false };
}

/**
 * Proactively refreshes the access token using the stored refresh token.
 * Called by the 59-minute timer in AdminAuthContext.
 * Returns true if refresh succeeded.
 */
export async function proactiveTokenRefresh(): Promise<boolean> {
  const refreshToken = getAdminRefreshToken();
  if (!refreshToken) return false;

  // Skip if already refreshing (another request triggered it)
  if (isRefreshingToken) return false;

  isRefreshingToken = true;
  try {
    const result = await refreshAdminToken(refreshToken);
    const newAccessToken = result.data?.accessToken || (result as any).accessToken;
    const newRefreshToken =
      result.data?.refreshToken || (result as any).refreshToken || refreshToken;

    if (newAccessToken) {
      setAdminTokens(newAccessToken, newRefreshToken);
      onTokenRefreshed(newAccessToken);
      console.info("[PRC Admin] Token proactively refreshed — next refresh in 59 min.");
      return true;
    }
    return false;
  } finally {
    isRefreshingToken = false;
  }
}

// ─── Main API Fetch with Reactive Refresh ─────────────────────────────────────
export async function fetchAdminApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<{ success: boolean; data?: T; message?: string; error?: any; [key: string]: any }> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let url = `${API_BASE_URL}${cleanEndpoint}`;
  const token = getAdminToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const isAuthEndpoint =
    cleanEndpoint.includes("/auth/login") ||
    cleanEndpoint.includes("/auth/admin/login") ||
    cleanEndpoint.includes("/auth/refresh-token") ||
    cleanEndpoint.includes("/auth/2fa/login") ||
    cleanEndpoint.includes("/auth/2fa/authenticate");

  try {
    let response = await fetch(url, { ...options, headers }).catch(async () => {
      // Fallback to Render URL if localhost fails to connect
      if (API_BASE_URL.includes("localhost")) {
        url = `https://prc-backend-6sw7.onrender.com/api/v1${cleanEndpoint}`;
        return await fetch(url, { ...options, headers });
      }
      throw new Error("Network connection error");
    });

    // Reactive refresh on 401/403 (token expired mid-session)
    if (
      !response.ok &&
      (response.status === 401 || response.status === 403) &&
      !isRetry &&
      !isAuthEndpoint
    ) {
      const storedRefreshToken = getAdminRefreshToken();

      if (storedRefreshToken) {
        if (!isRefreshingToken) {
          isRefreshingToken = true;

          const refreshed = await refreshAdminToken(storedRefreshToken);
          isRefreshingToken = false;

          const newAccessToken =
            refreshed.data?.accessToken || (refreshed as any).accessToken;
          const newRefreshToken =
            refreshed.data?.refreshToken ||
            (refreshed as any).refreshToken ||
            storedRefreshToken;

          if (newAccessToken) {
            setAdminTokens(newAccessToken, newRefreshToken);
            onTokenRefreshed(newAccessToken);
            headers["Authorization"] = `Bearer ${newAccessToken}`;

            // Retry the original request with the new token
            const retryResponse = await fetch(url, { ...options, headers });
            return await retryResponse.json();
          } else {
            // Refresh token itself has expired — clear session
            clearAdminTokens();
            return {
              success: false,
              message: "Your session has expired. Please sign in again.",
              error: { code: "UNAUTHORIZED", message: "Refresh token expired" },
            };
          }
        } else {
          // Another request is already refreshing — queue this one
          return new Promise((resolve) => {
            addRefreshSubscriber((newToken: string) => {
              headers["Authorization"] = `Bearer ${newToken}`;
              fetch(url, { ...options, headers })
                .then((r) => r.json())
                .then(resolve)
                .catch(() =>
                  resolve({ success: false, message: "Token refresh failed" })
                );
            });
          });
        }
      }
    }

    const resData = await response.json();
    return resData;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: error.message || "Failed to reach PRC Admin API server.",
      },
    };
  }
}
