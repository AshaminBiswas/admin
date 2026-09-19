import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CreditCard,
  Building2,
  Calendar,
  IndianRupee,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import type {
  TraceableDueItem,
  RecordPaymentAllocationInput,
} from '../../types/paymentFollowup';

interface RecordPaymentAllocationModalProps {
  isOpen: boolean;
  customerId: string;
  customerName: string;
  companyName?: string | null;
  totalOutstanding: number;
  initialDueId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordPaymentAllocationModal: React.FC<RecordPaymentAllocationModalProps> = ({
  isOpen,
  customerId,
  customerName,
  companyName,
  totalOutstanding,
  initialDueId,
  onClose,
  onSuccess,
}) => {
  const [allocationMode, setAllocationMode] = useState<'INVOICE_SPECIFIC' | 'OLDEST_DUE_FIRST'>('INVOICE_SPECIFIC');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<string>('RTGS');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bankAccountCredited, setBankAccountCredited] = useState('HDFC Bank - Current A/C (Mandoli Branch)');
  const [notes, setNotes] = useState('');

  // Open dues for invoice-specific allocation
  const [openDues, setOpenDues] = useState<TraceableDueItem[]>([]);
  const [loadingDues, setLoadingDues] = useState(false);
  const [allocationsMap, setAllocationsMap] = useState<Record<string, number>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch open dues on mount / open
  useEffect(() => {
    if (!isOpen || !customerId) return;

    setErrorMessage(null);
    setLoadingDues(true);
    paymentFollowupApi
      .getCustomerDuesDetail(customerId)
      .then((res) => {
        if (res.success && res.data) {
          const pending = (res.data.dues || []).filter((d) => d.balanceDue > 0);
          setOpenDues(pending);

          // If initialDueId is passed, pre-select it
          if (initialDueId) {
            const target = pending.find((d) => d.id === initialDueId);
            if (target) {
              setAmount(target.balanceDue);
              setAllocationsMap({ [target.id]: target.balanceDue });
            }
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load dues for allocation:', err);
      })
      .finally(() => {
        setLoadingDues(false);
      });
  }, [isOpen, customerId, initialDueId]);

  // Reset states on modal close
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setPaymentMode('RTGS');
      setTransactionRef('');
      setNotes('');
      setAllocationsMap({});
      setErrorMessage(null);
    }
  }, [isOpen]);

  const totalAllocated = useMemo(() => {
    return Object.values(allocationsMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [allocationsMap]);

  const numAmount = Number(amount) || 0;
  const remainingOutstanding = Math.max(0, totalOutstanding - numAmount);
  const allocationDelta = numAmount - totalAllocated;

  // Auto-distribute payment across oldest dues
  const handleAutoDistribute = () => {
    if (numAmount <= 0) return;
    let pool = numAmount;
    const newMap: Record<string, number> = {};

    for (const due of openDues) {
      if (pool <= 0) break;
      const canAlloc = Math.min(due.balanceDue, pool);
      newMap[due.id] = Number(canAlloc.toFixed(2));
      pool -= canAlloc;
    }

    setAllocationsMap(newMap);
  };

  const handleSetRowAmount = (dueId: string, val: number) => {
    setAllocationsMap((prev) => ({
      ...prev,
      [dueId]: val,
    }));
  };

  const handleFillRowBalance = (due: TraceableDueItem) => {
    setAllocationsMap((prev) => ({
      ...prev,
      [due.id]: due.balanceDue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    if (paymentMode !== 'CASH' && !transactionRef.trim()) {
      setErrorMessage('Please provide Bank UTR / Cheque / Transaction reference number.');
      return;
    }

    if (allocationMode === 'INVOICE_SPECIFIC') {
      if (totalAllocated <= 0) {
        setErrorMessage('Please allocate payment to at least one invoice or due item.');
        return;
      }
      if (Math.abs(numAmount - totalAllocated) > 0.05) {
        setErrorMessage(
          `Total allocated (₹${totalAllocated.toLocaleString('en-IN')}) does not match payment amount (₹${numAmount.toLocaleString('en-IN')}). Adjust allocations or click Auto-Distribute.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const allocatedEntries = Object.entries(allocationsMap).filter(([_, alloc]) => Number(alloc) > 0);
      const firstTargetId = allocatedEntries[0]?.[0];
      const targetDue = openDues.find((d) => d.id === firstTargetId);

      const payload: RecordPaymentAllocationInput = {
        customerId,
        amount: numAmount,
        paymentMode,
        transactionRef: transactionRef.trim() || undefined,
        paymentDate,
        allocationMode,
        targetId: allocationMode === 'INVOICE_SPECIFIC' ? firstTargetId : undefined,
        targetType: allocationMode === 'INVOICE_SPECIFIC' ? targetDue?.sourceType : undefined,
        notes: notes.trim()
          ? `${notes.trim()}${bankAccountCredited ? ` | Bank: ${bankAccountCredited}` : ''}`
          : bankAccountCredited
          ? `Bank: ${bankAccountCredited}`
          : undefined,
      };

      const res = await paymentFollowupApi.recordPaymentAllocation(payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.data?.message || 'Failed to record payment allocation.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while saving payment allocation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Record Payment Allocation
              </h2>
              <p className="text-xs text-zinc-400">
                {companyName || customerName} • Total Outstanding:{' '}
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

        {/* Error Banner */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-950/50 border-b border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Allocation Mode Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Allocation Method</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#09090B] rounded-xl border border-[#27272A]">
              <button
                type="button"
                onClick={() => setAllocationMode('INVOICE_SPECIFIC')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  allocationMode === 'INVOICE_SPECIFIC'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>Invoice-Specific Allocation</span>
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('OLDEST_DUE_FIRST')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  allocationMode === 'OLDEST_DUE_FIRST'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowRight size={14} />
                <span>Oldest Due First (FIFO)</span>
              </button>
            </div>
          </div>

          {/* Payment Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Payment Received (₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="e.g. 50000.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-emerald-400 font-mono font-bold placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Payment Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Payment Mode <span className="text-rose-400">*</span>
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="RTGS">RTGS</option>
                <option value="NEFT">NEFT</option>
                <option value="IMPS">IMPS</option>
                <option value="UPI">UPI / VPA</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Direct Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Bank UTR / Ref Number {paymentMode !== 'CASH' && <span className="text-rose-400">*</span>}
              </label>
              <input
                type="text"
                required={paymentMode !== 'CASH'}
                placeholder="e.g. HDFC123456789012"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">PRC Bank Account Credited</label>
              <select
                value={bankAccountCredited}
                onChange={(e) => setBankAccountCredited(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="HDFC Bank - Current A/C (Mandoli Branch)">
                  HDFC Bank — Current A/C 50200088991122 (Mandoli Branch)
                </option>
                <option value="ICICI Bank - Current A/C (Dilshad Garden Branch)">
                  ICICI Bank — Current A/C 002105012345 (Dilshad Garden Branch)
                </option>
                <option value="Cash In Hand / Counter Desk">Cash In Hand / Physical Cash Counter</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">Internal Remarks / Narration</label>
              <input
                type="text"
                placeholder="e.g. Settlement against May dispatch or partial on account"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Invoice-Specific Allocation Matrix */}
          {allocationMode === 'INVOICE_SPECIFIC' && (
            <div className="space-y-2 pt-2 border-t border-[#27272A]">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                  <Receipt size={14} className="text-purple-400" />
                  <span>Allocate across Open Invoices & Dues ({openDues.length})</span>
                </div>
                {numAmount > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoDistribute}
                    className="text-[11px] font-bold text-purple-400 hover:text-purple-300 underline"
                  >
                    Auto-Distribute ₹{numAmount.toLocaleString('en-IN')}
                  </button>
                )}
              </div>

              {loadingDues ? (
                <div className="py-6 flex items-center justify-center text-xs text-zinc-500 gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Loading open receivables...</span>
                </div>
              ) : openDues.length === 0 ? (
                <div className="p-3 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-zinc-500 text-center">
                  No open unpaid documents found. Payment will be credited on account.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto border border-[#27272A] rounded-xl divide-y divide-[#27272A]">
                  {openDues.map((due) => {
                    const rowAlloc = allocationsMap[due.id] || 0;
                    return (
                      <div
                        key={due.id}
                        className="p-2.5 bg-[#09090B] hover:bg-[#18181B] transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">{due.documentNumber}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              {due.sourceType}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span>Due: {new Date(due.dueDate).toLocaleDateString('en-IN')}</span>
                            <span>•</span>
                            <span>
                              Bal:{' '}
                              <strong className="text-rose-400 font-mono">
                                ₹{due.balanceDue.toLocaleString('en-IN')}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleFillRowBalance(due)}
                            className="px-2 py-1 rounded bg-[#27272A] hover:bg-[#3F3F46] text-[10px] font-bold text-zinc-300"
                          >
                            Full
                          </button>
                          <div className="relative w-28">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              max={due.balanceDue}
                              step="0.01"
                              value={rowAlloc || ''}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleSetRowAmount(
                                  due.id,
                                  e.target.value === '' ? 0 : parseFloat(e.target.value)
                                )
                              }
                              className="w-full pl-5 pr-2 py-1 rounded-lg bg-[#18181B] border border-[#27272A] text-xs text-right font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Allocation balance status */}
              {numAmount > 0 && (
                <div
                  className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                    Math.abs(allocationDelta) <= 0.05
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Info size={13} />
                    <span>Total Allocated: ₹{totalAllocated.toLocaleString('en-IN')}</span>
                  </span>
                  <span>
                    {Math.abs(allocationDelta) <= 0.05 ? (
                      <strong className="text-emerald-400">✓ Fully Matched</strong>
                    ) : allocationDelta > 0 ? (
                      <strong>₹{allocationDelta.toLocaleString('en-IN')} unallocated</strong>
                    ) : (
                      <strong className="text-rose-400">
                        ₹{Math.abs(allocationDelta).toLocaleString('en-IN')} over-allocated!
                      </strong>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Live Balance Impact Preview */}
          <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Current Dues</div>
              <div className="text-sm font-bold font-mono text-zinc-300 mt-0.5">
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-bold">This Payment</div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                ₹{numAmount.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Remaining Balance</div>
              <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">
                ₹{remainingOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Allocating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Execute Payment Allocation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
