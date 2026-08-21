import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Save,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Building2,
  Receipt,
  Sparkles,
  Coins,
  ArrowUpRight,
  Copy,
  Check,
  KeyRound,
  Download,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { usersApi, rolesApi } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Role } from "../types/admin";
import { useDebounce } from "../hooks/useDebounce";
import { getCachedRoles } from "../utils/referenceDataCache";
import { AsyncActionButton } from "../components/common/AsyncActionButton";

/* ─── Skeleton Loading Body for Users Page ───────────────────────────────────── */

export function UsersPageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#27272A]"></div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-60 bg-[#27272A] rounded"></div>
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

      {/* Filter Tabs & Search Skeleton */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-24 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
          ))}
        </div>
        <div className="h-8 w-64 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
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
              <div className="space-y-1.5 w-40">
                <div className="h-4 w-32 bg-[#27272A] rounded"></div>
                <div className="h-2.5 w-20 bg-[#27272A] rounded"></div>
              </div>
              <div className="h-5 w-24 bg-[#27272A] rounded-full"></div>
              <div className="h-5 w-16 bg-[#27272A] rounded-full"></div>
              <div className="h-7 w-32 bg-[#27272A] rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Users Page Component ──────────────────────────────────────────────── */

interface UsersPageProps {
  onNavigateB2BPricing?: (customerId?: string) => void;
}

export function UsersPage({ onNavigateB2BPricing }: UsersPageProps) {
  const { adminUser } = useAdminAuth();
  const rawRole = adminUser?.role as any;
  const roleSlug = typeof rawRole === "object" && rawRole !== null
    ? (rawRole.slug ?? rawRole.name ?? "super_admin")
    : (rawRole ?? "super_admin");
  const isSuperAdmin = roleSlug === "super_admin";

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [accountFilter, setAccountFilter] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [viewingUser, setViewingUser] = useState<any | null>(null);

  // Create Form State
  const [accountType, setAccountType] = useState<"B2C" | "B2B">("B2C");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password@123");
  const [phone, setPhone] = useState("+91 ");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [roleId, setRoleId] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Edit Form State
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editGstin, setEditGstin] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED">("ACTIVE");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const isCustomerRole = (role?: any): boolean => {
    if (!role) return true;
    const slug = (typeof role === "object" && role !== null ? role.slug ?? role.name : role) || "";
    const clean = String(slug).toLowerCase().replace(/_/g, "-").trim();
    return ["customer", "b2b-customer", "b2b-buyer", "b2b_customer", "b2b_buyer", "user", "retail-customer", "client"].includes(clean);
  };

  const isStaffOrAdmin = (user: any): boolean => {
    if (!user) return false;
    const role = user.role;
    if (!role) return false;
    const slug = (typeof role === "object" && role !== null ? role.slug ?? role.name : role) || "";
    const clean = String(slug).toLowerCase().replace(/_/g, "-").trim();
    if ([
      "super-admin", "super_admin", "admin", "staff", "manager", "support",
      "operations", "sales", "accountant", "inventory-manager", "inventory_manager",
      "custom-staff"
    ].includes(clean)) {
      return true;
    }
    return !isCustomerRole(role);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [uRes, rList] = await Promise.all([
        usersApi.list({
          page,
          limit,
          search: debouncedSearch.trim() || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          type: "customer",
        }),
        getCachedRoles(),
      ]);

      if (rList && rList.length > 0) {
        // Only customer/B2B roles can be assigned in UsersPage
        const customerRoles = rList.filter((r: Role) => isCustomerRole(r));
        const availableRoles = customerRoles.length > 0 ? customerRoles : rList;
        setRoles(availableRoles);
        setRoleId((prev) => {
          if (prev && availableRoles.some((r: Role) => r.id === prev)) return prev;
          const custRole = availableRoles.find((r: Role) => r.slug === "customer") || availableRoles[0];
          return custRole ? custRole.id : availableRoles[0].id;
        });
      }

      if (uRes && uRes.success !== false) {
        const uData = uRes.data ?? (Array.isArray(uRes) ? uRes : []);
        const items = Array.isArray(uData) ? uData : uData.items || uData.users || [];
        const meta = uData.meta || uRes.meta || {};
        // Extra client-side guard: filter out any admin/staff accounts
        const customerAccounts = items.filter((u: any) => !isStaffOrAdmin(u));
        setUsers(customerAccounts);
        setTotalCount(customerAccounts.length);
        setTotalPages(Math.max(1, Math.ceil(customerAccounts.length / limit)));
      }
    } catch (err: any) {
      console.error("[Users Fetch Error]:", err);
      setFeedback({ type: "error", text: "Failed to load registered accounts." });
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = totalCount || users.length;
    const b2b = users.filter((u) => u.companyName || u.gstin || u.role?.slug === "b2b_buyer").length;
    const b2c = users.filter((u) => !u.companyName && !u.gstin).length;
    const inactive = users.filter((u) => u.status === "INACTIVE" || u.status === "SUSPENDED").length;
    return { total, b2b, b2c, inactive };
  }, [users, totalCount]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const isB2B = Boolean(user.companyName || user.gstin || user.role?.slug === "b2b_buyer");
      if (accountFilter === "B2B" && !isB2B) return false;
      if (accountFilter === "B2C" && isB2B) return false;
      return true;
    });
  }, [users, accountFilter]);

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      setFeedback({ type: "error", text: "Please fill in all mandatory fields." });
      return;
    }

    // Resolve proper customer / B2B role
    let effectiveRoleId = roleId;
    if (accountType === "B2B") {
      const b2bRole =
        roles.find((r) => ["b2b-customer", "b2b_customer", "b2b-buyer", "b2b_buyer"].includes(r.slug?.toLowerCase())) ||
        roles.find((r) => r.slug === "customer") ||
        roles[0];
      if (b2bRole) effectiveRoleId = b2bRole.id;
    } else {
      const custRole = roles.find((r) => ["customer", "user"].includes(r.slug?.toLowerCase())) || roles[0];
      if (custRole) effectiveRoleId = custRole.id;
    }

    if (!effectiveRoleId) {
      setFeedback({ type: "error", text: "No valid customer role configured in the system." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await usersApi.create({
        firstName,
        lastName,
        email,
        password,
        phone,
        companyName: accountType === "B2B" ? companyName : undefined,
        gstin: accountType === "B2B" ? gstin : undefined,
        roleId: effectiveRoleId,
        status,
      });

      if (res && res.success !== false) {
        setFeedback({ type: "success", text: `Account for ${firstName} ${lastName} created successfully.` });
        setShowCreateModal(false);
        setFirstName("");
        setLastName("");
        setEmail("");
        setCompanyName("");
        setGstin("");
        setPhone("+91 ");
        setPassword("Password@123");
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.message || res.error?.message || "Failed to create user account." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to create user account." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit User
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditFirstName(user.firstName || "");
    setEditLastName(user.lastName || "");
    setEditPhone(user.phone || "");
    setEditCompanyName(user.companyName || "");
    setEditGstin(user.gstin || "");
    setEditStatus(user.status || "ACTIVE");
    const rId = user.role?.id || user.roleId || (roles[0]?.id ?? "");
    setEditRoleId(rId);
  };

  // Save Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const res = await usersApi.update(editingUser.id, {
        firstName: editFirstName,
        lastName: editLastName,
        phone: editPhone,
        companyName: editCompanyName || undefined,
        gstin: editGstin || undefined,
        status: editStatus,
        roleId: editRoleId,
      });

      if (res && res.success !== false) {
        setFeedback({ type: "success", text: "User profile updated successfully." });
        setEditingUser(null);
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.message || res.error?.message || "Failed to update user." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update user." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Permanent Delete User
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      const res = await usersApi.delete(deletingUser.id);
      if (res && res.success !== false) {
        setFeedback({ type: "success", text: `Account ${deletingUser.email} deleted permanently from database.` });
        setDeletingUser(null);
        setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      } else {
        setFeedback({ type: "error", text: res.message || res.error?.message || "Failed to delete user." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to delete user." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    if (users.length === 0) return;
    const headers = ["ID", "Name", "Email", "Phone", "Company", "GSTIN", "Role", "Status", "Created At"];
    const rows = users.map((u) => [
      `"${u.id}"`,
      `"${u.firstName || ""} ${u.lastName || ""}"`,
      `"${u.email || ""}"`,
      `"${u.phone || ""}"`,
      `"${u.companyName || ""}"`,
      `"${u.gstin || ""}"`,
      `"${u.role?.name || u.role?.slug || u.role || ""}"`,
      `"${u.status || ""}"`,
      `"${u.createdAt ? new Date(u.createdAt).toISOString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PRC_Accounts_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && users.length === 0) {
    return <UsersPageSkeleton />;
  }

  return (
    <div className="space-y-6 text-[#FAFAFA] max-w-[1600px] mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A855F7]">
            <Users size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#FAFAFA]">
                Customer & B2B Buyer Accounts Hub
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                CENTRAL DIRECTORY
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Manage retail buyers, wholesale contractors, architectural firms, GSTIN registrations, and custom B2B rate cards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs px-4 py-2 rounded-tr-xl rounded-bl-xl transition-all shadow-sm flex items-center gap-2"
          >
            <UserPlus size={15} />
            <span>Create New Account</span>
          </button>

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
            title="Refresh Directory"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-[#A855F7]" : ""} />
          </button>
        </div>
      </div>

      {/* ─── 4 Interactive KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => { setAccountFilter("ALL"); setStatusFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            accountFilter === "ALL" && statusFilter === "ALL"
              ? "border-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/10 ring-1 ring-[#8B5CF6]"
              : "border-[#27272A] hover:border-[#3F3F46]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider">Total Accounts</span>
            <Users size={14} className="text-[#A1A1AA] group-hover:text-[#FAFAFA]" />
          </div>
          <p className="text-xl font-black font-mono text-[#FAFAFA]">{metrics.total}</p>
          <span className="text-[10px] text-[#71717A] block">All customer profiles</span>
        </button>

        <button
          type="button"
          onClick={() => { setAccountFilter("B2B"); setStatusFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            accountFilter === "B2B"
              ? "border-purple-500 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500"
              : "border-[#27272A] hover:border-purple-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">B2B Enterprises</span>
            <Building2 size={14} className="text-[#A855F7]" />
          </div>
          <p className="text-xl font-black font-mono text-[#A855F7]">{metrics.b2b}</p>
          <span className="text-[10px] text-[#71717A] block">Corporate & GSTIN accounts</span>
        </button>

        <button
          type="button"
          onClick={() => { setAccountFilter("B2C"); setStatusFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            accountFilter === "B2C"
              ? "border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
              : "border-[#27272A] hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Retail Consumers</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-400">{metrics.b2c}</p>
          <span className="text-[10px] text-[#71717A] block">Direct individual buyers</span>
        </button>

        <button
          type="button"
          onClick={() => { setAccountFilter("ALL"); setStatusFilter("INACTIVE"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            statusFilter === "INACTIVE"
              ? "border-rose-500 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500"
              : "border-[#27272A] hover:border-rose-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Suspended / Inactive</span>
            <AlertCircle size={14} className="text-rose-400" />
          </div>
          <p className="text-xl font-black font-mono text-rose-400">{metrics.inactive}</p>
          <span className="text-[10px] text-[#71717A] block">Restricted logins</span>
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

      {/* ─── Search & Filter Toolbar ─── */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 bg-[#09090B] p-1 rounded-xl border border-[#27272A]">
            {[
              { id: "ALL", label: "All Accounts" },
              { id: "B2B", label: "B2B Enterprises" },
              { id: "B2C", label: "Retail Consumers" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAccountFilter(tab.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  accountFilter === tab.id
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
            placeholder="Search by Customer Name, Email, Phone, Company Name, or GSTIN..."
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

      {/* ─── Main Users Table ─── */}
      <div className="rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Customer Name & Contact</th>
                <th className="py-3.5 px-4">Organization & GSTIN</th>
                <th className="py-3.5 px-4">Role Tier</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#71717A]">
                    <Users size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                    No customer accounts found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isB2B = Boolean(user.companyName || user.gstin || user.role?.slug === "b2b_buyer");

                  return (
                    <tr key={user.id} className="hover:bg-[#27272A]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#FAFAFA]">
                          {user.firstName} {user.lastName}
                        </p>
                        <div className="flex flex-col text-[11px] text-[#A1A1AA] space-y-0.5 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail size={11} className="text-[#71717A]" />
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone size={11} className="text-[#71717A]" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isB2B ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-[#A855F7] flex items-center gap-1">
                              <Building2 size={12} />
                              {user.companyName || "B2B Enterprise"}
                            </p>
                            {user.gstin && (
                              <span className="text-[10px] font-mono text-[#A1A1AA] bg-[#09090B] px-1.5 py-0.5 rounded border border-[#27272A]">
                                GST: {user.gstin}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#71717A] text-[11px]">Retail Consumer</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            isB2B
                              ? "bg-purple-950/80 text-[#A855F7] border border-purple-500/40"
                              : "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                          }`}
                        >
                          {user.role?.name || (isB2B ? "B2B Buyer" : "Customer")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            user.status === "ACTIVE"
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {user.status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isB2B && onNavigateB2BPricing && (
                            <button
                              type="button"
                              onClick={() => onNavigateB2BPricing(user.id)}
                              className="px-2.5 py-1.5 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 text-purple-300 border border-purple-500/40 rounded-lg font-bold flex items-center gap-1 transition-colors text-xs"
                              title="Configure B2B Custom Matrix Rates"
                            >
                              <Coins size={12} />
                              <span>B2B Rates</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setViewingUser(user)}
                            className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-lg transition-colors"
                            title="Inspect Profile"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-amber-400 rounded-lg transition-colors"
                            title="Edit Account"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 rounded-lg transition-colors"
                            title="Permanently Delete Account"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-[#A1A1AA]">
            Showing page <strong className="text-[#FAFAFA]">{page}</strong> of <strong className="text-[#FAFAFA]">{totalPages}</strong> ({totalCount} total accounts)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-40 disabled:cursor-not-allowed border border-[#27272A] rounded-lg text-[#FAFAFA] font-bold"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-40 disabled:cursor-not-allowed border border-[#27272A] rounded-lg text-[#FAFAFA] font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: CREATE USER MODAL ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <UserPlus size={16} className="text-[#8B5CF6]" />
                <span>Provision Customer / B2B Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              {/* Account Type Toggle */}
              <div className="flex gap-2 p-1 bg-[#09090B] rounded-xl border border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setAccountType("B2C")}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    accountType === "B2C" ? "bg-[#8B5CF6] text-white" : "text-[#A1A1AA]"
                  }`}
                >
                  Retail Consumer (B2C)
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("B2B")}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    accountType === "B2B" ? "bg-[#8B5CF6] text-white" : "text-[#A1A1AA]"
                  }`}
                >
                  B2B Corporate Enterprise
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Anand"
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
                    placeholder="e.g. Singhania"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anand@singhaniaprojects.in"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {accountType === "B2B" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#A1A1AA] font-semibold">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Singhania Infrastructure Pvt Ltd"
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#A1A1AA] font-semibold">GSTIN (15 Digits)</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="27AABCU9603R1ZM"
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 font-mono text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>
              )}

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
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Initial Password</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 font-mono text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
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
                  {isSubmitting ? "Provisioning..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT USER MODAL ─── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <Edit2 size={16} className="text-amber-400" />
                <span>Edit Customer Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
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
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Company Name</label>
                  <input
                    type="text"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editGstin}
                    onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 font-mono text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
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
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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

      {/* ─── MODAL 3: DELETE USER MODAL ─── */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-sm text-[#FAFAFA]">Delete Account Permanently?</h3>
            <p className="text-xs text-[#A1A1AA]">
              Are you sure you want to permanently delete account <strong>{deletingUser.firstName} {deletingUser.lastName}</strong> ({deletingUser.email}) from the database? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
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

      {/* ─── DRAWER: INSPECT USER ─── */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border-l border-[#27272A] w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">
                    Profile Directory
                  </span>
                  <h2 className="text-lg font-bold text-[#FAFAFA]">
                    {viewingUser.firstName} {viewingUser.lastName}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingUser(null)}
                  className="p-1.5 rounded-lg bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Email Address</span>
                  <p className="font-bold text-[#FAFAFA] break-all">{viewingUser.email}</p>
                </div>

                {viewingUser.companyName && (
                  <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Enterprise Organization</span>
                    <p className="font-bold text-purple-400">{viewingUser.companyName}</p>
                  </div>
                )}

                {viewingUser.gstin && (
                  <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">GSTIN Registration</span>
                    <p className="font-mono font-bold text-[#FAFAFA]">{viewingUser.gstin}</p>
                  </div>
                )}

                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Account Tier</span>
                  <p className="font-bold text-[#FAFAFA]">
                    {viewingUser.role?.name || "Standard Customer"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#27272A] pt-4 mt-6">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="w-full py-2.5 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs text-[#FAFAFA] font-bold"
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
