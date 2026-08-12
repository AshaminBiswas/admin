import React, { useState } from "react";
import { Users, UserPlus, ShieldCheck, Lock, Mail, User, Search, Copy, Check, CheckCircle2, AlertCircle, QrCode, KeyRound } from "lucide-react";
import { adminAuthService } from "../api/adminAuthService";
import { AdminUser, CreatedAdminResult } from "../types/admin";

export function AdminManagementPage() {
  const [adminsList, setAdminsList] = useState<AdminUser[]>([
    {
      id: "admin-1",
      email: "admin@prchardware.com",
      firstName: "Executive",
      lastName: "Admin",
      role: "super_admin",
      roleId: "22222222-2222-2222-2222-222222222222",
      phone: "+91-9876543210",
      status: "ACTIVE",
      isTwoFactorEnabled: true,
    },
    {
      id: "admin-2",
      email: "jane.smith@prchardware.com",
      firstName: "Jane",
      lastName: "Smith",
      role: "admin",
      roleId: "33333333-3333-3333-3333-333333333333",
      phone: "+91-9876543211",
      status: "ACTIVE",
      isTwoFactorEnabled: true,
    },
    {
      id: "admin-3",
      email: "b2b.manager@prchardware.com",
      firstName: "Marcus",
      lastName: "Vance",
      role: "manager",
      roleId: "44444444-4444-4444-4444-444444444444",
      phone: "+91-9876543212",
      status: "ACTIVE",
      isTwoFactorEnabled: true,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedRoleId, setCopiedRoleId] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password@123");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("+91-9876543211");
  const [roleId, setRoleId] = useState("22222222-2222-2222-2222-222222222222");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [creationResult, setCreationResult] = useState<CreatedAdminResult | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const emailTrimmed = email.trim();
    const passTrimmed = password.trim();
    const firstNameTrimmed = firstName.trim();
    const lastNameTrimmed = lastName.trim();
    const roleIdTrimmed = roleId.trim();

    if (!emailTrimmed || !passTrimmed || !firstNameTrimmed || !lastNameTrimmed) {
      setFeedback({ type: "error", text: "Please fill in all required fields (First Name, Last Name, Email, Password)." });
      return;
    }

    // UUID format check (8-4-4-4-12 hex characters)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!roleIdTrimmed || !uuidRegex.test(roleIdTrimmed)) {
      setFeedback({
        type: "error",
        text: "Invalid Role ID! Please enter a valid Role UUID format (e.g. 22222222-2222-2222-2222-222222222222).",
      });
      return;
    }

    setIsSubmitting(true);
    const res = await adminAuthService.createAdminUser({
      email: emailTrimmed,
      password: passTrimmed,
      firstName: firstNameTrimmed,
      lastName: lastNameTrimmed,
      phone: phone.trim(),
      roleId: roleIdTrimmed,
      status: "ACTIVE",
    });
    setIsSubmitting(false);

    if (res.success && res.user) {
      const newAdmin: AdminUser = {
        ...res.user,
        roleId: roleIdTrimmed,
        phone: phone.trim(),
        status: "ACTIVE",
        isTwoFactorEnabled: true,
      };

      setAdminsList((prev) => [newAdmin, ...prev]);
      setCreationResult(res);
      setFeedback({ type: "success", text: `Admin user '${emailTrimmed}' created with Role ID [${roleIdTrimmed}] & MANDATORY 2FA enforcement!` });
    } else {
      setFeedback({ type: "error", text: res.message || "Failed to create new admin user." });
    }
  };

  const copyRoleId = (idStr: string) => {
    navigator.clipboard.writeText(idStr);
    setCopiedRoleId(idStr);
    setTimeout(() => setCopiedRoleId(null), 2000);
  };

  const filteredAdmins = adminsList.filter(
    (a) =>
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.roleId && a.roleId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-[#FAFAFA]">
      {/* Header & Stats Banner */}
      <div className="p-6 bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-tr-2xl rounded-bl-2xl bg-[#8B5CF6] text-white flex items-center justify-center font-bold shadow-lg shadow-[#8B5CF6]/20">
            <Users size={26} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#FAFAFA]">Admin Users & Role Assignment</h1>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Create executive admin users, assign system role UUIDs, and enforce mandatory 2FA security.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setCreationResult(null);
            setFeedback(null);
            setShowCreateModal(true);
          }}
          className="bg-[#8B5CF6] text-white hover:bg-[#A855F7] font-semibold py-2.5 px-5 rounded-tr-xl rounded-bl-xl text-xs flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/25 transition-all active:scale-95 flex-shrink-0"
        >
          <UserPlus size={16} />
          <span>+ Create New Admin User</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-tr-2xl rounded-bl-2xl border text-xs flex items-center gap-3 ${
          feedback.type === "success"
            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
            : "bg-red-950/60 border-red-500/40 text-red-300"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" /> : <AlertCircle size={18} className="text-red-400 flex-shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#18181B] border border-[#27272A] p-5 rounded-tr-2xl rounded-bl-2xl shadow-md space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">Total Executive Admins</p>
          <p className="text-2xl font-bold font-serif text-[#FAFAFA]">{adminsList.length}</p>
        </div>

        <div className="bg-[#18181B] border border-emerald-500/30 p-5 rounded-tr-2xl rounded-bl-2xl shadow-md space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck size={14} />
            <span>Mandatory 2FA Enforced</span>
          </p>
          <p className="text-2xl font-bold font-serif text-emerald-400">100% Protected</p>
        </div>

        <div className="bg-[#18181B] border border-[#27272A] p-5 rounded-tr-2xl rounded-bl-2xl shadow-md space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#A855F7]">API Endpoint Contract</p>
          <p className="text-xs font-mono text-[#FAFAFA] font-bold">POST /users</p>
        </div>
      </div>

      {/* Action Bar & Search */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or Role ID..."
              className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/50 pl-9 pr-4 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
          </div>

          <div className="text-xs text-[#A1A1AA] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Role UUID Matching Active</span>
          </div>
        </div>

        {/* Admins Table */}
        <div className="overflow-x-auto border border-[#27272A] rounded-tr-2xl rounded-bl-2xl">
          <table className="w-full text-left text-xs text-[#A1A1AA]">
            <thead className="bg-[#09090B] uppercase text-[10px] tracking-wider text-[#A855F7] font-bold border-b border-[#27272A]">
              <tr>
                <th className="py-3 px-4">Admin Name</th>
                <th className="py-3 px-4">Email & Phone</th>
                <th className="py-3 px-4">Role & Assigned Role ID (UUID)</th>
                <th className="py-3 px-4 text-center">2FA Protocol</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {filteredAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-[#27272A]/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#FAFAFA]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A855F7] font-bold flex items-center justify-center text-xs">
                        {admin.firstName ? admin.firstName[0] : "A"}
                      </div>
                      <div>
                        <p>{admin.firstName} {admin.lastName}</p>
                        <p className="text-[10px] text-[#A1A1AA] font-mono">{admin.id}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <p className="text-[#FAFAFA] font-medium">{admin.email}</p>
                    <p className="text-[10px] text-[#A1A1AA] font-mono">{admin.phone || "+91-9876543210"}</p>
                  </td>

                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/20 text-[#A855F7] text-[10px] font-bold uppercase">
                        {admin.role.replace("_", " ")}
                      </span>
                      <div className="flex items-center gap-1">
                        <code className="bg-[#09090B] text-[#FAFAFA] font-mono text-[11px] px-2 py-0.5 rounded border border-[#27272A]">
                          {admin.roleId || "22222222-2222-2222-2222-222222222222"}
                        </code>
                        <button
                          onClick={() => copyRoleId(admin.roleId || "22222222-2222-2222-2222-222222222222")}
                          className="text-[#A1A1AA] hover:text-[#FAFAFA] p-1"
                          title="Copy Role ID"
                        >
                          {copiedRoleId === (admin.roleId || "22222222-2222-2222-2222-222222222222") ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                      <ShieldCheck size={12} />
                      <span>2FA MANDATORY</span>
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-500/20">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-[#27272A] pb-4">
              <div>
                <div className="flex items-center gap-2 text-[#8B5CF6] font-bold text-base font-serif">
                  <UserPlus size={20} />
                  <span>Create Executive Admin User</span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  API: <code className="text-[#A855F7] font-mono">POST /users</code> with Mandatory 2FA Enforcement.
                </p>
              </div>

              <span className="px-2.5 py-1 bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A855F7] text-[10px] font-bold uppercase rounded-full">
                2FA Mandatory
              </span>
            </div>

            {!creationResult ? (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                      First Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jane"
                        className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 pl-9 pr-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                        required
                      />
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                      Last Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Smith"
                        className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 pl-9 pr-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                        required
                      />
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                    Admin Email *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="newadmin@prchardware.com"
                      className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 pl-9 pr-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                      required
                    />
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                      Initial Password *
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 pl-9 pr-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                        required
                      />
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91-9876543211"
                      className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 px-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7]">
                      Role ID (UUID Format) *
                    </label>
                    <span className="text-[10px] text-[#A1A1AA]">Must be a valid UUID string</span>
                  </div>
                  <input
                    type="text"
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    placeholder="e.g. 22222222-2222-2222-2222-222222222222"
                    className="w-full bg-[#09090B] text-[#FAFAFA] font-mono text-xs placeholder-[#A1A1AA]/40 px-3 py-2.5 rounded-tr-xl rounded-bl-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                    required
                  />
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#A1A1AA]">
                    <span>UUID Presets:</span>
                    <button
                      type="button"
                      onClick={() => setRoleId("22222222-2222-2222-2222-222222222222")}
                      className="px-2 py-0.5 bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white rounded text-mono transition-colors"
                    >
                      Super Admin UUID
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleId("33333333-3333-3333-3333-333333333333")}
                      className="px-2 py-0.5 bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white rounded text-mono transition-colors"
                    >
                      Store Operator UUID
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#09090B] border border-emerald-500/30 rounded-tr-xl rounded-bl-xl flex items-center gap-2 text-xs text-emerald-300">
                  <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Mandatory 2FA Protocol Active: QR Code & Recovery Keys generated instantly upon creation.</span>
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
                    {isSubmitting ? (
                      <span>Creating Admin User...</span>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        <span>Create Admin & Generate 2FA</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* CREATION SUCCESS DISPLAY */
              <div className="space-y-5">
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-tr-2xl rounded-bl-2xl text-emerald-300 text-xs flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Admin Account Created & Mandatory 2FA Enforced!</p>
                    <p className="text-[11px] text-emerald-300/80">
                      Share the secret key or QR code below with <strong>{creationResult.user?.email}</strong> to complete Authenticator app setup.
                    </p>
                  </div>
                </div>

                {creationResult.twoFactorSetup && (
                  <div className="bg-[#09090B] p-4 rounded-tr-2xl rounded-bl-2xl border border-[#27272A] space-y-4">
                    <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#A855F7]">
                        Mandatory 2FA QR Code & Security Keys
                      </span>
                      <span className="text-[10px] font-mono bg-[#8B5CF6]/20 text-[#A855F7] px-2 py-0.5 rounded">
                        2FA Enforced
                      </span>
                    </div>

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
                    onClick={() => setShowCreateModal(false)}
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
    </div>
  );
}
