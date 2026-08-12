import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, KeyRound, QrCode, Copy, Check, Lock, Smartphone, RefreshCw, AlertCircle, CheckCircle2, UserPlus, Users, Mail, User } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminAuthService } from "../../api/adminAuthService";
import { TwoFactorSetupData, CreatedAdminResult } from "../../types/admin";

export function AdminSecuritySettings() {
  const { adminUser, refreshUserProfile } = useAdminAuth();
  const [is2FAActive, setIs2FAActive] = useState<boolean>(!!adminUser?.isTwoFactorEnabled);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [confirmCode, setConfirmCode] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDisableModal, setShowDisableModal] = useState<boolean>(false);
  const [disableConfirmText, setDisableConfirmText] = useState<string>("");

  // Create New Admin Modal States
  const [showCreateAdminModal, setShowCreateAdminModal] = useState<boolean>(false);
  const [newAdminEmail, setNewAdminEmail] = useState<string>("");
  const [newAdminPassword, setNewAdminPassword] = useState<string>("Password@123");
  const [newAdminFirstName, setNewAdminFirstName] = useState<string>("");
  const [newAdminLastName, setNewAdminLastName] = useState<string>("");
  const [newAdminPhone, setNewAdminPhone] = useState<string>("+91-9876543211");
  const [newAdminRoleId, setNewAdminRoleId] = useState<string>("22222222-2222-2222-2222-222222222222");
  const [createAdminResult, setCreateAdminResult] = useState<CreatedAdminResult | null>(null);

  useEffect(() => {
    setIs2FAActive(!!adminUser?.isTwoFactorEnabled);
  }, [adminUser]);

  const handleStartSetup = async () => {
    setFeedback(null);
    setIsSubmitting(true);
    const res = await adminAuthService.setup2FA();
    setIsSubmitting(false);

    if (res.success && res.data) {
      setSetupData(res.data);
      setIsSettingUp(true);
    } else {
      setFeedback({ type: "error", text: res.message || "Failed to initialize 2FA setup details." });
    }
  };

  const handleConfirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!confirmCode.trim() || confirmCode.trim().length !== 6) {
      setFeedback({ type: "error", text: "Please enter a valid 6-digit confirmation code from your authenticator app." });
      return;
    }

    setIsSubmitting(true);
    const res = await adminAuthService.confirmEnable2FA(confirmCode);
    setIsSubmitting(false);

    if (res.success) {
      setIs2FAActive(true);
      setIsSettingUp(false);
      await refreshUserProfile();
      setFeedback({ type: "success", text: "Two-Factor Authentication has been activated successfully!" });
    } else {
      setFeedback({ type: "error", text: res.message || "Invalid code. Please verify your authenticator app code and try again." });
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!disableConfirmText.trim()) {
      setFeedback({ type: "error", text: "Please provide your confirmation code or password." });
      return;
    }

    setIsSubmitting(true);
    const res = await adminAuthService.disable2FA(disableConfirmText);
    setIsSubmitting(false);

    if (res.success) {
      setIs2FAActive(false);
      setShowDisableModal(false);
      setDisableConfirmText("");
      await refreshUserProfile();
      setFeedback({ type: "success", text: "Two-Factor Authentication is now disabled." });
    } else {
      setFeedback({ type: "error", text: res.message || "Failed to disable 2FA." });
    }
  };

  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const emailTrimmed = newAdminEmail.trim();
    const passTrimmed = newAdminPassword.trim();
    const firstNameTrimmed = newAdminFirstName.trim();
    const lastNameTrimmed = newAdminLastName.trim();
    const roleIdTrimmed = newAdminRoleId.trim();

    if (!emailTrimmed || !passTrimmed || !firstNameTrimmed || !lastNameTrimmed) {
      setFeedback({ type: "error", text: "Please fill in all required fields (First Name, Last Name, Email, Password)." });
      return;
    }

    // Role ID Format Validation (UUID format: 8-4-4-4-12 characters)
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
      phone: newAdminPhone.trim(),
      roleId: roleIdTrimmed,
      status: "ACTIVE",
    });
    setIsSubmitting(false);

    if (res.success) {
      setCreateAdminResult(res);
      setFeedback({ type: "success", text: `Admin '${emailTrimmed}' verified with Role ID [${roleIdTrimmed}] & MANDATORY 2FA enforcement!` });
    } else {
      setFeedback({ type: "error", text: res.message || "Failed to create new admin user." });
    }
  };

  const copyToClipboard = (text: string, type: "key" | "codes") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#FAFAFA]">
      {/* Header Banner */}
      <div className="p-6 bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-tr-2xl rounded-bl-2xl flex items-center justify-center font-bold text-white shadow-lg ${
            is2FAActive ? "bg-emerald-600 shadow-emerald-600/20" : "bg-[#8B5CF6] shadow-[#8B5CF6]/20"
          }`}>
            {is2FAActive ? <ShieldCheck size={26} /> : <ShieldAlert size={26} />}
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#FAFAFA]">Admin Security & Authentication</h1>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Manage multi-factor authentication, team creation, and mandatory 2FA enforcement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border ${
            is2FAActive
              ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-400"
              : "bg-amber-950/60 border-amber-500/30 text-amber-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${is2FAActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            {is2FAActive ? "2FA Protection Active" : "2FA Not Configured"}
          </span>
        </div>
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

      {/* Main 2FA Card */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#27272A] pb-6 gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-serif text-[#FAFAFA] flex items-center gap-2">
              <Smartphone className="text-[#8B5CF6]" size={20} />
              <span>Authenticator App (TOTP)</span>
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Use apps like Google Authenticator, Authy, or 1Password to generate time-based verification passcodes during login.
            </p>
          </div>

          {!is2FAActive ? (
            <button
              onClick={handleStartSetup}
              disabled={isSubmitting || isSettingUp}
              className="bg-[#8B5CF6] text-white hover:bg-[#A855F7] font-semibold py-2.5 px-5 rounded-tr-xl rounded-bl-xl text-xs flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <KeyRound size={16} />
              <span>{isSettingUp ? "Setting Up 2FA..." : "Enable Two-Factor Auth"}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowDisableModal(true)}
              className="bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/60 font-semibold py-2 px-4 rounded-tr-xl rounded-bl-xl text-xs flex items-center gap-2 transition-all active:scale-95"
            >
              <Lock size={14} />
              <span>Disable 2FA Protection</span>
            </button>
          )}
        </div>

        {/* SETUP WIZARD */}
        {isSettingUp && setupData && (
          <div className="p-6 bg-[#09090B] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
              <h3 className="text-sm font-bold text-[#A855F7] uppercase tracking-wider flex items-center gap-2">
                <QrCode size={16} />
                <span>Pair Your Authenticator Device</span>
              </h3>
              <button
                onClick={() => setIsSettingUp(false)}
                className="text-xs text-[#A1A1AA] hover:text-[#FAFAFA]"
              >
                Cancel Setup
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 1: QR Code & Secret Key */}
              <div className="space-y-4 border-r border-[#27272A]/50 pr-0 md:pr-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FAFAFA]">
                  <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Scan QR Code with Authenticator App</span>
                </div>

                <div className="bg-white p-3 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg border border-[#27272A]">
                  <img
                    src={setupData.qrCodeUrl}
                    alt="2FA QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1">
                    Or Enter Secret Key Manually:
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[#18181B] text-[#8B5CF6] font-mono text-xs p-2.5 rounded-tr-xl rounded-bl-xl border border-[#27272A]">
                      {setupData.secret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(setupData.secret, "key")}
                      className="p-2.5 bg-[#18181B] border border-[#27272A] text-[#FAFAFA] rounded-tr-xl rounded-bl-xl hover:border-[#8B5CF6] transition-colors"
                      title="Copy Secret Key"
                    >
                      {copiedKey ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Verification Input */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FAFAFA]">
                  <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Confirm Verification Passcode</span>
                </div>

                <p className="text-xs text-[#A1A1AA]">
                  Enter the 6-digit code displayed in your authenticator app to confirm proper pairing and activate protection.
                </p>

                <form onSubmit={handleConfirmEnable} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full bg-[#18181B] text-[#FAFAFA] font-mono text-center text-lg tracking-widest py-2.5 rounded-tr-xl rounded-bl-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#8B5CF6] text-white font-bold py-3 rounded-tr-xl rounded-bl-xl hover:bg-[#A855F7] transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Activating 2FA...</span>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Verify & Complete 2FA Setup</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Backup codes preview */}
                <div className="pt-3 border-t border-[#27272A]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A855F7]">
                      Emergency Recovery Codes
                    </span>
                    <button
                      onClick={() => copyToClipboard(setupData.backupCodes.join("\n"), "codes")}
                      className="text-[11px] text-[#A1A1AA] hover:text-[#FAFAFA] flex items-center gap-1"
                    >
                      {copiedCodes ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedCodes ? "Copied" : "Copy Codes"}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-[#18181B] p-3 rounded-tr-xl rounded-bl-xl border border-[#27272A]">
                    {setupData.backupCodes.map((code, idx) => (
                      <span key={idx} className="font-mono text-[11px] text-[#FAFAFA] text-center bg-[#09090B] py-1 rounded border border-[#27272A]">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE 2FA STATUS DETAILS */}
        {is2FAActive && !isSettingUp && (
          <div className="p-5 bg-[#09090B] border border-emerald-500/20 rounded-tr-2xl rounded-bl-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#FAFAFA]">Executive Login Guard Active</h4>
                <p className="text-xs text-[#A1A1AA]">
                  Your admin account is protected by Two-Factor Authentication. Any new sign-in will require a 6-digit TOTP code.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#27272A] flex flex-wrap gap-4 text-xs">
              <button
                onClick={handleStartSetup}
                className="text-[#8B5CF6] hover:underline flex items-center gap-1 font-semibold"
              >
                <RefreshCw size={13} />
                <span>Re-pair Authenticator Device or Generate New Secret</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* NEW ADMIN CREATION & MANDATORY 2FA ENFORCEMENT CARD */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#27272A] pb-4 gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-serif text-[#FAFAFA] flex items-center gap-2">
              <Users className="text-[#8B5CF6]" size={20} />
              <span>Executive Team & Admin Creation</span>
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Create new executive admin accounts. <strong className="text-[#A855F7]">Mandatory 2FA protection</strong> is automatically enforced on all newly created admin users.
            </p>
          </div>

          <button
            onClick={() => {
              setCreateAdminResult(null);
              setShowCreateAdminModal(true);
            }}
            className="bg-[#8B5CF6] text-white hover:bg-[#A855F7] font-semibold py-2.5 px-4 rounded-tr-xl rounded-bl-xl text-xs flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/20 transition-all active:scale-95 flex-shrink-0"
          >
            <UserPlus size={16} />
            <span>Create New Admin (Mandatory 2FA)</span>
          </button>
        </div>

        <div className="p-4 bg-[#09090B] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl flex items-center justify-between text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A855F7]">
              <Lock size={18} />
            </div>
            <div>
              <p className="font-bold text-[#FAFAFA]">Mandatory 2FA Protocol Enabled</p>
              <p className="text-[11px] text-[#A1A1AA]">All created admins receive mandatory 2FA pairing QR codes and cannot bypass multi-factor login.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-[10px]">
            ENFORCED BY POLICY
          </span>
        </div>
      </div>

      {/* CREATE NEW ADMIN MODAL */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-[#27272A] pb-4">
              <div>
                <div className="flex items-center gap-2 text-[#8B5CF6] font-bold text-sm">
                  <UserPlus size={18} />
                  <span>Create Executive Admin Account</span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  API: <code className="text-[#A855F7] font-mono">POST /users</code> with mandatory 2FA security enforcement.
                </p>
              </div>

              <span className="px-2.5 py-1 bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A855F7] text-[10px] font-bold uppercase rounded-full">
                Mandatory 2FA Active
              </span>
            </div>

            {!createAdminResult ? (
              <form onSubmit={handleCreateAdminSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                      First Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newAdminFirstName}
                        onChange={(e) => setNewAdminFirstName(e.target.value)}
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
                        value={newAdminLastName}
                        onChange={(e) => setNewAdminLastName(e.target.value)}
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
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
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
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 pl-9 pr-3 py-2 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                        required
                      />
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={newAdminPhone}
                      onChange={(e) => setNewAdminPhone(e.target.value)}
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
                    <span className="text-[10px] text-[#A1A1AA]">Must be a valid UUID</span>
                  </div>
                  <input
                    type="text"
                    value={newAdminRoleId}
                    onChange={(e) => setNewAdminRoleId(e.target.value)}
                    placeholder="e.g. 22222222-2222-2222-2222-222222222222"
                    className="w-full bg-[#09090B] text-[#FAFAFA] font-mono text-xs placeholder-[#A1A1AA]/40 px-3 py-2.5 rounded-tr-xl rounded-bl-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                    required
                  />
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#A1A1AA]">
                    <span>Presets:</span>
                    <button
                      type="button"
                      onClick={() => setNewAdminRoleId("22222222-2222-2222-2222-222222222222")}
                      className="px-2 py-0.5 bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white rounded text-mono transition-colors"
                    >
                      Super Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAdminRoleId("33333333-3333-3333-3333-333333333333")}
                      className="px-2 py-0.5 bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white rounded text-mono transition-colors"
                    >
                      Inventory Operator
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAdminRoleId("44444444-4444-4444-4444-444444444444")}
                      className="px-2 py-0.5 bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white rounded text-mono transition-colors"
                    >
                      B2B Manager
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#09090B] border border-emerald-500/30 rounded-tr-xl rounded-bl-xl flex items-center gap-2 text-xs text-emerald-300">
                  <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Mandatory 2FA: Authenticators QR Code & Recovery Keys will be generated instantly upon creation.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => setShowCreateAdminModal(false)}
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
              /* CREATION SUCCESS WITH MANDATORY 2FA PAIRING INFO */
              <div className="space-y-5">
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-tr-2xl rounded-bl-2xl text-emerald-300 text-xs flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Admin Account Created & Mandatory 2FA Enforced!</p>
                    <p className="text-[11px] text-emerald-300/80">
                      Share the secret key or QR code below with <strong>{createAdminResult.user?.email}</strong> to set up their Authenticator app.
                    </p>
                  </div>
                </div>

                {createAdminResult.twoFactorSetup && (
                  <div className="bg-[#09090B] p-4 rounded-tr-2xl rounded-bl-2xl border border-[#27272A] space-y-4">
                    <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#A855F7]">
                        Mandatory 2FA QR Code & Credentials
                      </span>
                      <span className="text-[10px] font-mono bg-[#8B5CF6]/20 text-[#A855F7] px-2 py-0.5 rounded">
                        2FA Mandatory
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="bg-white p-2 rounded-xl w-36 h-36 flex items-center justify-center flex-shrink-0 shadow-md">
                        <img
                          src={createAdminResult.twoFactorSetup.qrCodeUrl}
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
                            {createAdminResult.twoFactorSetup.secret}
                          </code>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">
                            Emergency Backup Codes:
                          </label>
                          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-[#FAFAFA]">
                            {createAdminResult.twoFactorSetup.backupCodes.slice(0, 4).map((code, idx) => (
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
                    onClick={() => setShowCreateAdminModal(false)}
                    className="px-5 py-2.5 bg-[#8B5CF6] text-white rounded-tr-xl rounded-bl-xl text-xs font-bold hover:bg-[#A855F7] shadow-lg shadow-[#8B5CF6]/25"
                  >
                    Done & Close Modal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DISABLE MODAL */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <ShieldAlert size={24} />
              <h3 className="text-lg font-bold font-serif text-[#FAFAFA]">Disable Two-Factor Auth?</h3>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Disabling 2FA will reduce the security level of your Executive Console account. To confirm, enter your admin password or a valid 2FA code below.
            </p>

            <form onSubmit={handleDisable2FA} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={disableConfirmText}
                  onChange={(e) => setDisableConfirmText(e.target.value)}
                  placeholder="Enter admin password or 2FA code"
                  className="w-full bg-[#09090B] text-[#FAFAFA] text-sm p-3 rounded-tr-xl rounded-bl-xl border border-[#27272A] focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisableModal(false)}
                  className="px-4 py-2 bg-[#27272A] text-[#FAFAFA] rounded-tr-xl rounded-bl-xl text-xs hover:bg-[#3F3F46]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-tr-xl rounded-bl-xl text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm & Disable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
