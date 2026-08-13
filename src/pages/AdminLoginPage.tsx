import React, { useState, useRef, useEffect } from "react";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, KeyRound, ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

export function AdminLoginPage() {
  const { login, verify2FA, pending2FA, cancel2FA, sessionNotice, clearSessionNotice } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 2FA Code States
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (pending2FA && !useBackupCode && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [pending2FA, useBackupCode]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    clearSessionNotice();

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please provide both admin email and password.");
      return;
    }

    setIsSubmitting(true);
    const res = await login(email.trim(), password);
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

    if (!codeToVerify) {
      setErrorMsg(useBackupCode ? "Please enter an 8-character emergency backup code." : "Please enter the complete 6-digit authenticator code.");
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

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl p-8 shadow-2xl space-y-6 text-[#FAFAFA] transition-all duration-300">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-tr-2xl rounded-bl-2xl bg-[#8B5CF6] text-[#FAFAFA] font-bold shadow-xl shadow-[#8B5CF6]/25 mb-3">
            {pending2FA ? <KeyRound size={28} /> : <ShieldCheck size={30} />}
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#FAFAFA]">PRC Hardware Console</h2>
          <p className="text-xs text-[#A1A1AA] mt-1">
            {pending2FA ? "Two-Factor Verification Required" : "Executive Admin Portal & Storefront Controller"}
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

        {!pending2FA ? (
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A855F7] mb-1">
                Password
              </label>
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
                <span>Authenticating Executive...</span>
              ) : (
                <>
                  <span>Sign In to Executive Console</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
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

