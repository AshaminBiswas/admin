import React, { useState, useMemo } from 'react';
import { ShoppingBag, Plus, X, AlertTriangle } from 'lucide-react';
import { inventoryApi } from '../../api/adminApi';
import type { Branch, Supplier, Purchase, ProductItem } from '../../types/admin';
import { ProductPicker } from '../common/ProductPicker';

export interface PurchaseModalProps {
  purchase?: Purchase | null;
  branches: Branch[];
  suppliers: Supplier[];
  products?: ProductItem[];
  onClose: () => void;
  onSuccess: () => void;
}

interface PurchaseItemRowState {
  mode: 'catalog' | 'custom';
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPurchasePrice: number;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ purchase, branches, suppliers, products = [], onClose, onSuccess }) => {
  const isEditing = !!purchase;
  const [branchId, setBranchId] = useState<string>(purchase?.branchId || branches[0]?.id || 'PRC_STOCK');
  const [supplierId, setSupplierId] = useState<string>(purchase?.supplierId || (suppliers[0]?.id || 'CUSTOM'));
  const [customSupplierName, setCustomSupplierName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(purchase?.invoiceNumber || '');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    purchase?.purchaseDate
      ? new Date(purchase.purchaseDate).toISOString().split('T')[0]
      : purchase?.createdAt
      ? new Date(purchase.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>(purchase?.notes || '');

  const [items, setItems] = useState<PurchaseItemRowState[]>([
    {
      mode: 'catalog',
      productId: String(products[0]?.id || ''),
      sku: '',
      name: '',
      quantity: 10,
      unitPurchasePrice: Number(products[0]?.price || 0),
    },
  ]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addItemRow = (mode: 'catalog' | 'custom' = 'catalog') => {
    setItems((prev) => [
      ...prev,
      {
        mode,
        productId: mode === 'catalog' ? String(products[0]?.id || '') : '',
        sku: '',
        name: '',
        quantity: 1,
        unitPurchasePrice: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        return { ...it, [field]: value };
      })
    );
  };

  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPurchasePrice) || 0), 0);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBranchId = branchId || 'PRC_STOCK';
    const effectiveSupplierId = supplierId === 'CUSTOM' || !supplierId ? (suppliers[0]?.id || 'sup-default') : supplierId;

    if (!effectiveBranchId) {
      setError('Please select receiving destination facility');
      return;
    }

    if (isEditing && purchase) {
      try {
        setSubmitting(true);
        setError(null);
        const res = await inventoryApi.updatePurchase(purchase.id, {
          supplierId: effectiveSupplierId,
          invoiceNumber: invoiceNumber || undefined,
          purchaseDate,
          notes: (notes || '') + (supplierId === 'CUSTOM' && customSupplierName ? ` | Supplier: ${customSupplierName}` : ''),
        });
        if (res && (res as any).success !== false) {
          onSuccess();
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to update purchase record');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (items.length === 0) {
      setError('At least one item is required');
      return;
    }

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      if (it.mode === 'catalog' && !it.productId) {
        setError(`Row #${idx + 1}: Please select a product from catalog or switch to New SKU mode.`);
        return;
      }
      if (it.mode === 'custom' && (!it.sku.trim() || !it.name.trim())) {
        setError(`Row #${idx + 1}: SKU and Product Name are required for new incoming stock.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await inventoryApi.createPurchase({
        branchId: effectiveBranchId,
        supplierId: effectiveSupplierId,
        invoiceNumber: invoiceNumber || undefined,
        purchaseDate,
        notes: (notes || '') + (supplierId === 'CUSTOM' && customSupplierName ? ` | Supplier: ${customSupplierName}` : ''),
        items: items.map((i) => ({
          ...(i.mode === 'catalog' && i.productId
            ? { productId: i.productId }
            : { sku: i.sku.trim().toUpperCase(), name: i.name.trim() }),
          quantity: Number(i.quantity),
          unitPurchasePrice: Number(i.unitPurchasePrice),
        })),
      });

      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to record purchase stock-in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
              {isEditing ? 'Edit Purchase Order Metadata' : 'Record Purchase & Stock-In ("Kahan Se Kharida")'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Destination Facility *</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="PRC_STOCK">🏢 PRC STOCK (Central Allocation)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.code}] {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Vendor / Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.gstNumber ? `(GST: ${s.gstNumber})` : ''}
                  </option>
                ))}
                <option value="CUSTOM">+ New / Direct Vendor</option>
              </select>
            </div>

            {supplierId === 'CUSTOM' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Vendor / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Industrial Wholesale Corp"
                  value={customSupplierName}
                  onChange={(e) => setCustomSupplierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Vendor Invoice / Reference #</label>
              <input
                type="text"
                placeholder="e.g. INV-2026-9812"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#27272A]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA] uppercase tracking-wider">Purchase Line Items</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addItemRow('catalog')}
                  className="text-xs text-[#8B5CF6] hover:text-[#7C3AED] font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-[#8B5CF6]/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Catalog Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => addItemRow('custom')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New SKU / Item</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-[#09090B] p-3 rounded-xl border border-slate-200 dark:border-[#27272A] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/50 dark:border-[#27272A]">
                    <div className="flex items-center gap-1 text-[11px] font-semibold">
                      <span className="text-slate-400 font-mono">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => updateItem(idx, 'mode', item.mode === 'catalog' ? 'custom' : 'catalog')}
                        className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                          item.mode === 'catalog'
                            ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30'
                            : 'bg-indigo-500/15 text-indigo-500 border border-indigo-500/30'
                        }`}
                      >
                        {item.mode === 'catalog' ? '🔍 Existing Catalog Product' : '✨ New SKU Registration'}
                      </button>
                      <span className="text-[10px] text-slate-400 ml-1">
                        (click pill to switch)
                      </span>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {item.mode === 'catalog' ? (
                    <div>
                      <ProductPicker
                        value={item.productId}
                        onChange={(p) => {
                          updateItem(idx, 'productId', p.id);
                          if (p.price && (!item.unitPurchasePrice || item.unitPurchasePrice === 0)) {
                            updateItem(idx, 'unitPurchasePrice', p.price);
                          }
                        }}
                        showBranchMetrics={false}
                        placeholder="Search product to restock..."
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Product Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Heavy Duty Brass Bolt 12mm"
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-800 dark:text-[#FAFAFA] font-medium focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">SKU *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. HEX-12-SS"
                          value={item.sku}
                          onChange={(e) => updateItem(idx, 'sku', e.target.value.toUpperCase())}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-mono uppercase font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1 border-t border-slate-200/60 dark:border-[#27272A]">
                    <div className="w-32">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-mono text-right font-bold text-slate-800 dark:text-[#FAFAFA]"
                      />
                    </div>

                    <div className="w-40">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Unit Cost (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit Price ₹"
                        value={item.unitPurchasePrice}
                        onChange={(e) => updateItem(idx, 'unitPurchasePrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-mono text-right font-bold text-slate-800 dark:text-[#FAFAFA]"
                      />
                    </div>

                    <div className="flex-1 text-right">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Line Total</span>
                      <span className="font-mono font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                        ₹{((item.quantity || 0) * (item.unitPurchasePrice || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 p-3.5 bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA]">Total Purchase Amount:</span>
              <span className="text-base font-extrabold text-[#8B5CF6] dark:text-[#A855F7] font-mono">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Procurement Notes / Batch Details</label>
            <textarea
              rows={2}
              placeholder="e.g. Received via logistics depot, physical count verified"
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
              {submitting ? 'Recording Stock-In...' : 'Confirm & Stock-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
