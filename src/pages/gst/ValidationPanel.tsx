import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Shield, ShieldOff } from 'lucide-react';

interface ValidationPanelProps {
  results: Array<{ field: string; label: string; passed: boolean; message?: string }>;
  allPassed: boolean;
  irpConfigured: boolean;
  canGenerateIRN: boolean;
  onGenerateIRN: () => void;
  generating: boolean;
  status: string;
}

export function ValidationPanel({
  results,
  allPassed,
  irpConfigured,
  canGenerateIRN,
  onGenerateIRN,
  generating,
  status,
}: ValidationPanelProps) {
  const failedCount = results.filter((r) => !r.passed).length;

  const isButtonEnabled =
    allPassed && irpConfigured && canGenerateIRN && status === 'VALIDATED' && !generating;

  return (
    <div className="space-y-4">
      {/* Checklist */}
      <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#09090B] border border-[#27272A] space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-3">
          Validation Checks ({results.filter((r) => r.passed).length}/{results.length} passed)
        </p>
        {results.map((r) => (
          <div key={r.field} className="flex items-start gap-2">
            {r.passed ? (
              <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-xs font-semibold ${r.passed ? 'text-[#A1A1AA]' : 'text-[#FAFAFA]'}`}>
                {r.label}
              </p>
              {!r.passed && r.message && (
                <p className="text-[11px] text-red-400 mt-0.5">{r.message}</p>
              )}
            </div>
          </div>
        ))}

        {results.length === 0 && (
          <p className="text-xs text-[#71717A] text-center py-3">
            Click "Validate Invoice" to run checks before generating IRN.
          </p>
        )}
      </div>

      {/* IRP Not Configured warning */}
      {allPassed && !irpConfigured && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-tr-xl rounded-bl-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-400">IRIS IRP Integration Pending</p>
            <p className="text-[11px] text-amber-300/80 mt-0.5">
              All validation checks pass, but the IRIS IRP 6 backend integration has not been configured yet. IRN generation is disabled until the backend team sets up the IRIS API credentials (client_id, client_secret). No invoice can reach IRN_GENERATED without a genuine IRIS API response.
            </p>
          </div>
        </div>
      )}

      {/* Role restriction */}
      {!canGenerateIRN && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-500/10 border border-slate-500/20">
          <ShieldOff size={14} className="text-[#71717A]" />
          <p className="text-xs text-[#71717A]">
            IRN generation requires <strong className="text-[#A1A1AA]">Admin</strong> or <strong className="text-[#A1A1AA]">Super Admin</strong> role.
          </p>
        </div>
      )}

      {/* Failure summary */}
      {!allPassed && failedCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <XCircle size={14} className="text-red-400" />
          <p className="text-xs text-red-400">
            {failedCount} check{failedCount > 1 ? 's' : ''} failing — fix the issues above before generating the IRN.
          </p>
        </div>
      )}

      {/* Generate IRN Button */}
      <button
        onClick={onGenerateIRN}
        disabled={!isButtonEnabled}
        title={
          !canGenerateIRN
            ? 'Admin role required'
            : !irpConfigured
            ? 'IRP not configured'
            : !allPassed
            ? `${failedCount} validation check(s) failing`
            : status !== 'VALIDATED'
            ? 'Invoice must be VALIDATED before generating IRN'
            : undefined
        }
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-tr-xl rounded-bl-xl text-sm font-bold transition-all ${
          isButtonEnabled
            ? 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-lg shadow-[#8B5CF6]/25'
            : 'bg-[#27272A] text-[#71717A] cursor-not-allowed border border-[#27272A]'
        }`}
      >
        {generating ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            Submitting to IRIS IRP 6…
          </>
        ) : (
          <>
            <Shield size={16} />
            Generate Government IRN
          </>
        )}
      </button>

      {!allPassed && results.length > 0 && (
        <p className="text-[10px] text-center text-[#71717A]">
          All {results.length} checks must pass before IRN generation is enabled.
        </p>
      )}

      {allPassed && irpConfigured && canGenerateIRN && (
        <p className="text-[10px] text-center text-green-400">
          ✓ All checks passed · IRP Connected · Ready to submit to IRIS IRP 6
        </p>
      )}
    </div>
  );
}
