import React, { useState } from 'react';
import { ArrowRightLeft, Plus, X, AlertTriangle } from 'lucide-react';
import { inventoryApi } from '../../api/adminApi';
import type { Branch, StockTransfer, ProductItem } from '../../types/admin';
import { ProductPicker } from '../common/ProductPicker';

export interface TransferModalProps {
  transfer?: StockTransfer | null;
  branches: Branch[];
  products?: ProductItem[];
  onClose: () => void;
  onSuccess: () => void;
}

interface TransferItemState {
  productId: string;
  quantity: number;
  availableAtSource?: number;
  name?: string;
  sku?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({ transfer, branches, products = [], onClose, onSuccess }) => {
  const isEditing = !!transfer;
  const [fromBranchId, setFromBranchId] = useState<string>(transfer?.fromBranchId || branches[0]?.id || '');
  const [toBranchId, setToBranchId] = useState<string>(transfer?.toBranchId || branches[1]?.id || branches[0]?.id || '');
  const [notes, setNotes] = useState<string>(transfer?.notes || '');
  const [items, setItems] = useState<TransferItemState[]>([
    { productId: String(products[0]?.id || ''), quantity: 5 },
  ]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addItemRow = () => {
    setItems((prev) => [...prev, { productId: String(products[0]?.id || ''), quantity: 1 }]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromBranchId === toBranchId) {
      setError('Origin and Destination facility cannot be the same branch');
      return;
    }

    if (isEditing && transfer) {
      try {
        setSubmitting(true);
        setError(null);
        const res = await inventoryApi.updateStockTransfer(transfer.id, {
          toBranchId,
          notes: notes || undefined,
        });
        if (res && (res as any).success !== false) {
          onSuccess();
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to update transfer');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    for (const item of items) {
      if (item.availableAtSource !== undefined && item.quantity > item.availableAtSource) {
        setError(
          `Cannot transfer ${item.quantity} units of "${item.name || item.sku || 'Product'}". Only ${item.availableAtSource} units available at source branch.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await inventoryApi.createStockTransfer({
        fromBranchId,
        toBranchId,
        notes: notes || undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      });
      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Transfer request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
              Initiate Inter-Branch Transfer
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Source (From) Facility *</label>
              <select
                value={fromBranchId}
                onChange={(e) => setFromBranchId(e.target.value)}
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Destination (To) Facility *</label>
              <select
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
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
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 dark:text-[#FAFAFA] uppercase tracking-wider">Transfer Items</label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs text-[#8B5CF6] hover:text-[#7C3AED] font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add SKU</span>
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-[#09090B] p-3 rounded-xl border border-slate-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <ProductPicker
                      branchId={fromBranchId}
                      value={item.productId}
                      onChange={(p) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? {
                                  ...it,
                                  productId: p.id,
                                  availableAtSource: p.branchAvailable,
                                  name: p.name,
                                  sku: p.sku,
                                }
                              : it
                          )
                        )
                      }
                      placeholder="Search SKU to transfer..."
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded mt-1 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-[#27272A]">
                  <div className="w-44">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Transfer Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, quantity: Math.max(1, parseInt(e.target.value) || 1) } : it
                          )
                        )
                      }
                      className={`w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border rounded-lg text-xs font-mono text-right font-bold ${
                        item.availableAtSource !== undefined && item.quantity > item.availableAtSource
                          ? 'border-rose-500 text-rose-600 bg-rose-50/50'
                          : 'border-slate-200 dark:border-[#27272A] text-slate-800 dark:text-[#FAFAFA]'
                      }`}
                    />
                  </div>

                  {item.availableAtSource !== undefined && item.quantity > item.availableAtSource && (
                    <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Exceeds source stock ({item.availableAtSource} available)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Transfer Reason / Purpose</label>
            <textarea
              rows={2}
              placeholder="e.g. Replenishing Kolkata depot for East region demand surge"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
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
              {submitting ? 'Requesting...' : 'Request Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
