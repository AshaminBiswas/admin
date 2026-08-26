import React, { useState } from 'react';
import { X, Save, RotateCcw, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { StockMovement } from '../../types/admin';
import { inventoryApi } from '../../api/adminApi';

interface MovementEditModalProps {
  movement: StockMovement;
  mode: 'edit_notes' | 'reverse';
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const MovementEditModal: React.FC<MovementEditModalProps> = ({ movement, mode, onClose, onSuccess }) => {
  const [notes, setNotes] = useState<string>(movement.notes || '');
  const [reversalReason, setReversalReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isReverseMode = mode === 'reverse';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isReverseMode) {
        if (!reversalReason.trim()) {
          throw new Error('Please provide an audit reason for this movement reversal');
        }
        await inventoryApi.reverseStockMovement(movement.id, { reason: reversalReason.trim() });
        onSuccess('Stock movement successfully reversed and offsetting audit transaction created');
      } else {
        await inventoryApi.updateStockMovement(movement.id, { notes: notes.trim() });
        onSuccess('Stock movement audit notes updated successfully');
      }
    } catch (err: any) {
      setError(err?.message || 'Error processing request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between bg-slate-50/50 dark:bg-[#09090B]/50">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isReverseMode ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-violet-500/10 text-[#8B5CF6]'
              }`}
            >
              {isReverseMode ? <RotateCcw className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm sm:text-base">
                {isReverseMode ? 'Reverse Movement Transaction' : 'Edit Movement Audit Notes'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#71717A]">
                Ref #{movement.id.slice(0, 8)} • {movement.type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-4 bg-slate-50 dark:bg-[#09090B] border-b border-slate-100 dark:border-[#27272A] text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-[#71717A]">Product:</span>
            <span className="font-bold text-slate-800 dark:text-[#FAFAFA]">{movement.product?.name || 'Product'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-[#71717A]">Facility:</span>
            <span className="font-semibold text-slate-700 dark:text-[#A1A1AA]">{movement.branch?.name || 'Central Facility'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-[#71717A]">Quantity Changed:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">{movement.quantity} Units</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-[#71717A]">Stock Progression:</span>
            <span className="font-mono text-slate-600 dark:text-[#A1A1AA]">
              {movement.previousQty ?? 'N/A'} → {movement.newQty ?? 'N/A'}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isReverseMode ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Reason for Reversal / Rollback <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="State the audit justification for reversing this stock movement (e.g. erroneous manual adjustment entry)..."
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-amber-500"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Executing a reversal will record an inverse transaction and adjust the branch stock balance atomically.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Audit Notes / Justification
              </label>
              <textarea
                rows={3}
                placeholder="Add or update audit reference notes for this transaction..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                required
              />
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5 ${
                isReverseMode
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25'
                  : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/25'
              }`}
            >
              {isReverseMode ? <RotateCcw className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Processing...' : isReverseMode ? 'Confirm Reversal' : 'Save Notes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
