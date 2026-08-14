import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { AdminUser, AdminView } from "../types/admin";
import { adminAuthService, isLocal2FAEnabled } from "../api/adminAuthService";
import {
  getAdminToken,
  getStoredAdminUser,
  clearAdminTokens,
  getAdminRefreshToken,
  proactiveTokenRefresh,
  getTokenExpiresInMs,
  PROACTIVE_REFRESH_MS,
  IDLE_TIMEOUT_MS,
  MAX_SESSION_MS,
  getSessionAgeMs,
  isSessionExpired,
} from "../api/adminApi";

const VIEW_STORAGE_KEY = "prc_admin_current_view";
const SESSION_NOTICE_KEY = "prc_admin_session_notice";

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pending2FA: boolean;
  mfaToken: string | null;
  currentView: AdminView;
  sessionNotice: string | null;
  clearSessionNotice: () => void;
  setCurrentView: (view: AdminView) => void;
  login: (e: string, p: string) => Promise<{ success: boolean; requires2FA?: boolean; message?: string }>;
  verify2FA: (code: string) => Promise<{ success: boolean; message?: string }>;
  cancel2FA: () => void;
  logout: (notice?: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  // Normalize role: backend can return role as object {slug} or as string
  function normalizeRole(user: any): AdminUser | null {
    if (!user) return null;
    const r = user.role;
    const roleSlug = typeof r === "object" && r !== null
      ? (r.slug ?? r.name ?? "super_admin")
      : (r ?? "super_admin");
    return { ...user, role: roleSlug };
  }

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const token = getAdminToken();
    const storedUser = getStoredAdminUser();
    if (token && storedUser && !isSessionExpired()) {
      const fixed = normalizeRole(storedUser);
      // Persist the fixed user back so localStorage no longer has the object-form role
      if (fixed) localStorage.setItem("prc_admin_user_session", JSON.stringify(fixed));
      return fixed;
    }
    if (token && !isSessionExpired()) {
      return {
        id: "admin-1",
        email: "admin@prchardware.com",
        firstName: "Executive",
        lastName: "Admin",
        role: "super_admin",
        phone: "+91 9876543210",
        status: "ACTIVE",
        isTwoFactorEnabled: true,
      };
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [pending2FA, setPending2FA] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [sessionNotice, setSessionNoticeState] = useState<string | null>(() => {
    return localStorage.getItem(SESSION_NOTICE_KEY);
  });

  const [currentView, setCurrentViewState] = useState<AdminView>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return (saved as AdminView) || "dashboard";
  });

  // Timers
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCurrentView = (view: AdminView) => {
    setCurrentViewState(view);
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  };

  const clearSessionNotice = () => {
    setSessionNoticeState(null);
    localStorage.removeItem(SESSION_NOTICE_KEY);
  };

  const setNotice = (noticeMsg: string) => {
    setSessionNoticeState(noticeMsg);
    localStorage.setItem(SESSION_NOTICE_KEY, noticeMsg);
  };

  // ─── Proactive Token Refresh Timer ──────────────────────────────────────────
  const scheduleProactiveRefresh = useCallback((delayMs?: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const refreshToken = getAdminRefreshToken();
    if (!refreshToken) return;

    let delay = delayMs ?? (getTokenExpiresInMs() - 60_000);
    if (delay < 30_000) delay = 0;
    if (delay > PROACTIVE_REFRESH_MS) delay = PROACTIVE_REFRESH_MS;

    refreshTimerRef.current = setTimeout(async () => {
      const success = await proactiveTokenRefresh();
      if (success) {
        scheduleProactiveRefresh(PROACTIVE_REFRESH_MS);
      } else {
        console.warn("[PRC Admin] Proactive refresh failed — session ended.");
        clearAdminTokens();
        setAdminUser(null);
      }
    }, delay);
  }, []);

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async (notice?: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);

    await adminAuthService.logout();
    clearAdminTokens();
    localStorage.removeItem(VIEW_STORAGE_KEY);
    setAdminUser(null);
    setPending2FA(false);
    setMfaToken(null);

    if (notice) {
      setNotice(notice);
    }
  }, []);

  // ─── Idle Timer & 60-min Max Lifetime Handlers ────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!adminUser) return;

    idleTimerRef.current = setTimeout(() => {
      console.warn("[PRC Admin] 10 minutes of inactivity detected — logging out.");
      logout("You were automatically logged out due to 10 minutes of inactivity.");
    }, IDLE_TIMEOUT_MS);
  }, [adminUser, logout]);

  useEffect(() => {
    if (!adminUser) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);
      return;
    }

    // 1. Check if 60-minute hard limit reached
    if (isSessionExpired()) {
      console.warn("[PRC Admin] 60-minute maximum session lifetime limit reached — logging out.");
      logout("Session expired after 60 minutes. Please sign in again.");
      return;
    }

    // 2. Schedule timer for 60-minute session cap
    const sessionAge = getSessionAgeMs();
    const remainingSessionMs = Math.max(0, MAX_SESSION_MS - sessionAge);
    maxSessionTimerRef.current = setTimeout(() => {
      console.warn("[PRC Admin] 60-minute session lifetime reached — logging out.");
      logout("Session expired after 60 minutes. Please sign in again.");
    }, remainingSessionMs);

    // 3. Setup activity listeners for 10-minute idle logout
    const activityEvents = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "click"];
    const handleUserActivity = () => {
      resetIdleTimer();
    };

    resetIdleTimer();
    activityEvents.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [adminUser, resetIdleTimer, logout]);

  // ─── Session Hydration on Mount ──────────────────────────────────────────────
  useEffect(() => {
    async function checkSession() {
      const token = getAdminToken();
      const storedUser = getStoredAdminUser();

      if (!token || isSessionExpired()) {
        if (isSessionExpired()) {
          logout("Session expired after 60 minutes. Please sign in again.");
        } else {
          setAdminUser(null);
        }
        setIsLoading(false);
        return;
      }

      if (storedUser) setAdminUser(normalizeRole(storedUser));
      scheduleProactiveRefresh();

      try {
        const res = await adminAuthService.getProfile();
        if (res.success && res.user) {
          setAdminUser(res.user);
          localStorage.setItem("prc_admin_user_session", JSON.stringify(res.user));
        } else if (!storedUser) {
          const defaultUser: AdminUser = {
            id: "admin-1",
            email: "admin@prchardware.com",
            firstName: "Executive",
            lastName: "Admin",
            role: "super_admin",
            phone: "+91 9876543210",
            status: "ACTIVE",
            isTwoFactorEnabled: true,
          };
          setAdminUser(defaultUser);
          localStorage.setItem("prc_admin_user_session", JSON.stringify(defaultUser));
        }
      } catch {
        if (storedUser) setAdminUser(storedUser);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, [scheduleProactiveRefresh, logout]);

  // ─── Refresh User Profile ────────────────────────────────────────────────────
  const refreshUserProfile = async () => {
    const res = await adminAuthService.getProfile();
    if (res.success && res.user) {
      setAdminUser(res.user);
      localStorage.setItem("prc_admin_user_session", JSON.stringify(res.user));
    } else if (adminUser) {
      const updated = {
        ...adminUser,
        isTwoFactorEnabled: isLocal2FAEnabled(),
      };
      setAdminUser(updated);
      localStorage.setItem("prc_admin_user_session", JSON.stringify(updated));
    }
  };

  // ─── Login ───────────────────────────────────────────────────────────────────
  const login = async (email: string, pass: string) => {
    clearSessionNotice();
    const res = await adminAuthService.login(email, pass);

    if (res.success && res.requires2FA) {
      setPending2FA(true);
      setMfaToken(res.mfaToken || `temp_mfa_${Date.now()}`);
      return { success: true, requires2FA: true, message: res.message };
    }

    if (res.success && res.user) {
      setAdminUser(res.user);
      localStorage.setItem("prc_admin_user_session", JSON.stringify(res.user));
      setPending2FA(false);
      setMfaToken(null);
      scheduleProactiveRefresh(PROACTIVE_REFRESH_MS);
      return { success: true, message: res.message };
    }

    return { success: false, message: res.message };
  };

  // ─── Verify 2FA ──────────────────────────────────────────────────────────────
  const verify2FA = async (code: string) => {
    clearSessionNotice();
    if (!mfaToken) {
      return { success: false, message: "Authentication session expired. Please sign in again." };
    }

    const res = await adminAuthService.verify2FALogin(mfaToken, code);
    if (res.success && res.user) {
      setAdminUser(res.user);
      localStorage.setItem("prc_admin_user_session", JSON.stringify(res.user));
      setPending2FA(false);
      setMfaToken(null);
      scheduleProactiveRefresh(PROACTIVE_REFRESH_MS);
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  };

  // ─── Cancel 2FA ──────────────────────────────────────────────────────────────
  const cancel2FA = () => {
    setPending2FA(false);
    setMfaToken(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isAuthenticated: !!adminUser,
        isLoading,
        pending2FA,
        mfaToken,
        currentView,
        sessionNotice,
        clearSessionNotice,
        setCurrentView,
        login,
        verify2FA,
        cancel2FA,
        logout,
        refreshUserProfile,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

const fallbackAdminAuth: AdminAuthContextType = {
  adminUser: null,
  isAuthenticated: false,
  isLoading: false,
  pending2FA: false,
  mfaToken: null,
  currentView: "dashboard",
  sessionNotice: null,
  clearSessionNotice: () => {},
  setCurrentView: () => {},
  login: async () => ({ success: false }),
  verify2FA: async () => ({ success: false }),
  cancel2FA: () => {},
  logout: async () => {},
  refreshUserProfile: async () => {},
};

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  return context || fallbackAdminAuth;
}
