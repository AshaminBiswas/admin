import React, { useState, useEffect, useRef } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { inventoryApi, fetchAdminApi } from '../api/adminApi';
import type { Branch } from '../types/admin';
import { syncProductUpdate } from '../utils/productSync';
import { getCachedCategories } from '../utils/referenceDataCache';
import {
  ChevronLeft,
  Boxes,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  Ruler,
  Palette,
  Package,
  IndianRupee,
  Layers,
  ArrowRight,
  Info,
  Tag,
  Home,
  ChevronRight as BreadArrow,
} from 'lucide-react';

type FinishType = 'SS' | 'NA' | 'NYLON';

const FINISH_COLOUR_MAP: Record<FinishType, { name: string; hex: string }[]> = {
  SS: [
    { name: 'Golden', hex: '#F59E0B' },
    { name: 'Black', hex: '#18181B' },
    { name: 'SS', hex: '#94A3B8' },
  ],
  NA: [
    { name: 'Black', hex: '#18181B' },
    { name: 'NA Aluminium', hex: '#CBD5E1' },
  ],
  NYLON: [
    { name: 'Black', hex: '#18181B' },
  ],
};

export const AddSkuPage: React.FC = () => {
  const { setCurrentView } = useAdminAuth();

  // Reference Data
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const cached = localStorage.getItem('prc_cached_branches');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('prc_admin_categories_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Core Form Fields
  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('PRC_STOCK');
  const [quantity, setQuantity] = useState<string>('10');
  const [reorderLevel, setReorderLevel] = useState<string>('10');
  const [categoryId, setCategoryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Finish & Dependent Colour Fields
  const [finish, setFinish] = useState<FinishType>('SS');
  const [colour, setColour] = useState<string>('Golden');

  // Dimensions (Optional, in mm)
  const [height, setHeight] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [length, setLength] = useState<string>('');

  // Pricing (Optional)
  const [unitCost, setUnitCost] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');

  // Catalog checking state
  const [checkingSku, setCheckingSku] = useState<boolean>(false);
  const [existingProductInfo, setExistingProductInfo] = useState<{
    id: string;
    name: string;
    stock: number;
    price?: number;
    reorderLevel?: number;
  } | null>(null);
  const skuCheckTimeoutRef = useRef<any>(null);

  // Status & Feedback
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load facilities if cache was empty
  useEffect(() => {
    let isMounted = true;
    if (branches.length === 0) {
      inventoryApi.getBranches().then((res) => {
        if (isMounted && res.data) {
          setBranches(res.data);
          try {
            localStorage.setItem('prc_cached_branches', JSON.stringify(res.data));
          } catch {}
        }
      }).catch(() => {});
    }
    if (categories.length === 0) {
      fetchAdminApi<any>('/categories').then((res) => {
        if (isMounted) {
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setCategories(list);
        }
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [branches.length, categories.length]);

  // Handle Finish Change and sync Colour
  const handleFinishChange = (newFinish: FinishType) => {
    setFinish(newFinish);
    const validColours = FINISH_COLOUR_MAP[newFinish];
    const stillValid = validColours.some((c) => c.name.toLowerCase() === colour.toLowerCase());
    if (!stillValid) {
      setColour(validColours[0].name);
    }
  };

  // Live SKU check against catalog
  const handleSkuChange = (val: string) => {
    const formattedSku = val.toUpperCase().trimStart();
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
            if (matched.reorderLevel) setReorderLevel(String(matched.reorderLevel));
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('SKU Name is mandatory');
      return;
    }

    if (!sku.trim()) {
      setError('Product SKU / Barcode is mandatory');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        branchId,
        quantity: quantity !== '' ? Number(quantity) : 0,
        reorderLevel: reorderLevel !== '' ? Number(reorderLevel) : 10,
        unitCost: unitCost !== '' ? parseFloat(unitCost) : 0,
        sellingPrice: sellingPrice !== '' ? parseFloat(sellingPrice) : undefined,
        categoryId: categoryId || undefined,
        notes: notes.trim() || undefined,
        finish,
        colour,
        height: height !== '' ? parseFloat(height) : undefined,
        width: width !== '' ? parseFloat(width) : undefined,
        length: length !== '' ? parseFloat(length) : undefined,
      };

      const res = await inventoryApi.quickStock(payload);

      if (res && res.success !== false) {
        const prod = (res as any)?.product || (res as any)?.data?.product;
        if (prod) {
          syncProductUpdate(prod, existingProductInfo ? 'UPDATE' : 'CREATE');
        }

        showToast(`SKU '${payload.sku}' added and allocated successfully!`, 'success');
        setTimeout(() => {
          setCurrentView('inventory');
        }, 800);
      } else {
        throw new Error((res as any)?.message || 'Failed to register SKU and stock');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to add SKU and allocate stock');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBranch = branches.find((b) => b.id === branchId);
  const branchDisplayName = branchId === 'PRC_STOCK' ? 'Central Allocation (All Facilities)' : (selectedBranch?.name || 'Selected Facility');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold animate-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#27272A] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentView('inventory')}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#27272A] text-slate-500 hover:text-slate-900 dark:hover:text-[#FAFAFA] rounded-xl transition"
              title="Return to Inventory Hub"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2.5">
              <span className="p-2 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-xl">
                <Boxes className="w-6 h-6" />
              </span>
              <span>Add SKU & Allocate Stock</span>
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/50 text-[#8B5CF6] border border-violet-200 dark:border-violet-800 uppercase tracking-wide">
              Dedicated Page
            </span>
          </div>
          <nav className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#71717A] ml-8">
            <Home size={11} className="text-slate-400 dark:text-[#52525B]" />
            <BreadArrow size={11} className="text-slate-300 dark:text-[#52525B]" />
            <span>Catalog & Operations</span>
            <BreadArrow size={11} className="text-slate-300 dark:text-[#52525B]" />
            <button
              type="button"
              onClick={() => setCurrentView('inventory')}
              className="hover:text-[#8B5CF6] transition font-medium"
            >
              Warehouse Allocations
            </button>
            <BreadArrow size={11} className="text-slate-300 dark:text-[#52525B]" />
            <span className="text-[#8B5CF6] font-semibold">Add SKU & Stock</span>
          </nav>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setCurrentView('inventory')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#3F3F46] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/25 transition active:scale-95"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>{submitting ? 'Saving SKU...' : 'Save SKU & Allocate'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-2xl flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Inputs (2 cols on desktop) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Card 1: SKU & Core Master Information */}
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272A] pb-3.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#8B5CF6]" />
                <span>1. SKU & Core Identification</span>
              </h3>
              <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
                * SKU Name is Mandatory
              </span>
            </div>

            <div className="space-y-4">
              {/* SKU Name (MANDATORY) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  SKU Name / Product Title <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heavy Duty Mortise Lock Body 60mm, Concealed Hinge SS 304"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] font-medium focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition"
                />
              </div>

              {/* SKU Code & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SKU Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA]">
                      SKU Code / Barcode <span className="text-rose-500 font-bold">*</span>
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
                    placeholder="e.g. ML-SS-60MM, CH-304-B"
                    value={sku}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono uppercase font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition"
                  />
                  {existingProductInfo ? (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      Matches existing catalog product ({existingProductInfo.stock} units currently on hand).
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 dark:text-[#71717A] mt-1 font-mono">
                      Will be registered as a brand new catalog product and synced to storefront.
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                    Product Category <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition"
                  >
                    <option value="">No Category / General Hardware</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Material Finish & Color Specification (Dynamic Dependency) */}
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272A] pb-3.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#8B5CF6]" />
                <span>2. Finish & Dynamic Colour Specification</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Finish: <strong>{finish}</strong> | Colour: <strong>{colour}</strong>
              </span>
            </div>

            <div className="space-y-4">
              {/* Field 1: Finish = {SS, NA, NYLON} */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-2">
                  Material Finish
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'SS', label: 'SS', title: 'Stainless Steel', desc: 'Grade 304/316 Steel' },
                      { id: 'NA', label: 'NA', title: 'Natural Anodised', desc: 'Anodised Aluminium' },
                      { id: 'NYLON', label: 'NYLON', title: 'Nylon', desc: 'Polyamide 6 Polymer' },
                    ] as const
                  ).map((f) => {
                    const isSelected = finish === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleFinishChange(f.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-slate-900 dark:text-[#FAFAFA] shadow-sm'
                            : 'border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] hover:border-slate-300 dark:hover:border-[#3F3F46]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-[#8B5CF6]' : ''}`}>
                            {f.label}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#8B5CF6]" />}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-[#FAFAFA] mt-1">
                          {f.title}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-[#71717A] mt-0.5">
                          {f.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 2: Colour (Dependent on Finish) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-2">
                  Colour / Surface Shade <span className="text-slate-400 font-normal">(Dynamic for {finish})</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {FINISH_COLOUR_MAP[finish].map((c) => {
                    const isSelected = colour.toLowerCase() === c.name.toLowerCase();
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setColour(c.name)}
                        className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all ${
                          isSelected
                            ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-slate-900 dark:text-[#FAFAFA] shadow-sm'
                            : 'border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] hover:border-slate-300 dark:hover:border-[#3F3F46]'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 shadow-inner flex-shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#8B5CF6]' : ''}`}>
                            {c.name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-[#71717A]">
                            For {finish}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#8B5CF6] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Size & Dimensions (Optional - in mm) */}
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272A] pb-3.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#8B5CF6]" />
                <span>3. Size & Dimensions (Optional — in mm)</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Unit: mm</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Height */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Height <span className="text-slate-400 font-normal">(Not mandatory)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 100"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">mm</span>
                </div>
              </div>

              {/* Width */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Width <span className="text-slate-400 font-normal">(Not mandatory)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 50"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">mm</span>
                </div>
              </div>

              {/* Length */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Length <span className="text-slate-400 font-normal">(Not mandatory)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 250"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">mm</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#09090B] rounded-xl border border-slate-200/60 dark:border-[#27272A] flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-[#8B5CF6] flex-shrink-0" />
              <span>All dimensions are recorded in millimeters (mm). Fields left blank default to standard catalog specifications.</span>
            </div>
          </div>

          {/* Card 4: Warehouse Allocation & Pricing */}
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272A] pb-3.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#8B5CF6]" />
                <span>4. Warehouse Stock Allocation & Pricing</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Destination: {branchDisplayName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Destination Facility */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Destination Warehouse / Facility
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition"
                >
                  <option value="PRC_STOCK">PRC STOCK (Central Master Allocation)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.code ? `(${b.code})` : ''} - {b.city || 'Facility'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Initial Stock Quantity <span className="text-slate-400 font-normal">(Units)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition"
                />
              </div>

              {/* Unit Purchase Cost (NOT MANDATORY) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Unit Cost / Purchase Price (₹) <span className="text-slate-400 font-normal">(Not mandatory)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition"
                  />
                </div>
              </div>

              {/* Selling Price / MRP (NOT MANDATORY) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Selling Price / MRP (₹) <span className="text-slate-400 font-normal">(Not mandatory)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition"
                  />
                </div>
              </div>

              {/* Reorder Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Reorder Alert Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="10"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition"
                />
              </div>

              {/* Notes / Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Audit Notes / Reason <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Initial stock intake from manufacturer"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentView('inventory')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#3F3F46] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-[#8B5CF6]/30 transition active:scale-95"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{submitting ? 'Registering SKU & Stock...' : 'Save SKU & Allocate Stock'}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Live Dossier Preview */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 sm:p-6 shadow-sm space-y-5 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
                <span>Live SKU Dossier Preview</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase">
                Active Catalog
              </span>
            </div>

            {/* Product Card Preview */}
            <div className="p-4 bg-slate-50 dark:bg-[#09090B] rounded-xl border border-slate-200/60 dark:border-[#27272A] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-[#8B5CF6] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#8B5CF6]/15 text-[#8B5CF6] rounded-md">
                      {sku || 'NEW-SKU-CODE'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-[#FAFAFA] mt-1 line-clamp-2">
                    {name || 'Product Title / SKU Name'}
                  </h4>
                </div>
              </div>

              {/* Badges / Specifications Row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  Finish: {finish}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-[#27272A] text-slate-800 dark:text-slate-200">
                  Colour: {colour}
                </span>
                {(height || width || length) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    {length ? `${length}L × ` : ''}{width ? `${width}W × ` : ''}{height ? `${height}H ` : ''}mm
                  </span>
                )}
              </div>

              {/* Allocation Stats */}
              <div className="pt-2 border-t border-slate-200 dark:border-[#27272A] grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Allocated Quantity</span>
                  <strong className="text-slate-900 dark:text-[#FAFAFA] text-xs font-mono font-bold">
                    +{quantity || 0} Units
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Destination Facility</span>
                  <strong className="text-slate-900 dark:text-[#FAFAFA] text-xs truncate block">
                    {branchDisplayName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Selling Price / MRP</span>
                  <strong className="text-slate-900 dark:text-[#FAFAFA] text-xs font-mono">
                    {sellingPrice ? `₹${parseFloat(sellingPrice).toLocaleString('en-IN')}` : 'Not Specified'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Unit Purchase Cost</span>
                  <strong className="text-slate-900 dark:text-[#FAFAFA] text-xs font-mono">
                    {unitCost ? `₹${parseFloat(unitCost).toLocaleString('en-IN')}` : '₹0.00'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Architecture Synchronizer Alert */}
            <div className="p-3.5 bg-[#8B5CF6]/5 rounded-xl border border-[#8B5CF6]/20 text-xs space-y-1.5 text-slate-600 dark:text-[#A1A1AA]">
              <div className="flex items-center gap-1.5 text-[#8B5CF6] font-bold text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero-Downtime Catalog Broadcast</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Saving this SKU executes an atomic transaction creating the physical inventory ledger row and broadcasting real-time updates to both the Admin Catalog and Storefront.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
