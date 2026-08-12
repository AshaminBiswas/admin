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
} from "../api/adminApi";

const VIEW_STORAGE_KEY = "prc_admin_current_view";

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pending2FA: boolean;
  mfaToken: string | null;
  currentView: AdminView;
  setCurrentView: (view: AdminView) => void;
  login: (e: string, p: string) => Promise<{ success: boolean; requires2FA?: boolean; message?: string }>;
  verify2FA: (code: string) => Promise<{ success: boolean; message?: string }>;
  cancel2FA: () => void;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const token = getAdminToken();
    const storedUser = getStoredAdminUser();
    if (token && storedUser) return storedUser;
    if (token) {
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

  const [currentView, setCurrentViewState] = useState<AdminView>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return (saved as AdminView) || "dashboard";
  });

  // Ref to the proactive refresh timer so we can clear/reset it
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCurrentView = (view: AdminView) => {
    setCurrentViewState(view);
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  };

  // ─── Proactive Token Refresh Timer ──────────────────────────────────────────
  // Schedules a silent token refresh BEFORE the access token expires.
  // - On login: fires at 59 minutes
  // - On page reload: calculates remaining time and fires accordingly
  // - On each successful refresh: reschedules for another 59 minutes
  const scheduleProactiveRefresh = useCallback((delayMs?: number) => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const refreshToken = getAdminRefreshToken();
    if (!refreshToken) return; // Nothing to refresh if no refresh token

    // Calculate delay: use provided value, or compute from stored expiry
    let delay = delayMs ?? (getTokenExpiresInMs() - 60_000); // fire 60s before expiry

    // Clamp: if token already expired or expires in < 30s, refresh immediately
    if (delay < 30_000) delay = 0;

    // Cap at PROACTIVE_REFRESH_MS (59 min) to avoid overshooting
    if (delay > PROACTIVE_REFRESH_MS) delay = PROACTIVE_REFRESH_MS;

    console.info(
      `[PRC Admin] Token refresh scheduled in ${Math.round(delay / 1000 / 60)} min ${Math.round((delay / 1000) % 60)} sec`
    );

    refreshTimerRef.current = setTimeout(async () => {
      const success = await proactiveTokenRefresh();
      if (success) {
        // Reschedule for next cycle (59 minutes from now)
        scheduleProactiveRefresh(PROACTIVE_REFRESH_MS);
      } else {
        // Refresh token expired — log out gracefully
        console.warn("[PRC Admin] Proactive refresh failed — session ended.");
        clearAdminTokens();
        setAdminUser(null);
      }
    }, delay);
  }, []);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // ─── Session Hydration on Mount ──────────────────────────────────────────────
  useEffect(() => {
    async function checkSession() {
      const token = getAdminToken();
      const storedUser = getStoredAdminUser();

      if (!token) {
        setAdminUser(null);
        setIsLoading(false);
        return;
      }

      // Populate from localStorage immediately (instant UI)
      if (storedUser) setAdminUser(storedUser);

      // Schedule proactive refresh based on stored expiry
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
  }, [scheduleProactiveRefresh]);

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
      // Start the 59-minute proactive refresh timer from now
      scheduleProactiveRefresh(PROACTIVE_REFRESH_MS);
      return { success: true, message: res.message };
    }

    return { success: false, message: res.message };
  };

  // ─── Verify 2FA ──────────────────────────────────────────────────────────────
  const verify2FA = async (code: string) => {
    if (!mfaToken) {
      return { success: false, message: "Authentication session expired. Please sign in again." };
    }

    const res = await adminAuthService.verify2FALogin(mfaToken, code);
    if (res.success && res.user) {
      setAdminUser(res.user);
      localStorage.setItem("prc_admin_user_session", JSON.stringify(res.user));
      setPending2FA(false);
      setMfaToken(null);
      // Start the 59-minute proactive refresh timer after successful 2FA
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

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    // Cancel the proactive refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    await adminAuthService.logout();
    clearAdminTokens();
    localStorage.removeItem(VIEW_STORAGE_KEY);
    setAdminUser(null);
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

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
