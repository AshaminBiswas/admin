import { fetchAdminApi, setAdminTokens, clearAdminTokens, getAdminRefreshToken, getStoredAdminUser } from "./adminApi";
import { AdminUser, TwoFactorLoginResult, TwoFactorSetupData, CreateAdminPayload, CreatedAdminResult } from "../types/admin";
import { logAdminActivity } from "./auditService";

const TWO_FACTOR_STORAGE_KEY = "prc_admin_2fa_enabled";

export function isLocal2FAEnabled(): boolean {
  const val = localStorage.getItem(TWO_FACTOR_STORAGE_KEY);
  return val === "true";
}

export function setLocal2FAEnabled(enabled: boolean) {
  localStorage.setItem(TWO_FACTOR_STORAGE_KEY, enabled ? "true" : "false");
}

export const adminAuthService = {
  async login(email: string, password: string): Promise<TwoFactorLoginResult> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Call Backend Admin Login
    let res = await fetchAdminApi("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    if (!res.success && ((res.error?.code === "NOT_FOUND") || (res as any).statusCode === 404)) {
      res = await fetchAdminApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, password }),
      });
    }

    if (res.success && res.data) {
      const backendRequires2FA = Boolean(
        res.data.requiresTwoFactor || res.data.requires2FA || res.data.twoFactorRequired
      );

      // If 2FA is required by backend, return challenge with real mfaToken
      if (backendRequires2FA) {
        return {
          success: true,
          requires2FA: true,
          mfaToken: res.data.mfaToken,
          message: res.data.message || "Two-factor authentication code required.",
        };
      }

      // No 2FA required — complete login immediately
      const accessToken = res.data.accessToken;
      const refreshToken = res.data.refreshToken;
      const rawUser = res.data.user || res.data;
      const resolvedRole = typeof rawUser.role === "object" && rawUser.role !== null
        ? (rawUser.role.slug ?? rawUser.role.name ?? "super_admin")
        : (rawUser.role ?? "super_admin");

      const user: AdminUser = {
        id: rawUser.id || "admin-1",
        email: rawUser.email || cleanEmail,
        firstName: rawUser.firstName || "Executive",
        lastName: rawUser.lastName || "Admin",
        role: resolvedRole,
        isTwoFactorEnabled: Boolean(rawUser.isTwoFactorEnabled || rawUser.twoFactorEnabled),
      };

      setAdminTokens(accessToken, refreshToken, user);
      setLocal2FAEnabled(Boolean(user.isTwoFactorEnabled));

      return {
        success: true,
        user,
        message: "Admin authentication successful!",
      };
    }

    return {
      success: false,
      message: res.error?.message || res.message || "Invalid executive email or password credentials.",
    };
  },

  async verify2FALogin(
    mfaToken: string,
    code: string
  ): Promise<{ success: boolean; user?: AdminUser; message?: string }> {
    const cleanCode = code.trim().replace(/[\s-]+/g, "");

    if (!cleanCode) {
      return {
        success: false,
        message: "Please enter your 6-digit authenticator code or emergency backup code.",
      };
    }

    // Call Backend 2FA Login endpoint
    const res = await fetchAdminApi("/auth/2fa/login", {
      method: "POST",
      body: JSON.stringify({ mfaToken, code: cleanCode }),
    });

    if (res.success && res.data) {
      const accessToken = res.data.accessToken;
      const refreshToken = res.data.refreshToken;
      const rawUser = res.data.user || res.data;

      const resolvedRole = typeof rawUser.role === "object" && rawUser.role !== null
        ? (rawUser.role.slug ?? rawUser.role.name ?? "super_admin")
        : (rawUser.role ?? "super_admin");

      const verifiedUser: AdminUser = {
        id: rawUser.id || "admin-1",
        email: rawUser.email,
        firstName: rawUser.firstName || "Executive",
        lastName: rawUser.lastName || "Admin",
        role: resolvedRole,
        isTwoFactorEnabled: true,
      };

      if (accessToken) {
        setAdminTokens(accessToken, refreshToken, verifiedUser);
        setLocal2FAEnabled(true);

        logAdminActivity({
          action: "2FA_VERIFIED",
          entity: "AUTH",
          category: "AUTH",
          severity: "SECURITY",
          details: `Executive 2FA passcode verified for '${verifiedUser.email}'.`,
          adminEmail: verifiedUser.email,
          payload: { method: "TOTP_OR_BACKUP" },
        });

        return {
          success: true,
          user: verifiedUser,
          message: "2FA Security Passcode Verified!",
        };
      }
    }

    return {
      success: false,
      message: res.error?.message || res.message || "Invalid 2FA code. Please check your authenticator app.",
    };
  },

  async setup2FA(): Promise<{ success: boolean; data?: TwoFactorSetupData; message?: string }> {
    let res = await fetchAdminApi("/auth/2fa/setup", { method: "POST" });
    if (!res.success) {
      res = await fetchAdminApi("/auth/2fa/generate", { method: "POST" });
    }

    if (res.success && res.data) {
      return {
        success: true,
        data: {
          secret: res.data.secret,
          qrCodeUrl: res.data.qrCodeUrl || res.data.qrCode,
          backupCodes: res.data.backupCodes || [],
        },
      };
    }

    return {
      success: false,
      message: res.error?.message || "Failed to generate 2FA setup.",
    };
  },

  async confirmEnable2FA(code: string): Promise<{ success: boolean; message?: string }> {
    const cleanCode = code.trim().replace(/[\s-]+/g, "");
    if (!cleanCode) {
      return { success: false, message: "Please enter a valid 6-digit confirmation code." };
    }

    const res = await fetchAdminApi("/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code: cleanCode }),
    });

    if (res.success) {
      setLocal2FAEnabled(true);
      return {
        success: true,
        message: res.message || "Two-Factor Authentication is now active on your account!",
      };
    }

    return {
      success: false,
      message: res.error?.message || res.message || "Invalid code. Failed to enable 2FA.",
    };
  },

  async disable2FA(code: string): Promise<{ success: boolean; message?: string }> {
    const cleanCode = code.trim().replace(/[\s-]+/g, "");

    const res = await fetchAdminApi("/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code: cleanCode }),
    });

    if (res.success) {
      setLocal2FAEnabled(false);
      return {
        success: true,
        message: res.message || "Two-Factor Authentication has been disabled.",
      };
    }

    return {
      success: false,
      message: res.error?.message || res.message || "Failed to disable 2FA.",
    };
  },

  async createAdminUser(payload: CreateAdminPayload): Promise<CreatedAdminResult> {
    const bodyData = {
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone || "+91-9876543211",
      roleId: payload.roleId,
      status: payload.status || "ACTIVE",
    };

    const res = await fetchAdminApi("/users", {
      method: "POST",
      body: JSON.stringify(bodyData),
    });

    if (!res.success) {
      return {
        success: false,
        message: res.error?.message || res.message || "Failed to create administrator account in database.",
      };
    }

    const createdUser: AdminUser = {
      id: res.data?.id || `admin-user-${Date.now()}`,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: "admin",
      roleId: payload.roleId,
      phone: payload.phone,
      status: "ACTIVE",
      isTwoFactorEnabled: false,
    };

    return {
      success: true,
      message: `Admin user '${payload.email}' created successfully!`,
      user: createdUser,
    };
  },

  async getProfile(): Promise<{ success: boolean; user?: AdminUser }> {
    const cachedUser = getStoredAdminUser();

    try {
      const res = await fetchAdminApi("/auth/me");
      if (res.success && res.data) {
        const resRole = res.data.role;
        const resolvedRole = typeof resRole === "object" && resRole !== null
          ? (resRole.slug ?? resRole.name ?? "super_admin")
          : (resRole ?? "super_admin");

        const is2fa = Boolean(res.data.isTwoFactorEnabled || res.data.twoFactorEnabled);
        setLocal2FAEnabled(is2fa);

        return {
          success: true,
          user: {
            id: res.data.id || "admin-1",
            email: res.data.email,
            firstName: res.data.firstName || "Executive",
            lastName: res.data.lastName || "Admin",
            role: resolvedRole,
            isTwoFactorEnabled: is2fa,
          },
        };
      }
    } catch {}

    if (cachedUser) {
      return { success: true, user: cachedUser };
    }

    return { success: false };
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetchAdminApi("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword: confirmPassword || newPassword,
        }),
      });

      if (res.success) {
        return {
          success: true,
          message: res.message || "Password changed successfully! All active sessions have been updated.",
        };
      }

      return {
        success: false,
        message: res.error?.message || res.message || "Failed to update password. Please check your current password.",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Network error while changing password.",
      };
    }
  },

  async logout(): Promise<void> {
    const refreshToken = getAdminRefreshToken();
    if (refreshToken) {
      try {
        await fetchAdminApi("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch {}
    }
    clearAdminTokens();
  },
};
