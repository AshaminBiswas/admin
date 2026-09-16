import React, { useState } from 'react';
import { SlidersHorizontal, X, AlertTriangle } from 'lucide-react';
import { inventoryApi } from '../../api/adminApi';
import type { Branch, ProductItem } from '../../types/admin';
import { ProductPicker } from '../common/ProductPicker';

export interface AdjustmentModalProps {
  branches: Branch[];
  products?: ProductItem[];
  targetProduct: { id: string; name: string; sku: string; branchId: string; currentQty: number } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({ branches, products = [], targetProduct, onClose, onSuccess }) => {
  const [branchId, setBranchId] = useState<string>(targetProduct?.branchId || branches[0]?.id || '');
  const [productId, setProductId] = useState<string>(targetProduct?.id || String(products[0]?.id || ''));
  const [type, setType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'RETURN_IN'>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 3) {
      setError('A valid explanatory reason is required for all stock adjustments');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await inventoryApi.adjustStock({
        branchId,
        productId,
        type,
        quantity: Number(quantity),
        reason,
      });

      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Stock adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
              Adjust Stock & Log Ledger
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Target Product / SKU *</label>
            {targetProduct ? (
              <div className="p-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-[#FAFAFA] block">{targetProduct.name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-[#71717A] font-mono">SKU: {targetProduct.sku}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 block">Current Qty</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA]">{targetProduct.currentQty}</span>
                </div>
              </div>
            ) : (
              <ProductPicker
                value={productId}
                onChange={(p) => setProductId(p.id)}
                showBranchMetrics={true}
                branchId={branchId}
                placeholder="Search product to adjust..."
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Facility *</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Adjustment Action *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ADJUSTMENT_IN">➕ Increase Stock (+ Count)</option>
                <option value="ADJUSTMENT_OUT">➖ Decrease Stock (- Count)</option>
                <option value="DAMAGE">⚠️ Damage / Breakage Write-off</option>
                <option value="RETURN_IN">📦 Customer / Order Return (+)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Quantity *</label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Audit Reason / Justification *</label>
            <input
              type="text"
              required
              placeholder="e.g. Physical inventory cycle count reconciliation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

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
              className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-md shadow-[#8B5CF6]/25 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Applying Adjustment...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
