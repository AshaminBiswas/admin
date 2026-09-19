import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Users,
  ShieldCheck,
  Building2,
  Sparkles,
  Info,
} from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import type { BulkActionPreviewResult, BulkActionResult } from '../../types/paymentFollowup';

interface BulkCommunicationModalProps {
  isOpen: boolean;
  selectedCustomerIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkCommunicationModal: React.FC<BulkCommunicationModalProps> = ({
  isOpen,
  selectedCustomerIds,
  onClose,
  onSuccess,
}) => {
  const [actionType, setActionType] = useState<'SEND_LEDGER' | 'SEND_SMS'>('SEND_LEDGER');
  const [previewData, setPreviewData] = useState<BulkActionPreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Email customizations
  const [emailSubject, setEmailSubject] = useState(
    'Statement of Account & Payment Follow-up Notice | PRC Hardware'
  );
  const [emailBody, setEmailBody] = useState(
    'Dear Customer, please find attached your updated Statement of Account. Kindly arrange the pending remittance at earliest.'
  );

  // SMS template
  const [smsTemplate, setSmsTemplate] = useState(
    'Dear {{customer_name}}, outstanding balance of INR {{outstanding_amount}} is pending with PRC Hardware. Kindly arrange payment to HDFC A/C 50200088991122. Thank you.'
  );

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<BulkActionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch preview when modal opens or actionType changes
  useEffect(() => {
    if (!isOpen || selectedCustomerIds.length === 0) return;

    setLoadingPreview(true);
    setExecutionResult(null);
    setErrorMessage(null);

    paymentFollowupApi
      .previewBulk(selectedCustomerIds, actionType)
      .then((res) => {
        if (res.success && res.data) {
          setPreviewData(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to preview bulk action:', err);
        setErrorMessage(err?.message || 'Failed to load preview.');
      })
      .finally(() => {
        setLoadingPreview(false);
      });
  }, [isOpen, selectedCustomerIds, actionType]);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (!previewData || previewData.eligibleCount === 0) return;

    setIsExecuting(true);
    setErrorMessage(null);

    try {
      let res: { success: boolean; data: BulkActionResult };
      const eligibleItems = (previewData.items || []).filter((c) => c.isEligible);
      const customerIdsToProcess = eligibleItems.map((c) => c.customerId);

      if (actionType === 'SEND_LEDGER') {
        res = await paymentFollowupApi.executeBulkLedger(customerIdsToProcess, {
          subject: emailSubject,
          body: emailBody,
        });
      } else {
        res = await paymentFollowupApi.executeBulkSms(customerIdsToProcess, smsTemplate);
      }

      if (res.success && res.data) {
        setExecutionResult(res.data);
        onSuccess();
      } else {
        setErrorMessage(
          res.data?.details?.find((d) => d.status === 'FAILED')?.reason ||
            'Bulk execution encountered errors.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to execute bulk communication.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Bulk Follow-up Communication Engine
              </h2>
              <p className="text-xs text-zinc-400">
                2-Stage Safe Dispatch: Preview & Audit Validation → Resilient Execution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-950/50 border-b border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Channel selector */}
          {!executionResult && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Communication Medium</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#09090B] rounded-xl border border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setActionType('SEND_LEDGER')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    actionType === 'SEND_LEDGER'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Mail size={14} />
                  <span>Email Statement of Account PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('SEND_SMS')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    actionType === 'SEND_SMS'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <MessageSquare size={14} />
                  <span>Send SMS Reminders</span>
                </button>
              </div>
            </div>
          )}

          {/* Results Summary if completed */}
          {executionResult ? (
            <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-4 text-center">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Bulk Communication Completed!</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Execution report across {executionResult.totalSelected} accounts
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Successfully Sent</div>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {executionResult.successful}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Failed Attempts</div>
                  <div className="text-lg font-bold font-mono text-rose-400">
                    {executionResult.failed}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Skipped (Safe Guard)</div>
                  <div className="text-lg font-bold font-mono text-amber-400">
                    {executionResult.skipped}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Preview Statistics Deck */}
              {loadingPreview ? (
                <div className="py-8 flex flex-col items-center justify-center text-xs text-zinc-400 gap-2">
                  <Loader2 size={18} className="animate-spin text-purple-500" />
                  <span>Calculating eligible recipients and auditing exclusion rules...</span>
                </div>
              ) : previewData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div className="p-2.5 rounded-xl bg-[#09090B] border border-emerald-500/30">
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Eligible Customers</div>
                      <div className="text-base font-bold text-emerald-400 font-mono">
                        {previewData.eligibleCount}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#09090B] border border-[#27272A]">
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Total Dues Value</div>
                      <div className="text-base font-bold text-white font-mono">
                        ₹{Math.round(previewData.totalEligibleAmount).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#09090B] border border-amber-500/30">
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Excluded / Skipped</div>
                      <div className="text-base font-bold text-amber-400 font-mono">
                        {previewData.totalSelected - previewData.eligibleCount}
                      </div>
                    </div>
                  </div>

                  {/* Template Customizer */}
                  {actionType === 'SEND_LEDGER' ? (
                    <div className="space-y-2 p-3 rounded-xl bg-[#09090B] border border-[#27272A]">
                      <div className="text-xs font-bold text-purple-300">Email Configuration</div>
                      <div>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Subject line"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <textarea
                          rows={2}
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 rounded-xl bg-[#09090B] border border-[#27272A]">
                      <div className="text-xs font-bold text-purple-300">SMS Template</div>
                      <textarea
                        rows={2}
                        value={smsTemplate}
                        onChange={(e) => setSmsTemplate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-xs text-white font-mono focus:outline-none focus:border-purple-500 resize-none"
                      />
                    </div>
                  )}

                  {/* List of eligible recipients */}
                  {(() => {
                    const eligibleItems = (previewData.items || []).filter((c) => c.isEligible);
                    const skippedCount = previewData.totalSelected - previewData.eligibleCount;
                    return (
                      <>
                        <div className="space-y-1.5">
                          <div className="text-xs font-bold text-zinc-400 flex items-center justify-between">
                            <span>Eligible Recipients ({eligibleItems.length})</span>
                            <span className="text-[10px] text-zinc-500">
                              Excludes Disputed/Declined accounts automatically
                            </span>
                          </div>

                          <div className="max-h-44 overflow-y-auto border border-[#27272A] rounded-xl divide-y divide-[#27272A]">
                            {eligibleItems.map((c) => (
                              <div
                                key={c.customerId}
                                className="p-2 bg-[#09090B] flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-bold text-white">{c.customerName}</span>
                                  {c.companyName && <span className="text-zinc-400"> ({c.companyName})</span>}
                                  <span className="text-zinc-500"> • {c.phone || c.email}</span>
                                </div>
                                <div className="font-mono font-bold text-emerald-400">
                                  ₹{c.outstandingAmount.toLocaleString('en-IN')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Skipped reasons */}
                        {skippedCount > 0 && (
                          <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-300 flex items-center gap-2">
                            <ShieldCheck size={14} className="shrink-0 text-amber-400" />
                            <span>
                              {skippedCount} accounts were skipped because they are marked as
                              Disputed, Declined, or lack contact information.
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : null}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isExecuting}
                  className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isExecuting || !previewData || previewData.eligibleCount === 0}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Dispatching Batch...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Confirm & Dispatch to {previewData?.eligibleCount || 0} Recipients</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
