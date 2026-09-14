import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  LogOut,
  KeyRound,
  Download,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { adminAuthService } from "../api/adminAuthService";
import { TwoFactorSetupData } from "../types/admin";

export function AdminMandatory2FAPage() {
  const { adminUser, logout, refreshUserProfile, complete2FAVerification } = useAdminAuth();

  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [confirmCode, setConfirmCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadSetup() {
      setIsLoadingSetup(true);
      setErrorMsg("");
      try {
        const res = await adminAuthService.setup2FA();
        if (!isMounted) return;
        if (res.success && res.data) {
          setSetupData(res.data);
        } else {
          setErrorMsg(res.message || "Failed to initialize 2FA authenticator parameters.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMsg(err.message || "Network error loading 2FA setup details.");
      } finally {
        if (isMounted) setIsLoadingSetup(false);
      }
    }
    loadSetup();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyKey = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    if (!setupData?.backupCodes?.length) return;
    const text = `PRC Admin Console Backup Codes (${adminUser?.email}):\n${setupData.backupCodes.join("\n")}\nKeep these in a secure place.`;
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanCode = confirmCode.trim().replace(/[\s-]+/g, "");
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit code shown in your authenticator app.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await adminAuthService.confirmEnable2FA(cleanCode);
      if (res.success) {
        setSuccessMsg("Two-Factor Authentication verified successfully! Access granted. Entering Admin Console...");
        // Instantly activate 2FA and transition directly into the Admin Console dashboard
        complete2FAVerification(res.user);
      } else {
        setErrorMsg(res.message || "Invalid 6-digit code. Please verify the current code in your app and retry.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error during 2FA verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-xl bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative z-10">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#A855F7]">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xs">
              2
            </span>
            <span className="uppercase tracking-wider">Step 2 of 2: Multi-Factor Authentication</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-[#A855F7] border border-purple-500/20 font-bold">
            Mandatory Security
          </span>
        </div>

        {/* Title & Context */}
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A855F7] mb-2">
            <Lock size={24} />
          </div>
          <h1 className="text-xl font-bold text-[#FAFAFA]">Set Up Two-Factor Authentication</h1>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            All administrative, management, and operational accounts require Two-Factor Authentication (2FA). Pair an authenticator app (Google Authenticator, Microsoft Authenticator, or Authy) to secure your account.
          </p>
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

        {isLoadingSetup ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#A1A1AA]">Generating cryptographic TOTP keypair & QR code…</p>
          </div>
        ) : setupData ? (
          <div className="space-y-5">
            {/* Step A: Scan QR Code or Copy Secret */}
            <div className="p-4 bg-[#09090B] border border-[#27272A] rounded-xl space-y-4">
              <span className="text-[11px] font-bold text-[#FAFAFA] block">
                A. Scan QR Code in Authenticator App
              </span>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {setupData.qrCodeUrl ? (
                  <div className="bg-white p-2.5 rounded-xl shadow-md flex-shrink-0 border border-zinc-200">
                    <img
                      src={setupData.qrCodeUrl}
                      alt="TOTP 2FA QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-36 h-36 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] text-xs flex-shrink-0">
                    <QrCode size={36} />
                  </div>
                )}

                <div className="space-y-2 text-xs flex-1">
                  <p className="text-[#A1A1AA] text-[11px] leading-relaxed">
                    Open your authenticator app, tap <strong>+</strong>, and scan the QR code. If unable to scan, enter the key below manually:
                  </p>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#71717A] uppercase font-semibold">Secret Key</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-[#18181B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-purple-300 font-mono select-all truncate">
                        {setupData.secret}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="px-2.5 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        {copiedKey ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copiedKey ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step B: Emergency Backup Codes */}
            {setupData.backupCodes && setupData.backupCodes.length > 0 && (
              <div className="p-3.5 bg-[#09090B] border border-[#27272A] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#FAFAFA]">
                    <KeyRound size={13} className="text-amber-400" />
                    <span>Emergency Backup Codes</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyBackupCodes}
                    className="text-[11px] text-[#A855F7] hover:text-purple-300 font-semibold flex items-center gap-1"
                  >
                    {copiedCodes ? <Check size={12} className="text-emerald-400" /> : <Download size={12} />}
                    <span>{copiedCodes ? "Codes Copied!" : "Copy All Codes"}</span>
                  </button>
                </div>
                <p className="text-[10px] text-[#71717A]">
                  Save these 8-digit one-time codes in case you lose access to your authenticator device.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                  {setupData.backupCodes.map((code, idx) => (
                    <span
                      key={idx}
                      className="bg-[#18181B] border border-[#27272A] px-2 py-1 rounded text-center font-mono text-[10px] text-zinc-300"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Step C: Enter 6-Digit Code */}
            <form onSubmit={handleVerifyAndEnable} className="space-y-4 pt-1 text-xs">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center justify-between">
                  <span>B. Enter 6-Digit Code From Authenticator *</span>
                  <span className="text-[10px] text-purple-400">Updates every 30s</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={7}
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/[^\d\s-]/g, ""))}
                  placeholder="000 000"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-3 text-[#FAFAFA] placeholder-[#71717A] text-center font-mono text-lg tracking-widest focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || confirmCode.trim().length < 6}
                className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#8B5CF6]/20 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Verifying Code…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Verify Code & Enter Console</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : null}

        {/* Sign Out Option */}
        <div className="pt-4 border-t border-[#27272A] flex items-center justify-between text-xs text-[#71717A]">
          <span>PRC Access Governance</span>
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