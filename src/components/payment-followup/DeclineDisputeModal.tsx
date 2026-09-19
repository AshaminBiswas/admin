import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  FileWarning,
  CheckCircle2,
  Loader2,
  Ban,
  Info,
} from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import type { DeclineDisputeInput } from '../../types/paymentFollowup';

interface DeclineDisputeModalProps {
  isOpen: boolean;
  customerId: string;
  customerName: string;
  companyName?: string | null;
  totalOutstanding: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeclineDisputeModal: React.FC<DeclineDisputeModalProps> = ({
  isOpen,
  customerId,
  customerName,
  companyName,
  totalOutstanding,
  onClose,
  onSuccess,
}) => {
  const [actionType, setActionType] = useState<'DISPUTE' | 'DECLINE'>('DISPUTE');
  const [disputeCategory, setDisputeCategory] = useState<
    'INVOICE_DISCREPANCY' | 'GOODS_DAMAGED' | 'RATE_MISMATCH' | 'DELIVERY_DELAYED' | 'TAX_CALCULATION_ISSUE' | 'OTHER'
  >('INVOICE_DISCREPANCY');
  const [reason, setReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayName = companyName || customerName;

  useEffect(() => {
    if (isOpen) {
      setActionType('DISPUTE');
      setDisputeCategory('INVOICE_DISCREPANCY');
      setReason('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanReason = reason.trim();
    if (!cleanReason || cleanReason.length < 8) {
      setErrorMessage('Please provide a specific justification/reason (at least 8 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: DeclineDisputeInput = {
        status: actionType === 'DISPUTE' ? 'DISPUTED' : 'DECLINED',
        reason: cleanReason,
      };

      const res = await paymentFollowupApi.declineOrDispute(customerId, payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.data?.message || 'Failed to update account status.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while updating account status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                actionType === 'DISPUTE'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {actionType === 'DISPUTE' ? <FileWarning size={20} /> : <Ban size={20} />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {actionType === 'DISPUTE' ? 'Mark Account as Disputed' : 'Mark Account as Declined'}
              </h2>
              <p className="text-xs text-zinc-400">
                {displayName} • Outstanding:{' '}
                <span className="font-mono font-bold text-rose-400">
                  ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
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

        {/* Safety Banner */}
        <div className="px-5 py-3 bg-amber-950/30 border-b border-amber-800/40 text-amber-300 text-xs flex items-start gap-2.5">
          <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Automated Queue Protection:</strong> Marking this account as Disputed or Declined
            immediately removes it from automated reminder sequences and bulk notifications. Outstanding
            balances and invoices remain strictly preserved in the ledger.
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-950/50 border-b border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Action toggle */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Action Classification</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#09090B] rounded-xl border border-[#27272A]">
              <button
                type="button"
                onClick={() => setActionType('DISPUTE')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  actionType === 'DISPUTE'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileWarning size={14} />
                <span>Dispute Raised</span>
              </button>
              <button
                type="button"
                onClick={() => setActionType('DECLINE')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  actionType === 'DECLINE'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Ban size={14} />
                <span>Recovery Declined</span>
              </button>
            </div>
          </div>

          {/* Dispute Category if action is DISPUTE */}
          {actionType === 'DISPUTE' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Dispute Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={disputeCategory}
                onChange={(e) => setDisputeCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="INVOICE_DISCREPANCY">Invoice Billing / Quantity Discrepancy</option>
                <option value="GOODS_DAMAGED">Material Damage / Quality Claim</option>
                <option value="RATE_MISMATCH">Pricing / Commercial Rate Mismatch</option>
                <option value="DELIVERY_DELAYED">Delayed Fulfillment / Dispatch Dispute</option>
                <option value="TAX_CALCULATION_ISSUE">GST / Tax Invoice Dispute</option>
                <option value="OTHER">Other Commercial Grievance</option>
              </select>
            </div>
          )}

          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Mandatory Reason / Discussion Summary <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder={
                actionType === 'DISPUTE'
                  ? 'e.g. Customer disputes billing rate on invoice INV-2025-012, claiming 5% bulk discount was not credited.'
                  : 'e.g. Customer refused payment citing firm closure; matter escalated to legal desk.'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272A]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2 ${
                actionType === 'DISPUTE'
                  ? 'bg-amber-600 hover:bg-amber-500 disabled:opacity-50'
                  : 'bg-rose-600 hover:bg-rose-500 disabled:opacity-50'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Confirm Status Update</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
