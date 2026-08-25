import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldCheck,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Download,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Lock,
  UserCheck,
  Package,
  ShoppingCart,
  Settings,
  Info,
  Clock,
  Laptop,
  Globe,
  Copy,
  Check,
  X,
  FileText,
  FileSpreadsheet,
  Layers,
  Crown,
  UserCog,
  DollarSign,
  ChevronRight,
  Shield,
  Key,
  Database,
  ExternalLink,
  Eye,
} from "lucide-react";
import { auditApi, usersApi } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import { AdminDossierData, AdminAuditLogEntry } from "../types/admin";
import { AsyncActionButton } from "../components/common/AsyncActionButton";

interface AdminDossierPageProps {
  adminId?: string | null;
  onBack?: () => void;
}

export function AdminDossierPage({ adminId: propAdminId, onBack }: AdminDossierPageProps) {
  const { adminUser, setCurrentView } = useAdminAuth();

  // Resolve adminId from props or localStorage
  const activeAdminId = useMemo(() => {
    return propAdminId || localStorage.getItem("prc_admin_selected_admin_id") || "";
  }, [propAdminId]);

  const [dossier, setDossier] = useState<AdminDossierData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "quotes" | "invoices" | "catalog" | "customers" | "audit_logs"
  >("overview");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>("ALL");
  const [inspectingLog, setInspectingLog] = useState<AdminAuditLogEntry | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Check if current logged-in user is Super Admin
  const isSuperAdmin = useMemo(() => {
    const rawRole = (adminUser as any)?.roleSlug || (typeof adminUser?.role === "object" ? (adminUser.role as any)?.slug : adminUser?.role) || "";
    return String(rawRole).toLowerCase().includes("super");
  }, [adminUser]);

  // Fetch full Admin 360 dossier with transparent retry
  const fetchDossier = useCallback(
    async (isRetry = false) => {
      if (!activeAdminId) {
        setErrorMessage("No administrator ID provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await auditApi.getAdmin360(activeAdminId);
        if (res.success && res.data) {
          setDossier(res.data);
        } else if (!isRetry) {
          // Automatic retry on transient network delay
          setTimeout(() => fetchDossier(true), 600);
          return;
        } else {
          // Fallback to basic user profile lookup
          const userRes = await usersApi.getById(activeAdminId);
          if (userRes.success && userRes.data) {
            const u = userRes.data;
            setDossier({
              admin: {
                id: u.id,
                email: u.email,
                firstName: u.firstName || "Admin",
                lastName: u.lastName || "Staff",
                phone: u.phone,
                avatar: u.avatar,
                status: u.status || "ACTIVE",
                isVerified: u.isVerified ?? true,
                twoFactorEnabled: u.isTwoFactorEnabled ?? false,
                lastLoginAt: u.lastLoginAt,
                createdAt: u.createdAt || new Date().toISOString(),
                updatedAt: u.updatedAt || new Date().toISOString(),
                isSuperAdmin: String(u.role?.slug || u.role?.name || "").toLowerCase().includes("super"),
                role: u.role,
                roles: u.role ? [u.role] : [],
                permissions: u.role?.permissions?.map((p: string) => ({ id: p, name: p, slug: p, module: p.split(".")[0] || "general" })) || [],
                seniority: { totalDays: 0, years: 0, months: 0, days: 0, label: "Active Member" },
              },
              summary: {
                totalOperations: 0,
                quotesApproved: 0,
                invoicesGenerated: 0,
                productsManaged: 0,
                customersManaged: 0,
                securityActionsCount: 0,
              },
              sections: {
                quoteActions: [],
                invoiceActions: [],
                catalogActions: [],
                customerActions: [],
                securityActions: [],
                allLogs: [],
              },
            });
          } else {
            setErrorMessage(res.error?.message || res.message || "Failed to load administrator dossier.");
          }
        }
      } catch (err: any) {
        if (!isRetry) {
          setTimeout(() => fetchDossier(true), 600);
          return;
        }
        setErrorMessage(err?.message || "Unable to reach server. Please check your network connection.");
      } finally {
        setLoading(false);
      }
    },
    [activeAdminId]
  );

  useEffect(() => {
    fetchDossier();
  }, [fetchDossier]);

  const handleCopyPayload = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleExportCsv = () => {
    if (!dossier) return;
    const logs = dossier.sections.allLogs;
    if (logs.length === 0) return;

    const headers = ["ID", "Timestamp", "Admin Email", "Admin Name", "Role", "Action", "Entity", "Details", "Severity", "IP Address"];
    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.createdAt).toLocaleString()}"`,
      `"${l.adminEmail || ""}"`,
      `"${l.adminName || ""}"`,
      `"${l.adminRole || ""}"`,
      `"${l.action}"`,
      `"${l.entity}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      `"${l.severity}"`,
      `"${l.ipAddress || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Admin_Audit_Trail_${dossier.admin.firstName}_${dossier.admin.lastName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered timeline logs
  const filteredTimelineLogs = useMemo(() => {
    if (!dossier) return [];
    return dossier.sections.allLogs.filter((log) => {
      const matchesSearch =
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.entityName && log.entityName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.ipAddress && log.ipAddress.includes(searchTerm));

      const matchesSeverity = selectedSeverity === "ALL" || log.severity === selectedSeverity;
      const matchesEntity = selectedEntityFilter === "ALL" || log.entity === selectedEntityFilter;

      return matchesSearch && matchesSeverity && matchesEntity;
    });
  }, [dossier, searchTerm, selectedSeverity, selectedEntityFilter]);

  // If not super admin, show security restriction
  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="rounded-2xl bg-rose-950/40 border border-rose-500/30 p-8 text-center space-y-4 shadow-xl backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#FAFAFA]">Restricted Executive Access</h2>
          <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
            Viewing deep administrator audit logs, quotation authorizations, and invoice operations requires <strong>Super Administrator</strong> clearance.
          </p>
          <button
            type="button"
            onClick={() => onBack ? onBack() : setCurrentView("admins")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs font-bold transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Return to Admin Directory</span>
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <div className="h-6 w-48 bg-[#27272A] rounded"></div>
          <div className="h-9 w-32 bg-[#27272A] rounded-xl"></div>
        </div>
        <div className="h-44 bg-[#18181B] rounded-2xl border border-[#27272A]"></div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#18181B] rounded-xl border border-[#27272A]"></div>
          ))}
        </div>
        <div className="h-96 bg-[#18181B] rounded-2xl border border-[#27272A]"></div>
      </div>
    );
  }

  // Error state
  if (errorMessage || !dossier) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="rounded-2xl bg-[#18181B] border border-rose-500/30 p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg font-bold text-[#FAFAFA]">Failed to Load Administrator Dossier</h2>
          <p className="text-xs text-[#A1A1AA]">{errorMessage || "The requested administrator record could not be retrieved."}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onBack ? onBack() : setCurrentView("admins")}
              className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-xl text-xs font-bold"
            >
              Back to Administrators
            </button>
            <AsyncActionButton
              onAction={() => fetchDossier()}
              idleLabel="Retry"
              className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold"
            />
          </div>
        </div>
      </div>
    );
  }

  const { admin, summary, sections } = dossier;
  const roleName = admin.role?.name || admin.role?.slug || (admin.isSuperAdmin ? "Super Administrator" : "Administrator");

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* ─── Top Header & Breadcrumbs ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#71717A]">
            <button
              type="button"
              onClick={() => onBack ? onBack() : setCurrentView("admins")}
              className="hover:text-[#FAFAFA] transition-colors"
            >
              Admin Management
            </button>
            <ChevronRight size={12} />
            <span className="text-[#FAFAFA] font-semibold">
              {admin.firstName} {admin.lastName}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#FAFAFA] flex items-center gap-2.5">
            <Crown size={22} className="text-amber-400" />
            <span>Administrator 360° Activity Dossier</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onBack ? onBack() : setCurrentView("admins")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs font-bold transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-[#A855F7] border border-purple-500/30 text-xs font-bold transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <AsyncActionButton
            onAction={() => fetchDossier()}
            idleLabel="Refresh"
            idleIcon={<RefreshCw size={13} />}
            className="px-3.5 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-xl text-xs font-bold"
          />
        </div>
      </div>

      {/* ─── Hero Master Card ─── */}
      <div className="rounded-2xl bg-gradient-to-br from-[#18181B] via-[#18181B] to-[#121215] border border-[#27272A] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-500/20">
                {admin.avatar ? (
                  <img src={admin.avatar} alt={admin.firstName} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>{admin.firstName?.[0]?.toUpperCase()}{admin.lastName?.[0]?.toUpperCase()}</span>
                )}
              </div>
              {admin.isSuperAdmin && (
                <div className="absolute -top-1.5 -right-1.5 p-1 bg-amber-500 text-black rounded-full shadow" title="Super Administrator">
                  <Crown size={12} className="stroke-[3]" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-[#FAFAFA]">
                  {admin.firstName} {admin.lastName}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                    admin.status === "ACTIVE"
                      ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                >
                  {admin.status}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    admin.isSuperAdmin
                      ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                      : "bg-purple-950/80 text-[#A855F7] border-purple-500/40"
                  }`}
                >
                  {roleName}
                </span>
              </div>

              <p className="text-xs text-[#A1A1AA] flex items-center gap-3">
                <span>{admin.email}</span>
                {admin.phone && <span>• {admin.phone}</span>}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#71717A]">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-[#A1A1AA]" />
                  <span>Seniority: <strong className="text-[#FAFAFA]">{admin.seniority?.label || "Active"}</strong></span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {admin.twoFactorEnabled ? (
                    <span className="text-cyan-400 font-semibold flex items-center gap-1">
                      <Lock size={12} />
                      2FA Enforced
                    </span>
                  ) : (
                    <span className="text-[#71717A]">2FA Optional</span>
                  )}
                </span>
                <span>•</span>
                <span>Account ID: <strong className="font-mono text-[#FAFAFA]">#{admin.id.slice(0, 8)}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-2 border-t md:border-t-0 md:border-l border-[#27272A] pt-4 md:pt-0 md:pl-6">
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">Assigned Privileges</span>
              <p className="text-sm font-bold text-purple-400">
                {admin.permissions?.length || 0} Granular Permissions Active
              </p>
            </div>
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">Account Created</span>
              <p className="text-xs text-[#A1A1AA]">
                {new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5 KPI Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-[11px] font-semibold">Total Actions Logged</span>
            <Activity size={15} className="text-purple-400" />
          </div>
          <p className="text-2xl font-black text-[#FAFAFA]">{summary.totalOperations}</p>
          <span className="text-[10px] text-[#71717A]">Lifetime admin events</span>
        </div>

        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-[11px] font-semibold">Quotes Approved</span>
            <FileText size={15} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{summary.quotesApproved}</p>
          <span className="text-[10px] text-[#71717A]">B2B RFQs & Revisions</span>
        </div>

        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-[11px] font-semibold">Invoices / PIs</span>
            <DollarSign size={15} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{summary.invoicesGenerated}</p>
          <span className="text-[10px] text-[#71717A]">GST & Proforma generated</span>
        </div>

        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-[11px] font-semibold">Catalog Ops</span>
            <Package size={15} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{summary.productsManaged}</p>
          <span className="text-[10px] text-[#71717A]">Products & Stock updates</span>
        </div>

        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-[11px] font-semibold">Customer Accounts</span>
            <UserCog size={15} className="text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-400">{summary.customersManaged}</p>
          <span className="text-[10px] text-[#71717A]">B2B Rates & Profiles</span>
        </div>
      </div>

      {/* ─── 6 Interactive Tabs ─── */}
      <div className="border-b border-[#27272A] flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-semibold">
        {[
          { id: "overview", label: "Identity & Permissions", count: admin.permissions?.length || 0, icon: Shield },
          { id: "quotes", label: "Quotation & RFQ Actions", count: sections.quoteActions.length, icon: FileText },
          { id: "invoices", label: "Invoices, PI & POs", count: sections.invoiceActions.length, icon: DollarSign },
          { id: "catalog", label: "Product & Stock Actions", count: sections.catalogActions.length, icon: Package },
          { id: "customers", label: "Customer Management", count: sections.customerActions.length, icon: UserCog },
          { id: "audit_logs", label: "Complete Audit Timeline", count: sections.allLogs.length, icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-[#8B5CF6] text-[#FAFAFA] bg-purple-500/5 font-bold"
                  : "border-transparent text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46]"
              }`}
            >
              <Icon size={14} className={isActive ? "text-[#8B5CF6]" : "text-[#71717A]"} />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${isActive ? "bg-purple-500/20 text-[#A855F7]" : "bg-[#27272A] text-[#71717A]"}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW & PERMISSIONS MATRIX ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">Account Credentials</span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#71717A]">Official Email</span>
                  <p className="font-bold text-[#FAFAFA] break-all">{admin.email}</p>
                </div>
                <div>
                  <span className="text-[#71717A]">Phone Number</span>
                  <p className="font-bold text-[#FAFAFA]">{admin.phone || "Not configured"}</p>
                </div>
                <div>
                  <span className="text-[#71717A]">Account Status</span>
                  <p className={`font-bold ${admin.status === "ACTIVE" ? "text-emerald-400" : "text-zinc-400"}`}>{admin.status}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">Security & Multi-Factor</span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#71717A]">2FA TOTP Protection</span>
                  <p className={`font-bold ${admin.twoFactorEnabled ? "text-cyan-400" : "text-amber-400"}`}>
                    {admin.twoFactorEnabled ? "Active & Enforced" : "Disabled / Optional"}
                  </p>
                </div>
                <div>
                  <span className="text-[#71717A]">Verification Status</span>
                  <p className="font-bold text-emerald-400">{admin.isVerified ? "Verified Staff Account" : "Pending Verification"}</p>
                </div>
                <div>
                  <span className="text-[#71717A]">Security Role</span>
                  <p className="font-bold text-purple-400">{roleName}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">Seniority & Lifetime</span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#71717A]">Total Tenure</span>
                  <p className="font-bold text-[#FAFAFA]">{admin.seniority?.label || "Member"}</p>
                </div>
                <div>
                  <span className="text-[#71717A]">Created On</span>
                  <p className="font-bold text-[#FAFAFA]">{new Date(admin.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[#71717A]">Last Updated</span>
                  <p className="font-bold text-[#FAFAFA]">{new Date(admin.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Granular Active Permissions Matrix */}
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-purple-400" />
                <h3 className="font-bold text-sm text-[#FAFAFA]">Active Granted Permissions ({admin.permissions?.length || 0})</h3>
              </div>
              <span className="text-xs text-[#71717A]">Inherited from role: <strong className="text-purple-400">{roleName}</strong></span>
            </div>

            {(!admin.permissions || admin.permissions.length === 0) ? (
              <p className="text-xs text-[#71717A] py-4 text-center">No explicit permissions assigned to this role.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {admin.permissions.map((perm) => (
                  <div key={perm.id || perm.slug} className="p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#FAFAFA]">{perm.name || perm.slug}</p>
                      <span className="text-[10px] font-mono text-purple-400">{perm.slug}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                      GRANTED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: QUOTATION & RFQ ACTIONS ─── */}
      {activeTab === "quotes" && (
        <div className="rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
          <div className="p-4 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#A1A1AA]">
              B2B Quotation Approvals & Pricing Revisions ({sections.quoteActions.length})
            </h3>
          </div>

          {sections.quoteActions.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#71717A] space-y-2">
              <FileText size={32} className="mx-auto text-[#3F3F46]" />
              <p>No quotation actions recorded for this administrator yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#27272A]">
              {sections.quoteActions.map((log) => (
                <div key={log.id} className="p-4 hover:bg-[#27272A]/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono uppercase ${
                        log.action.includes("APPROV")
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                          : log.action.includes("REJECT")
                          ? "bg-rose-950/80 text-rose-400 border border-rose-500/30"
                          : "bg-blue-950/80 text-blue-400 border border-blue-500/30"
                      }`}>
                        {log.action}
                      </span>
                      <strong className="text-[#FAFAFA] font-mono">{log.entityName || `Ref #${log.entityId}`}</strong>
                    </div>
                    <p className="text-[#A1A1AA]">{log.details}</p>
                    <span className="text-[10px] text-[#71717A] flex items-center gap-2">
                      <Clock size={11} />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                      {log.ipAddress && <span>• IP: {log.ipAddress}</span>}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectingLog(log)}
                    className="self-start sm:self-center px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg text-[#FAFAFA] text-[11px] font-semibold flex items-center gap-1.5"
                  >
                    <Eye size={12} />
                    <span>Inspect Payload</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: INVOICES, PI & PO OPERATIONS ─── */}
      {activeTab === "invoices" && (
        <div className="rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
          <div className="p-4 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#A1A1AA]">
              GST Tax Invoices, Proforma Invoices & PO Operations ({sections.invoiceActions.length})
            </h3>
          </div>

          {sections.invoiceActions.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#71717A] space-y-2">
              <DollarSign size={32} className="mx-auto text-[#3F3F46]" />
              <p>No tax invoice or PI generation events recorded for this administrator yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#27272A]">
              {sections.invoiceActions.map((log) => (
                <div key={log.id} className="p-4 hover:bg-[#27272A]/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono uppercase ${
                        log.action.includes("TAX_INVOICE")
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                          : log.action.includes("PI_")
                          ? "bg-indigo-950/80 text-indigo-300 border border-indigo-500/30"
                          : "bg-zinc-800 text-zinc-300"
                      }`}>
                        {log.action}
                      </span>
                      <strong className="text-[#FAFAFA] font-mono">{log.entityName || `Invoice #${log.entityId}`}</strong>
                    </div>
                    <p className="text-[#A1A1AA]">{log.details}</p>
                    <span className="text-[10px] text-[#71717A] flex items-center gap-2">
                      <Clock size={11} />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                      {log.ipAddress && <span>• IP: {log.ipAddress}</span>}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectingLog(log)}
                    className="self-start sm:self-center px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg text-[#FAFAFA] text-[11px] font-semibold flex items-center gap-1.5"
                  >
                    <Eye size={12} />
                    <span>Inspect Payload</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: PRODUCT CATALOG & STOCK ACTIONS ─── */}
      {activeTab === "catalog" && (
        <div className="rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
          <div className="p-4 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#A1A1AA]">
              Product Catalog Mutations & Stock Adjustments ({sections.catalogActions.length})
            </h3>
          </div>

          {sections.catalogActions.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#71717A] space-y-2">
              <Package size={32} className="mx-auto text-[#3F3F46]" />
              <p>No catalog actions recorded for this administrator yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#27272A]">
              {sections.catalogActions.map((log) => (
                <div key={log.id} className="p-4 hover:bg-[#27272A]/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono uppercase ${
                        log.action.includes("CREATE")
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                          : log.action.includes("DELETE")
                          ? "bg-rose-950/80 text-rose-400 border border-rose-500/30"
                          : "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                      }`}>
                        {log.action}
                      </span>
                      <strong className="text-[#FAFAFA]">{log.entityName || `Product #${log.entityId}`}</strong>
                    </div>
                    <p className="text-[#A1A1AA]">{log.details}</p>
                    <span className="text-[10px] text-[#71717A] flex items-center gap-2">
                      <Clock size={11} />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                      {log.ipAddress && <span>• IP: {log.ipAddress}</span>}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectingLog(log)}
                    className="self-start sm:self-center px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg text-[#FAFAFA] text-[11px] font-semibold flex items-center gap-1.5"
                  >
                    <Eye size={12} />
                    <span>Inspect Payload</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: CUSTOMER MANAGEMENT ACTIONS ─── */}
      {activeTab === "customers" && (
        <div className="rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
          <div className="p-4 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#A1A1AA]">
              Customer Account & B2B Rate Actions ({sections.customerActions.length})
            </h3>
          </div>

          {sections.customerActions.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#71717A] space-y-2">
              <UserCog size={32} className="mx-auto text-[#3F3F46]" />
              <p>No customer management actions recorded for this administrator yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#27272A]">
              {sections.customerActions.map((log) => (
                <div key={log.id} className="p-4 hover:bg-[#27272A]/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono uppercase ${
                        log.action.includes("CREATE")
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                          : log.action.includes("DELETE")
                          ? "bg-rose-950/80 text-rose-400 border border-rose-500/30"
                          : "bg-cyan-950/80 text-cyan-300 border border-cyan-500/30"
                      }`}>
                        {log.action}
                      </span>
                      <strong className="text-[#FAFAFA]">{log.entityName || `Customer #${log.entityId}`}</strong>
                    </div>
                    <p className="text-[#A1A1AA]">{log.details}</p>
                    <span className="text-[10px] text-[#71717A] flex items-center gap-2">
                      <Clock size={11} />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                      {log.ipAddress && <span>• IP: {log.ipAddress}</span>}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectingLog(log)}
                    className="self-start sm:self-center px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg text-[#FAFAFA] text-[11px] font-semibold flex items-center gap-1.5"
                  >
                    <Eye size={12} />
                    <span>Inspect Payload</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 6: COMPLETE AUDIT TIMELINE ─── */}
      {activeTab === "audit_logs" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                placeholder="Search audit trail, actions, diffs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#09090B] border border-[#27272A] rounded-xl pl-9 pr-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL">All Severities</option>
                <option value="INFO">INFO</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="SECURITY">SECURITY</option>
              </select>

              <select
                value={selectedEntityFilter}
                onChange={(e) => setSelectedEntityFilter(e.target.value)}
                className="bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL">All Domains</option>
                <option value="QUOTATION">Quotation</option>
                <option value="INVOICE">Invoice / PI</option>
                <option value="PRODUCT">Catalog</option>
                <option value="CUSTOMER">Customer</option>
                <option value="ROLE">Role / Security</option>
                <option value="AUTH">Auth</option>
              </select>
            </div>
          </div>

          {/* Timeline Stream */}
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg divide-y divide-[#27272A]">
            {filteredTimelineLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#71717A] space-y-2">
                <Activity size={32} className="mx-auto text-[#3F3F46]" />
                <p>No activity logs match the selected filter criteria.</p>
              </div>
            ) : (
              filteredTimelineLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-[#27272A]/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono uppercase ${
                        log.severity === "CRITICAL" || log.severity === "SECURITY"
                          ? "bg-rose-950/80 text-rose-400 border border-rose-500/40"
                          : log.severity === "SUCCESS"
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                          : log.severity === "WARNING"
                          ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                          : "bg-blue-950/80 text-blue-400 border border-blue-500/40"
                      }`}>
                        {log.severity}
                      </span>
                      <span className="font-bold text-[#FAFAFA] font-mono">{log.action}</span>
                      <span className="text-[10px] text-purple-400 font-mono">[{log.entity}]</span>
                    </div>

                    <p className="text-[#A1A1AA]">{log.details}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#71717A]">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </span>
                      {log.ipAddress && (
                        <span className="flex items-center gap-1">
                          <Globe size={11} />
                          <span>IP: {log.ipAddress}</span>
                        </span>
                      )}
                      {log.userAgent && (
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <Laptop size={11} />
                          <span>{log.userAgent}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectingLog(log)}
                    className="self-start sm:self-center px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg text-[#FAFAFA] text-[11px] font-semibold flex items-center gap-1.5"
                  >
                    <Eye size={12} />
                    <span>Inspect</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: INSPECT LOG PAYLOAD ─── */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-purple-400" />
                <h3 className="font-bold text-sm text-[#FAFAFA]">Log Event Record #{inspectingLog.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A]">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Action & Domain</span>
                  <p className="font-bold text-[#FAFAFA]">{inspectingLog.action} ({inspectingLog.entity})</p>
                </div>
                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A]">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Severity Level</span>
                  <p className="font-bold text-purple-400">{inspectingLog.severity}</p>
                </div>
              </div>

              <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[10px] text-[#71717A] uppercase font-bold">Details</span>
                <p className="text-[#FAFAFA] pt-1">{inspectingLog.details}</p>
              </div>

              <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Structured JSON Metadata & Diffs</span>
                  <button
                    type="button"
                    onClick={() => handleCopyPayload(inspectingLog.metadata || {})}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                  >
                    {copiedPayload ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedPayload ? "Copied!" : "Copy JSON"}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#000000] border border-[#27272A] rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60">
                  {JSON.stringify(inspectingLog.metadata || {}, null, 2)}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] text-[#71717A]">
                <div>IP Address: <strong className="text-[#FAFAFA]">{inspectingLog.ipAddress || "Unknown"}</strong></div>
                <div>Timestamp: <strong className="text-[#FAFAFA]">{new Date(inspectingLog.createdAt).toLocaleString()}</strong></div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
