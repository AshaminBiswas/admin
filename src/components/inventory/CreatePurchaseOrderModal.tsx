import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  X,
  Building2,
  Warehouse,
  Calendar,
  Sparkles,
  Layers,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import type { Branch, Supplier, ProductItem } from '../../types/admin';
import type {
  PurchaseOrder,
  CompanyEntity,
  CompanyLogo,
  CreatePoItemInput,
} from '../../types/purchaseOrder';
import { purchaseOrderApi } from '../../api/purchaseOrderApi';
import { COMPANY_PROFILES } from '../../utils/purchaseOrderPdfGenerator';
import { PRC_LOGO_DATA_URL } from '../../assets/logo.base64';
import { PACIFIC_LOGO_DATA_URL } from '../../assets/pacific_logo.base64';

export interface CreatePurchaseOrderModalProps {
  po?: PurchaseOrder | null;
  suppliers: Supplier[];
  branches: Branch[];
  products: ProductItem[];
  preSelectedSupplierId?: string;
  preSelectedProductId?: string;
  onClose: () => void;
  onSuccess: (savedPo: PurchaseOrder, openPreview?: boolean) => void;
}

interface ItemRowState {
  mode: 'catalog' | 'custom';
  productId: string;
  itemSku: string;
  itemName: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitRate: number;
  discountPercent: number;
  gstRate: number;
}

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  po,
  suppliers,
  branches,
  products = [],
  preSelectedSupplierId,
  preSelectedProductId,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!po;

  // 1. Company Entity & Logo
  const [companyEntity, setCompanyEntity] = useState<CompanyEntity>(
    po?.companyEntity || 'PACIFIC_PRODUCTS'
  );
  const [companyLogo, setCompanyLogo] = useState<CompanyLogo>(
    po?.companyLogo || (companyEntity === 'PRC_HARDWARE' ? 'prc' : 'pacific')
  );

  // 2. Supplier & Branch
  const [supplierId, setSupplierId] = useState<string>(
    po?.supplierId || preSelectedSupplierId || (suppliers[0]?.id || '')
  );
  const [branchId, setBranchId] = useState<string>(
    po?.branchId || (branches[0]?.id || '')
  );

  // 3. Dates
  const [issueDate, setIssueDate] = useState<string>(
    po?.issueDate
      ? new Date(po.issueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(
    po?.expectedDeliveryDate
      ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0]
      : ''
  );

  // 4. Terms & Notes
  const [paymentTerms, setPaymentTerms] = useState<string>(
    po?.paymentTerms || '30 days from clear physical material receipt and tax invoice submission'
  );
  const [deliveryTerms, setDeliveryTerms] = useState<string>(
    po?.deliveryTerms || 'Door delivery at destination branch facility with freight paid by supplier'
  );
  const [notes, setNotes] = useState<string>(po?.notes || '');

  // 5. Line Items State
  const initialItems = useMemo<ItemRowState[]>(() => {
    if (po && po.items && po.items.length > 0) {
      return po.items.map((it) => ({
        mode: it.productId ? 'catalog' : 'custom',
        productId: it.productId || '',
        itemSku: it.itemSku,
        itemName: it.itemName,
        description: it.description || '',
        hsnCode: it.hsnCode || '8302',
        quantity: it.quantity,
        unit: it.unit || 'PCS',
        unitRate: Number(it.unitRate),
        discountPercent: Number(it.discountPercent),
        gstRate: Number(it.gstRate),
      }));
    }

    if (preSelectedProductId) {
      const match = products.find((p) => String(p.id) === String(preSelectedProductId));
      if (match) {
        return [
          {
            mode: 'catalog',
            productId: String(match.id),
            itemSku: match.sku,
            itemName: match.name,
            description: '',
            hsnCode: '8302',
            quantity: 10,
            unit: 'PCS',
            unitRate: Number(match.price || 0),
            discountPercent: 0,
            gstRate: 18,
          },
        ];
      }
    }

    if (products.length > 0) {
      const first = products[0];
      return [
        {
          mode: 'catalog',
          productId: String(first.id),
          itemSku: first.sku,
          itemName: first.name,
          description: '',
          hsnCode: '8302',
          quantity: 10,
          unit: 'PCS',
          unitRate: Number(first.price || 0),
          discountPercent: 0,
          gstRate: 18,
        },
      ];
    }

    return [
      {
        mode: 'custom',
        productId: '',
        itemSku: 'GEN-01',
        itemName: 'Hardware Component',
        description: '',
        hsnCode: '8302',
        quantity: 10,
        unit: 'PCS',
        unitRate: 100,
        discountPercent: 0,
        gstRate: 18,
      },
    ];
  }, [po, preSelectedProductId, products]);

  const [items, setItems] = useState<ItemRowState[]>(initialItems);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Supplier & Branch Objects
  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId),
    [suppliers, supplierId]
  );
  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === branchId),
    [branches, branchId]
  );

  // Determine if Inter-state
  const isInterState = useMemo(() => {
    const sAddr = (selectedSupplier?.address || '').toLowerCase();
    const bState = (selectedBranch?.state || 'delhi').toLowerCase();
    const isSupplierDelhi = sAddr.includes('delhi');
    const isBranchDelhi = bState.includes('delhi');
    return isSupplierDelhi !== isBranchDelhi;
  }, [selectedSupplier, selectedBranch]);

  // Handle entity change
  const handleEntityChange = (entity: CompanyEntity) => {
    setCompanyEntity(entity);
    setCompanyLogo(entity === 'PRC_HARDWARE' ? 'prc' : 'pacific');
  };

  // Add Item Row
  const addItemRow = (mode: 'catalog' | 'custom' = 'catalog') => {
    if (mode === 'catalog' && products.length > 0) {
      const p = products[0];
      setItems((prev) => [
        ...prev,
        {
          mode: 'catalog',
          productId: String(p.id),
          itemSku: p.sku,
          itemName: p.name,
          description: '',
          hsnCode: '8302',
          quantity: 10,
          unit: 'PCS',
          unitRate: Number(p.price || 0),
          discountPercent: 0,
          gstRate: 18,
        },
      ]);
    } else {
      setItems((prev) => [
        ...prev,
        {
          mode: 'custom',
          productId: '',
          itemSku: '',
          itemName: '',
          description: '',
          hsnCode: '8302',
          quantity: 1,
          unit: 'PCS',
          unitRate: 0,
          discountPercent: 0,
          gstRate: 18,
        },
      ]);
    }
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) {
      setError('A purchase order must contain at least one line item.');
      return;
    }
    setError(null);
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ItemRowState, val: any) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        return { ...it, [field]: val };
      })
    );
  };

  // When catalog product is selected
  const handleProductSelect = (idx: number, prodId: string) => {
    const p = products.find((prod) => String(prod.id) === String(prodId));
    if (!p) return;
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        return {
          ...it,
          productId: String(p.id),
          itemSku: p.sku,
          itemName: p.name,
          unitRate: Number(p.price || 0),
        };
      })
    );
  };

  // Financial Summary Calculation
  const financialTotals = useMemo(() => {
    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    items.forEach((it) => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.unitRate) || 0;
      const disc = Number(it.discountPercent) || 0;
      const gst = Number(it.gstRate) || 18;

      const base = qty * rate;
      const taxable = Math.max(0, base - (base * disc) / 100);
      subtotal += taxable;

      if (isInterState) {
        igstTotal += (taxable * gst) / 100;
      } else {
        cgstTotal += (taxable * (gst / 2)) / 100;
        sgstTotal += (taxable * (gst / 2)) / 100;
      }
    });

    const grandTotal = Math.round(subtotal + cgstTotal + sgstTotal + igstTotal);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      cgstTotal: Math.round(cgstTotal * 100) / 100,
      sgstTotal: Math.round(sgstTotal * 100) / 100,
      igstTotal: Math.round(igstTotal * 100) / 100,
      grandTotal,
    };
  }, [items, isInterState]);

  // Submit Handler
  const handleSubmit = async (openPreviewAfterSave = false) => {
    if (!supplierId) {
      setError('Please select a Supplier/Vendor');
      return;
    }
    if (!branchId) {
      setError('Please select a receiving destination Depot/Branch');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one line item to the purchase order');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.itemSku.trim() || !it.itemName.trim()) {
        setError(`Line #${i + 1}: SKU and Item Name are required`);
        return;
      }
      if (Number(it.quantity) <= 0) {
        setError(`Line #${i + 1}: Quantity must be greater than 0`);
        return;
      }
      if (Number(it.unitRate) < 0) {
        setError(`Line #${i + 1}: Unit rate cannot be negative`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const payloadItems: CreatePoItemInput[] = items.map((it) => ({
      productId: it.productId || null,
      itemSku: it.itemSku.trim().toUpperCase(),
      itemName: it.itemName.trim(),
      description: it.description.trim() || null,
      hsnCode: it.hsnCode.trim() || '8302',
      quantity: Number(it.quantity),
      unit: it.unit || 'PCS',
      unitRate: Number(it.unitRate),
      discountPercent: Number(it.discountPercent) || 0,
      gstRate: Number(it.gstRate) || 18,
    }));

    try {
      if (isEditing && po) {
        const res = await purchaseOrderApi.updatePurchaseOrder(po.id, {
          companyEntity,
          companyLogo,
          supplierId,
          branchId,
          issueDate,
          expectedDeliveryDate: expectedDeliveryDate || null,
          paymentTerms,
          deliveryTerms,
          notes,
          items: payloadItems,
        });
        if (res.success && res.data) {
          onSuccess(res.data, openPreviewAfterSave);
        } else {
          setError('Failed to update Purchase Order');
        }
      } else {
        const res = await purchaseOrderApi.createPurchaseOrder({
          companyEntity,
          companyLogo,
          supplierId,
          branchId,
          issueDate,
          expectedDeliveryDate: expectedDeliveryDate || null,
          paymentTerms,
          deliveryTerms,
          notes,
          items: payloadItems,
        });
        if (res.success && res.data) {
          onSuccess(res.data, openPreviewAfterSave);
        } else {
          setError('Failed to create Purchase Order');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred while saving Purchase Order');
    } finally {
      setSubmitting(false);
    }
  };

  const profile = COMPANY_PROFILES[companyEntity] || COMPANY_PROFILES.PACIFIC_PRODUCTS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#18181B] border border-zinc-700 w-full max-w-5xl rounded-2xl shadow-2xl text-white overflow-hidden my-auto max-h-[92vh] flex flex-col animate-fadeIn">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 bg-[#09090B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                {isEditing ? `Edit Purchase Order (${po.poNumber})` : 'Create Purchase Order (PO)'}
                {isEditing && po.status !== 'DRAFT' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Revision R{po.revision + 1}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-400">
                Generate pure black & white, print-ready Purchase Order for supplier dispatch
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Section 1: Issuing Brand & Logo Selection ────────────────────── */}
          <div className="bg-[#09090B] p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                1. Issuing Entity & Letterhead
              </span>
              <span className="text-[10px] text-zinc-400">Appears on official PO Header</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pacific Products Option */}
              <button
                type="button"
                onClick={() => handleEntityChange('PACIFIC_PRODUCTS')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                  companyEntity === 'PACIFIC_PRODUCTS'
                    ? 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/40'
                    : 'bg-[#18181B] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                  <img src={PACIFIC_LOGO_DATA_URL} alt="Pacific Logo" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-xs">Pacific Products & Solutions</div>
                  <div className="text-[10px] text-zinc-400">Mandoli, Delhi • GSTIN: 07AADFP3948F1Z1</div>
                  <div className="text-[9px] text-indigo-300 font-mono">billing@pacifichardware.com</div>
                </div>
              </button>

              {/* PRC Hardware Option */}
              <button
                type="button"
                onClick={() => handleEntityChange('PRC_HARDWARE')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                  companyEntity === 'PRC_HARDWARE'
                    ? 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/40'
                    : 'bg-[#18181B] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                  <img src={PRC_LOGO_DATA_URL} alt="PRC Logo" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-xs">PRC Hardware</div>
                  <div className="text-[10px] text-zinc-400">Melaram Farm, Delhi • GSTIN: 07AABCP1234F1Z9</div>
                  <div className="text-[9px] text-indigo-300 font-mono">purchase@prchardware.com</div>
                </div>
              </button>
            </div>

            {/* Logo Selector Toggle */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">Attached Header Logo:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCompanyLogo('pacific')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1.5 ${
                    companyLogo === 'pacific'
                      ? 'bg-zinc-700 text-white border-zinc-500'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <img src={PACIFIC_LOGO_DATA_URL} alt="Pacific" className="w-3.5 h-3.5 object-contain bg-white rounded-sm" />
                  Pacific Logo
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyLogo('prc')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1.5 ${
                    companyLogo === 'prc'
                      ? 'bg-zinc-700 text-white border-zinc-500'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <img src={PRC_LOGO_DATA_URL} alt="PRC" className="w-3.5 h-3.5 object-contain bg-white rounded-sm" />
                  PRC Logo
                </button>
              </div>
            </div>
          </div>

          {/* ── Section 2: Parties & Order Dates ─────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Supplier / Vendor Selection */}
            <div className="bg-[#09090B] p-3.5 rounded-2xl border border-zinc-800 space-y-2">
              <label className="text-[11px] font-bold text-zinc-300 block">
                Vendor / Supplier <span className="text-rose-400">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-[#18181B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none focus:border-indigo-500"
                required
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.contactPerson ? `(${s.contactPerson})` : ''} {s.gstNumber ? `[${s.gstNumber}]` : ''}
                  </option>
                ))}
              </select>

              {selectedSupplier && (
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                  <div>
                    <strong className="text-zinc-200">Address:</strong> {selectedSupplier.address || 'Address on file'}
                  </div>
                  <div className="flex justify-between">
                    <span>
                      <strong className="text-zinc-200">GSTIN:</strong> {selectedSupplier.gstNumber || 'N/A'}
                    </span>
                    <span>
                      <strong className="text-zinc-200">Email:</strong> {selectedSupplier.email || 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Receiving Branch & Dates */}
            <div className="bg-[#09090B] p-3.5 rounded-2xl border border-zinc-800 space-y-2">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Receiving Destination Depot <span className="text-rose-400">*</span>
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full bg-[#18181B] text-white text-xs p-2 rounded-xl border border-zinc-700 outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">-- Select Receiving Depot --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city || 'Delhi'}) - {b.code || 'MAIN'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">PO Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-[#18181B] text-white text-xs p-1.5 rounded-xl border border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full bg-[#18181B] text-white text-xs p-1.5 rounded-xl border border-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 3: Line Items Table ─────────────────────────────────── */}
          <div className="bg-[#09090B] p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                  2. Order Line Items
                </span>
                <span className="text-[10px] text-zinc-400 ml-2">
                  Tax Type: {isInterState ? 'IGST (Interstate)' : 'CGST + SGST (Intrastate)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => addItemRow('catalog')}
                  className="px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1"
                >
                  <Plus size={13} /> + From Catalog
                </button>
                <button
                  type="button"
                  onClick={() => addItemRow('custom')}
                  className="px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-semibold transition flex items-center gap-1"
                >
                  <Plus size={13} /> + Custom Line
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181B] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Item / SKU</th>
                    <th className="py-2.5 px-2 w-20">HSN</th>
                    <th className="py-2.5 px-2 w-20 text-right">Qty</th>
                    <th className="py-2.5 px-2 w-20">Unit</th>
                    <th className="py-2.5 px-2 w-28 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-2 w-16 text-right">Disc%</th>
                    <th className="py-2.5 px-2 w-16 text-center">GST%</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
                    <th className="py-2.5 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {items.map((it, idx) => {
                    const qty = Number(it.quantity) || 0;
                    const rate = Number(it.unitRate) || 0;
                    const disc = Number(it.discountPercent) || 0;
                    const gst = Number(it.gstRate) || 18;
                    const base = qty * rate;
                    const taxable = Math.max(0, base - (base * disc) / 100);
                    const lineTotal = taxable + (taxable * gst) / 100;

                    return (
                      <tr key={idx} className="hover:bg-zinc-900/50 transition">
                        <td className="py-2 px-3">
                          {it.mode === 'catalog' ? (
                            <div className="space-y-1">
                              <select
                                value={it.productId}
                                onChange={(e) => handleProductSelect(idx, e.target.value)}
                                className="w-full bg-[#18181B] text-white text-xs p-1.5 rounded-lg border border-zinc-700 outline-none"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    [{p.sku}] {p.name}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                <span className="font-mono text-indigo-400">{it.itemSku}</span>
                                <span>•</span>
                                <input
                                  type="text"
                                  placeholder="Item note / desc..."
                                  value={it.description}
                                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                  className="bg-transparent border-b border-zinc-800 text-[10px] text-zinc-300 w-full outline-none focus:border-zinc-600"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Item / Material Name"
                                value={it.itemName}
                                onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                                className="w-full bg-[#18181B] text-white text-xs p-1 rounded-lg border border-zinc-700 outline-none"
                              />
                              <input
                                type="text"
                                placeholder="SKU (e.g. ALUM-01)"
                                value={it.itemSku}
                                onChange={(e) => updateItem(idx, 'itemSku', e.target.value)}
                                className="w-full bg-transparent border-b border-zinc-800 font-mono text-[10px] text-indigo-400 outline-none"
                              />
                            </div>
                          )}
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={it.hsnCode}
                            onChange={(e) => updateItem(idx, 'hsnCode', e.target.value)}
                            className="w-full bg-[#18181B] text-white text-xs p-1 text-center font-mono rounded-lg border border-zinc-700 outline-none"
                          />
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-[#18181B] text-white text-xs p-1 text-right font-bold rounded-lg border border-zinc-700 outline-none"
                          />
                        </td>

                        <td className="py-2 px-2">
                          <select
                            value={it.unit}
                            onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                            className="w-full bg-[#18181B] text-white text-xs p-1 rounded-lg border border-zinc-700 outline-none"
                          >
                            <option value="PCS">PCS</option>
                            <option value="SET">SET</option>
                            <option value="KG">KG</option>
                            <option value="MTR">MTR</option>
                            <option value="BOX">BOX</option>
                            <option value="PAIR">PAIR</option>
                          </select>
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unitRate}
                            onChange={(e) => updateItem(idx, 'unitRate', Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full bg-[#18181B] text-white text-xs p-1 text-right font-mono rounded-lg border border-zinc-700 outline-none"
                          />
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={it.discountPercent}
                            onChange={(e) => updateItem(idx, 'discountPercent', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                            className="w-full bg-[#18181B] text-white text-xs p-1 text-right font-mono rounded-lg border border-zinc-700 outline-none"
                          />
                        </td>

                        <td className="py-2 px-2">
                          <select
                            value={it.gstRate}
                            onChange={(e) => updateItem(idx, 'gstRate', Number(e.target.value))}
                            className="w-full bg-[#18181B] text-white text-xs p-1 text-center font-mono rounded-lg border border-zinc-700 outline-none"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>

                        <td className="py-2 px-3 text-right font-mono font-bold text-white">
                          ₹{lineTotal.toFixed(2)}
                        </td>

                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-zinc-500 hover:text-rose-400 rounded transition"
                            title="Remove row"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Card */}
            <div className="p-3 bg-[#18181B] rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1 text-[11px] text-zinc-400">
                <div>
                  <strong>Total Lines:</strong> {items.length} items
                </div>
                <div>
                  <strong>Tax Mechanism:</strong> {isInterState ? 'IGST 18% (Interstate)' : 'CGST 9% + SGST 9% (Intrastate)'}
                </div>
              </div>

              <div className="w-full sm:w-72 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal (Taxable):</span>
                  <span className="font-mono">₹{financialTotals.subtotal.toFixed(2)}</span>
                </div>
                {isInterState ? (
                  <div className="flex justify-between text-zinc-400">
                    <span>IGST:</span>
                    <span className="font-mono">₹{financialTotals.igstTotal.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-zinc-400">
                      <span>CGST:</span>
                      <span className="font-mono">₹{financialTotals.cgstTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>SGST:</span>
                      <span className="font-mono">₹{financialTotals.sgstTotal.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-zinc-700">
                  <span>Total Order Value:</span>
                  <span className="font-mono text-emerald-400">₹{financialTotals.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Terms & Special Instructions ─────────────────────── */}
          <div className="bg-[#09090B] p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              3. Commercial Terms & Instructions
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full bg-[#18181B] text-white text-xs p-2 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Delivery Terms</label>
                <input
                  type="text"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  className="w-full bg-[#18181B] text-white text-xs p-2 rounded-xl border border-zinc-700 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Special Notes / Inspection Instructions</label>
              <textarea
                rows={2}
                placeholder="e.g. Ensure batch test certificates accompany shipment. Unloading at Gate No. 2."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#18181B] text-white text-xs p-2 rounded-xl border border-zinc-700 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-[#09090B] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-400">
            {isEditing && po.status !== 'DRAFT'
              ? '⚠ Saving changes will generate a revision increment (-R1).'
              : 'PO will be created as Draft. You can preview PDF before dispatch.'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-xs transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 disabled:opacity-50"
            >
              <Eye size={14} />
              {submitting ? 'Processing...' : 'Save & Preview PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
