import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Search,
  Copy,
  CheckCircle2,
  AlertCircle,
  QrCode,
  KeyRound,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  Save,
  Shield,
  Phone,
  Eye,
  AlertTriangle,
  Sliders,
  CheckSquare,
  Sparkles,
  Download,
  Calendar,
  Crown,
  UserCog,
  ChevronDown,
} from "lucide-react";
import { usersApi, rolesApi } from "../api/adminApi";
import { adminAuthService } from "../api/adminAuthService";
import { useAdminAuth } from "../context/AdminAuthContext";
import { AdminUser, CreatedAdminResult, Role } from "../types/admin";
import { AsyncActionButton } from "../components/common/AsyncActionButton";
import { useDebounce } from "../hooks/useDebounce";

/* ─── Skeleton Loading Body for Admin Management ────────────────────────────── */

export function AdminManagementPageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#27272A]"></div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-56 bg-[#27272A] rounded"></div>
              <div className="h-4 w-28 bg-[#27272A] rounded-full"></div>
            </div>
            <div className="h-3 w-80 bg-[#27272A] rounded"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 bg-[#27272A] rounded-tr-xl rounded-bl-xl"></div>
          <div className="h-9 w-9 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#27272A]"></div>
            <div className="h-5 w-12 bg-[#27272A] rounded"></div>
            <div className="h-2.5 w-20 bg-[#27272A] rounded"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <div className="p-3.5 bg-[#09090B] border-b border-[#27272A] flex justify-between">
          <div className="h-3 w-40 bg-[#27272A] rounded"></div>
          <div className="h-3 w-20 bg-[#27272A] rounded"></div>
        </div>
        <div className="divide-y divide-[#27272A]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 w-48">
                <div className="h-4 w-36 bg-[#27272A] rounded"></div>
                <div className="h-2.5 w-28 bg-[#27272A] rounded"></div>
              </div>
              <div className="h-4 w-32 bg-[#27272A] rounded"></div>
              <div className="h-5 w-24 bg-[#27272A] rounded-full"></div>
              <div className="h-5 w-16 bg-[#27272A] rounded-full"></div>
              <div className="h-7 w-24 bg-[#27272A] rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Admin Management Page Component ───────────────────────────────────── */

export function AdminManagementPage() {
  const { adminUser } = useAdminAuth();
  const rawRole = adminUser?.role as any;
  const roleSlug = typeof rawRole === "object" && rawRole !== null
    ? (rawRole.slug ?? rawRole.name ?? "super_admin")
    : (rawRole ?? "super_admin");
  const isSuperAdmin = (roleSlug || "").toLowerCase().includes("super");

  // Data states
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<any | null>(null);
  const [viewingAdmin, setViewingAdmin] = useState<any | null>(null);

  // Create Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password@123");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [adminStatus, setAdminStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Edit Form fields
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [creationResult, setCreationResult] = useState<CreatedAdminResult | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch Admins & Roles
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        usersApi.list({ limit: 100 }),
        rolesApi.list(),
      ]);

      if (rolesRes && rolesRes.success !== false) {
        const rData = rolesRes.data ?? (Array.isArray(rolesRes) ? rolesRes : []);
        setRolesList(rData);
        if (rData.length > 0) {
          setSelectedRoleId((prev) => {
            if (prev) return prev;
            const defaultAdminRole = rData.find((r: Role) => r.slug === "admin" || r.slug === "super_admin") || rData[0];
            return defaultAdminRole ? defaultAdminRole.id : rData[0].id;
          });
        }
      }

      if (usersRes && usersRes.success !== false) {
        const uData = usersRes.data ?? (Array.isArray(usersRes) ? usersRes : []);
        setAdminsList(uData);
      }
    } catch (err: any) {
      console.error("[Admin Fetch Error]:", err);
      setFeedback({ type: "error", text: "Failed to load staff administrators." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = adminsList.length;
    const active = adminsList.filter((a) => a.status === "ACTIVE").length;
    const twoFa = adminsList.filter((a) => a.isTwoFactorEnabled).length;
    const superAdmins = adminsList.filter((a) => {
      const r = (a.role?.slug || a.role?.name || a.role || "").toLowerCase();
      return r.includes("super");
    }).length;
    return { total, active, twoFa, superAdmins };
  }, [adminsList]);

  // Filtered List
  const filteredAdmins = useMemo(() => {
    return adminsList.filter((admin) => {
      const matchSearch =
        debouncedSearch === "" ||
        admin.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        `${admin.firstName} ${admin.lastName}`.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (admin.phone && admin.phone.includes(debouncedSearch));

      const matchStatus = statusFilter === "ALL" || admin.status === statusFilter;

      const adminRoleSlug = (admin.role?.slug || admin.role?.name || admin.role || "").toLowerCase();
      const matchRole =
        roleFilter === "ALL" ||
        (roleFilter === "SUPER_ADMIN" && adminRoleSlug.includes("super")) ||
        (roleFilter === "STORE_MANAGER" && (adminRoleSlug.includes("manager") || adminRoleSlug === "admin")) ||
        (roleFilter === "SUPPORT" && adminRoleSlug.includes("support"));

      return matchSearch && matchStatus && matchRole;
    });
  }, [adminsList, debouncedSearch, statusFilter, roleFilter]);

  // Create Staff Admin (Only Super Admin)
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setFeedback({ type: "error", text: "Only Super Administrators can provision staff accounts." });
      return;
    }

    if (!email || !firstName || !lastName || !selectedRoleId) {
      setFeedback({ type: "error", text: "Please fill in all mandatory fields." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await adminAuthService.createAdminUser({
        email,
        password,
        firstName,
        lastName,
        phone,
        roleId: selectedRoleId,
        status: adminStatus,
      });

      if (res && res.success !== false) {
        setCreationResult(res as any);
        setShowCreateModal(false);
        setFeedback({ type: "success", text: `Admin ${firstName} ${lastName} provisioned successfully with assigned role!` });
        // Reset form
        setEmail("");
        setFirstName("");
        setLastName("");
        setPhone("+91 ");
        setPassword("Password@123");
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to create administrator." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to create administrator." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Admin Handler
  const handleOpenEdit = (admin: any) => {
    setEditingAdmin(admin);
    setEditFirstName(admin.firstName || "");
    setEditLastName(admin.lastName || "");
    setEditPhone(admin.phone || "");
    setEditStatus(admin.status || "ACTIVE");
    const rId = admin.role?.id || admin.roleId || (rolesList[0]?.id ?? "");
    setEditRoleId(rId);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin || !isSuperAdmin) return;
    setIsSubmitting(true);
    try {
      const res = await usersApi.update(editingAdmin.id, {
        firstName: editFirstName,
        lastName: editLastName,
        phone: editPhone,
        status: editStatus,
        roleId: editRoleId,
      });

      if (res && res.success !== false) {
        setFeedback({ type: "success", text: "Admin credentials & assigned role updated successfully." });
        setEditingAdmin(null);
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.message || res.error?.message || "Failed to update admin." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update admin." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Permanent Delete Admin
  const handleConfirmDelete = async () => {
    if (!deletingAdmin || !isSuperAdmin) return;
    setIsSubmitting(true);
    try {
      const res = await usersApi.delete(deletingAdmin.id);
      if (res && res.success !== false) {
        setFeedback({ type: "success", text: `Administrator ${deletingAdmin.email} deleted permanently.` });
        setDeletingAdmin(null);
        setAdminsList((prev) => prev.filter((a) => a.id !== deletingAdmin.id));
      } else {
        setFeedback({ type: "error", text: res.message || res.error?.message || "Failed to delete administrator." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to delete administrator." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    if (adminsList.length === 0) return;
    const headers = ["ID", "Name", "Email", "Phone", "Role", "Status", "2FA Enforced", "Created At"];
    const rows = adminsList.map((a) => [
      `"${a.id}"`,
      `"${a.firstName || ""} ${a.lastName || ""}"`,
      `"${a.email || ""}"`,
      `"${a.phone || ""}"`,
      `"${a.role?.name || a.role?.slug || a.role || ""}"`,
      `"${a.status || ""}"`,
      `"${a.isTwoFactorEnabled ? "YES" : "NO"}"`,
      `"${a.createdAt ? new Date(a.createdAt).toISOString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PRC_Staff_Admins_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && adminsList.length === 0) {
    return <AdminManagementPageSkeleton />;
  }

  return (
    <div className="space-y-6 text-[#FAFAFA] max-w-[1600px] mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A855F7]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#FAFAFA]">
                Staff & Admin Access Governance
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                RBAC MATRIX
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Provision internal administrators, store managers, and operational staff with custom RBAC security roles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs px-4 py-2 rounded-tr-xl rounded-bl-xl transition-all shadow-sm flex items-center gap-2"
            >
              <UserPlus size={15} />
              <span>Provision Admin / Manager</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold flex items-center gap-1.5">
              <Lock size={12} />
              <span>Super Admin Required to Provision</span>
            </div>
          )}

          <AsyncActionButton
            mode="download"
            onAction={handleExportCSV}
            idleIcon={<Download size={14} />}
            idleLabel="Export CSV"
            loadingLabel="Exporting…"
            successLabel="Exported!"
            className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold text-xs px-3.5 py-2 rounded-tr-xl rounded-bl-xl transition-all border border-[#3F3F46] flex items-center gap-1.5 shadow-sm"
            variant="custom"
          />

          <button
            type="button"
            onClick={loadData}
            className="p-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-tr-lg rounded-bl-lg text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#3F3F46] transition-colors"
            title="Refresh Administrators"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-[#A855F7]" : ""} />
          </button>
        </div>
      </div>

      {/* Super Admin Privileges Callout Banner */}
      {isSuperAdmin && (
        <div className="p-3.5 bg-purple-950/20 border border-purple-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-[#A855F7]" />
            <span>
              <strong>Super Admin Authority:</strong> You have full authority to provision new administrators, store managers, and assign standard or custom security roles.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="text-[11px] font-bold text-[#A855F7] hover:text-purple-300 underline"
          >
            + Provision New Staff Account
          </button>
        </div>
      )}

      {/* ─── 4 Interactive KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => { setRoleFilter("ALL"); setStatusFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            roleFilter === "ALL" && statusFilter === "ALL"
              ? "border-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/10 ring-1 ring-[#8B5CF6]"
              : "border-[#27272A] hover:border-[#3F3F46]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider">Total Staff</span>
            <Users size={14} className="text-[#A1A1AA] group-hover:text-[#FAFAFA]" />
          </div>
          <p className="text-xl font-black font-mono text-[#FAFAFA]">{metrics.total}</p>
          <span className="text-[10px] text-[#71717A] block">Configured staff accounts</span>
        </button>

        <button
          type="button"
          onClick={() => { setRoleFilter("ALL"); setStatusFilter("ACTIVE"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            statusFilter === "ACTIVE"
              ? "border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
              : "border-[#27272A] hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Active Access</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-400">{metrics.active}</p>
          <span className="text-[10px] text-[#71717A] block">Operational logins</span>
        </button>

        <button
          type="button"
          onClick={() => { setRoleFilter("ALL"); setStatusFilter("ALL"); }}
          className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] transition-all text-left space-y-1 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">2FA Protected</span>
            <Lock size={14} className="text-cyan-400" />
          </div>
          <p className="text-xl font-black font-mono text-cyan-400">{metrics.twoFa}</p>
          <span className="text-[10px] text-[#71717A] block">TOTP hardware key</span>
        </button>

        <button
          type="button"
          onClick={() => { setRoleFilter("SUPER_ADMIN"); setStatusFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            roleFilter === "SUPER_ADMIN"
              ? "border-purple-500 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500"
              : "border-[#27272A] hover:border-purple-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">Super Admins</span>
            <Crown size={14} className="text-[#A855F7]" />
          </div>
          <p className="text-xl font-black font-mono text-[#A855F7]">{metrics.superAdmins}</p>
          <span className="text-[10px] text-[#71717A] block">Root master privileges</span>
        </button>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/80 border-rose-500/40 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 2FA Provisioning Success Card */}
      {creationResult && (
        <div className="p-5 rounded-2xl bg-[#18181B] border border-purple-500/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
            <div className="flex items-center gap-2 text-[#A855F7] font-bold text-sm">
              <QrCode size={18} />
              <span>Admin Account Provisioned & 2FA Secret Key</span>
            </div>
            <button
              type="button"
              onClick={() => setCreationResult(null)}
              className="text-[#71717A] hover:text-[#FAFAFA]"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Please share these initial credentials with the newly created administrator (<strong>{creationResult.user?.email || "Account"}</strong>).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {creationResult.twoFactorSetup?.qrCodeUrl && (
              <div className="p-3 bg-white rounded-xl flex items-center justify-center w-48 h-48 mx-auto">
                <img
                  src={creationResult.twoFactorSetup.qrCodeUrl}
                  alt="2FA QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-[#09090B] rounded-lg border border-[#27272A] space-y-1">
                <span className="text-[10px] text-[#71717A] uppercase font-bold">2FA Manual Setup Key</span>
                <p className="font-mono text-purple-300 font-bold break-all">
                  {creationResult.twoFactorSetup?.secret || "Configured"}
                </p>
              </div>
              <div className="p-2.5 bg-[#09090B] rounded-lg border border-[#27272A] space-y-1">
                <span className="text-[10px] text-[#71717A] uppercase font-bold">Initial Password</span>
                <p className="font-mono text-[#FAFAFA] font-bold">{password}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Search & Filter Toolbar ─── */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 bg-[#09090B] p-1 rounded-xl border border-[#27272A]">
            {[
              { id: "ALL", label: "All Roles" },
              { id: "SUPER_ADMIN", label: "Super Admins" },
              { id: "STORE_MANAGER", label: "Store Managers" },
              { id: "SUPPORT", label: "Support Staff" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  roleFilter === tab.id
                    ? "bg-[#8B5CF6] text-white shadow"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {["ALL", "ACTIVE", "INACTIVE"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  statusFilter === st
                    ? "border-[#8B5CF6] text-purple-300 bg-purple-950/40"
                    : "border-[#27272A] text-[#71717A] hover:text-[#FAFAFA]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Admin Name, Email, Phone, or Assigned Role..."
            className="w-full pl-10 pr-9 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Admin Table ─── */}
      <div className="rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Administrator</th>
                <th className="py-3.5 px-4">Role & Assigned Privilege</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">2FA Security</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#71717A]">
                    <ShieldCheck size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                    No administrators found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const roleName = admin.role?.name || admin.role?.slug || admin.role || "Admin";
                  const isRootSuper = (admin.role?.slug || admin.role?.name || admin.role || "").toLowerCase().includes("super");
                  const isCustomRole = admin.role && admin.role.isSystem === false;

                  return (
                    <tr key={admin.id} className="hover:bg-[#27272A]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#FAFAFA]">
                          {admin.firstName} {admin.lastName}
                        </p>
                        <div className="flex flex-col text-[11px] text-[#A1A1AA] space-y-0.5 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail size={11} className="text-[#71717A]" />
                            {admin.email}
                          </span>
                          {admin.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone size={11} className="text-[#71717A]" />
                              {admin.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                              isRootSuper
                                ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                                : isCustomRole
                                ? "bg-purple-950/80 text-[#A855F7] border border-purple-500/40"
                                : "bg-blue-950/80 text-blue-400 border border-blue-500/40"
                            }`}
                          >
                            {roleName}
                          </span>
                          {isCustomRole && (
                            <span className="text-[9px] font-black text-purple-400 font-mono">
                              [CUSTOM]
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            admin.status === "ACTIVE"
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {admin.status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {admin.isTwoFactorEnabled ? (
                          <span className="text-[10px] font-bold text-cyan-400 flex items-center justify-center gap-1">
                            <Lock size={12} />
                            <span>Enforced</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#71717A]">Optional</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingAdmin(admin)}
                            className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-lg transition-colors"
                            title="Inspect Details"
                          >
                            <Eye size={13} />
                          </button>
                          {isSuperAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(admin)}
                                className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-amber-400 rounded-lg transition-colors"
                                title="Edit Role & Details"
                              >
                                <Edit2 size={13} />
                              </button>
                              {!isRootSuper && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingAdmin(admin)}
                                  className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 rounded-lg transition-colors"
                                  title="Permanently Delete Admin"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL 1: CREATE ADMIN / MANAGER MODAL (Super Admin Only) ─── */}
      {showCreateModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <Crown size={16} className="text-amber-400" />
                <span>Provision Staff Admin / Manager</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Ramesh"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Corporate Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh.sharma@prchardware.com"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold flex items-center justify-between">
                    <span>Assign Custom / Standard Role *</span>
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {!r.isSystem ? "— [Custom Role]" : `— [${r.slug}]`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Initial Temporary Password</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl text-[11px] text-purple-200">
                👑 <strong>Super Admin Guarantee:</strong> This user will receive internal dashboard access governed by the selected role's granular permission matrix.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl font-bold shadow"
                >
                  {isSubmitting ? "Provisioning..." : "Provision Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT ADMIN & REASSIGN ROLE MODAL ─── */}
      {editingAdmin && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <Edit2 size={16} className="text-amber-400" />
                <span>Edit Staff Member & Reassign Role</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">First Name</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Last Name</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Assigned Role (Custom or Standard)</label>
                  <select
                    value={editRoleId}
                    onChange={(e) => setEditRoleId(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {!r.isSystem ? "— [Custom Role]" : `— [${r.slug}]`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Access Status</label>
                <div className="flex gap-2">
                  {["ACTIVE", "INACTIVE"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st as any)}
                      className={`px-4 py-2 rounded-xl font-bold transition-all ${
                        editStatus === st
                          ? "bg-[#8B5CF6] text-white"
                          : "bg-[#09090B] text-[#A1A1AA] border border-[#27272A]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl font-bold shadow"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DELETE ADMIN MODAL ─── */}
      {deletingAdmin && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-sm text-[#FAFAFA]">Delete Administrator Permanently?</h3>
            <p className="text-xs text-[#A1A1AA]">
              Are you sure you want to permanently delete <strong>{deletingAdmin.firstName} {deletingAdmin.lastName}</strong> ({deletingAdmin.email}) from the database? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs text-[#FAFAFA] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow"
              >
                {isSubmitting ? "Deleting..." : "Yes, Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DRAWER: INSPECT ADMIN ─── */}
      {viewingAdmin && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border-l border-[#27272A] w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">
                    Staff Identity
                  </span>
                  <h2 className="text-lg font-bold text-[#FAFAFA]">
                    {viewingAdmin.firstName} {viewingAdmin.lastName}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingAdmin(null)}
                  className="p-1.5 rounded-lg bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Corporate Email</span>
                  <p className="font-bold text-[#FAFAFA] break-all">{viewingAdmin.email}</p>
                </div>

                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Contact Phone</span>
                  <p className="font-bold text-[#FAFAFA] font-mono">{viewingAdmin.phone || "Not specified"}</p>
                </div>

                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Assigned Security Role</span>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-purple-400">
                      {viewingAdmin.role?.name || viewingAdmin.role?.slug || viewingAdmin.role || "Admin"}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-[#A855F7] font-mono">
                      {viewingAdmin.role?.isSystem === false ? "CUSTOM ROLE" : "SYSTEM ROLE"}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Account Access Status</span>
                  <p className={`font-bold ${viewingAdmin.status === "ACTIVE" ? "text-emerald-400" : "text-zinc-400"}`}>
                    {viewingAdmin.status || "ACTIVE"}
                  </p>
                </div>

                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Two-Factor Authentication</span>
                  <p className="font-bold text-cyan-400">
                    {viewingAdmin.isTwoFactorEnabled ? "Enforced & Active (TOTP)" : "Optional / Standard"}
                  </p>
                </div>

                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Created On Database</span>
                  <p className="font-mono text-[#A1A1AA]">
                    {viewingAdmin.createdAt ? new Date(viewingAdmin.createdAt).toLocaleString() : "System Managed"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#27272A] pt-4 mt-6 space-y-2">
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingAdmin;
                    setViewingAdmin(null);
                    handleOpenEdit(target);
                  }}
                  className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow"
                >
                  Edit Role & Account Settings
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
                className="w-full py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs text-[#FAFAFA] font-bold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
