import React, { useState } from 'react';
import {
  Package,
  CheckCircle2,
  X,
  AlertCircle,
  ShoppingBag,
  Warehouse,
} from 'lucide-react';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import { purchaseOrderApi } from '../../api/purchaseOrderApi';

export interface ReceivePoGoodsModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  onSuccess: (updatedPo: PurchaseOrder) => void;
}

export const ReceivePoGoodsModal: React.FC<ReceivePoGoodsModalProps> = ({
  po,
  onClose,
  onSuccess,
}) => {
  const fullPoNo = po.revision > 0 ? `${po.poNumber}-R${po.revision}` : po.poNumber;

  // Initialize receipt quantities with remaining balance
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    po.items.forEach((it) => {
      const remaining = Math.max(0, it.quantity - it.quantityReceived);
      initial[it.id] = remaining;
    });
    return initial;
  });

  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleQtyChange = (itemId: string, maxQty: number, val: string) => {
    const parsed = parseInt(val) || 0;
    const clamped = Math.max(0, Math.min(maxQty, parsed));
    setReceiveQtys((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const handleReceiveAll = () => {
    const all: Record<string, number> = {};
    po.items.forEach((it) => {
      all[it.id] = Math.max(0, it.quantity - it.quantityReceived);
    });
    setReceiveQtys(all);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsPayload = Object.entries(receiveQtys)
      .map(([itemId, quantityReceivedNow]) => ({
        itemId,
        quantityReceivedNow: Number(quantityReceivedNow) || 0,
      }))
      .filter((i) => i.quantityReceivedNow > 0);

    if (itemsPayload.length === 0) {
      setError('Please specify a received quantity greater than 0 for at least one line item.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await purchaseOrderApi.recordGoodsReceipt(po.id, {
        items: itemsPayload,
        invoiceNumber: invoiceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        setError('Failed to record goods receipt.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred while recording goods receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#18181B] border border-zinc-700 w-full max-w-3xl rounded-2xl shadow-2xl text-white overflow-hidden my-auto flex flex-col animate-fadeIn">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 bg-[#09090B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/20">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Receive Goods against PO ({fullPoNo})
              </h2>
              <p className="text-[11px] text-zinc-400">
                Incoming shipment to {po.branch?.name} Depot. Physical inventory will be incremented.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Depot & Supplier Info */}
          <div className="p-3 bg-[#09090B] rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-bold text-white">Supplier: {po.supplier?.name}</div>
              <div className="text-[10px] text-zinc-400">Receiving Depot: {po.branch?.name} ({po.branch?.city || 'Delhi'})</div>
            </div>
            <button
              type="button"
              onClick={handleReceiveAll}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold transition border border-zinc-700 self-start sm:self-auto"
            >
              Fill All Remaining Balances
            </button>
          </div>

          {/* Line Items Receiving Table */}
          <div className="overflow-x-auto border border-zinc-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#09090B] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Item / SKU</th>
                  <th className="py-2.5 px-2 text-right">Ordered</th>
                  <th className="py-2.5 px-2 text-right">Prev. Received</th>
                  <th className="py-2.5 px-2 text-right">Remaining</th>
                  <th className="py-2.5 px-3 text-right w-28">Receiving Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-[#18181B]">
                {po.items.map((it) => {
                  const remaining = Math.max(0, it.quantity - it.quantityReceived);
                  const currInput = receiveQtys[it.id] ?? remaining;
                  const isFullyReceived = remaining === 0;

                  return (
                    <tr key={it.id} className="hover:bg-zinc-900/50 transition">
                      <td className="py-2 px-3">
                        <div className="font-bold text-white">{it.itemName}</div>
                        <div className="font-mono text-[10px] text-zinc-400">{it.itemSku} • {it.unit}</div>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-zinc-300">{it.quantity}</td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-400">{it.quantityReceived}</td>
                      <td className="py-2 px-2 text-right font-mono text-amber-400 font-bold">{remaining}</td>
                      <td className="py-2 px-3 text-right">
                        {isFullyReceived ? (
                          <span className="text-[10px] text-zinc-500 font-semibold">Completed</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={currInput}
                            onChange={(e) => handleQtyChange(it.id, remaining, e.target.value)}
                            className="w-20 bg-[#09090B] text-white text-xs p-1 text-right font-mono font-bold rounded-lg border border-zinc-700 outline-none focus:border-emerald-500"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">
                Vendor Delivery Challan / Invoice #
              </label>
              <input
                type="text"
                placeholder="e.g. INV-9812 / CHAL-004"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-[#09090B] text-white text-xs p-2 rounded-xl border border-zinc-700 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">
                Receiving Notes / Quality Remark
              </label>
              <input
                type="text"
                placeholder="e.g. Received in good condition, batch test verified."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#09090B] text-white text-xs p-2 rounded-xl border border-zinc-700 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            <div className="text-[10px] text-zinc-400">
              Auto-syncs with destination branch inventory & creates audit ledger.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{submitting ? 'Updating Inventory...' : 'Confirm Goods Receipt'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
