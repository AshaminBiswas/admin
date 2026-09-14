import React, { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  Wifi,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { adminAuthService } from "../api/adminAuthService";

export function AdminLoginPage() {
  const { login, verify2FA, pending2FA, cancel2FA, sessionNotice, clearSessionNotice } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Mode: "login" | "forgot_request" | "forgot_reset"
  const [authMode, setAuthMode] = useState<"login" | "forgot_request" | "forgot_reset">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState("");
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const forgotOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 2FA Code States
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const wakeUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pending2FA && !useBackupCode && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [pending2FA, useBackupCode]);

  // Focus first OTP field when entering forgot_reset mode
  useEffect(() => {
    if (authMode === "forgot_reset" && forgotOtpInputRefs.current[0]) {
      forgotOtpInputRefs.current[0].focus();
    }
  }, [authMode]);

  // Cleanup wake-up timer on unmount
  useEffect(() => {
    return () => {
      if (wakeUpTimerRef.current) clearTimeout(wakeUpTimerRef.current);
    };
  }, []);

  // Resend Countdown Timer
  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCountdown]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsWakingUp(false);
    clearSessionNotice();

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please provide both admin email and password.");
      return;
    }

    setIsSubmitting(true);

    // After 5s of waiting, show the "server waking up" indicator
    wakeUpTimerRef.current = setTimeout(() => {
      setIsWakingUp(true);
    }, 5000);

    const res = await login(email.trim(), password);

    if (wakeUpTimerRef.current) clearTimeout(wakeUpTimerRef.current);
    setIsWakingUp(false);
    setIsSubmitting(false);

    if (res.success) {
      if (res.requires2FA) {
        setSuccessMsg("Primary credentials verified. Enter 2FA security code.");
        setOtpDigits(Array(6).fill(""));
      }
    } else {
      setErrorMsg(res.message || "Executive authorization failed.");
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    clearSessionNotice();

    const codeToVerify = useBackupCode
      ? backupCode.trim()
      : otpDigits.join("");

    if (!useBackupCode && codeToVerify.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit authenticator code from your app.");
      return;
    }

    if (useBackupCode && !codeToVerify) {
      setErrorMsg("Please enter an 8-digit emergency backup code (e.g. 9821-4432).");
      return;
    }

    setIsSubmitting(true);
    const res = await verify2FA(codeToVerify);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.message || "2FA verification failed.");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance focus
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/\D/g, "");
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleForgotOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...forgotOtpDigits];
    newDigits[index] = value.slice(-1);
    setForgotOtpDigits(newDigits);

    // Auto-advance focus
    if (value && index < 5 && forgotOtpInputRefs.current[index + 1]) {
      forgotOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !forgotOtpDigits[index] && index > 0) {
      forgotOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/\D/g, "");
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setForgotOtpDigits(digits);
      forgotOtpInputRefs.current[5]?.focus();
    }
  };

  const handleForgotRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setErrorMsg("Please enter your registered administrative email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg("Please provide a valid corporate email address.");
      return;
    }

    setIsSubmitting(true);
    const res = await adminAuthService.forgotPassword(cleanEmail);
    setIsSubmitting(false);

    if (res.success) {
      setForgotMaskedEmail(res.maskedEmail || cleanEmail);
      setSuccessMsg(res.message);
      setAuthMode("forgot_reset");
      setForgotOtpDigits(Array(6).fill(""));
      setNewPassword("");
      setConfirmPassword("");
      setResendCountdown(60);
    } else {
      setErrorMsg(res.message || "Failed to initiate password reset.");
    }
  };

  const handleResendForgotOtp = async () => {
    if (resendCountdown > 0 || isSubmitting) return;
    setErrorMsg("");
    setSuccessMsg("");

    setIsSubmitting(true);
    const res = await adminAuthService.forgotPassword(forgotEmail.trim());
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg("A fresh 6-digit OTP code has been sent to your email.");
      setResendCountdown(60);
    } else {
      setErrorMsg(res.message || "Failed to resend verification OTP.");
    }
  };

  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const otp = forgotOtpDigits.join("").trim();
    if (otp.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP verification code sent to your email.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation password do not match.");
      return;
    }

    setIsSubmitting(true);
    const res = await adminAuthService.resetPassword({
      email: forgotEmail.trim(),
      otp,
      password: newPassword,
      confirmPassword,
    });
    setIsSubmitting(false);

    if (res.success) {
      setEmail(forgotEmail.trim());
      setPassword("");
      setAuthMode("login");
      setSuccessMsg("Password reset successfully! You can now sign in with your new password.");
      setForgotOtpDigits(Array(6).fill(""));
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setErrorMsg(res.message || "Failed to reset password. Please verify your OTP code.");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-8 shadow-2xl space-y-6 text-[#FAFAFA] transition-all duration-300">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-tr-2xl rounded-bl-2xl bg-[#8B5CF6] text-[#FAFAFA] font-bold shadow-xl shadow-[#8B5CF6]/25 mb-3">
            {pending2FA || authMode !== "login" ? <KeyRound size={28} /> : <ShieldCheck size={30} />}
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#FAFAFA]">PRC Hardware Console</h2>
          <p className="text-xs text-[#A1A1AA] mt-1">
            {pending2FA
              ? "Two-Factor Verification Required"
              : authMode === "forgot_request"
              ? "Administrator Password Recovery"
              : authMode === "forgot_reset"
              ? "OTP Verification & Password Reset"
              : "Executive Admin Portal & Storefront Controller"}
          </p>
        </div>

        {sessionNotice && (
          <div className="p-3 rounded-tr-xl rounded-bl-xl bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
              <span>{sessionNotice}</span>
            </div>
            <button
              onClick={clearSessionNotice}
              className="text-amber-400 hover:text-amber-200 font-bold px-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-tr-xl rounded-bl-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-tr-xl rounded-bl-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {authMode === "forgot_request" ? (
          /* FORGOT PASSWORD STEP 1: Enter Registered Email */
          <form onSubmit={handleForgotRequestSubmit} className="space-y-4">
            <div className="bg-[#09090B] border border-[#27272A] p-4 rounded-tr-xl rounded-bl-xl space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#A855F7] font-semibold uppercase tracking-wider">
                <KeyRound size={14} />
                <span>Executive Account Recovery</span>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Enter your registered admin corporate email address. We will dispatch a single-use 6-digit verification code to reset your password.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                Admin Registered Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@prchardware.com"
                  className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 pl-10 pr-4 py-2.5 rounded-tr-xl rounded-bl-xl text-sm border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                  required
                  autoFocus
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#8B5CF6] text-[#FAFAFA] font-bold py-3 px-4 rounded-tr-2xl rounded-bl-2xl hover:bg-[#A855F7] transition-all duration-300 shadow-lg shadow-[#8B5CF6]/25 text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span>Sending Verification OTP...</span>
              ) : (
                <>
                  <span>Send 6-Digit Reset Code</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="pt-2 border-t border-[#27272A] flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-xs text-[#A1A1AA] hover:text-[#FAFAFA] flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Return to Executive Sign In</span>
              </button>
            </div>
          </form>
        ) : authMode === "forgot_reset" ? (
          /* FORGOT PASSWORD STEP 2: OTP & New Password */
          <form onSubmit={handleForgotResetSubmit} className="space-y-4">
            <div className="bg-[#09090B] border border-[#27272A] p-3.5 rounded-tr-xl rounded-bl-xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-[#A855F7] font-semibold uppercase tracking-wider">
                <ShieldCheck size={14} />
                <span>Verification Code Sent</span>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Enter the 6-digit OTP sent to <strong className="text-[#FAFAFA] font-mono">{forgotMaskedEmail || forgotEmail}</strong> and specify your new password.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7]">
                  6-Digit OTP Code
                </label>
                <button
                  type="button"
                  onClick={handleResendForgotOtp}
                  disabled={resendCountdown > 0 || isSubmitting}
                  className="text-[11px] text-[#A855F7] hover:underline disabled:text-[#71717A] disabled:no-underline flex items-center gap-1 font-mono"
                >
                  <RotateCcw size={11} className={isSubmitting ? "animate-spin" : ""} />
                  {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend Code"}
                </button>
              </div>

              <div className="flex justify-between items-center gap-2">
                {forgotOtpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (forgotOtpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleForgotOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleForgotOtpKeyDown(idx, e)}
                    onPaste={handleForgotOtpPaste}
                    className="w-11 h-12 text-center bg-[#09090B] text-[#FAFAFA] font-mono text-xl font-bold rounded-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/30 shadow-inner"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 pl-10 pr-10 py-2.5 rounded-tr-xl rounded-bl-xl text-sm border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                  required
                  minLength={8}
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 pl-10 pr-10 py-2.5 rounded-tr-xl rounded-bl-xl text-sm border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                  required
                  minLength={8}
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#8B5CF6] text-[#FAFAFA] font-bold py-3 px-4 rounded-tr-2xl rounded-bl-2xl hover:bg-[#A855F7] transition-all duration-300 shadow-lg shadow-[#8B5CF6]/25 text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span>Resetting Password...</span>
              ) : (
                <>
                  <span>Save New Password & Sign In</span>
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>

            <div className="pt-2 border-t border-[#27272A] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("forgot_request");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-[#A1A1AA] hover:text-[#FAFAFA] flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Change Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-[#A855F7] hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : !pending2FA ? (
          /* STEP 1: Email & Password Form */
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@prchardware.com"
                  className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 pl-10 pr-4 py-2.5 rounded-tr-xl rounded-bl-xl text-sm border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                  required
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setErrorMsg("");
                    setSuccessMsg("");
                    setAuthMode("forgot_request");
                  }}
                  className="text-[11px] text-[#A855F7] hover:text-purple-300 font-medium hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/40 pl-10 pr-4 py-2.5 rounded-tr-xl rounded-bl-xl text-sm border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                  required
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#8B5CF6] text-[#FAFAFA] font-bold py-3 px-4 rounded-tr-2xl rounded-bl-2xl hover:bg-[#A855F7] transition-all duration-300 shadow-lg shadow-[#8B5CF6]/25 text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span>{isWakingUp ? "Server Starting Up..." : "Authenticating Executive..."}</span>
              ) : (
                <>
                  <span>Sign In to Executive Console</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Server cold-start wake-up indicator — shown after 5s of waiting */}
            {isWakingUp && (
              <div className="p-3 rounded-tr-xl rounded-bl-xl bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Wifi size={14} className="text-violet-400 flex-shrink-0 animate-pulse" />
                  <span className="font-semibold">Server waking up from sleep...</span>
                </div>
                <p className="text-violet-400/80 leading-relaxed">
                  The server was resting. It's starting now — this usually takes 20–40 seconds on first sign-in. Please wait, do not close this page.
                </p>
                {/* Animated progress bar */}
                <div className="w-full bg-violet-900/40 rounded-full h-1 overflow-hidden">
                  <div className="h-1 bg-violet-400 rounded-full animate-[progress_30s_linear_forwards]" style={{ animation: "wakeup-progress 55s linear forwards" }} />
                </div>
              </div>
            )}
          </form>
        ) : (
          /* STEP 2: 2FA Security Code Verification Form */
          <form onSubmit={handleStep2Submit} className="space-y-5">
            <div className="bg-[#09090B] border border-[#27272A] p-4 rounded-tr-xl rounded-bl-xl space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#A855F7] font-semibold uppercase tracking-wider">
                <ShieldAlert size={14} />
                <span>Executive Security Protocol</span>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                {useBackupCode
                  ? "Enter one of your 8-digit emergency recovery codes generated during 2FA setup."
                  : "Enter the 6-digit verification code generated by your Authenticator app (Google Authenticator, Authy, or 1Password)."}
              </p>
            </div>

            {!useBackupCode ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-2 text-center">
                  6-Digit Verification PIN
                </label>
                <div className="flex justify-between items-center gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center bg-[#09090B] text-[#FAFAFA] font-mono text-xl font-bold rounded-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/30 shadow-inner"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                  8-Digit Emergency Backup Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 9821-4432"
                    className="w-full bg-[#09090B] text-[#FAFAFA] font-mono text-sm placeholder-[#A1A1AA]/40 pl-10 pr-4 py-2.5 rounded-tr-xl rounded-bl-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                    required
                  />
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#8B5CF6] text-[#FAFAFA] font-bold py-3 px-4 rounded-tr-2xl rounded-bl-2xl hover:bg-[#A855F7] transition-all duration-300 shadow-lg shadow-[#8B5CF6]/25 text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Verifying Security Code...</span>
              ) : (
                <>
                  <span>Verify 2FA & Access Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#27272A]">
              <button
                type="button"
                onClick={cancel2FA}
                className="text-[#A1A1AA] hover:text-[#FAFAFA] flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Email Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setErrorMsg("");
                }}
                className="text-[#A855F7] hover:underline font-medium"
              >
                {useBackupCode ? "Use Authenticator App" : "Use Backup Code"}
              </button>
            </div>
          </form>
        )}

        <div className="p-3 bg-[#09090B] rounded-tr-xl rounded-bl-xl border border-[#27272A] text-center text-xs text-[#A1A1AA]">
          <p className="font-semibold text-[#A855F7]">Connected Live API PRC</p>
        </div>
      </div>
    </div>
  );
}

