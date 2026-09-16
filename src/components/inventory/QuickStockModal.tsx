import React, { useState, useRef } from 'react';
import { Plus, X, Loader2, Sparkles, Building2 } from 'lucide-react';
import { inventoryApi, fetchAdminApi } from '../../api/adminApi';
import type { Branch } from '../../types/admin';
import { syncProductUpdate } from '../../utils/productSync';

export interface QuickStockModalProps {
  branches: Branch[];
  categories: any[];
  onClose: () => void;
  onSuccess: (data?: any) => void;
}

type FinishType = 'SS' | 'NA' | 'NYLON';
const FINISH_COLOUR_MAP: Record<FinishType, string[]> = {
  SS: ['Golden', 'Black', 'SS'],
  NA: ['Black', 'NA Aluminium'],
  NYLON: ['Black'],
};

export const QuickStockModal: React.FC<QuickStockModalProps> = ({ branches, categories, onClose, onSuccess }) => {
  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('PRC_STOCK');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [categoryId, setCategoryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [finish, setFinish] = useState<FinishType>('SS');
  const [colour, setColour] = useState<string>('Golden');
  const [height, setHeight] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [length, setLength] = useState<string>('');

  const handleFinishChange = (newFinish: FinishType) => {
    setFinish(newFinish);
    const validColours = FINISH_COLOUR_MAP[newFinish];
    if (!validColours.includes(colour)) {
      setColour(validColours[0]);
    }
  };

  const [existingProductInfo, setExistingProductInfo] = useState<{ id: string; name: string; stock: number; price?: number; reorderLevel?: number } | null>(null);
  const [checkingSku, setCheckingSku] = useState<boolean>(false);
  const skuCheckTimeoutRef = useRef<any>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSkuChange = (val: string) => {
    const formattedSku = val.toUpperCase();
    setSku(formattedSku);

    if (skuCheckTimeoutRef.current) {
      clearTimeout(skuCheckTimeoutRef.current);
    }

    if (!formattedSku.trim() || formattedSku.trim().length < 2) {
      setExistingProductInfo(null);
      return;
    }

    skuCheckTimeoutRef.current = setTimeout(async () => {
      try {
        setCheckingSku(true);
        const res = await fetchAdminApi<any>(`/products?search=${encodeURIComponent(formattedSku.trim())}&limit=5`);
        if (res?.success !== false) {
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.products) ? res.products : Array.isArray(res) ? res : [];
          const matched = list.find((p: any) => p.sku?.toUpperCase() === formattedSku.trim());
          if (matched) {
            setExistingProductInfo({
              id: matched.id,
              name: matched.name,
              stock: Number(matched.stock) || 0,
              price: matched.price,
              reorderLevel: matched.reorderLevel,
            });
            if (!name) setName(matched.name);
            if (!sellingPrice && matched.price) setSellingPrice(String(matched.price));
            if (matched.reorderLevel) setReorderLevel(matched.reorderLevel);
            if (matched.categoryId) setCategoryId(String(matched.categoryId));
          } else {
            setExistingProductInfo(null);
          }
        }
      } catch (err) {
        console.warn('SKU check warning:', err);
      } finally {
        setCheckingSku(false);
      }
    }, 280);
  };

  const totalProductStockSum = (existingProductInfo?.stock || 0) + (Number(quantity) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      setError('SKU and Product Name are required');
      return;
    }
    if (!branchId) {
      setError('Please select a destination facility (e.g. PRC STOCK)');
      return;
    }
    if (!quantity || quantity < 1) {
      setError('Initial stock quantity must be at least 1');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await inventoryApi.quickStock({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        branchId,
        quantity: Number(quantity),
        unitCost: unitCost ? parseFloat(unitCost) : 0,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
        reorderLevel: Number(reorderLevel) || 10,
        categoryId: categoryId || undefined,
        notes: notes.trim() || undefined,
        finish,
        colour,
        height: height ? parseFloat(height) : undefined,
        width: width ? parseFloat(width) : undefined,
        length: length ? parseFloat(length) : undefined,
      });

      if (res && res.success !== false) {
        const prod = (res as any)?.product || (res as any)?.data?.product;
        if (prod) {
          syncProductUpdate(prod, existingProductInfo ? 'UPDATE' : 'CREATE');
        }
        onSuccess(res.data || res);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to add SKU and stock entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
                Add SKU & Allocate Stock
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#71717A]">
                Registers catalog SKU and assigns initial warehouse stock
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* SKU Field with live checking */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA]">
                Product SKU / Barcode *
              </label>
              {checkingSku && (
                <span className="text-[10px] text-[#8B5CF6] flex items-center gap-1 font-mono">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking catalog...
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="e.g. HEX-SS-M10, PRC-HINGE-01"
              value={sku}
              onChange={(e) => handleSkuChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono uppercase font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
            {existingProductInfo && (
              <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-400 flex items-center justify-between">
                <span>
                  Existing Product: <strong>"{existingProductInfo.name}"</strong>
                </span>
                <span className="font-mono font-bold">
                  Existing Stock: {existingProductInfo.stock} units
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Stainless Steel Hex Bolt M10 x 50mm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          {/* Finish & Colour */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Finish
              </label>
              <select
                value={finish}
                onChange={(e) => handleFinishChange(e.target.value as FinishType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="SS">SS (Stainless Steel)</option>
                <option value="NA">NA (Natural Anodised)</option>
                <option value="NYLON">NYLON</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Colour
              </label>
              <select
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                {FINISH_COLOUR_MAP[finish].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dimensions (in mm, not mandatory) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Height (mm)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Optional"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Width (mm)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Optional"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Length (mm)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Optional"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Destination Warehouse *
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="PRC_STOCK">🏢 PRC STOCK (Central Master)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.code}] {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Initial Stock Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Unit Purchase Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="₹ Cost"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Selling Price / MRP (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="₹ Price"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Reorder Alert Level
              </label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="">Select Category (Optional)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
              Internal Stock Inbound Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Initial stock intake from central manufacturing batch"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          {existingProductInfo && (
            <div className="p-3 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-[#A1A1AA]">
                Consolidated Stock Post-Addition:
              </span>
              <span className="font-mono font-extrabold text-[#8B5CF6] dark:text-[#A855F7]">
                {totalProductStockSum} Units
              </span>
            </div>
          )}

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
              <Sparkles className="w-3.5 h-3.5" />
              <span>{submitting ? 'Registering SKU...' : '+ Add SKU & Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
