import type { Branch, Supplier, InventoryItem, Purchase, StockTransfer, StockMovement } from '../types/admin';

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

export function isOfflineToken(_token?: string | null): boolean {
  return false;
}

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
  data?: { accessToken: string; refreshToken: string; user?: any };
  accessToken?: string;
  refreshToken?: string;
  user?: any;
}> {
  const body = JSON.stringify({ refreshToken });
  const headers = { "Content-Type": "application/json" };

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers,
      body,
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.error("[PRC Admin] Token refresh network error:", err);
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

  if (isRefreshingToken) return false;

  isRefreshingToken = true;
  try {
    const result = await refreshAdminToken(refreshToken);
    const newAccessToken = result.data?.accessToken || (result as any).accessToken;
    const newRefreshToken =
      result.data?.refreshToken || (result as any).refreshToken || refreshToken;
    const refreshedUser = result.data?.user || (result as any).user;

    if (newAccessToken) {
      setAdminTokens(newAccessToken, newRefreshToken, refreshedUser);
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

  // Configure timeout controller (25s for auth/login cold starts, 15s for general requests)
  const timeoutMs = isAuthEndpoint ? 25000 : 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await fetch(url, { ...options, headers, signal: options.signal || controller.signal });
    clearTimeout(timeoutId);

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
          const refreshedUser = refreshed.data?.user || (refreshed as any).user;

          if (newAccessToken) {
            setAdminTokens(newAccessToken, newRefreshToken, refreshedUser);
            onTokenRefreshed(newAccessToken);
            headers["Authorization"] = `Bearer ${newAccessToken}`;

            // Retry the original request with the new token
            const retryCtrl = new AbortController();
            const retryTimeout = setTimeout(() => retryCtrl.abort(), 15000);
            try {
              const retryResponse = await fetch(url, { ...options, headers, signal: retryCtrl.signal });
              clearTimeout(retryTimeout);
              return await retryResponse.json();
            } catch (retryErr) {
              clearTimeout(retryTimeout);
              return { success: false, error: { code: "RETRY_FAILED", message: "Retry request timed out or failed" } };
            }
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
              const queueCtrl = new AbortController();
              const queueTimeout = setTimeout(() => queueCtrl.abort(), 15000);
              fetch(url, { ...options, headers, signal: queueCtrl.signal })
                .then((r) => {
                  clearTimeout(queueTimeout);
                  return r.json();
                })
                .then(resolve)
                .catch(() => {
                  clearTimeout(queueTimeout);
                  resolve({ success: false, message: "Token refresh failed" });
                });
            });
          });
        }
      }
    }

    const resData = await response.json();
    return resData;
  } catch (error: any) {
    clearTimeout(timeoutId);
    const isTimeout = error.name === "AbortError" || error.name === "TimeoutError";
    return {
      success: false,
      error: {
        code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        message: isTimeout
          ? `PRC Admin API connection timed out (${Math.round(timeoutMs / 1000)}s). Server may be waking up from sleep, please try again.`
          : error.message || "Failed to reach PRC Admin API server.",
      },
    };
  }
}

/* ─── Roles & Permissions API ───────────────────────────────────────────────── */
export const rolesApi = {
  /** GET /roles — list all roles with user counts */
  list: () => fetchAdminApi<any[]>('/roles'),

  /** GET /roles/:id — get role detail with permissions array */
  getById: (id: string) => fetchAdminApi<any>(`/roles/${id}`),

  /** POST /roles — create new role */
  create: (payload: { name: string; description?: string; permissions?: string[] }) =>
    fetchAdminApi('/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** PATCH /roles/:id — update role name / description */
  update: (id: string, payload: { name?: string; description?: string }) =>
    fetchAdminApi(`/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /** DELETE /roles/:id */
  delete: (id: string) =>
    fetchAdminApi(`/roles/${id}`, { method: 'DELETE' }),

  /** PATCH /roles/:id/permissions — replace full permission set */
  updatePermissions: (id: string, permissions: string[]) =>
    fetchAdminApi(`/roles/${id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    }),

  /** GET /roles/permissions — list all permissions grouped by module */
  listPermissions: () => fetchAdminApi<any[]>('/roles/permissions'),

  /** POST /roles/permissions — create new custom permission */
  createPermission: (payload: { name: string; slug?: string; module: string; description?: string }) =>
    fetchAdminApi<any>('/roles/permissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** PATCH /roles/permissions/:id — update permission */
  updatePermission: (id: string, payload: { name?: string; slug?: string; module?: string; description?: string }) =>
    fetchAdminApi<any>(`/roles/permissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /** DELETE /roles/permissions/:id — delete custom permission */
  deletePermission: (id: string) =>
    fetchAdminApi<any>(`/roles/permissions/${id}`, { method: 'DELETE' }),
};

/* ─── Users & Profile API ────────────────────────────────────────────────────── */
export const usersApi = {
  /** GET /users — list users with optional query filters */
  list: (params?: { page?: number; limit?: number; search?: string; status?: string; role?: string; type?: 'customer' | 'admin' | 'all' }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.role) query.append('role', params.role);
    if (params?.type) query.append('type', params.type);
    const qs = query.toString();
    return fetchAdminApi<any>(`/users${qs ? `?${qs}` : ''}`);
  },

  /** GET /users/:id — get user details */
  getById: (id: string) => fetchAdminApi<any>(`/users/${id}`),

  /** GET /users/:id/360 — get comprehensive 360 customer dossier */
  getCustomer360: (id: string) => fetchAdminApi<any>(`/users/${id}/360`),

  /** POST /users — create new user/admin/b2b */
  create: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    companyName?: string;
    gstin?: string;
    roleId: string;
    status?: 'ACTIVE' | 'INACTIVE';
    mustChangePassword?: boolean;
    sendWelcomeEmail?: boolean;
  }) =>
    fetchAdminApi<any>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** PATCH /users/:id — update user details */
  update: (
    id: string,
    payload: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      companyName?: string;
      gstin?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
      roleId?: string;
    }
  ) =>
    fetchAdminApi<any>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /** DELETE /users/:id — delete user */
  delete: (id: string) =>
    fetchAdminApi<any>(`/users/${id}`, {
      method: 'DELETE',
    }),

  /** PATCH /users/profile — update current logged-in user profile */
  updateProfile: (payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
    gstin?: string;
  }) =>
    fetchAdminApi<any>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /** PATCH /users/avatar — update avatar */
  updateAvatar: (avatar: string) =>
    fetchAdminApi<any>('/users/avatar', {
      method: 'PATCH',
      body: JSON.stringify({ avatar }),
    }),

  /** GET /users/:id/roles */
  getUserRoles: (id: string) => fetchAdminApi<any>(`/users/${id}/roles`),

  /** PATCH /users/:id/roles */
  updateUserRoles: (id: string, roleIds: string[]) =>
    fetchAdminApi<any>(`/users/${id}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roleIds }),
    }),
};

/* ─── B2B Custom Pricing API ─────────────────────────────────────────────────── */
export const b2bPricingApi = {
  /** GET /b2b-pricing/customer/:userId — get all catalog products with custom pricing */
  getCustomerPricing: (userId: string) =>
    fetchAdminApi<any>(`/b2b-pricing/customer/${userId}`),

  /** POST /b2b-pricing/customer/:userId — set/update single product custom price */
  setProductPrice: (
    userId: string,
    payload: { productId: string; price: number; minQuantity?: number; notes?: string }
  ) =>
    fetchAdminApi<any>(`/b2b-pricing/customer/${userId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** POST /b2b-pricing/customer/:userId/bulk — bulk update custom prices */
  bulkSetPrices: (
    userId: string,
    prices: Array<{ productId: string; price: number; minQuantity?: number; notes?: string }>
  ) =>
    fetchAdminApi<any>(`/b2b-pricing/customer/${userId}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ prices }),
    }),

  /** POST /b2b-pricing/customer/:userId/discount — apply flat % discount */
  applyFlatDiscount: (
    userId: string,
    payload: { discountPercent: number; categoryId?: string; minQuantity?: number }
  ) =>
    fetchAdminApi<any>(`/b2b-pricing/customer/${userId}/discount`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** DELETE /b2b-pricing/customer/:userId/:productId — revert product to retail price */
  deleteProductPrice: (userId: string, productId: string) =>
    fetchAdminApi<any>(`/b2b-pricing/customer/${userId}/${productId}`, {
      method: 'DELETE',
    }),
};

/* ─── Product Variants API ─────────────────────────────────────────────────── */
export interface ProductVariantItem {
  id: string;
  productId: string;
  sku: string;
  name: string | null;
  price: number;
  salePrice: number | null;
  offerPrice: number | null;
  stock: number;
  attributes: Record<string, any>;
  image: string | null;
  isAvailable: boolean;
  inStock?: boolean;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    thumbnail?: string | null;
    category?: {
      id: string;
      name: string;
    };
  };
}

export interface ListVariantsParams {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  inStock?: string;
  isAvailable?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const variantsApi = {
  /** GET /variants — list variants catalog-wide or by product */
  list: (params?: ListVariantsParams) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.productId) query.append('productId', params.productId);
    if (params?.inStock) query.append('inStock', params.inStock);
    if (params?.isAvailable) query.append('isAvailable', params.isAvailable);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
    const qs = query.toString();
    return fetchAdminApi<any>(`/variants${qs ? `?${qs}` : ''}`);
  },

  /** GET /variants/:id — get variant detail */
  getById: (id: string) => fetchAdminApi<any>(`/variants/${id}`),

  /** POST /variants — create new variant */
  create: (payload: {
    productId: string;
    sku: string;
    name?: string | null;
    price: number;
    salePrice?: number | null;
    offerPrice?: number | null;
    stock?: number;
    attributes?: Record<string, any>;
    image?: string | null;
    isAvailable?: boolean;
  }) =>
    fetchAdminApi<any>('/variants', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** PATCH /variants/:id — update variant */
  update: (
    id: string,
    payload: {
      productId?: string;
      sku?: string;
      name?: string | null;
      price?: number;
      salePrice?: number | null;
      offerPrice?: number | null;
      stock?: number;
      attributes?: Record<string, any>;
      image?: string | null;
      isAvailable?: boolean;
    }
  ) =>
    fetchAdminApi<any>(`/variants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /** DELETE /variants/:id — delete variant permanently */
  delete: (id: string) =>
    fetchAdminApi<any>(`/variants/${id}`, {
      method: 'DELETE',
    }),
};

/* ─── Notifications API ─────────────────────────────────────────────────────── */
export interface AdminNotificationItem {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export const notificationsApi = {
  /** GET /notifications — get paginated notifications for current user */
  list: (params?: { page?: number; limit?: number; isRead?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.isRead !== undefined) query.append('isRead', String(params.isRead));
    const qs = query.toString();
    return fetchAdminApi<any>(`/notifications${qs ? `?${qs}` : ''}`);
  },

  /** PATCH /notifications/:id/read — mark single notification as read */
  markAsRead: (id: string) =>
    fetchAdminApi<any>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  /** PATCH /notifications/read-all — mark all notifications as read */
  markAllAsRead: () =>
    fetchAdminApi<any>('/notifications/read-all', {
      method: 'PATCH',
    }),

  /** POST /notifications — broadcast or send targeted notification */
  create: (payload: {
    userId?: string;
    broadcast?: boolean;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) =>
    fetchAdminApi<any>('/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** DELETE /notifications/:id — delete notification */
  delete: (id: string) =>
    fetchAdminApi<any>(`/notifications/${id}`, {
      method: 'DELETE',
    }),
};

/* ─── Enterprise Audit & Admin 360° API ──────────────────────────────────────── */
export const auditApi = {
  /** GET /audit/admin/:id/360 — Super-admin exclusive admin 360 dossier */
  getAdmin360: (adminId: string) =>
    fetchAdminApi<any>(`/audit/admin/${adminId}/360`),

  /** GET /audit/logs — paginated & filterable activity log feed */
  listLogs: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    entity?: string;
    action?: string;
    severity?: string;
    adminUserId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.entity && params.entity !== 'ALL') query.append('entity', params.entity);
    if (params?.action && params.action !== 'ALL') query.append('action', params.action);
    if (params?.severity && params.severity !== 'ALL') query.append('severity', params.severity);
    if (params?.adminUserId) query.append('adminUserId', params.adminUserId);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const qs = query.toString();
    return fetchAdminApi<any>(`/audit/logs${qs ? `?${qs}` : ''}`);
  },
};

/* ─── Multi-Branch Inventory Management API ─────────────────────────────────── */
export const inventoryApi = {
  // 1. Branches
  getBranches: (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.isActive !== undefined) query.append('isActive', String(params.isActive));
    const qs = query.toString();
    return fetchAdminApi<Branch[]>(`/branches${qs ? `?${qs}` : ''}`);
  },
  createBranch: (payload: { name: string; code: string; address?: string; city?: string; state?: string; isActive?: boolean }) =>
    fetchAdminApi<Branch>(`/branches`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateBranch: (id: string, payload: Partial<{ name: string; code: string; address?: string; city?: string; state?: string; isActive?: boolean }>) =>
    fetchAdminApi<Branch>(`/branches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // 2. Suppliers
  getSuppliers: (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.isActive !== undefined) query.append('isActive', String(params.isActive));
    const qs = query.toString();
    return fetchAdminApi<Supplier[]>(`/suppliers${qs ? `?${qs}` : ''}`);
  },
  getSupplierById: (id: string) => fetchAdminApi<Supplier>(`/suppliers/${id}`),
  createSupplier: (payload: { name: string; contactPerson?: string; phone?: string; email?: string; address?: string; gstNumber?: string; isActive?: boolean }) =>
    fetchAdminApi<Supplier>(`/suppliers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSupplier: (id: string, payload: Partial<{ name: string; contactPerson?: string; phone?: string; email?: string; address?: string; gstNumber?: string; isActive?: boolean }>) =>
    fetchAdminApi<Supplier>(`/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteSupplier: (id: string) =>
    fetchAdminApi<{ success: boolean }>(`/suppliers/${id}`, {
      method: 'DELETE',
    }),

  // 3. Inventory Stock
  getInventory: (params?: { page?: number; limit?: number; branchId?: string; productId?: string; search?: string; lowStock?: boolean; sortBy?: string; sortOrder?: 'asc' | 'desc' }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.branchId && params.branchId !== 'ALL') query.append('branchId', params.branchId);
    if (params?.productId) query.append('productId', params.productId);
    if (params?.search) query.append('search', params.search);
    if (params?.lowStock) query.append('lowStock', 'true');
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
    const qs = query.toString();
    return fetchAdminApi<InventoryItem[]>(`/inventory${qs ? `?${qs}` : ''}`);
  },
  getProductInventory: (productId: string) =>
    fetchAdminApi<{ product: any; totalAvailable: number; totalOnHand?: number; totalReserved: number; branches: InventoryItem[] }>(`/inventory/product/${productId}`),
  quickStock: async (payload: {
    sku: string;
    name: string;
    branchId: string;
    quantity: number;
    unitCost?: number;
    sellingPrice?: number;
    reorderLevel?: number;
    categoryId?: string;
    notes?: string;
  }) => {
    try {
      const res = await fetchAdminApi<{ product: any; inventory: InventoryItem; movement: StockMovement }>(`/inventory/quick-stock`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.success !== false && !(res as any).error) {
        return res;
      }

      const errorMsg = (res as any)?.message || (res as any)?.error?.message || '';
      const is404 = errorMsg.includes('404') || errorMsg.includes('Not Found') || (res as any)?.statusCode === 404;

      if (!is404) {
        return res;
      }
    } catch {
      // Continue to fallback
    }

    // ── Resilient Fallback Orchestration for Remote Cloud Deploys ──
    try {
      // 1. Check if product already exists
      const searchRes = await fetchAdminApi<any>(`/products?search=${encodeURIComponent(payload.sku.trim())}&limit=5`);
      const list = Array.isArray(searchRes?.data) ? searchRes.data : Array.isArray(searchRes?.products) ? searchRes.products : Array.isArray(searchRes) ? searchRes : [];
      let existingProd = list.find((p: any) => p.sku?.toUpperCase() === payload.sku.trim().toUpperCase());

      // 2. If product doesn't exist, create it
      if (!existingProd) {
        const createProdRes = await fetchAdminApi<any>(`/products`, {
          method: 'POST',
          body: JSON.stringify({
            name: payload.name.trim(),
            sku: payload.sku.trim().toUpperCase(),
            price: payload.sellingPrice ?? (payload.unitCost ? payload.unitCost * 1.3 : 0),
            stock: Number(payload.quantity) || 0,
            reorderLevel: payload.reorderLevel || 10,
            categoryId: payload.categoryId || undefined,
            status: 'ACTIVE',
          }),
        });
        existingProd = createProdRes?.data || createProdRes;
      }

      // 3. If exists and specific branch selected, adjust or purchase stock
      if (existingProd?.id && payload.branchId && payload.branchId !== 'PRC_STOCK') {
        try {
          await fetchAdminApi<any>(`/inventory/adjustments`, {
            method: 'POST',
            body: JSON.stringify({
              branchId: payload.branchId,
              productId: existingProd.id,
              quantity: Number(payload.quantity),
              type: 'INCREASE',
              reason: 'QUICK_STOCK_ENTRY',
              notes: payload.notes || 'Quick stock entry',
            }),
          });
        } catch {}
      }

      return {
        success: true,
        data: {
          product: existingProd,
          inventory: { id: 'inv-temp', productId: existingProd?.id, branchId: payload.branchId, quantity: payload.quantity, reservedQuantity: 0, reorderLevel: 10 } as any,
          movement: { id: 'mov-temp', type: 'PURCHASE_IN', quantity: payload.quantity } as any,
        },
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        message: fallbackErr?.message || 'Failed to complete quick stock entry',
      };
    }
  },

  // 4. Purchases (Stock-In)
  getPurchases: (params?: { page?: number; limit?: number; branchId?: string; supplierId?: string; search?: string; from?: string; to?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.branchId && params.branchId !== 'ALL') query.append('branchId', params.branchId);
    if (params?.supplierId) query.append('supplierId', params.supplierId);
    if (params?.search) query.append('search', params.search);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
    const qs = query.toString();
    return fetchAdminApi<Purchase[]>(`/purchases${qs ? `?${qs}` : ''}`);
  },
  getPurchaseById: (id: string) => fetchAdminApi<Purchase>(`/purchases/${id}`),
  createPurchase: (payload: {
    branchId: string;
    supplierId: string;
    invoiceNumber?: string;
    purchaseDate?: string;
    notes?: string;
    items: Array<{ productId?: string; sku?: string; name?: string; quantity: number; unitPurchasePrice: number }>;
  }) =>
    fetchAdminApi<Purchase>(`/purchases`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // 5. Stock Transfers
  getStockTransfers: (params?: { page?: number; limit?: number; branchId?: string; status?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.branchId && params.branchId !== 'ALL') query.append('branchId', params.branchId);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const qs = query.toString();
    return fetchAdminApi<StockTransfer[]>(`/transfers${qs ? `?${qs}` : ''}`);
  },
  getStockTransferById: (id: string) => fetchAdminApi<StockTransfer>(`/transfers/${id}`),
  createStockTransfer: (payload: { fromBranchId: string; toBranchId: string; notes?: string; items: Array<{ productId: string; quantity: number }> }) =>
    fetchAdminApi<StockTransfer>(`/transfers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  dispatchStockTransfer: (id: string, payload?: { notes?: string }) =>
    fetchAdminApi<StockTransfer>(`/transfers/${id}/dispatch`, {
      method: 'PATCH',
      body: JSON.stringify(payload || {}),
    }),
  receiveStockTransfer: (id: string, payload?: { notes?: string }) =>
    fetchAdminApi<StockTransfer>(`/transfers/${id}/receive`, {
      method: 'PATCH',
      body: JSON.stringify(payload || {}),
    }),
  cancelStockTransfer: (id: string, payload?: { notes?: string }) =>
    fetchAdminApi<StockTransfer>(`/transfers/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify(payload || {}),
    }),

  // 6. Stock Adjustments
  adjustStock: (payload: { branchId: string; productId: string; type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'RETURN_IN'; quantity: number; reason: string }) =>
    fetchAdminApi<StockMovement>(`/stock-adjustments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // 7. Stock Movements Ledger
  getStockMovements: (params?: { page?: number; limit?: number; branchId?: string; productId?: string; type?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.branchId && params.branchId !== 'ALL') query.append('branchId', params.branchId);
    if (params?.productId) query.append('productId', params.productId);
    if (params?.type && params.type !== 'ALL') query.append('type', params.type);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const qs = query.toString();
    return fetchAdminApi<StockMovement[]>(`/stock-movements${qs ? `?${qs}` : ''}`);
  },

  // 8. Download Exports (Excel & PDF)
  downloadStockReport: async (params?: { branchId?: string; lowStock?: boolean; format?: 'xlsx' | 'pdf' }) => {
    const query = new URLSearchParams();
    if (params?.branchId && params.branchId !== 'ALL') query.append('branchId', params.branchId);
    if (params?.lowStock) query.append('lowStock', 'true');
    if (params?.format) query.append('format', params.format);
    const token = getAdminToken();
    const res = await fetch(`${API_BASE_URL}/reports/stock?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to download stock report');
    const blob = await res.blob();
    const ext = params?.format === 'pdf' ? 'pdf' : 'xlsx';
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock-Report-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  downloadPurchasesReport: async (params?: { branchId?: string; supplierId?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId && params.branchId !== 'ALL') query.append('branchId', params.branchId);
    if (params?.supplierId) query.append('supplierId', params.supplierId);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const token = getAdminToken();
    const res = await fetch(`${API_BASE_URL}/reports/purchases?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to download purchases report');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Purchases-Report-${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  downloadMovementsReport: async (params?: { branchId?: string; productId?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId && params.branchId !== 'ALL') query.append('branchId', params.branchId);
    if (params?.productId) query.append('productId', params.productId);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const token = getAdminToken();
    const res = await fetch(`${API_BASE_URL}/reports/movements?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to download movements report');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock-Movements-${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};



