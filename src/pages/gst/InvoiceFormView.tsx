import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, Search, X, Save, CheckCircle, AlertCircle,
  RefreshCw, Package, ChevronDown, ArrowLeft,
} from 'lucide-react';
import {
  searchGSTCustomers,
  getCompanySettings,
  createGSTInvoice,
  updateDraftGSTInvoice,
  validateGSTInvoice,
  getGSTInvoiceById,
  formatCurrency,
  CreateGSTInvoicePayload,
} from '../../api/gstInvoiceService';
import { fetchAdminApi } from '../../api/adminApi';
import {
  calculateLineItem,
  calculateInvoiceTotals,
  isInterState,
  DraftLineItem,
  amountInWords,
} from '../../utils/gstCalculator';
import {
  GSTCustomer,
  CompanySettings,
  GSTInvoice,
  INDIA_STATE_CODES,
  GST_RATES,
  UNIT_OPTIONS,
} from '../../types/admin';

function newLineItem(slNo: number): DraftLineItem {
  return {
    sl_no: slNo,
    description: '',
    hsn_sac: '',
    is_service: false,
    quantity: 1,
    unit: 'NOS',
    unit_price: 0,
    discount: 0,
    gst_rate: 18,
    cess_rate: 0,
  };
}

interface Props {
  invoiceId?: string; // if set → edit mode
  onSaved: (invoice: GSTInvoice) => void;
  onCancel: () => void;
}

export function InvoiceFormView({ invoiceId, onSaved, onCancel }: Props) {
  const [loadingForm, setLoadingForm] = useState(!!invoiceId);

  // Invoice header fields
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplyType, setSupplyType] = useState<'B2B' | 'B2C'>('B2B');
  const [notes, setNotes] = useState('');

  // Customer
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<GSTCustomer[]>([]);
  const [customerDropOpen, setCustomerDropOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<GSTCustomer | null>(null);
  const [customerSearching, setCustomerSearching] = useState(false);

  // Place of supply
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState('');

  // Company settings (for INTRA/INTER determination)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  // Line items
  const [items, setItems] = useState<DraftLineItem[]>([newLineItem(1)]);

  // Computed
  const interstate = isInterState(placeOfSupplyCode, companySettings?.state_code || '');
  const calculatedItems = items.map((it) => calculateLineItem(it, interstate));
  const totals = calculateInvoiceTotals(calculatedItems);

  // Submission
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [validationResults, setValidationResults] = useState<
    Array<{ field: string; label: string; passed: boolean; message?: string }>
  >([]);
  const [existingInvoiceNumber, setExistingInvoiceNumber] = useState('');

  // Debounce ref
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load company settings
  useEffect(() => {
    getCompanySettings().then((s) => setCompanySettings(s)).catch(() => {});
  }, []);

  // Load invoice if editing
  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      try {
        const inv = await getGSTInvoiceById(invoiceId);
        setExistingInvoiceNumber(inv.invoice_number);
        setInvoiceDate(inv.invoice_date);
        setSupplyType(inv.supply_type);
        setNotes(inv.notes || '');
        setPlaceOfSupply(inv.place_of_supply);
        setPlaceOfSupplyCode(inv.place_of_supply_state_code);
        if (inv.items && inv.items.length > 0) {
          setItems(
            inv.items.map((it) => ({
              sl_no: it.sl_no,
              description: it.description,
              hsn_sac: it.hsn_sac,
              is_service: it.is_service,
              quantity: it.quantity,
              unit: it.unit,
              unit_price: it.unit_price,
              discount: it.discount,
              gst_rate: it.gst_rate,
              cess_rate: it.cess_rate,
              product_id: it.product_id,
            }))
          );
        }
        // Try to load customer
        if (inv.customer_id) {
          searchGSTCustomers('', 1, 1)
            .then((res) => {
              // find the customer by ID from the list — or just set basic info from invoice
            })
            .catch(() => {});
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingForm(false);
      }
    })();
  }, [invoiceId]);

  // Customer search with debounce
  const handleCustomerSearch = (q: string) => {
    setCustomerQuery(q);
    setCustomerDropOpen(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      if (!q.trim()) { setCustomerResults([]); return; }
      setCustomerSearching(true);
      try {
        const res = await searchGSTCustomers(q, 1, 10);
        setCustomerResults(res.items);
      } catch {
        setCustomerResults([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 300);
  };

  const selectCustomer = (c: GSTCustomer) => {
    setSelectedCustomer(c);
    setCustomerQuery(c.legal_name);
    setCustomerDropOpen(false);
    setCustomerResults([]);
    // Auto-set place of supply from customer billing state
    if (c.billing_address?.state_code) {
      const state = INDIA_STATE_CODES.find((s) => s.code === c.billing_address.state_code);
      setPlaceOfSupply(state?.name || c.billing_address.state);
      setPlaceOfSupplyCode(c.billing_address.state_code);
    }
    // Auto-set supply type
    setSupplyType(c.gstin ? 'B2B' : 'B2C');
  };

  // Line item helpers
  const updateItem = (idx: number, updates: Partial<DraftLineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...updates } : it)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, newLineItem(prev.length + 1)]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((it, i) => ({ ...it, sl_no: i + 1 }));
    });
  };

  // Build API payload
  const buildPayload = (): CreateGSTInvoicePayload => ({
    invoice_date: invoiceDate,
    customer_id: selectedCustomer?.id || '',
    place_of_supply: placeOfSupply,
    place_of_supply_state_code: placeOfSupplyCode,
    supply_type: supplyType,
    notes: notes || undefined,
    items: items.map((it) => ({
      sl_no: it.sl_no,
      product_id: it.product_id,
      description: it.description,
      hsn_sac: it.hsn_sac,
      is_service: it.is_service,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      discount: it.discount,
      gst_rate: it.gst_rate,
      cess_rate: it.cess_rate || 0,
    })),
  });

  const clientValidate = (): string | null => {
    if (!selectedCustomer && !invoiceId) return 'Please select a customer';
    if (!invoiceDate) return 'Invoice date is required';
    if (!placeOfSupply) return 'Place of supply is required';
    if (items.length === 0) return 'Add at least one line item';
    for (const it of items) {
      if (!it.description.trim()) return 'All items must have a description';
      if (!it.hsn_sac.trim()) return 'All items must have an HSN/SAC code';
      if (it.quantity <= 0) return 'Quantity must be greater than 0';
      if (it.unit_price < 0) return 'Unit price cannot be negative';
    }
    return null;
  };

  const handleSaveDraft = async () => {
    const err = clientValidate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      const payload = buildPayload();
      const saved = invoiceId
        ? await updateDraftGSTInvoice(invoiceId, payload)
        : await createGSTInvoice(payload);
      onSaved(saved);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndValidate = async () => {
    const err = clientValidate();
    if (err) { setError(err); return; }
    setError('');
    setValidating(true);
    try {
      const payload = buildPayload();
      // Save first
      const saved = invoiceId
        ? await updateDraftGSTInvoice(invoiceId, payload)
        : await createGSTInvoice(payload);

      // Then validate
      const { invoice: validated, validationResults: results } = await validateGSTInvoice(saved.id);
      setValidationResults(results);
      const failed = results.filter((r) => !r.passed);
      if (failed.length > 0) {
        setError(`Validation failed: ${failed[0].message || failed[0].label}`);
      } else {
        onSaved(validated);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setValidating(false);
    }
  };

  const handlePosChange = (stateName: string) => {
    const found = INDIA_STATE_CODES.find((s) => s.name === stateName);
    setPlaceOfSupply(stateName);
    setPlaceOfSupplyCode(found?.code || '');
  };

  if (loadingForm) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="p-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#8B5CF6]/40 transition-colors"
        >
          <ArrowLeft size={15} />
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-[#FAFAFA]">
            {invoiceId ? `Edit Invoice — ${existingInvoiceNumber}` : 'Create New GST Tax Invoice'}
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            {invoiceId ? 'Editing DRAFT invoice' : 'Invoice number is auto-generated by the server (PRC-INV-2026-27-XXX)'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-tr-xl rounded-bl-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertCircle size={15} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Validation results */}
      {validationResults.length > 0 && (
        <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-2">Validation Results</p>
          {validationResults.map((r) => (
            <div key={r.field} className="flex items-start gap-2 text-xs">
              {r.passed ? (
                <CheckCircle size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <span className={r.passed ? 'text-[#A1A1AA]' : 'text-red-400'}>
                {r.label}{!r.passed && r.message ? ` — ${r.message}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Invoice Header */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Invoice Details</p>

            {/* Invoice number */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Invoice Number</label>
              <input
                readOnly
                value={existingInvoiceNumber || 'Auto-generated on save (PRC-INV-2026-27-XXX)'}
                className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#71717A] text-xs cursor-not-allowed"
              />
            </div>

            {/* Invoice date */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                Invoice Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            {/* Supply type */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-2">Supply Type</label>
              <div className="flex gap-2">
                {(['B2B', 'B2C'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSupplyType(t)}
                    className={`flex-1 py-1.5 rounded-tr-lg rounded-bl-lg text-xs font-bold transition-colors border ${
                      supplyType === t
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'border-[#27272A] text-[#A1A1AA] hover:border-[#8B5CF6]/40'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Payment terms, delivery instructions…"
                className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs resize-none focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          {/* Customer */}
          <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Customer</p>

            {/* Customer search */}
            <div className="relative">
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                Search Customer <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                <input
                  value={customerQuery}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onFocus={() => customerQuery && setCustomerDropOpen(true)}
                  placeholder="Type name, GSTIN, phone…"
                  className="w-full pl-8 pr-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                />
                {customerSearching && (
                  <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] animate-spin" />
                )}
              </div>
              {customerDropOpen && customerResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-tr-xl rounded-bl-xl bg-[#09090B] border border-[#27272A] shadow-xl max-h-48 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full px-3 py-2.5 text-left hover:bg-[#18181B] transition-colors border-b border-[#27272A]/50 last:border-0"
                    >
                      <p className="text-xs font-semibold text-[#FAFAFA]">{c.legal_name}</p>
                      <p className="text-[10px] text-[#71717A]">
                        {c.gstin || 'No GSTIN'} · {c.billing_address?.state || ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div className="p-3 rounded-tr-xl rounded-bl-xl bg-[#09090B] border border-[#8B5CF6]/30 space-y-1">
                <p className="text-xs font-bold text-[#FAFAFA]">{selectedCustomer.legal_name}</p>
                {selectedCustomer.gstin && (
                  <p className="text-[11px] font-mono text-[#8B5CF6]">GSTIN: {selectedCustomer.gstin}</p>
                )}
                <p className="text-[11px] text-[#A1A1AA]">
                  {selectedCustomer.billing_address?.addr1}, {selectedCustomer.billing_address?.city},{' '}
                  {selectedCustomer.billing_address?.state} — {selectedCustomer.billing_address?.pincode}
                </p>
              </div>
            )}

            {/* Place of Supply */}
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                Place of Supply <span className="text-red-400">*</span>
              </label>
              <select
                value={placeOfSupply}
                onChange={(e) => handlePosChange(e.target.value)}
                className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="">— Select State —</option>
                {INDIA_STATE_CODES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* GST Type Badge */}
            {placeOfSupplyCode && companySettings?.state_code && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-tr-lg rounded-bl-lg text-xs font-bold border ${
                  interstate
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                    : 'border-green-500/40 bg-green-500/10 text-green-400'
                }`}
              >
                {interstate ? (
                  <>🔵 INTERSTATE — IGST applies (POS code {placeOfSupplyCode} ≠ Company {companySettings.state_code})</>
                ) : (
                  <>🟢 INTRASTATE — CGST + SGST applies</>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Line Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                Line Items ({items.length})
              </p>
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-tr-lg rounded-bl-lg bg-[#8B5CF6]/15 text-[#8B5CF6] text-xs font-bold hover:bg-[#8B5CF6]/25 transition-colors"
              >
                <Plus size={12} /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const calc = calculatedItems[idx];
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-tr-xl rounded-bl-xl bg-[#09090B] border border-[#27272A] space-y-2"
                  >
                    {/* Row 1: Sl No + Description + HSN + Actions */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#71717A] font-bold w-6 flex-shrink-0">
                        {item.sl_no}
                      </span>
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="Item description *"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-[#27272A] bg-[#18181B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                      />
                      <input
                        value={item.hsn_sac}
                        onChange={(e) => updateItem(idx, { hsn_sac: e.target.value })}
                        placeholder="HSN/SAC *"
                        className="w-24 px-2 py-1.5 rounded-lg border border-[#27272A] bg-[#18181B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                      />
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1.5 rounded-lg text-[#71717A] hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Row 2: Qty, Unit, Rate, Discount, GST% */}
                    <div className="grid grid-cols-5 gap-2">
                      <div>
                        <label className="block text-[9px] text-[#71717A] mb-0.5">Qty</label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 rounded-lg border border-[#27272A] bg-[#18181B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[#71717A] mb-0.5">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(idx, { unit: e.target.value })}
                          className="w-full px-1 py-1.5 rounded-lg border border-[#27272A] bg-[#18181B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-[#71717A] mb-0.5">Rate (₹)</label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 rounded-lg border border-[#27272A] bg-[#18181B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[#71717A] mb-0.5">Discount (₹)</label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.discount}
                          onChange={(e) => updateItem(idx, { discount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 rounded-lg border border-[#27272A] bg-[#18181B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[#71717A] mb-0.5">GST %</label>
                        <select
                          value={item.gst_rate}
                          onChange={(e) => updateItem(idx, { gst_rate: parseFloat(e.target.value) })}
                          className="w-full px-1 py-1.5 rounded-lg border border-[#27272A] bg-[#18181B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>{r}%</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 3: Computed values */}
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-[#27272A]/50">
                      <div className="text-center">
                        <p className="text-[9px] text-[#71717A]">Taxable</p>
                        <p className="text-xs font-semibold text-[#FAFAFA]">{formatCurrency(calc.taxable_value)}</p>
                      </div>
                      {!interstate ? (
                        <>
                          <div className="text-center">
                            <p className="text-[9px] text-[#71717A]">CGST</p>
                            <p className="text-xs font-semibold text-blue-400">{formatCurrency(calc.cgst_amount)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-[#71717A]">SGST</p>
                            <p className="text-xs font-semibold text-blue-400">{formatCurrency(calc.sgst_amount)}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center col-span-2">
                            <p className="text-[9px] text-[#71717A]">IGST</p>
                            <p className="text-xs font-semibold text-purple-400">{formatCurrency(calc.igst_amount)}</p>
                          </div>
                        </>
                      )}
                      <div className="text-center">
                        <p className="text-[9px] text-[#71717A]">Line Total</p>
                        <p className="text-xs font-bold text-[#8B5CF6]">{formatCurrency(calc.total_item_value)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tax Summary Footer */}
          <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-3">Tax Summary (Preview)</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Taxable Amount</span>
                <span className="font-semibold text-[#FAFAFA]">{formatCurrency(totals.taxable_amount)}</span>
              </div>
              {!interstate ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">CGST</span>
                    <span className="text-blue-400">{formatCurrency(totals.cgst_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">SGST</span>
                    <span className="text-blue-400">{formatCurrency(totals.sgst_amount)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-[#A1A1AA]">IGST</span>
                  <span className="text-purple-400">{formatCurrency(totals.igst_amount)}</span>
                </div>
              )}
              {totals.round_off !== 0 && (
                <div className="flex justify-between text-[#71717A]">
                  <span>Round-Off</span>
                  <span>{formatCurrency(totals.round_off)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#27272A] font-bold">
                <span className="text-[#FAFAFA]">Grand Total</span>
                <span className="text-[#8B5CF6] text-sm">{formatCurrency(totals.grand_total)}</span>
              </div>
              <p className="text-[10px] text-[#71717A] mt-1 italic">
                {amountInWords(totals.grand_total)}
              </p>
            </div>
            <p className="text-[10px] text-[#71717A] mt-3">
              ⚠ Preview only — server recalculates and validates all tax amounts before saving.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-tr-xl rounded-bl-xl border border-[#27272A] text-[#A1A1AA] text-xs font-semibold hover:border-[#8B5CF6]/40 hover:text-[#FAFAFA] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving || validating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-tr-xl rounded-bl-xl border border-[#8B5CF6]/60 text-[#8B5CF6] text-xs font-bold hover:bg-[#8B5CF6]/10 disabled:opacity-60 transition-colors"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? 'Saving…' : 'Save as Draft'}
            </button>
            <button
              onClick={handleSaveAndValidate}
              disabled={saving || validating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] disabled:opacity-60 transition-colors shadow-md shadow-[#8B5CF6]/25"
            >
              {validating ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              {validating ? 'Validating…' : 'Save & Validate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
