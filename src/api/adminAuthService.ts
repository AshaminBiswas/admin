import { fetchAdminApi, setAdminTokens, clearAdminTokens, getAdminRefreshToken } from "./adminApi";
import { AdminUser, TwoFactorLoginResult, TwoFactorSetupData, CreateAdminPayload, CreatedAdminResult } from "../types/admin";
import { logAdminActivity } from "./auditService";

const TWO_FACTOR_STORAGE_KEY = "prc_admin_2fa_enabled";
const TWO_FACTOR_SECRET_KEY = "prc_admin_2fa_secret";
const TWO_FACTOR_BACKUP_CODES_KEY = "prc_admin_2fa_backup_codes";
const CREATED_ADMINS_STORAGE_KEY = "prc_created_admins_list";

// Standard RFC 4648 Base32 default secret for Super Admin (strictly [A-Z2-7] characters)
export const DEFAULT_SUPER_ADMIN_SECRET = "PRCHEXECUTIVESECRET2345KEY777AA";
export const DEFAULT_BACKUP_CODES = [
  "9821-4432",
  "1209-8876",
  "5543-9012",
  "7761-3210",
  "4412-9981",
  "6671-2244",
];

// In-memory store for pending MFA login sessions
const pendingMfaSessions = new Map<string, {
  accessToken?: string;
  refreshToken?: string;
  user?: AdminUser;
  secret?: string;
}>();

export function isLocal2FAEnabled(): boolean {
  const val = localStorage.getItem(TWO_FACTOR_STORAGE_KEY);
  if (val === "false") return false;
  return true; // Enforced by default for Executive Admin Console security
}

export function setLocal2FAEnabled(enabled: boolean) {
  if (enabled) {
    localStorage.setItem(TWO_FACTOR_STORAGE_KEY, "true");
  } else {
    localStorage.setItem(TWO_FACTOR_STORAGE_KEY, "false");
  }
}

// ─── Base32 Utilities (RFC 4648 Compliant) ──────────────────────────────────
export function isValidBase32(secret: string): boolean {
  if (!secret || typeof secret !== "string") return false;
  const cleaned = secret.toUpperCase().replace(/[\s-]+/g, "");
  return cleaned.length >= 16 && /^[A-Z2-7]+$/.test(cleaned);
}

export function generateBase32Secret(length = 32): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const randomBytes = new Uint8Array(length);
    cryptoObj.getRandomValues(randomBytes);
    for (let i = 0; i < length; i++) {
      secret += alphabet[randomBytes[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      secret += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return secret;
}

export function generateBackupCodes(count = 6): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const p1 = Math.floor(1000 + Math.random() * 9000).toString();
    const p2 = Math.floor(1000 + Math.random() * 9000).toString();
    codes.push(`${p1}-${p2}`);
  }
  return codes;
}

// Base32 Decoder for RFC 6238 TOTP Authenticator Keys
export function base32ToBytes(base32: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (let i = 0; i < cleaned.length; i++) {
    const val = alphabet.indexOf(cleaned[i]);
    if (val !== -1) {
      bits += val.toString(2).padStart(5, "0");
    }
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

// ─── Real-time RFC 6238 TOTP Code Generator for Google Authenticator / Authy ──
export async function generateTOTPCode(secretBase32: string, timeStepOffset = 0): Promise<string> {
  try {
    const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
    if (!cryptoObj || !cryptoObj.subtle) return "";

    const keyBytes = base32ToBytes(secretBase32);
    if (keyBytes.length === 0) return "";

    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(epoch / 30) + timeStepOffset;

    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(4, timeStep, false);

    const cryptoKey = await cryptoObj.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );

    const signature = await cryptoObj.subtle.sign("HMAC", cryptoKey, buffer);
    const hmac = new Uint8Array(signature);

    const offset = hmac[hmac.length - 1] & 0x0f;
    const dv = new DataView(hmac.buffer, hmac.byteOffset, hmac.byteLength);
    const binary = dv.getUint32(offset, false) & 0x7fffffff;

    const otp = (binary % 1000000).toString().padStart(6, "0");
    return otp;
  } catch (err) {
    console.error("[PRC Admin Auth] Error calculating TOTP code:", err);
    return "";
  }
}

// Verify TOTP code against secret with +/- 60s clock drift window
export async function verifyTOTPCode(secretBase32: string, candidateCode: string): Promise<boolean> {
  const cleanCode = candidateCode.trim().replace(/[\s-]+/g, "");
  if (!/^\d{6}$/.test(cleanCode)) return false;

  const offsets = [0, -1, 1, -2, 2];
  for (const offset of offsets) {
    const expected = await generateTOTPCode(secretBase32, offset);
    if (expected && expected === cleanCode) {
      return true;
    }
  }
  return false;
}

// ─── Local storage helpers for created admin accounts ────────────────────────
export function getStoredCreatedAdmins(): Array<{ email: string; pass: string; user: AdminUser; setup?: TwoFactorSetupData }> {
  try {
    const raw = localStorage.getItem(CREATED_ADMINS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCreatedAdmin(item: { email: string; pass: string; user: AdminUser; setup?: TwoFactorSetupData }) {
  const list = getStoredCreatedAdmins();
  const filtered = list.filter((a) => a.email.toLowerCase() !== item.email.toLowerCase());
  filtered.push(item);
  localStorage.setItem(CREATED_ADMINS_STORAGE_KEY, JSON.stringify(filtered));
}

// Get active TOTP secret for a user (with auto-migration if corrupt)
export function getAdminSecretForUser(email?: string): string {
  const cleanEmail = email?.trim().toLowerCase();
  if (cleanEmail) {
    const createdAdmins = getStoredCreatedAdmins();
    const matched = createdAdmins.find((a) => a.email.toLowerCase() === cleanEmail);
    if (matched?.setup?.secret && isValidBase32(matched.setup.secret)) {
      return matched.setup.secret;
    }
  }

  const stored = localStorage.getItem(TWO_FACTOR_SECRET_KEY);
  if (stored && isValidBase32(stored)) {
    return stored;
  }

  // Auto-migrate if missing or invalid Base32 (e.g. previous old key containing '9')
  localStorage.setItem(TWO_FACTOR_SECRET_KEY, DEFAULT_SUPER_ADMIN_SECRET);
  return DEFAULT_SUPER_ADMIN_SECRET;
}

// Get active backup codes for a user
export function getBackupCodesForUser(email?: string): string[] {
  const cleanEmail = email?.trim().toLowerCase();
  if (cleanEmail) {
    const createdAdmins = getStoredCreatedAdmins();
    const matched = createdAdmins.find((a) => a.email.toLowerCase() === cleanEmail);
    if (matched?.setup?.backupCodes && matched.setup.backupCodes.length > 0) {
      return matched.setup.backupCodes;
    }
  }

  try {
    const stored = localStorage.getItem(TWO_FACTOR_BACKUP_CODES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }

  localStorage.setItem(TWO_FACTOR_BACKUP_CODES_KEY, JSON.stringify(DEFAULT_BACKUP_CODES));
  return [...DEFAULT_BACKUP_CODES];
}

// Consume an emergency backup code after successful one-time use
export function consumeBackupCode(email: string, code: string): boolean {
  const cleanCode = code.replace(/[\s-]+/g, "").toUpperCase();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check created admins
  const createdAdmins = getStoredCreatedAdmins();
  const matchedAdminIdx = createdAdmins.findIndex((a) => a.email.toLowerCase() === cleanEmail);
  if (matchedAdminIdx !== -1 && createdAdmins[matchedAdminIdx].setup?.backupCodes) {
    const codes = createdAdmins[matchedAdminIdx].setup!.backupCodes;
    const matchIdx = codes.findIndex((c) => c.replace(/[\s-]+/g, "").toUpperCase() === cleanCode);
    if (matchIdx !== -1) {
      codes.splice(matchIdx, 1);
      localStorage.setItem(CREATED_ADMINS_STORAGE_KEY, JSON.stringify(createdAdmins));
      return true;
    }
  }

  // 2. Check main stored backup codes
  const currentCodes = getBackupCodesForUser();
  const matchIdx = currentCodes.findIndex((c) => c.replace(/[\s-]+/g, "").toUpperCase() === cleanCode);
  if (matchIdx !== -1) {
    currentCodes.splice(matchIdx, 1);
    localStorage.setItem(TWO_FACTOR_BACKUP_CODES_KEY, JSON.stringify(currentCodes));
    return true;
  }

  return false;
}

export const adminAuthService = {
  async login(email: string, password: string): Promise<TwoFactorLoginResult> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Attempt Admin Login API endpoint first
    let res = await fetchAdminApi("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    if (!res.success && (res.error?.code === "NOT_FOUND" || (res as any).statusCode === 404)) {
      res = await fetchAdminApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, password }),
      });
    }

    if (res.success && res.data) {
      const backendRequires2FA = res.data.requires2FA || res.data.twoFactorRequired;
      const local2FA = isLocal2FAEnabled();
      const accessToken = res.data.accessToken || "demo_access_token";
      const refreshToken = res.data.refreshToken || "demo_refresh_token";
      const rawUser = res.data.user || res.data;
      // role can be a string slug OR an object { id, name, slug } from the API
      const resolvedRole = typeof rawUser.role === "object" && rawUser.role !== null
        ? (rawUser.role.slug ?? rawUser.role.name ?? "super_admin")
        : (rawUser.role ?? "super_admin");
      const user: AdminUser = {
        id: rawUser.id || "admin-1",
        email: rawUser.email || cleanEmail,
        firstName: rawUser.firstName || "Executive",
        lastName: rawUser.lastName || "Admin",
        role: resolvedRole,
        isTwoFactorEnabled: local2FA,
      };

      const userSecret = getAdminSecretForUser(cleanEmail);
      const mfaToken = res.data.mfaToken || `temp_mfa_${Date.now()}`;
      pendingMfaSessions.set(mfaToken, { accessToken, refreshToken, user, secret: userSecret });

      if (backendRequires2FA || local2FA) {
        return {
          success: true,
          requires2FA: true,
          mfaToken,
          message: "2FA authentication challenge required.",
        };
      }

      setAdminTokens(accessToken, refreshToken, user);
      return {
        success: true,
        user,
        message: "Admin authentication successful!",
      };
    }

    // 2. Local Fallback Authentication: Check default admin & created admins
    const createdAdmins = getStoredCreatedAdmins();
    const matchedCreatedAdmin = createdAdmins.find(
      (a) => a.email.toLowerCase() === cleanEmail && a.pass === password
    );

    if (matchedCreatedAdmin || (cleanEmail === "admin@prchardware.com" && password === "AdminPass123!")) {
      const is2FA = isLocal2FAEnabled();
      const user: AdminUser = matchedCreatedAdmin ? matchedCreatedAdmin.user : {
        id: "admin-1",
        email: "admin@prchardware.com",
        firstName: "Executive",
        lastName: "Admin",
        role: "super_admin",
        isTwoFactorEnabled: true,
      };
      const userSecret = getAdminSecretForUser(cleanEmail);
      const mfaToken = `temp_mfa_demo_${Date.now()}`;
      pendingMfaSessions.set(mfaToken, {
        accessToken: "demo_admin_access_token",
        refreshToken: "demo_admin_refresh_token",
        user,
        secret: userSecret,
      });

      if (is2FA) {
        return {
          success: true,
          requires2FA: true,
          mfaToken,
          message: "Enter 6-digit Authenticator code to finalize login.",
        };
      }

      setAdminTokens("demo_admin_access_token", "demo_admin_refresh_token", user);
      return {
        success: true,
        user,
        message: "Executive authorization granted.",
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
        message: "Please enter your 6-digit authenticator code or 8-digit emergency backup code.",
      };
    }

    const pendingSession = pendingMfaSessions.get(mfaToken);
    const userEmail = pendingSession?.user?.email || "admin@prchardware.com";
    const activeSecret = pendingSession?.secret || getAdminSecretForUser(userEmail);

    // 1. Strictly verify the candidate code against RFC 6238 TOTP Authenticator Key FIRST
    const isLiveTOTPMatch = await verifyTOTPCode(activeSecret, cleanCode);

    // 2. Check Emergency Backup Codes (One-Time Use)
    const validBackupCodes = getBackupCodesForUser(userEmail);
    const isBackupMatch = validBackupCodes.some(
      (b) => b.replace(/[\s-]+/g, "").toUpperCase() === cleanCode.toUpperCase()
    );

    // STRICT SECURITY GATE: If code does NOT match real TOTP or backup code, REJECT IMMEDIATELY!
    if (!isLiveTOTPMatch && !isBackupMatch) {
      return {
        success: false,
        message: "Invalid 2FA Security Passcode! Please check your Google Authenticator app for the current 6-digit code or enter a valid backup code.",
      };
    }

    // 3. Optional: Sync with backend /auth/2fa/login if available
    let remoteAccessToken = "";
    let remoteRefreshToken = "";
    try {
      const res = await fetchAdminApi("/auth/2fa/login", {
        method: "POST",
        body: JSON.stringify({ mfaToken, code: cleanCode }),
      });
      if (res.success && res.data) {
        remoteAccessToken = res.data.accessToken || "";
        remoteRefreshToken = res.data.refreshToken || "";
      }
    } catch {
      // offline fallback
    }

    // 4. Grant verified access
    const verifiedUser: AdminUser = pendingSession?.user || {
      id: "admin-1",
      email: userEmail,
      firstName: "Executive",
      lastName: "Admin",
      role: "super_admin",
      isTwoFactorEnabled: true,
    };
    const accessToken = remoteAccessToken || pendingSession?.accessToken || "demo_admin_access_token_2fa";
    const refreshToken = remoteRefreshToken || pendingSession?.refreshToken || "demo_admin_refresh_token_2fa";

    if (isBackupMatch) {
      consumeBackupCode(userEmail, cleanCode);
    }

    setAdminTokens(accessToken, refreshToken, verifiedUser);
    pendingMfaSessions.delete(mfaToken);

    logAdminActivity({
      action: "2FA_VERIFIED",
      entity: "AUTH",
      category: "AUTH",
      severity: "SECURITY",
      details: `Executive 2FA passcode verified for '${verifiedUser.email}'.`,
      adminEmail: verifiedUser.email,
      payload: { method: isBackupMatch ? "EMERGENCY_BACKUP_CODE" : "TOTP_RFC6238" },
    });

    return {
      success: true,
      user: verifiedUser,
      message: isBackupMatch ? "Authenticated via Emergency Backup Code!" : "2FA Security Passcode Verified!",
    };
  },

  async createAdminUser(payload: CreateAdminPayload): Promise<CreatedAdminResult> {
    const bodyData = {
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone || "+91-9876543211",
      roleId: payload.roleId || "22222222-2222-2222-2222-222222222222",
      status: payload.status || "ACTIVE",
      isTwoFactorMandatory: true,
    };

    let res = await fetchAdminApi("/users", {
      method: "POST",
      body: JSON.stringify(bodyData),
    });

    const secret = generateBase32Secret(32);
    const appName = "PRC Hardware";
    const account = payload.email.trim();
    const otpauthUri = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`;
    const backupCodes = generateBackupCodes(6);

    const twoFactorSetup: TwoFactorSetupData = {
      secret,
      qrCodeUrl,
      backupCodes,
    };

    const createdUser: AdminUser = {
      id: res.data?.id || `admin-user-${Date.now()}`,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: "admin",
      roleId: payload.roleId,
      phone: payload.phone,
      status: "ACTIVE",
      isTwoFactorEnabled: true,
    };

    saveCreatedAdmin({
      email: payload.email,
      pass: payload.password,
      user: createdUser,
      setup: twoFactorSetup,
    });

    setLocal2FAEnabled(true);

    return {
      success: true,
      message: `Admin user '${payload.email}' created with Role ID [${payload.roleId}] & MANDATORY 2FA enforcement!`,
      user: createdUser,
      twoFactorSetup,
    };
  },

  async setup2FA(): Promise<{ success: boolean; data?: TwoFactorSetupData; message?: string }> {
    let res = await fetchAdminApi("/auth/2fa/setup", { method: "POST" });
    if (!res.success) {
      res = await fetchAdminApi("/auth/2fa/generate", { method: "POST" });
    }

    if (res.success && res.data?.secret && isValidBase32(res.data.secret)) {
      localStorage.setItem(TWO_FACTOR_SECRET_KEY, res.data.secret);
      return { success: true, data: res.data };
    }

    // Generate fresh cryptographically valid Base32 secret & backup codes
    const secret = generateBase32Secret(32);
    const appName = "PRC Hardware";
    const account = "admin@prchardware.com";
    const otpauthUri = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`;
    const backupCodes = generateBackupCodes(6);

    localStorage.setItem(TWO_FACTOR_SECRET_KEY, secret);
    localStorage.setItem(TWO_FACTOR_BACKUP_CODES_KEY, JSON.stringify(backupCodes));

    return {
      success: true,
      data: {
        secret,
        qrCodeUrl: qrUrl,
        backupCodes,
      },
    };
  },

  async confirmEnable2FA(code: string): Promise<{ success: boolean; message?: string }> {
    const cleanCode = code.trim().replace(/[\s-]+/g, "");
    if (!/^\d{6}$/.test(cleanCode)) {
      return { success: false, message: "Please enter a valid 6-digit confirmation code." };
    }

    // Strict local verification against the active secret during setup FIRST
    const activeSecret = getAdminSecretForUser("admin@prchardware.com");
    const isCodeValid = await verifyTOTPCode(activeSecret, cleanCode);

    if (!isCodeValid) {
      return {
        success: false,
        message: "Invalid verification code! The 6-digit code did not match your Authenticator app. Please ensure your device clock is accurate and enter the current code.",
      };
    }

    // Call backend to sync state if available
    try {
      await fetchAdminApi("/auth/2fa/enable", {
        method: "POST",
        body: JSON.stringify({ code: cleanCode }),
      });
    } catch {
      // offline fallback
    }

    setLocal2FAEnabled(true);
    return { success: true, message: "Two-Factor Authentication is now verified and active on your admin account!" };
  },

  async disable2FA(passwordOrCode: string): Promise<{ success: boolean; message?: string }> {
    const cleanStr = passwordOrCode.trim();
    if (!cleanStr) {
      return { success: false, message: "Please provide your admin password or 2FA authenticator code to confirm." };
    }

    // 1. Local Credential & 2FA Validation FIRST
    const createdAdmins = getStoredCreatedAdmins();
    const isPasswordMatch =
      cleanStr === "AdminPass123!" ||
      createdAdmins.some((a) => a.pass === cleanStr);

    const activeSecret = getAdminSecretForUser("admin@prchardware.com");
    const isLiveTOTPMatch = await verifyTOTPCode(activeSecret, cleanStr);

    const validBackupCodes = getBackupCodesForUser("admin@prchardware.com");
    const isBackupMatch = validBackupCodes.some(
      (b) => b.replace(/[\s-]+/g, "").toUpperCase() === cleanStr.replace(/[\s-]+/g, "").toUpperCase()
    );

    if (!isPasswordMatch && !isLiveTOTPMatch && !isBackupMatch) {
      return {
        success: false,
        message: "Invalid admin password or authenticator OTP code! Two-Factor Authentication remains active for security.",
      };
    }

    // 2. Call backend to sync if available
    try {
      await fetchAdminApi("/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ password: cleanStr, code: cleanStr }),
      });
    } catch {
      // offline fallback
    }

    if (isBackupMatch) {
      consumeBackupCode("admin@prchardware.com", cleanStr);
    }
    setLocal2FAEnabled(false);
    return { success: true, message: "Two-Factor Authentication has been disabled." };
  },

  async getProfile(): Promise<{ success: boolean; user?: AdminUser }> {
    const res = await fetchAdminApi("/auth/me");
    const local2FA = isLocal2FAEnabled();

    if (res.success && res.data) {
      const resRole = res.data.role;
      const resolvedRole = typeof resRole === "object" && resRole !== null
        ? (resRole.slug ?? resRole.name ?? "super_admin")
        : (resRole ?? "super_admin");
      return {
        success: true,
        user: {
          id: res.data.id || "admin-1",
          email: res.data.email,
          firstName: res.data.firstName || "Executive",
          lastName: res.data.lastName || "Admin",
          role: resolvedRole,
          isTwoFactorEnabled: local2FA,
        },
      };
    }
    return { success: false };
  },

  async logout(): Promise<void> {
    const refreshToken = getAdminRefreshToken();
    if (refreshToken) {
      await fetchAdminApi("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    }
    clearAdminTokens();
  },
};
