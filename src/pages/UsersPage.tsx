import React, { useState, useEffect, useCallback } from "react";
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
  Loader2,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Building,
  Coins,
  Building2,
  Receipt,
  Sparkles,
  ArrowUpRight,
  Copy,
  Check,
  KeyRound,
  Send,
} from "lucide-react";
import { usersApi, rolesApi } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Role } from "../types/admin";

interface UsersPageProps {
  onNavigateB2BPricing?: (customerId?: string) => void;
}

export function UsersPage({ onNavigateB2BPricing }: UsersPageProps) {
  const { adminUser } = useAdminAuth();
  const rawRole = adminUser?.role as any;
  const roleSlug =
    typeof rawRole === "object" && rawRole !== null
      ? rawRole.slug ?? rawRole.name ?? "super_admin"
      : rawRole ?? "super_admin";
  const isSuperAdmin = roleSlug === "super_admin";

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  const [createdB2BResult, setCreatedB2BResult] = useState<{
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
    companyName?: string;
    temporaryPassword?: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

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
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  // Edit Form State
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editGstin, setEditGstin] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED">("ACTIVE");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "Prc@";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        usersApi.list({ limit: 100 }),
        rolesApi.list(),
      ]);

      if (rRes && rRes.success !== false) {
        const rList = rRes.data ?? (Array.isArray(rRes) ? rRes : []);
        setRoles(rList);
        if (rList.length > 0 && !roleId) {
          setRoleId(rList[0].id);
        }
      }

      if (uRes && uRes.success !== false) {
        const uList = uRes.data ?? (Array.isArray(uRes) ? uRes : []);
        setUsers(uList);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load customers." });
    } finally {
      setIsLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Adjust role when accountType toggles
  useEffect(() => {
    if (roles.length === 0) return;
    if (accountType === "B2B") {
      const b2bRole = roles.find(
        (r) => r.slug === "b2b-customer" || r.slug === "b2b_customer"
      );
      if (b2bRole) setRoleId(b2bRole.id);
      generateTempPassword();
      setMustChangePassword(true);
    } else {
      const customerRole = roles.find((r) => r.slug === "customer");
      if (customerRole) setRoleId(customerRole.id);
      setPassword("Password@123");
      setMustChangePassword(false);
    }
  }, [accountType, roles]);

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditFirstName(user.firstName || "");
    setEditLastName(user.lastName || "");
    setEditPhone(user.phone || "");
    setEditCompanyName(user.companyName || "");
    setEditGstin(user.gstin || "");
    setEditStatus(user.status || "ACTIVE");
    setEditRoleId(user.role?.id || user.roleId || (roles[0]?.id ?? ""));
    setFeedback(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!roleId) {
      setFeedback({ type: "error", text: "Please select a valid role." });
      return;
    }

    if (accountType === "B2B" && !companyName.trim()) {
      setFeedback({ type: "error", text: "Company name is required for B2B accounts." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await usersApi.create({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        companyName: accountType === "B2B" ? companyName.trim() : undefined,
        gstin: accountType === "B2B" ? gstin.trim().toUpperCase() : undefined,
        roleId,
        status,
        mustChangePassword: accountType === "B2B" ? mustChangePassword : false,
        sendWelcomeEmail,
      });

      if (res && res.success !== false) {
        const createdUser = res.data || res;
        setShowCreateModal(false);
        if (accountType === "B2B") {
          setCreatedB2BResult({
            id: createdUser.id,
            email: email.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            companyName: companyName.trim(),
            temporaryPassword: password,
          });
        } else {
          setFeedback({
            type: "success",
            text: `Customer '${email.trim()}' created successfully!`,
          });
        }
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("Password@123");
        setPhone("+91 ");
        setCompanyName("");
        setGstin("");
        await loadData();
      } else {
        setFeedback({ type: "error", text: res?.message || "Failed to create user." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to create user." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFeedback(null);

    setIsSubmitting(true);
    try {
      const res = await usersApi.update(editingUser.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim() || undefined,
        companyName: editCompanyName.trim() || undefined,
        gstin: editGstin.trim().toUpperCase() || undefined,
        status: editStatus,
        roleId: editRoleId || undefined,
      });

      if (res && res.success !== false) {
        setFeedback({
          type: "success",
          text: `User '${editingUser.email}' updated successfully!`,
        });
        setEditingUser(null);
        await loadData();
      } else {
        setFeedback({ type: "error", text: res?.message || "Failed to update user." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update user." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      const res = await usersApi.delete(deletingUser.id);
      if (res && res.success !== false) {
        setFeedback({ type: "success", text: `User '${deletingUser.email}' deleted.` });
        setDeletingUser(null);
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

  const filteredUsers = users.filter((u) => {
    const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
    const em = (u.email || "").toLowerCase();
    const comp = (u.companyName || "").toLowerCase();
    const gst = (u.gstin || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      name.includes(q) ||
      em.includes(q) ||
      comp.includes(q) ||
      gst.includes(q) ||
      (u.phone && u.phone.includes(q));

    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;

    let matchesRole = true;
    if (roleFilter === "B2B") {
      matchesRole =
        u.role?.slug === "b2b-customer" ||
        u.role?.slug === "b2b_customer" ||
        !!u.companyName ||
        !!u.gstin;
    } else if (roleFilter === "B2C") {
      matchesRole =
        u.role?.slug === "customer" && !u.companyName && !u.gstin;
    }

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="space-y-6 text-[#FAFAFA]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-tr-3xl rounded-bl-3xl bg-[#18181B] border border-[#27272A] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-tr-2xl rounded-bl-2xl bg-[#8B5CF6] text-white flex items-center justify-center font-bold shadow-lg shadow-[#8B5CF6]/20">
            <Users size={26} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#FAFAFA]">
              Customers & B2B Client Management
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Manage retail buyers, wholesale distributors, enterprise B2B accounts, and custom contracts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadData}
            title="Refresh List"
            className="p-2.5 rounded-tr-xl rounded-bl-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>

          {onNavigateB2BPricing && (
            <button
              type="button"
              onClick={() => onNavigateB2BPricing()}
              className="flex items-center gap-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs font-bold px-3.5 py-2.5 rounded-tr-xl rounded-bl-xl transition-colors border border-[#3F3F46]"
            >
              <Coins size={14} className="text-[#8B5CF6]" />
              <span>B2B Pricing Matrix</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setFeedback(null);
            }}
            className="flex items-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold px-4 py-2.5 rounded-tr-xl rounded-bl-xl shadow-lg shadow-[#8B5CF6]/25 transition-colors"
          >
            <UserPlus size={15} />
            <span>+ Create Customer</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-tr-2xl rounded-bl-2xl border text-xs flex items-center gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/60 border-rose-500/40 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="p-6 bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, company, GSTIN, email, phone..."
              className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/50 pl-9 pr-4 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#09090B] text-[#FAFAFA] text-xs px-3 py-2 rounded-tr-xl rounded-bl-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Account Types</option>
              <option value="B2B">🏢 B2B & Wholesale Clients</option>
              <option value="B2C">🛍️ Retail Customers (B2C)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#09090B] text-[#FAFAFA] text-xs px-3 py-2 rounded-tr-xl rounded-bl-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto border border-[#27272A] rounded-tr-2xl rounded-bl-2xl">
          <table className="w-full text-left text-xs text-[#A1A1AA]">
            <thead className="bg-[#09090B] text-[#A855F7] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Customer & Business Details</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Account Type</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#A1A1AA]">
                    <Loader2 size={24} className="animate-spin mx-auto text-[#8B5CF6] mb-2" />
                    <span>Loading customer accounts...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#A1A1AA]">
                    <Users size={32} className="mx-auto text-slate-500 mb-2 opacity-60" />
                    <p className="font-semibold text-sm">No customers found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleName =
                    typeof u.role === "object" ? u.role?.name : u.role || "Customer";
                  const isB2B =
                    u.role?.slug === "b2b-customer" ||
                    u.role?.slug === "b2b_customer" ||
                    !!u.companyName ||
                    !!u.gstin;

                  return (
                    <tr key={u.id} className="hover:bg-[#27272A]/50 transition-colors">
                      {/* Customer Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isB2B
                                ? "bg-[#8B5CF6]/20 text-[#A855F7] border border-[#8B5CF6]/40"
                                : "bg-[#27272A] text-[#FAFAFA]"
                            }`}
                          >
                            {isB2B ? <Building2 size={16} /> : (u.firstName ? u.firstName[0].toUpperCase() : "U")}
                          </div>
                          <div>
                            <div className="font-bold text-[#FAFAFA] flex items-center gap-2">
                              <span>
                                {u.firstName || "Customer"} {u.lastName || ""}
                              </span>
                              {isB2B && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#A855F7] uppercase tracking-wide">
                                  B2B
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#A1A1AA] font-mono">{u.email}</div>
                            {u.companyName && (
                              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mt-0.5">
                                🏢 {u.companyName}
                              </div>
                            )}
                            {u.gstin && (
                              <div className="text-[10px] font-mono text-slate-400">
                                GST: {u.gstin}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <p className="text-[#FAFAFA] font-medium">{u.phone || "—"}</p>
                      </td>

                      {/* Role & B2B Badge */}
                      <td className="py-3.5 px-4 font-semibold text-[#8B5CF6]">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isB2B
                              ? "bg-[#8B5CF6]/20 text-[#A855F7] border border-[#8B5CF6]/30"
                              : "bg-[#27272A] text-[#A1A1AA]"
                          }`}
                        >
                          {roleName}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {u.status || "ACTIVE"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Direct B2B Pricing Setup shortcut */}
                          {onNavigateB2BPricing && (
                            <button
                              type="button"
                              onClick={() => onNavigateB2BPricing(u.id)}
                              title="Set Custom Product Pricing (B2B Rates)"
                              className="p-1.5 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white transition-colors flex items-center gap-1 text-[11px] font-bold px-2.5"
                            >
                              <Coins size={12} />
                              <span>Pricing</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setViewingUser(u)}
                            title="View Details"
                            className="p-1.5 rounded-lg bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white text-[#A1A1AA] transition-colors"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User"
                            className="p-1.5 rounded-lg bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white text-[#A1A1AA] transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingUser(u)}
                            title="Delete User"
                            className="p-1.5 rounded-lg bg-[#27272A] hover:bg-rose-600 hover:text-white text-[#A1A1AA] transition-colors"
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
      </div>

      {/* ══ CREATE USER MODAL ══════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#27272A] pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#FAFAFA]">
                  Create Customer Account
                </h3>
                <p className="text-[10px] text-[#A1A1AA]">
                  Add a new retail buyer or corporate wholesale B2B client
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              {/* Account Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#09090B] border border-[#27272A] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAccountType("B2C")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                      accountType === "B2C"
                        ? "bg-[#27272A] text-white shadow-xs"
                        : "text-[#A1A1AA] hover:text-white"
                    }`}
                  >
                    🛍️ Retail Customer (B2C)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("B2B")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                      accountType === "B2B"
                        ? "bg-[#8B5CF6] text-white shadow-xs"
                        : "text-[#A1A1AA] hover:text-[#8B5CF6]"
                    }`}
                  >
                    🏢 B2B / Wholesale Client
                  </button>
                </div>
              </div>

              {/* B2B Company Details */}
              {accountType === "B2B" && (
                <div className="p-3 bg-[#8B5CF6]/8 border border-[#8B5CF6]/25 rounded-xl space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#A855F7] mb-1">
                      Company / Firm Name *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required={accountType === "B2B"}
                      placeholder="e.g. Apex Hardware & Contracting Ltd"
                      className="w-full bg-[#09090B] border border-[#8B5CF6]/40 rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#A855F7] mb-1">
                      GSTIN (15-character GST Number)
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      maxLength={15}
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      className="w-full bg-[#09090B] border border-[#8B5CF6]/40 rounded-lg px-3 py-2 text-xs font-mono uppercase text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>
              )}

              {/* Personal Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#A1A1AA]">
                    {accountType === "B2B" ? "Temporary Login Password *" : "Password *"}
                  </label>
                  {accountType === "B2B" && (
                    <button
                      type="button"
                      onClick={generateTempPassword}
                      className="text-[11px] text-[#A855F7] hover:text-[#C084FC] font-semibold flex items-center gap-1"
                    >
                      <Sparkles size={11} />
                      <span>Generate Temporary</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs font-mono text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* B2B Onboarding Preferences */}
              {accountType === "B2B" && (
                <div className="p-2.5 bg-[#18181B] border border-[#27272A] rounded-xl space-y-2 text-xs">
                  <label className="flex items-center gap-2 text-[#FAFAFA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mustChangePassword}
                      onChange={(e) => setMustChangePassword(e.target.checked)}
                      className="rounded accent-[#8B5CF6]"
                    />
                    <span>Force customer to change password on first login</span>
                  </label>
                  <label className="flex items-center gap-2 text-[#FAFAFA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendWelcomeEmail}
                      onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                      className="rounded accent-[#8B5CF6]"
                    />
                    <span>Email temporary login credentials to customer</span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">
                    Role Assignment
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold py-2.5 rounded-tr-xl rounded-bl-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#8B5CF6]/20"
                >
                  {isSubmitting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <UserPlus size={13} />
                  )}
                  <span>Create {accountType === "B2B" ? "B2B Customer" : "Account"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs text-[#A1A1AA] hover:bg-[#27272A] rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ B2B CUSTOMER CREATED SUCCESS MODAL ═══════════════════════════════ */}
      {createdB2BResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#18181B] border border-[#8B5CF6]/40 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/20 text-[#A855F7] flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">B2B Customer Account Created</h3>
                <p className="text-xs text-[#A1A1AA]">
                  {createdB2BResult.companyName || `${createdB2BResult.firstName} ${createdB2BResult.lastName || ""}`}
                </p>
              </div>
            </div>

            <div className="bg-[#09090B] border border-[#27272A] rounded-2xl p-4 space-y-3">
              <div>
                <span className="text-[11px] text-[#A1A1AA] block">Login Email</span>
                <span className="text-xs font-semibold text-white">{createdB2BResult.email}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#A1A1AA] block">Temporary Login Password</span>
                <span className="text-xs font-mono font-bold text-[#38BDF8] bg-[#18181B] px-2 py-1 rounded border border-[#27272A] inline-block mt-0.5">
                  {createdB2BResult.temporaryPassword}
                </span>
              </div>
              <div className="p-2.5 bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 rounded-xl text-[11px] text-[#C084FC]">
                ℹ️ The customer will be prompted to set their permanent password upon logging in.
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const creds = `Pacific Hardware Wholesale Portal Credentials:\nCompany: ${createdB2BResult.companyName || ""}\nLogin Email: ${createdB2BResult.email}\nTemporary Password: ${createdB2BResult.temporaryPassword}\nNote: Please set your permanent password upon your first login.`;
                  navigator.clipboard.writeText(creds);
                  setCopiedCredentials(true);
                  setTimeout(() => setCopiedCredentials(false), 2000);
                }}
                className="w-full bg-[#27272A] hover:bg-[#3F3F46] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedCredentials ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedCredentials ? "Credentials Copied to Clipboard!" : "Copy Login Credentials"}</span>
              </button>

              {onNavigateB2BPricing && (
                <button
                  type="button"
                  onClick={() => {
                    const custId = createdB2BResult.id;
                    setCreatedB2BResult(null);
                    onNavigateB2BPricing(custId);
                  }}
                  className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#8B5CF6]/20 transition-colors"
                >
                  <Coins size={14} />
                  <span>Configure Custom Pricing Matrix Now</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCreatedB2BResult(null)}
                className="w-full text-xs text-[#A1A1AA] hover:text-white py-2 text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ EDIT USER MODAL ════════════════════════════════════════════════════ */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#27272A] pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#FAFAFA]">Edit User Details</h3>
                <p className="text-[10px] text-[#A1A1AA] font-mono">{editingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">
                    First Name *
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
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">
                    Last Name *
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
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1">
                  Company / Firm Name
                </label>
                <input
                  type="text"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="Leave empty if regular customer"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={editGstin}
                    onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                    maxLength={15}
                    placeholder="GSTIN"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs font-mono uppercase text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">Role</label>
                  <select
                    value={editRoleId}
                    onChange={(e) => setEditRoleId(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#27272A]">
                {editingUser.email !== adminUser?.email ? (
                  <button
                    type="button"
                    onClick={() => {
                      const toDel = editingUser;
                      setEditingUser(null);
                      setDeletingUser(toDel);
                    }}
                    className="p-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-colors flex items-center gap-1 font-bold"
                  >
                    <Trash2 size={13} />
                    <span>Delete User</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2.5 text-xs text-[#A1A1AA] hover:bg-[#27272A] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold px-5 py-2.5 rounded-tr-xl rounded-bl-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE USER MODAL ══════════════════════════════════════════════════ */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/40 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#FAFAFA]">Delete User Account?</h3>
              <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                Are you sure you want to remove{" "}
                <span className="text-[#FAFAFA] font-bold">{deletingUser.email}</span>?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteSubmit}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-tr-xl rounded-bl-xl text-xs"
              >
                {isSubmitting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] font-semibold py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW USER DETAILS MODAL ════════════════════════════════════════════ */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#27272A] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center font-black">
                  {viewingUser.firstName ? viewingUser.firstName[0].toUpperCase() : "U"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#FAFAFA]">
                    {viewingUser.firstName} {viewingUser.lastName}
                  </h3>
                  <p className="text-[10px] text-[#A1A1AA] font-mono">{viewingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {viewingUser.companyName && (
                <div className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                  <span className="text-[#A1A1AA]">Company Name:</span>
                  <span className="font-bold text-[#FAFAFA]">{viewingUser.companyName}</span>
                </div>
              )}
              {viewingUser.gstin && (
                <div className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                  <span className="text-[#A1A1AA]">GSTIN:</span>
                  <span className="font-mono font-bold text-[#8B5CF6]">{viewingUser.gstin}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[#A1A1AA]">Phone Number:</span>
                <span className="text-[#FAFAFA] font-medium">{viewingUser.phone || "—"}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[#A1A1AA]">Role:</span>
                <span className="text-[#8B5CF6] font-bold uppercase">
                  {typeof viewingUser.role === "object"
                    ? viewingUser.role?.name
                    : viewingUser.role}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[#A1A1AA]">Status:</span>
                <span className="text-emerald-400 font-bold">
                  {viewingUser.status || "ACTIVE"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#27272A]">
              {onNavigateB2BPricing && (
                <button
                  type="button"
                  onClick={() => {
                    const id = viewingUser.id;
                    setViewingUser(null);
                    onNavigateB2BPricing(id);
                  }}
                  className="flex-1 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6] text-[#8B5CF6] hover:text-white py-2.5 rounded-tr-xl rounded-bl-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Coins size={13} />
                  <span>Configure B2B Pricing</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const toEdit = viewingUser;
                  setViewingUser(null);
                  handleOpenEdit(toEdit);
                }}
                className="px-4 py-2.5 bg-[#27272A] hover:bg-[#3F3F46] text-white py-2.5 rounded-tr-xl rounded-bl-xl font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
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
