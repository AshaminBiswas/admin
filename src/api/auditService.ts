import { AuditLogItem } from "../types/admin";

const AUDIT_LOGS_STORAGE_KEY = "prc_admin_audit_logs";

export const INITIAL_REALTIME_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "LOG-9008",
    adminEmail: "admin@prchardware.com",
    action: "2FA_VERIFIED",
    entity: "AUTH",
    category: "AUTH",
    severity: "SECURITY",
    details: "Executive 2FA TOTP passcode verified successfully.",
    createdAt: "2026-08-13 10:30:57",
    ipAddress: "103.21.124.50",
    userAgent: "Chrome 122.0 / Windows 11 (Executive Portal)",
    payload: { method: "TOTP_RFC6238", sessionDurationMs: 3600000 },
  },
  {
    id: "LOG-9007",
    adminEmail: "admin@prchardware.com",
    action: "ADMIN_LOGIN",
    entity: "AUTH",
    category: "AUTH",
    severity: "SECURITY",
    details: "Executive login credentials verified (Step 1). 2FA challenge issued.",
    createdAt: "2026-08-13 10:30:36",
    ipAddress: "103.21.124.50",
    userAgent: "Chrome 122.0 / Windows 11 (Executive Portal)",
    payload: { email: "admin@prchardware.com", status: "PENDING_2FA" },
  },
  {
    id: "LOG-9006",
    adminEmail: "superadmin@prchardware.com",
    action: "CREATE_ADMIN",
    entity: "SYSTEM",
    category: "SYSTEM",
    severity: "CRITICAL",
    details: "Created new Executive Admin user account 'manager@prchardware.com' with MANDATORY 2FA enforcement.",
    createdAt: "2026-08-12 16:45:10",
    ipAddress: "103.21.124.50",
    userAgent: "Chrome 122.0 / Windows 11",
    payload: { createdEmail: "manager@prchardware.com", roleId: "22222222-2222-2222-2222-222222222222" },
  },
  {
    id: "LOG-9005",
    adminEmail: "admin@prchardware.com",
    action: "APPROVE_QUOTE",
    entity: "SALES",
    category: "SALES",
    severity: "SUCCESS",
    details: "Approved B2B bulk price quotation PRC-QUOTE-2026-702 (Value: ₹6,80,000).",
    createdAt: "2026-08-11 14:32:00",
    ipAddress: "114.31.88.12",
    userAgent: "Safari 17.2 / macOS",
    payload: { quoteNumber: "PRC-QUOTE-2026-702", client: "Apex Builders Pvt Ltd" },
  },
  {
    id: "LOG-9004",
    adminEmail: "inventory.lead@prchardware.com",
    action: "UPDATE_STOCK",
    entity: "CATALOG",
    category: "CATALOG",
    severity: "INFO",
    details: "Adjusted warehouse stock level for SKU PRC-MORT-COP-01 (+25 units).",
    createdAt: "2026-08-10 11:20:15",
    ipAddress: "103.21.124.50",
    userAgent: "Chrome 122.0 / Windows 11",
    payload: { sku: "PRC-MORT-COP-01", oldStock: 20, newStock: 45 },
  },
  {
    id: "LOG-9003",
    adminEmail: "admin@prchardware.com",
    action: "2FA_ENABLED",
    entity: "SECURITY",
    category: "AUTH",
    severity: "SECURITY",
    details: "Activated Two-Factor Authentication (TOTP) for executive account.",
    createdAt: "2026-08-09 09:15:00",
    ipAddress: "103.21.124.50",
    userAgent: "Chrome 122.0 / Windows 11",
    payload: { isTwoFactorEnabled: true, method: "RFC6238_TOTP" },
  },
  {
    id: "LOG-9002",
    adminEmail: "admin@prchardware.com",
    action: "UPDATE_PRODUCT",
    entity: "CATALOG",
    category: "CATALOG",
    severity: "INFO",
    details: "Updated pricing & offer discounts for Stainless Steel 304 Glass Door Patch Fitting Set.",
    createdAt: "2026-08-08 15:10:44",
    ipAddress: "103.21.124.50",
    userAgent: "Chrome 122.0 / Windows 11",
    payload: { sku: "PRC-PATCH-SS304", price: 2890, originalPrice: 3490 },
  },
  {
    id: "LOG-9001",
    adminEmail: "system@prchardware.com",
    action: "SYSTEM_BOOT",
    entity: "SYSTEM",
    category: "SYSTEM",
    severity: "INFO",
    details: "Executive Console API & Cryptographic Audit Logging Service Initialized.",
    createdAt: "2026-08-08 00:00:01",
    ipAddress: "127.0.0.1",
    userAgent: "System Kernel 1.0",
    payload: { environment: "PRODUCTION", apiBaseUrl: "https://prc-backend-6sw7.onrender.com/api/v1" },
  },
];

export function getAuditLogs(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(INITIAL_REALTIME_AUDIT_LOGS));
  return INITIAL_REALTIME_AUDIT_LOGS;
}

export function logAdminActivity(entry: {
  action: string;
  entity: string;
  category?: string;
  severity?: "INFO" | "SECURITY" | "CRITICAL" | "SUCCESS";
  details: string;
  adminEmail?: string;
  payload?: Record<string, any>;
}): AuditLogItem {
  const currentLogs = getAuditLogs();

  const newLog: AuditLogItem = {
    id: `LOG-${Date.now().toString().slice(-6)}`,
    adminEmail: entry.adminEmail || "admin@prchardware.com",
    action: entry.action,
    entity: entry.entity,
    category: entry.category || "SYSTEM",
    severity: entry.severity || "INFO",
    details: entry.details,
    createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    ipAddress: "103.21.124.50",
    userAgent: navigator.userAgent || "Executive Console",
    payload: entry.payload || {},
  };

  const updatedLogs = [newLog, ...currentLogs];
  localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));
  return newLog;
}

export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOGS_STORAGE_KEY);
}
