import React, { useState } from 'react';
import { X, Save, AlertTriangle, Layers, ShieldCheck, Package, CheckCircle2, TrendingUp, TrendingDown, Clock } from 'lucide-react';
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
  const availableQty = Math.max(0, quantity - reservedQuantity);

  const isOutOfStock = availableQty <= 0;
  const isLowStock = availableQty > 0 && availableQty <= reorderLevel;

  const applyDelta = (delta: number) => {
    setQuantity((prev) => Math.max(0, prev + delta));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await inventoryApi.updateInventoryItem(item.id, {
        quantity,
        reorderLevel,
        reservedQuantity,
        notes: notes.trim() || undefined,
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
                Quick delta adjustment, live available balance & audit note
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg transition"
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
              className="w-11 h-11 rounded-lg object-cover border border-violet-200 dark:border-violet-800 flex-shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center flex-shrink-0">
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

        {/* Live Calculation Preview Banner */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-[#09090B] border-b border-slate-200 dark:border-[#27272A] text-center">
          <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A]">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">On-Hand</span>
            <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-[#FAFAFA]">{quantity}</span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A]">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">Reserved</span>
            <span className="text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400">{reservedQuantity}</span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A]">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">Available</span>
            <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{availableQty}</span>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] flex flex-col justify-center items-center">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Status</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isOutOfStock
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  : isLowStock
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA]">
                On-Hand Quantity (Physical Units)
              </label>
              {qtyDelta !== 0 && (
                <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${qtyDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {qtyDelta > 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                  {qtyDelta > 0 ? `+${qtyDelta}` : qtyDelta} units delta
                </span>
              )}
            </div>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              required
            />

            {/* Quick Delta Pills */}
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-slate-400 dark:text-[#71717A] mr-1">Quick Delta:</span>
              {[
                { label: '+1', val: 1 },
                { label: '+5', val: 5 },
                { label: '+10', val: 10 },
                { label: '+25', val: 25 },
                { label: '+50', val: 50 },
                { label: '+100', val: 100 },
                { label: '-1', val: -1 },
                { label: '-5', val: -5 },
                { label: '-10', val: -10 },
                { label: '-25', val: -25 },
              ].map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => applyDelta(pill.val)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition ${
                    pill.val > 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Reserved for Orders
              </label>
              <input
                type="number"
                min={0}
                value={reservedQuantity}
                onChange={(e) => setReservedQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
              <p className="text-[10px] text-slate-400 mt-1">Units locked in pending orders</p>
            </div>
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
            <span>Updates to stock quantities are automatically logged to the immutable ledger with your user credentials.</span>
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
