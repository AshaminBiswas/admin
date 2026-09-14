import React, { useState } from "react";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { adminAuthService } from "../api/adminAuthService";

export function AdminForceChangePasswordPage() {
  const { adminUser, logout, refreshUserProfile, setCurrentView } = useAdminAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const hasMinLength = newPassword.length >= 8;
  const hasMixedCase = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasDigitOrSymbol = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!currentPassword) {
      setErrorMsg("Please enter your current temporary password.");
      return;
    }

    if (!hasMinLength) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg("New password and confirmation password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg("New password cannot be identical to your temporary password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminAuthService.changePassword(
        currentPassword.trim(),
        newPassword.trim(),
        confirmPassword.trim()
      );

      if (res.success) {
        setSuccessMsg(res.message || "Password successfully established!");
        // Refresh context user profile so mustChangePassword becomes false
        await refreshUserProfile();
        setCurrentView("dashboard");
      } else {
        setErrorMsg(res.message || "Failed to update password. Please check your credentials.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error while changing password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card Container */}
      <div className="w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative z-10">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs">
              1
            </span>
            <span className="uppercase tracking-wider">Step 1 of 2: Change Password</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
            Action Required
          </span>
        </div>

        {/* Title & Context */}
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
            <ShieldAlert size={26} />
          </div>
          <h1 className="text-xl font-bold text-[#FAFAFA]">Set Your Permanent Password</h1>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Your account was initialized with a temporary password. For regulatory compliance and data protection, you must establish a new, permanent password before accessing the Pacific Restroom Solutions console.
          </p>
        </div>

        {/* Logged in User Identification Chip */}
        <div className="p-3 bg-[#09090B] border border-[#27272A] rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-[#71717A] block">Signed In As</span>
            <span className="font-mono text-[#FAFAFA] font-bold">{adminUser?.email}</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30 uppercase">
            {adminUser?.role || "Staff"}
          </span>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-500/40 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Current Temporary Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock size={12} className="text-[#8B5CF6]" />
                <span>Temporary Password *</span>
              </span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter temporary password provided to you"
                className="w-full bg-[#09090B] border border-[#27272A] rounded-xl pl-3 pr-10 py-2.5 text-[#FAFAFA] placeholder-[#71717A] font-mono focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
              >
                {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound size={12} className="text-[#8B5CF6]" />
                <span>New Permanent Password *</span>
              </span>
              <span className="text-[10px] text-[#71717A]">Min. 8 characters</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong personal password"
                className="w-full bg-[#09090B] border border-[#27272A] rounded-xl pl-3 pr-10 py-2.5 text-[#FAFAFA] placeholder-[#71717A] font-mono focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
              >
                {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Password Strength Checklist */}
          {newPassword && (
            <div className="p-3 bg-[#09090B] border border-[#27272A] rounded-xl space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hasMinLength ? "bg-emerald-400" : "bg-zinc-600"}`} />
                <span className={hasMinLength ? "text-emerald-300 font-medium" : "text-[#71717A]"}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hasMixedCase ? "bg-emerald-400" : "bg-zinc-600"}`} />
                <span className={hasMixedCase ? "text-emerald-300 font-medium" : "text-[#71717A]"}>
                  Contains uppercase and lowercase letters
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hasDigitOrSymbol ? "bg-emerald-400" : "bg-zinc-600"}`} />
                <span className={hasDigitOrSymbol ? "text-emerald-300 font-medium" : "text-[#71717A]"}>
                  Contains at least one number or special symbol
                </span>
              </div>
            </div>
          )}

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock size={12} className="text-[#8B5CF6]" />
                <span>Confirm New Password *</span>
              </span>
              {confirmPassword && (
                <span className={`text-[10px] font-bold ${passwordsMatch ? "text-emerald-400" : "text-rose-400"}`}>
                  {passwordsMatch ? "✓ Passwords Match" : "✕ Do Not Match"}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type your new permanent password"
                className={`w-full bg-[#09090B] border rounded-xl pl-3 pr-10 py-2.5 text-[#FAFAFA] placeholder-[#71717A] font-mono focus:outline-none ${
                  confirmPassword && !passwordsMatch
                    ? "border-rose-500/80 focus:border-rose-400"
                    : "border-[#27272A] focus:border-[#8B5CF6]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting || !hasMinLength || !passwordsMatch}
            className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#8B5CF6]/20 flex items-center justify-center gap-2 mt-4"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Updating Password…</span>
              </>
            ) : (
              <>
                <span>Save Password & Proceed to 2FA Setup</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Sign Out Option */}
        <div className="pt-4 border-t border-[#27272A] flex items-center justify-between text-xs text-[#71717A]">
          <span>Need help? Contact IT administrator</span>
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-[#A1A1AA] hover:text-rose-400 transition-colors"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}