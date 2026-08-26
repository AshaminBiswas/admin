import React, { useState } from 'react';
import { X, Save, AlertTriangle, Layers, ShieldCheck, Package } from 'lucide-react';
import { InventoryItem, Branch } from '../../types/admin';
import { inventoryApi } from '../../api/adminApi';

interface StockEditModalProps {
  item: InventoryItem;
  branches: Branch[];
  onClose: () => void;
  onSuccess: () => void;
}

export const StockEditModal: React.FC<StockEditModalProps> = ({ item, branches, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState<number>(item.quantity ?? 0);
  const [reorderLevel, setReorderLevel] = useState<number>(item.reorderLevel || item.product?.reorderLevel || 10);
  const [reservedQuantity, setReservedQuantity] = useState<number>(item.reservedQuantity || 0);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const initialQty = item.quantity ?? 0;
  const qtyDelta = quantity - initialQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await inventoryApi.updateInventoryItem(item.id, {
        quantity,
        reorderLevel,
        reservedQuantity,
      });

      if (res && (res as any).success === false) {
        throw new Error((res as any).message || 'Failed to update stock matrix record');
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Error updating stock matrix record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between bg-slate-50/50 dark:bg-[#09090B]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-[#8B5CF6] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm sm:text-base">
                Edit Stock Matrix Record
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#71717A]">
                Update warehouse balance and safety threshold
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

        {/* Product Details Bar */}
        <div className="p-4 bg-violet-50/50 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-900/30 flex items-center gap-3">
          {item.product?.thumbnail ? (
            <img
              src={item.product.thumbnail}
              alt={item.product.name}
              className="w-10 h-10 rounded-lg object-cover border border-violet-200 dark:border-violet-800 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900 dark:text-[#FAFAFA] text-xs sm:text-sm truncate">
              {item.product?.name || 'Unnamed Product'}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-[#A1A1AA] font-mono mt-0.5">
              <span>SKU: {item.product?.sku || 'N/A'}</span>
              <span>•</span>
              <span className="font-sans font-semibold text-[#8B5CF6]">
                Facility: {item.branch?.name || 'Delhi HQ'} ({item.branch?.code || 'DEL'})
              </span>
            </div>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                On-Hand Quantity (Units)
              </label>
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                required
              />
              {qtyDelta !== 0 && (
                <p className={`text-[10px] mt-1 font-mono font-bold ${qtyDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {qtyDelta > 0 ? `+${qtyDelta}` : qtyDelta} units delta (Logged to Stock Ledger)
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Reorder Alert Level
              </label>
              <input
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(e) => setReorderLevel(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Low-stock warning threshold</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
              Reserved for Orders (Units)
            </label>
            <input
              type="number"
              min={0}
              value={reservedQuantity}
              onChange={(e) => setReservedQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
            <p className="text-[10px] text-slate-400 mt-1">Units locked in pending customer orders</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
              Audit Note / Reason for Change
            </label>
            <input
              type="text"
              placeholder="e.g. Physical inventory cycle count reconciliation"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Updates to stock quantities are automatically logged to the immutable ledger.</span>
          </div>

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
              className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/25 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : 'Save Stock Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
