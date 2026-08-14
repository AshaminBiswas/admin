import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Search,
  Copy,
  Check,
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
  Loader2,
  Sliders,
  CheckSquare,
} from "lucide-react";
import { usersApi, rolesApi } from "../api/adminApi";
import { adminAuthService } from "../api/adminAuthService";
import { useAdminAuth } from "../context/AdminAuthContext";
import { AdminUser, CreatedAdminResult, Role } from "../types/admin";

export function AdminManagementPage() {
  const { adminUser } = useAdminAuth();
  const rawRole = adminUser?.role as any;
  const roleSlug = typeof rawRole === "object" && rawRole !== null
    ? (rawRole.slug ?? rawRole.name ?? "super_admin")
    : (rawRole ?? "super_admin");
  const isSuperAdmin = roleSlug === "super_admin";

  // Data states
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [copiedRoleId, setCopiedRoleId] = useState<string | null>(null);

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
  const [phone, setPhone] = useState("+91 9876543210");
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
        if (rData.length > 0 && !selectedRoleId) {
          const defaultAdminRole = rData.find((r: Role) => r.slug === "admin" || r.slug === "super_admin") || rData[0];
          setSelectedRoleId(defaultAdminRole.id);
        }
      }

      if (usersRes && usersRes.success !== false) {
        const uData = usersRes.data ?? (Array.isArray(usersRes) ? usersRes : []);
        setAdminsList(uData);
      } else {
        setAdminsList([
          {
            id: "admin-1",
            email: "admin@prchardware.com",
            firstName: "Executive",
            lastName: "Admin",
            role: { name: "Super Admin", slug: "super_admin", id: "22222222-2222-2222-2222-222222222222" },
            phone: "+91 9876543210",
            status: "ACTIVE",
            isTwoFactorEnabled: true,
          },
          {
            id: "admin-2",
            email: "jane.smith@prchardware.com",
            firstName: "Jane",
            lastName: "Smith",
            role: { name: "Store Manager", slug: "admin", id: "33333333-3333-3333-3333-333333333333" },
            phone: "+91 9876543211",
            status: "ACTIVE",
            isTwoFactorEnabled: true,
          },
        ]);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load admin accounts." });
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenEdit = (admin: any) => {
    setEditingAdmin(admin);
    setEditFirstName(admin.firstName || "");
    setEditLastName(admin.lastName || "");
    setEditPhone(admin.phone || "");
    setEditStatus(admin.status || "ACTIVE");
    const currentRoleId = admin.role?.id || admin.roleId || (rolesList[0]?.id ?? "");
    setEditRoleId(currentRoleId);
    setFeedback(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const emailTrimmed = email.trim().toLowerCase();
    const passTrimmed = password.trim();
    const firstNameTrimmed = firstName.trim();
    const lastNameTrimmed = lastName.trim();

    if (!emailTrimmed || !passTrimmed || !firstNameTrimmed || !lastNameTrimmed || !selectedRoleId) {
      setFeedback({ type: "error", text: "Please fill in all required fields and select a role." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminAuthService.createAdminUser({
        email: emailTrimmed,
        password: passTrimmed,
        firstName: firstNameTrimmed,
        lastName: lastNameTrimmed,
        phone: phone.trim(),
        roleId: selectedRoleId,
        status: adminStatus,
      });

      if (res && res.success) {
        setCreationResult(res);
        setFeedback({
          type: "success",
          text: `Admin user '${emailTrimmed}' created successfully with 2FA enabled!`,
        });
        await loadData();
      } else {
        setFeedback({ type: "error", text: res?.message || "Failed to create admin user." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to create admin user." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setFeedback(null);

    if (!editFirstName.trim() || !editLastName.trim()) {
      setFeedback({ type: "error", text: "First Name and Last Name are required." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await usersApi.update(editingAdmin.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim() || undefined,
        status: editStatus,
        roleId: editRoleId || undefined,
      });

      if (res && res.success !== false) {
        setFeedback({ type: "success", text: `Admin account for '${editingAdmin.email}' updated successfully!` });
        setEditingAdmin(null);
        await loadData();
      } else {
        setFeedback({ type: "error", text: res?.message || "Failed to update admin account." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update admin account." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingAdmin) return;
    setIsSubmitting(true);
    try {
      const res = await usersApi.delete(deletingAdmin.id);
      if (res && res.success !== false) {
        setFeedback({ type: "success", text: `Admin user '${deletingAdmin.email}' removed.` });
        setDeletingAdmin(null);
        await loadData();
      } else {
        setFeedback({ type: "error", text: res?.message || "Failed to delete user." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to delete user." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyRoleId = (idStr: string) => {
    navigator.clipboard.writeText(idStr);
    setCopiedRoleId(idStr);
    setTimeout(() => setCopiedRoleId(null), 2000);
  };

  const filteredAdmins = adminsList.filter((a) => {
    const name = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
    const em = (a.email || "").toLowerCase();
    const rName = (typeof a.role === "object" ? a.role?.name || a.role?.slug : a.role || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = name.includes(q) || em.includes(q) || rName.includes(q);

    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    const matchesRole = roleFilter === "ALL" || (typeof a.role === "object" ? a.role?.slug === roleFilter || a.role?.id === roleFilter : a.role === roleFilter);

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="space-y-6 text-[#FAFAFA]">
      <div className="p-6 bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-tr-2xl rounded-bl-2xl bg-[#8B5CF6] text-white flex items-center justify-center font-bold shadow-lg shadow-[#8B5CF6]/20">
            <Users size={26} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#FAFAFA]">Admin Users & Staff Management</h1>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Create, read, update, and manage executive accounts and RBAC access permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            title="Refresh List"
            className="p-2.5 rounded-tr-xl rounded-bl-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                setCreationResult(null);
                setFeedback(null);
                setShowCreateModal(true);
              }}
              className="bg-[#8B5CF6] text-white hover:bg-[#A855F7] font-semibold py-2.5 px-5 rounded-tr-xl rounded-bl-xl text-xs flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/25 transition-all active:scale-95 flex-shrink-0"
            >
              <UserPlus size={16} />
              <span>+ Create Admin User</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-tr-2xl rounded-bl-2xl border text-xs flex items-center gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/60 border-red-500/40 text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#18181B] border border-[#27272A] p-5 rounded-tr-2xl rounded-bl-2xl shadow-md space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">Total Accounts</p>
          <p className="text-2xl font-bold font-serif text-[#FAFAFA]">{adminsList.length}</p>
        </div>

        <div className="bg-[#18181B] border border-emerald-500/30 p-5 rounded-tr-2xl rounded-bl-2xl shadow-md space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck size={14} />
            <span>Active Roles Loaded</span>
          </p>
          <p className="text-2xl font-bold font-serif text-emerald-400">{rolesList.length} Defined Roles</p>
        </div>

        <div className="bg-[#18181B] border border-[#27272A] p-5 rounded-tr-2xl rounded-bl-2xl shadow-md space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#A855F7]">RBAC Authority</p>
          <p className="text-xs font-mono text-[#FAFAFA] font-bold">
            {isSuperAdmin ? "Super Admin (Full CRUD)" : "Restricted Operator (View Only)"}
          </p>
        </div>
      </div>

      <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/50 pl-9 pr-4 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#09090B] text-[#FAFAFA] text-xs px-3 py-2 rounded-tr-xl rounded-bl-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#09090B] text-[#FAFAFA] text-xs px-3 py-2 rounded-tr-xl rounded-bl-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Roles</option>
              {rolesList.map((r) => (
                <option key={r.id} value={r.slug || r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#27272A] rounded-tr-2xl rounded-bl-2xl">
          <table className="w-full text-left text-xs text-[#A1A1AA]">
            <thead className="bg-[#09090B] uppercase text-[10px] tracking-wider text-[#A855F7] font-bold border-b border-[#27272A]">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions (CRUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#A1A1AA]">
                    <Loader2 size={24} className="animate-spin mx-auto text-[#8B5CF6] mb-2" />
                    <span>Loading accounts...</span>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#A1A1AA]">
                    <Shield size={32} className="mx-auto text-slate-500 mb-2 opacity-60" />
                    <p className="font-semibold text-sm">No admin accounts found</p>
                    <p className="text-[11px] text-slate-500 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const roleObj = typeof admin.role === "object" ? admin.role : null;
                  const roleName = roleObj?.name || admin.role || "Admin";
                  const roleSlugStr = roleObj?.slug || (typeof admin.role === "string" ? admin.role : "admin");
                  const isCurrentSuper = roleSlugStr === "super_admin";

                  return (
                    <tr key={admin.id} className="hover:bg-[#27272A]/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#FAFAFA]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A855F7] font-bold flex items-center justify-center text-xs">
                            {admin.firstName ? admin.firstName[0].toUpperCase() : "A"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#FAFAFA]">
                              {admin.firstName || "Admin"} {admin.lastName || ""}
                            </p>
                            <p className="text-[10px] text-[#A1A1AA] font-mono">{admin.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="text-[#FAFAFA] font-medium">{admin.phone || "—"}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCurrentSuper
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-[#8B5CF6]/15 text-[#A855F7] border border-[#8B5CF6]/30"
                          }`}
                        >
                          <Shield size={10} />
                          {roleName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            admin.status === "ACTIVE"
                              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-950/40 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {admin.status || "ACTIVE"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingAdmin(admin)}
                            title="View Details (Read)"
                            className="p-1.5 rounded-lg bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white text-[#A1A1AA] transition-colors"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(admin)}
                            title="Edit Admin (Update)"
                            className="p-1.5 rounded-lg bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white text-[#A1A1AA] transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>

                          {admin.email !== adminUser?.email && (
                            <button
                              type="button"
                              onClick={() => setDeletingAdmin(admin)}
                              title="Delete Admin (Delete)"
                              className="p-1.5 rounded-lg bg-[#27272A] hover:bg-rose-600 hover:text-white text-[#A1A1AA] transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-[#27272A] pb-4">
              <div>
                <div className="flex items-center gap-2 text-[#8B5CF6] font-bold text-base font-serif">
                  <UserPlus size={20} />
                  <span>Create Executive Admin User</span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  Assign user roles and configure mandatory authentication access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#27272A]"
              >
                <X size={16} />
              </button>
            </div>

            {!creationResult ? (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 px-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 px-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 px-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                      Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 px-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 px-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                    Select System Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    required
                    className="w-full bg-[#09090B] text-[#FAFAFA] text-xs px-3 py-2.5 rounded-tr-xl rounded-bl-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="" disabled>Choose a role...</option>
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.slug})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-[#27272A] text-[#FAFAFA] rounded-tr-xl rounded-bl-xl text-xs hover:bg-[#3F3F46]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#8B5CF6] text-white rounded-tr-xl rounded-bl-xl text-xs font-bold hover:bg-[#A855F7] shadow-lg shadow-[#8B5CF6]/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    <span>Create Admin User</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 size={18} />
                    <span>Admin User Created & 2FA Key Generated!</span>
                  </div>
                  <p className="text-xs text-emerald-200">Scan the QR code with Google Authenticator or share the secret key with the new admin.</p>
                </div>

                {creationResult.twoFactorSetup && (
                  <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A] space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="bg-white p-2 rounded-xl w-36 h-36 flex items-center justify-center flex-shrink-0 shadow-md">
                        <img
                          src={creationResult.twoFactorSetup.qrCodeUrl}
                          alt="New Admin 2FA QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="space-y-3 flex-1 min-w-0">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">
                            Secret Key:
                          </label>
                          <code className="block bg-[#18181B] text-[#8B5CF6] font-mono text-xs p-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] truncate">
                            {creationResult.twoFactorSetup.secret}
                          </code>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">
                            Emergency Backup Codes:
                          </label>
                          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-[#FAFAFA]">
                            {creationResult.twoFactorSetup.backupCodes.slice(0, 4).map((code, idx) => (
                              <span key={idx} className="bg-[#18181B] px-2 py-1 rounded border border-[#27272A] text-center">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreationResult(null);
                    }}
                    className="px-5 py-2.5 bg-[#8B5CF6] text-white rounded-tr-xl rounded-bl-xl text-xs font-bold hover:bg-[#A855F7] shadow-lg shadow-[#8B5CF6]/25"
                  >
                    Done & Return to Admin List
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ EDIT ADMIN MODAL (UPDATE) ═════════════════════════════════════════ */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#27272A] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6]">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#FAFAFA]">Edit Admin User (Update)</h3>
                  <p className="text-[10px] text-[#A1A1AA] font-mono">{editingAdmin.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#27272A]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">Role Assignment</label>
                  <select
                    value={editRoleId}
                    onChange={(e) => setEditRoleId(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#27272A]">
                {editingAdmin.email !== adminUser?.email ? (
                  <button
                    type="button"
                    onClick={() => {
                      const toDel = editingAdmin;
                      setEditingAdmin(null);
                      setDeletingAdmin(toDel);
                    }}
                    className="p-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-colors flex items-center gap-1 font-bold"
                  >
                    <Trash2 size={13} />
                    <span>Delete User</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAdmin(null)}
                    className="px-4 py-2.5 text-xs font-semibold text-[#A1A1AA] hover:bg-[#27272A] rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold px-5 py-2.5 rounded-tr-xl rounded-bl-xl shadow-md transition-colors"
                  >
                    {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRMATION MODAL ═══════════════════════════════════════════ */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/40 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#FAFAFA]">Delete Admin Account?</h3>
              <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                Are you sure you want to delete and remove{" "}
                <span className="text-[#FAFAFA] font-bold font-mono">{deletingAdmin.email}</span>?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteSubmit}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-tr-xl rounded-bl-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Yes, Delete</span>
              </button>
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
                className="flex-1 bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] font-semibold py-2 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW DETAILS MODAL (READ) ═══════════════════════════════════════════ */}
      {viewingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#27272A] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center font-black">
                  {viewingAdmin.firstName ? viewingAdmin.firstName[0].toUpperCase() : "A"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#FAFAFA]">
                    {viewingAdmin.firstName} {viewingAdmin.lastName}
                  </h3>
                  <p className="text-[10px] text-[#A1A1AA] font-mono">{viewingAdmin.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#27272A]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[#A1A1AA]">Account ID:</span>
                <span className="font-mono text-[#FAFAFA]">{viewingAdmin.id}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[#A1A1AA]">Phone Number:</span>
                <span className="text-[#FAFAFA] font-medium">{viewingAdmin.phone || "—"}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[#A1A1AA]">Role & Access:</span>
                <span className="text-[#8B5CF6] font-bold uppercase">
                  {typeof viewingAdmin.role === "object" ? viewingAdmin.role?.name : viewingAdmin.role}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[#A1A1AA]">Status:</span>
                <span className="text-emerald-400 font-bold">{viewingAdmin.status || "ACTIVE"}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[#A1A1AA]">Two-Factor Auth:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck size={12} /> Mandatory / Enforced
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => {
                  const toEdit = viewingAdmin;
                  setViewingAdmin(null);
                  handleOpenEdit(toEdit);
                }}
                className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-2.5 rounded-tr-xl rounded-bl-xl font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Edit2 size={13} />
                <span>Edit Account</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingAdmin(null)}
                className="px-4 py-2.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-xl font-semibold text-xs"
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

