import React, { useState } from 'react';
import { X, Calendar, CreditCard, DollarSign, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import type { AddCustomerBalanceEntryInput } from '../../types/paymentFollowup';

interface AddCustomerBalanceModalProps {
  isOpen: boolean;
  customerId: string | null;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddCustomerBalanceModal: React.FC<AddCustomerBalanceModalProps> = ({
  isOpen,
  customerId,
  customerName,
  onClose,
  onSuccess,
}) => {
  const [entryType, setEntryType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [amount, setAmount] = useState<string>('');
  const [referenceDate, setReferenceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !customerId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!referenceDate) {
      setError('Please select a valid date.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: AddCustomerBalanceEntryInput = {
        amount: numAmount,
        entryType,
        referenceDate,
        referenceNumber: referenceNumber.trim() || undefined,
        paymentMode: entryType === 'CREDIT' ? paymentMode : undefined,
        notes: notes.trim() || undefined,
      };

      const res = await paymentFollowupApi.addCustomerBalanceEntry(customerId, payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to record balance entry.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred while saving balance entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard size={18} className="text-purple-400" />
              <span>Add Customer Balance / Payment</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Customer: <span className="text-zinc-200 font-semibold">{customerName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Entry Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Entry Type <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEntryType('DEBIT')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  entryType === 'DEBIT'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-200 ring-1 ring-rose-500/30'
                    : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-bold text-xs">Debit (Add Dues / Bill)</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Increases customer balance owed
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEntryType('CREDIT')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  entryType === 'CREDIT'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 ring-1 ring-emerald-500/30'
                    : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-bold text-xs">Credit (Past Payment)</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Reduces customer balance owed
                </div>
              </button>
            </div>
          </div>

          {/* Amount and Custom Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Amount (₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-sm font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-white font-mono text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Date <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Select actual historical or invoice date</p>
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Reference # (Bill / Challan / UTR / Cheque)
            </label>
            <input
              type="text"
              placeholder="e.g. INV-2023-049, UTR482910, CHQ-1049"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Payment Mode (only when Credit) */}
          {entryType === 'CREDIT' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Payment Mode <span className="text-rose-400">*</span>
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="BANK_TRANSFER">Bank Transfer (RTGS / NEFT / IMPS)</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other Commercial Instrument</option>
              </select>
            </div>
          )}

          {/* Remarks / Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Remarks / Transaction Notes
            </label>
            <textarea
              rows={3}
              placeholder="Optional details e.g. 'Old material bill from factory delivery' or 'Received via Axis Bank'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#27272A]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-[#18181B] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow flex items-center gap-2 ${
                entryType === 'DEBIT'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              <span>{entryType === 'DEBIT' ? 'Add Debit Balance' : 'Record Past Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
