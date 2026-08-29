import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Building2, Users, Search, Plus, Trash2, ArrowLeft,
  FileText, ShieldCheck, Printer, Download, Sparkles, CheckCircle2,
  AlertCircle, RefreshCw, X, Package, MapPin, Phone, Mail,
  CreditCard, Calendar, Truck, Layers, ChevronDown
} from 'lucide-react';
import {
  PROFORMA_FACILITIES,
  ProformaFacility,
  ProformaInvoice,
  CreateProformaInvoicePayload
} from '../../types/proforma';
import {
  proformaService,
  B2BCustomerSearchResult,
  CustomerSavedAddressSummary,
  ProductSearchResult
} from '../../api/proformaService';
import { printProformaInvoice } from '../../utils/proformaPdfGenerator';

interface Props {
  onBack: () => void;
  onSaved: (pi: ProformaInvoice) => void;
}

interface DraftLineItem {
  productId?: string;
  sku: string;
  productName: string;
  description?: string;
  hsnCode: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
}

export function ProformaInvoiceCreateView({ onBack, onSaved }: Props) {
  // Facility
  const [facilityCode, setFacilityCode] = useState<'DELHI_WORKS' | 'MUMBAI_DEPOT'>('DELHI_WORKS');
  const facility = PROFORMA_FACILITIES[facilityCode];

  // Customer Search & Details
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchType, setCustomerSearchType] = useState<'ALL' | 'GSTIN' | 'EMAIL' | 'PHONE' | 'COMPANY'>('ALL');
  const [customerResults, setCustomerResults] = useState<B2BCustomerSearchResult[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [selectedCustomer, setSelectedCustomer] = useState<B2BCustomerSearchResult | null>(null);
  const [customerSavedAddresses, setCustomerSavedAddresses] = useState<CustomerSavedAddressSummary[]>([]);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Delhi');
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState('07');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Dates & Commercial Terms
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [poReference, setPoReference] = useState('');
  const [quoteReference, setQuoteReference] = useState('');
  const [advancePercentage, setAdvancePercentage] = useState(30);
  const [deliveryTimeline, setDeliveryTimeline] = useState('Immediate dispatch within 5-7 working days');
  const [notes, setNotes] = useState('');

  // Line Items
  const [items, setItems] = useState<DraftLineItem[]>([
    {
      productId: 'p-1',
      sku: 'PRC-SS-GH-304',
      productName: 'Grade 304 SS Heavy Duty Restroom Gravity Hinge Set',
      description: 'Spring-assisted self-closing gravity hinge set with mounting fasteners',
      hsnCode: '83024110',
      unit: 'SETS',
      quantity: 10,
      unitPrice: 850,
      discount: 0,
      gstRate: 18,
    },
  ]);

  // Catalog Product Search for line items
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Customer Search
  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingCustomer(true);
      try {
        const results = await proformaService.searchB2BCustomers(customerSearch, customerSearchType);
        setCustomerResults(results);
        setIsCustomerDropdownOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingCustomer(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch, customerSearchType]);

  // Debounced Product Search
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingProduct(true);
      try {
        const results = await proformaService.searchProducts(productSearch);
        setProductResults(results);
        setIsProductDropdownOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingProduct(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Handle Customer Selection
  const handleSelectCustomer = async (c: B2BCustomerSearchResult) => {
    setSelectedCustomerId(c.id);
    setSelectedCustomer(c);
    setCustomerName(c.name);
    setCompanyName(c.companyName);
    setCustomerEmail(c.email);
    setCustomerPhone(c.phone);
    setCustomerGstin(c.gstin || '');
    setBillingAddress(c.billingAddress);
    setShippingAddress(c.shippingAddress || c.billingAddress);
    if (c.state) setPlaceOfSupply(c.state);
    if (c.stateCode) setPlaceOfSupplyCode(c.stateCode);
    setCustomerSavedAddresses(c.addresses || []);

    // Clear search query so it does NOT auto-trigger search for company name
    setCustomerSearch('');
    setIsCustomerDropdownOpen(false);
    setCustomerResults([]);

    // Asynchronously fetch full 360 customer profile to retrieve all saved addresses
    if (c.id && !c.id.startsWith('quote-')) {
      try {
        const full = await proformaService.getCustomerFullDetails(c.id);
        if (full) {
          setSelectedCustomer(full);
          if (full.addresses && full.addresses.length > 0) {
            setCustomerSavedAddresses(full.addresses);
          }
          if (full.billingAddress && (!c.billingAddress || c.billingAddress.includes('Standard Registered'))) {
            setBillingAddress(full.billingAddress);
          }
          if (full.shippingAddress && (!c.shippingAddress || c.shippingAddress.includes('Standard Registered'))) {
            setShippingAddress(full.shippingAddress);
          }
        }
      } catch (err) {
        console.warn('Could not load customer 360 full details:', err);
      }
    }
  };

  // Handle Clear / Change Customer
  const handleClearCustomer = () => {
    setSelectedCustomerId(undefined);
    setSelectedCustomer(null);
    setCustomerSavedAddresses([]);
    setCustomerSearch('');
    setCompanyName('');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerGstin('');
    setBillingAddress('');
    setShippingAddress('');
    setCustomerResults([]);
    setIsCustomerDropdownOpen(false);
  };

  // Handle Product Selection into line items
  const handleAddProduct = (p: ProductSearchResult) => {
    setItems((prev) => [
      ...prev,
      {
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        description: p.description || '',
        hsnCode: p.hsnCode || '83024110',
        unit: p.unit || 'PCS',
        quantity: 1,
        unitPrice: p.price || 0,
        discount: 0,
        gstRate: p.gstRate || 18,
      },
    ]);
    setProductSearch('');
    setIsProductDropdownOpen(false);
  };

  // Add empty custom item
  const handleAddCustomItem = () => {
    setItems((prev) => [
      ...prev,
      {
        sku: `CUSTOM-${Date.now().toString().slice(-4)}`,
        productName: '',
        description: '',
        hsnCode: '83024110',
        unit: 'PCS',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        gstRate: 18,
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof DraftLineItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Calculations
  const isInterState =
    facility.stateCode.trim().toUpperCase() !== placeOfSupplyCode.trim().toUpperCase();

  const totals = useMemo(() => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    items.forEach((it) => {
      const lineSubtotal = Math.round(Number(it.quantity || 0) * Number(it.unitPrice || 0));
      const discount = Number(it.discount || 0);
      const taxable = Math.max(0, lineSubtotal - discount);
      const rate = Number(it.gstRate || 18);

      subtotal += lineSubtotal;

      if (isInterState) {
        igst += Math.round((taxable * rate) / 100);
      } else {
        cgst += Math.round((taxable * (rate / 2)) / 100);
        sgst += Math.round((taxable * (rate / 2)) / 100);
      }
    });

    const taxTotal = cgst + sgst + igst;
    const grandTotal = subtotal + taxTotal;
    const advanceAmount = Math.round((grandTotal * advancePercentage) / 100);
    const balanceAmount = grandTotal - advanceAmount;

    return {
      subtotal,
      cgst,
      sgst,
      igst,
      taxTotal,
      grandTotal,
      advanceAmount,
      balanceAmount,
    };
  }, [items, isInterState, advancePercentage]);

  // Submit Handler
  const handleGeneratePI = async () => {
    setErrorMsg('');
    if (!companyName.trim() && !customerName.trim()) {
      setErrorMsg('Customer or Company Name is mandatory.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Please add at least one line item.');
      return;
    }
    if (items.some((it) => !it.productName.trim() || it.quantity <= 0)) {
      setErrorMsg('Please fill out all product names and positive quantities.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateProformaInvoicePayload = {
        facilityCode,
        customerId: selectedCustomerId,
        customerName: customerName.trim() || companyName.trim(),
        companyName: companyName.trim() || customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        customerGstin: customerGstin.trim() || undefined,
        placeOfSupply,
        placeOfSupplyCode,
        billingAddress: billingAddress.trim() || 'Standard Commercial Address',
        shippingAddress: sameAsBilling ? billingAddress.trim() : (shippingAddress.trim() || billingAddress.trim()),
        issueDate,
        validUntil,
        poReference: poReference.trim() || undefined,
        quoteReference: quoteReference.trim() || undefined,
        deliveryTimeline,
        paymentTerms: `${advancePercentage}% Advance against Proforma Invoice, balance before dispatch`,
        advancePercentage,
        notes: notes.trim() || undefined,
        items,
      };

      const created = await proformaService.createProformaInvoice(payload);
      onSaved(created);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate Proforma Invoice. Please check all fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
            title="Back to PI List"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-[#8B5CF6]/20 text-[#C4B5FD] border border-[#8B5CF6]/30">
                PROFORMA GENERATOR
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Create Proforma Invoice (PI)</h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Issue an official Commercial Proforma Invoice with dual facility routing, B2B customer auto-fill, and GST computation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-zinc-300 text-xs font-bold rounded-xl border border-[#27272A] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGeneratePI}
            disabled={isSubmitting}
            className="px-5 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-900/20 flex items-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Generating PI...
              </>
            ) : (
              <>
                <Sparkles size={14} /> Generate & Issue PI
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 flex items-center gap-2.5">
          <AlertCircle size={16} className="shrink-0 text-rose-400" />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      {/* ─── 1. FACILITY SELECTION CARD (2 FACILITIES) ────────────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272A] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 size={16} className="text-[#8B5CF6]" /> 1. Select Origin Dispatch Facility
            </h2>
            <p className="text-xs text-zinc-400">
              Determines billing entity, state code for GST (IGST vs CGST+SGST), registered warehouse address, and bank payment instructions.
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#A78BFA] bg-[#8B5CF6]/10 px-2.5 py-1 rounded-full border border-[#8B5CF6]/20">
            Active: {facility.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Facility 1: Delhi Works */}
          <div
            onClick={() => setFacilityCode('DELHI_WORKS')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 space-y-2 ${
              facilityCode === 'DELHI_WORKS'
                ? 'bg-[#8B5CF6]/10 border-[#8B5CF6] shadow-md shadow-purple-950/20'
                : 'bg-[#27272A]/40 border-[#27272A] hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/20 text-[#A78BFA] flex items-center justify-center font-black text-xs">
                  01
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-white">Delhi Corporate Works & HQ</h3>
                  <span className="text-[10px] text-zinc-400 block">Pacific Products and Solutions</span>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                facilityCode === 'DELHI_WORKS' ? 'bg-[#8B5CF6] text-white' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {facilityCode === 'DELHI_WORKS' ? '✓ SELECTED' : 'SELECT'}
              </span>
            </div>

            <div className="text-[11px] text-zinc-300 space-y-1 bg-[#121214] p-2.5 rounded-lg border border-zinc-800/80">
              <div className="flex items-start gap-1 text-zinc-400">
                <MapPin size={12} className="shrink-0 mt-0.5 text-zinc-500" />
                <span>H-3, J.R. Complex, Gate No 4, Mandoli, Delhi - 110093</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10.5px]">
                <div><strong className="text-zinc-500 font-sans">GSTIN:</strong> 07AABCP1234F1Z9</div>
                <div><strong className="text-zinc-500 font-sans">State:</strong> Delhi (07)</div>
                <div><strong className="text-zinc-500 font-sans">Bank:</strong> HDFC Bank Ltd</div>
                <div><strong className="text-zinc-500 font-sans">A/C:</strong> ...88991122</div>
              </div>
            </div>
          </div>

          {/* Facility 2: Mumbai Regional Depot */}
          <div
            onClick={() => setFacilityCode('MUMBAI_DEPOT')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 space-y-2 ${
              facilityCode === 'MUMBAI_DEPOT'
                ? 'bg-[#8B5CF6]/10 border-[#8B5CF6] shadow-md shadow-purple-950/20'
                : 'bg-[#27272A]/40 border-[#27272A] hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs">
                  02
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-white">Maharashtra Regional Depot</h3>
                  <span className="text-[10px] text-zinc-400 block">Western Logistics Park</span>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                facilityCode === 'MUMBAI_DEPOT' ? 'bg-[#8B5CF6] text-white' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {facilityCode === 'MUMBAI_DEPOT' ? '✓ SELECTED' : 'SELECT'}
              </span>
            </div>

            <div className="text-[11px] text-zinc-300 space-y-1 bg-[#121214] p-2.5 rounded-lg border border-zinc-800/80">
              <div className="flex items-start gap-1 text-zinc-400">
                <MapPin size={12} className="shrink-0 mt-0.5 text-zinc-500" />
                <span>Unit 14-16, Logistics Park Phase II, Bhiwandi, Thane, MH - 421302</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10.5px]">
                <div><strong className="text-zinc-500 font-sans">GSTIN:</strong> 27AABCP1234F1Z9</div>
                <div><strong className="text-zinc-500 font-sans">State:</strong> Maharashtra (27)</div>
                <div><strong className="text-zinc-500 font-sans">Bank:</strong> ICICI Bank Ltd</div>
                <div><strong className="text-zinc-500 font-sans">A/C:</strong> ...00110502</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── 2. B2B CUSTOMER SEARCH & AUTO-FILL CARD ─────────────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 space-y-4">
        <div className="border-b border-[#27272A] pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users size={16} className="text-[#8B5CF6]" /> 2. B2B Customer / Buyer Directory
              </h2>
              <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                B2B Clients Only
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Search strictly queries registered commercial B2B buyers & RFQ quotation accounts (Vendors & Suppliers excluded).
            </p>
          </div>
          {selectedCustomer && (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> Account Linked
              </span>
              <button
                type="button"
                onClick={handleClearCustomer}
                className="text-[11px] text-rose-400 hover:text-rose-300 underline font-bold flex items-center gap-1"
              >
                <X size={12} /> Change / Re-search
              </button>
            </div>
          )}
        </div>

        {/* Selected Customer Locked Card */}
        {selectedCustomer ? (
          <div className="bg-gradient-to-r from-[#8B5CF6]/15 via-purple-950/20 to-transparent border-2 border-[#8B5CF6]/50 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white px-2 py-0.5 bg-[#8B5CF6] rounded-md">
                    SELECTED B2B CLIENT
                  </span>
                  <h3 className="text-sm font-extrabold text-white">
                    {selectedCustomer.companyName || selectedCustomer.name}
                  </h3>
                  {selectedCustomer.gstin && (
                    <span className="font-mono text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-md font-bold">
                      GSTIN: {selectedCustomer.gstin}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-300 pt-1">
                  <span><strong>Contact:</strong> {selectedCustomer.name}</span>
                  {selectedCustomer.email && <span><strong>Email:</strong> {selectedCustomer.email}</span>}
                  {selectedCustomer.phone && <span><strong>Phone:</strong> {selectedCustomer.phone}</span>}
                  <span><strong>State:</strong> {selectedCustomer.state} ({selectedCustomer.stateCode || '07'})</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearCustomer}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-bold border border-zinc-700 transition-colors shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw size={12} /> Switch Account
              </button>
            </div>

            {/* Saved Addresses Quick Picker */}
            {customerSavedAddresses.length > 0 && (
              <div className="pt-2 border-t border-purple-900/40 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <MapPin size={12} /> Saved Addresses on Account ({customerSavedAddresses.length})
                  </span>
                  <span className="text-zinc-400 text-[10px]">Click buttons below to assign to Billing / Shipping</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {customerSavedAddresses.map((addr, idx) => (
                    <div
                      key={addr.id || idx}
                      className="p-2.5 rounded-lg border border-purple-900/40 bg-[#121214]/80 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200 text-[11px] flex items-center gap-1">
                          {addr.label || addr.type || `Address #${idx + 1}`}
                          {addr.isDefault && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-mono">
                              Default
                            </span>
                          )}
                        </span>
                        {addr.city && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {addr.city}, {addr.state}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-2">
                        {addr.fullAddress}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setBillingAddress(addr.fullAddress)}
                          className="px-2 py-0.5 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/40 text-[#C4B5FD] text-[10.5px] font-bold rounded border border-[#8B5CF6]/40 transition-colors"
                        >
                          Use as Billing
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShippingAddress(addr.fullAddress);
                            setSameAsBilling(false);
                          }}
                          className="px-2 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 text-[10.5px] font-bold rounded border border-indigo-500/40 transition-colors"
                        >
                          Use as Shipping
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Search Criteria Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-zinc-400 mr-1">Search By:</span>
              {[
                { id: 'ALL', label: '⚡ All Criteria' },
                { id: 'GSTIN', label: '📄 15-Digit GSTIN' },
                { id: 'EMAIL', label: '✉️ Email Address' },
                { id: 'PHONE', label: '📞 Phone Number' },
                { id: 'COMPANY', label: '🏢 Company Name' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCustomerSearchType(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    customerSearchType === tab.id
                      ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-xs'
                      : 'bg-[#27272A]/50 text-zinc-400 border-[#27272A] hover:text-zinc-200 hover:bg-[#27272A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Live Search Combobox */}
            <div className="relative" ref={customerDropdownRef}>
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={() => {
                    if (customerResults.length > 0) setIsCustomerDropdownOpen(true);
                  }}
                  placeholder={
                    customerSearchType === 'GSTIN'
                      ? 'Enter 15-digit GSTIN (e.g. 07AAACA1234A1Z5, 27AABCS...)...'
                      : customerSearchType === 'EMAIL'
                      ? 'Enter client billing email (e.g. procurement@apexinfra.com)...'
                      : customerSearchType === 'PHONE'
                      ? 'Enter client 10-digit mobile number (e.g. 9811223344)...'
                      : customerSearchType === 'COMPANY'
                      ? 'Enter commercial enterprise or company legal name...'
                      : 'Search B2B Client by GSTIN, Email, Phone, or Company Name...'
                  }
                  className="w-full pl-10 pr-10 py-2.5 bg-[#27272A]/50 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-all"
                />
                {searchingCustomer && (
                  <RefreshCw size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B5CF6] animate-spin" />
                )}
              </div>

              {/* Customer Dropdown Results */}
              {isCustomerDropdownOpen && customerResults.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-zinc-800 animate-in fade-in zoom-in-98 duration-150">
                  <div className="px-3 py-1.5 bg-[#121214] text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">
                    <span>Matching B2B Clients ({customerResults.length})</span>
                    <span className="text-[#A78BFA]">Click to Select Account</span>
                  </div>
                  {customerResults.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="p-3 hover:bg-[#8B5CF6]/15 cursor-pointer transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-white font-bold">{c.companyName || c.name}</strong>
                          {c.gstin ? (
                            <span className="font-mono text-[10px] bg-purple-950/60 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800/60">
                              GSTIN: {c.gstin}
                            </span>
                          ) : (
                            <span className="text-[9.5px] text-zinc-500 bg-zinc-800 px-1.5 py-0.2 rounded">
                              Unregistered B2B
                            </span>
                          )}
                          {c.addresses && c.addresses.length > 0 && (
                            <span className="text-[9.5px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded">
                              {c.addresses.length} Saved Address{c.addresses.length > 1 ? 'es' : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-2 pt-0.5">
                          <span>👤 {c.name}</span>
                          <span>•</span>
                          <span>✉️ {c.email}</span>
                          <span>•</span>
                          <span>📞 {c.phone}</span>
                          <span>•</span>
                          <span>📍 {c.city}, {c.state} ({c.stateCode || '07'})</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#A78BFA] bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 px-2.5 py-1 rounded-lg shrink-0">
                        Select Account →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Details Form Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1">
          
          <div className="space-y-1">
            <label className="text-zinc-400 font-bold">Company / Business Legal Name *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Apex Infrastructure Pvt Ltd"
              className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400 font-bold">Contact Person Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400 font-bold">15-Digit GSTIN / Tax ID</label>
            <input
              type="text"
              maxLength={15}
              value={customerGstin}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setCustomerGstin(val);
                if (val.length >= 2 && /^\d{2}/.test(val)) {
                  setPlaceOfSupplyCode(val.substring(0, 2));
                }
              }}
              placeholder="e.g. 07AAACA1234A1Z5"
              className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl font-mono text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400 font-bold">Email Address</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="procurement@company.com"
              className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400 font-bold">Mobile / Phone Number</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400 font-bold">Place of Supply (State & Code)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                placeholder="e.g. Delhi / Maharashtra"
                className="w-2/3 px-3 py-2 bg-[#27272A]/40 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
              />
              <input
                type="text"
                maxLength={2}
                value={placeOfSupplyCode}
                onChange={(e) => setPlaceOfSupplyCode(e.target.value)}
                placeholder="Code (07)"
                className="w-1/3 px-3 py-2 bg-[#27272A]/40 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl font-mono text-center text-white focus:outline-none"
              />
            </div>
          </div>

        </div>

        {/* Addresses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="space-y-1">
            <label className="text-zinc-400 font-bold flex items-center gap-1">
              <MapPin size={12} className="text-[#8B5CF6]" /> Registered Billing Address
            </label>
            <textarea
              rows={2}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Office tower, street, city, state, postal pincode"
              className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-zinc-400 font-bold flex items-center gap-1">
                <Truck size={12} className="text-[#8B5CF6]" /> Site / Shipping Destination
              </label>
              <label className="text-[11px] text-zinc-400 flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                  className="rounded accent-[#8B5CF6]"
                />
                Same as billing
              </label>
            </div>
            <textarea
              rows={2}
              disabled={sameAsBilling}
              value={sameAsBilling ? billingAddress : shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Project site location, gate number, contact receiver"
              className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none resize-none disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* ─── 3. CATALOG PRODUCT SEARCH & LINE ITEMS COMPOSER ─────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 space-y-4">
        <div className="border-b border-[#27272A] pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Package size={16} className="text-[#8B5CF6]" /> 3. Line Items & Product Selector ({items.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Select products from catalog or add customized SKUs with custom rates, HSN codes, and GST rates.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddCustomItem}
            className="px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-all"
          >
            <Plus size={13} /> Add Custom Line Item
          </button>
        </div>

        {/* Product Catalog Combobox */}
        <div className="relative" ref={productDropdownRef}>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onFocus={() => {
                if (productResults.length > 0) setIsProductDropdownOpen(true);
              }}
              placeholder="Search product catalog by name, SKU or HSN (e.g. Gravity Hinge, Indicator Bolt, Supporting Leg)..."
              className="w-full pl-10 pr-10 py-2.5 bg-[#27272A]/50 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-all"
            />
            {searchingProduct && (
              <RefreshCw size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B5CF6] animate-spin" />
            )}
          </div>

          {/* Product Dropdown Results */}
          {isProductDropdownOpen && productResults.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1.5 bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-zinc-800">
              {productResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddProduct(p)}
                  className="p-3 hover:bg-[#27272A]/70 cursor-pointer transition-colors flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <strong className="text-white font-bold">{p.name}</strong>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-3">
                      <span className="font-mono text-zinc-300">SKU: {p.sku}</span>
                      <span>•</span>
                      <span className="font-mono">HSN: {p.hsnCode}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">₹{p.price.toLocaleString('en-IN')} / {p.unit}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                    + Add to PI
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto rounded-xl border border-[#27272A] bg-[#121214]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#18181B] border-b border-[#27272A] text-[11px] font-bold text-zinc-400 uppercase">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">Product Name & SKU</th>
                <th className="p-3 w-28">HSN Code</th>
                <th className="p-3 w-20">Unit</th>
                <th className="p-3 w-24 text-right">Qty</th>
                <th className="p-3 w-28 text-right">Unit Rate (₹)</th>
                <th className="p-3 w-24 text-center">GST %</th>
                <th className="p-3 w-32 text-right">Line Total (₹)</th>
                <th className="p-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {items.map((item, idx) => {
                const lineSubtotal = Math.round(Number(item.quantity || 0) * Number(item.unitPrice || 0));
                const taxable = Math.max(0, lineSubtotal - Number(item.discount || 0));
                const gst = Math.round((taxable * Number(item.gstRate || 18)) / 100);
                const total = taxable + gst;

                return (
                  <tr key={idx} className="hover:bg-[#18181B]/50 transition-colors">
                    <td className="p-3 text-center text-zinc-500 font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                        placeholder="Product title / description"
                        className="w-full px-2.5 py-1.5 bg-[#27272A]/40 border border-[#27272A] rounded-lg text-white text-xs focus:outline-none focus:border-[#8B5CF6]"
                      />
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => handleUpdateItem(idx, 'sku', e.target.value)}
                        placeholder="SKU"
                        className="w-full mt-1 px-2 py-0.5 bg-transparent text-[10px] font-mono text-zinc-400 border-0 focus:outline-none"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={(e) => handleUpdateItem(idx, 'hsnCode', e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#27272A]/40 border border-[#27272A] rounded-lg text-white font-mono text-xs focus:outline-none"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={item.unit}
                        onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#27272A]/40 border border-[#27272A] rounded-lg text-white text-xs focus:outline-none"
                      >
                        <option value="PCS">PCS</option>
                        <option value="SETS">SETS</option>
                        <option value="PAIRS">PAIRS</option>
                        <option value="MTR">MTR</option>
                        <option value="BOX">BOX</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-20 px-2 py-1.5 bg-[#27272A]/40 border border-[#27272A] rounded-lg text-white font-bold text-right text-xs focus:outline-none"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
                        className="w-24 px-2 py-1.5 bg-[#27272A]/40 border border-[#27272A] rounded-lg text-white font-mono text-right text-xs focus:outline-none"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={item.gstRate}
                        onChange={(e) => handleUpdateItem(idx, 'gstRate', Number(e.target.value))}
                        className="px-2 py-1.5 bg-[#27272A]/40 border border-[#27272A] rounded-lg text-white font-mono text-xs focus:outline-none"
                      >
                        <option value={18}>18%</option>
                        <option value={12}>12%</option>
                        <option value={5}>5%</option>
                        <option value={28}>28%</option>
                        <option value={0}>0%</option>
                      </select>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      ₹{total.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. COMMERCIAL TERMS & FINANCIAL SUMMARY ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Commercial Terms & References */}
        <div className="lg:col-span-7 bg-[#18181B] border border-[#27272A] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#27272A] pb-3">
            <CreditCard size={16} className="text-[#8B5CF6]" /> 4. Commercial & Payment Terms
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-zinc-400 font-bold">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] rounded-xl text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 font-bold">Valid Until Date</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] rounded-xl text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 font-bold">Customer PO Reference (Optional)</label>
              <input
                type="text"
                value={poReference}
                onChange={(e) => setPoReference(e.target.value)}
                placeholder="e.g. PO-APEX-2026-881"
                className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] rounded-xl font-mono text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 font-bold">Linked Quotation Ref (Optional)</label>
              <input
                type="text"
                value={quoteReference}
                onChange={(e) => setQuoteReference(e.target.value)}
                placeholder="e.g. PRC-QT-2026-0001"
                className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] rounded-xl font-mono text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-zinc-400 font-bold">Required Advance Deposit %</label>
              <div className="flex gap-2">
                {[30, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setAdvancePercentage(pct)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      advancePercentage === pct
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-[#27272A]/40 text-zinc-300 border-[#27272A] hover:bg-[#27272A]'
                    }`}
                  >
                    {pct}% Advance
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-zinc-400 font-bold">Dispatch & Delivery Timeline</label>
              <input
                type="text"
                value={deliveryTimeline}
                onChange={(e) => setDeliveryTimeline(e.target.value)}
                className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] rounded-xl text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-zinc-400 font-bold">Special Remarks / Project Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Floor-wise tagged packing, SS Grade 304 test certificate included..."
                className="w-full px-3 py-2 bg-[#27272A]/40 border border-[#27272A] rounded-xl text-white focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Financial Summary & Taxes Card */}
        <div className="lg:col-span-5 bg-[#18181B] border border-[#27272A] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center justify-between border-b border-[#27272A] pb-3">
              <span>Financials & Tax Summary</span>
              <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full ${
                isInterState ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST + SGST)'}
              </span>
            </h2>

            <div className="space-y-2.5 pt-3 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span>Basic Subtotal:</span>
                <span className="font-mono font-bold text-white">₹{totals.subtotal.toLocaleString('en-IN')}</span>
              </div>

              {isInterState ? (
                <div className="flex justify-between text-zinc-300">
                  <span>Integrated GST (IGST 18%):</span>
                  <span className="font-mono text-amber-400 font-bold">₹{totals.igst.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-zinc-300">
                    <span>Central GST (CGST 9%):</span>
                    <span className="font-mono text-emerald-400 font-bold">₹{totals.cgst.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>State GST (SGST 9%):</span>
                    <span className="font-mono text-emerald-400 font-bold">₹{totals.sgst.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}

              <div className="border-t border-[#27272A] pt-2.5 flex justify-between text-sm font-extrabold text-white">
                <span>Grand Total:</span>
                <span className="font-mono text-base text-purple-400">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl space-y-1.5 mt-2">
                <div className="flex justify-between text-xs font-bold text-purple-200">
                  <span>Advance Payable ({advancePercentage}%):</span>
                  <span className="font-mono font-extrabold text-sm text-purple-300">
                    ₹{totals.advanceAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Balance Due Before Dispatch:</span>
                  <span className="font-mono">₹{totals.balanceAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#27272A] space-y-2">
            <button
              type="button"
              onClick={handleGeneratePI}
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Generating PI...
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Save & Generate Proforma Invoice PDF
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
