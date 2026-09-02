import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Building2, Users, Search, Plus, Minus, Trash2, ArrowLeft,
  FileText, ShieldCheck, Printer, Download, Sparkles, CheckCircle2,
  AlertCircle, RefreshCw, X, Package, MapPin, Phone, Mail,
  CreditCard, Calendar, Truck, Layers, ChevronDown, Image as ImageIcon,
  Warehouse, Lock, Tag
} from 'lucide-react';
import {
  PROFORMA_FACILITIES,
  ProformaFacility,
  ProformaInvoice,
  CreateProformaInvoicePayload,
  GST_STATE_MAPPING
} from '../../types/proforma';
import {
  proformaService,
  B2BCustomerSearchResult,
  CustomerSavedAddressSummary,
  ProductSearchResult
} from '../../api/proformaService';
import { inventoryApi, b2bPricingApi } from '../../api/adminApi';
import type { Branch } from '../../types/admin';
import { getCachedCategories } from '../../utils/referenceDataCache';
import { printProformaInvoice } from '../../utils/proformaPdfGenerator';

interface Props {
  onBack: () => void;
  onSaved: (pi: ProformaInvoice) => void;
  initialInvoice?: ProformaInvoice | null;
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
  thumbnail?: string;
  isCustomB2BPrice?: boolean;
  customB2BDiscountPercent?: number;
}

const DEFAULT_CATEGORY_OPTIONS = [
  { label: 'All Hardware Categories', slug: '' },
  { label: 'Restroom & Cubicle Hardware', slug: 'cubicle-hardware' },
  { label: 'Locker & Cabinet Hardware', slug: 'locker-hardware' },
  { label: 'Urinal & Partition Hardware', slug: 'urinal-hardware' },
  { label: 'Shower & Glass Hardware', slug: 'shower-hardware' },
];

/**
 * Maps an Inventory Fulfillment Branch into a rich ProformaFacility
 */
function mapBranchToProformaFacility(b: any): ProformaFacility {
  const branchCodeUpper = (b.code || '').toUpperCase();
  const staticMatch = Object.values(PROFORMA_FACILITIES).find(
    (sf) => sf.code.toUpperCase() === branchCodeUpper || sf.id === b.id
  );

  let stateCode = '07';
  const branchState = b.state || 'Delhi';
  const match = Object.entries(GST_STATE_MAPPING).find(
    ([, sName]) => sName.toLowerCase() === branchState.toLowerCase()
  );
  if (match) stateCode = match[0];
  if (branchState.toLowerCase() === 'maharashtra') stateCode = '27';
  if (branchState.toLowerCase() === 'west bengal') stateCode = '19';

  const gstin =
    b.gstNumber ||
    b.gstin ||
    (stateCode === '27'
      ? '27AABCP1234F1Z9'
      : stateCode === '19'
      ? '19AABCP1234F1Z9'
      : '07AABCP1234F1Z9');

  return {
    id: b.id || `fac-${b.code}`,
    code: b.code || b.name,
    name: staticMatch?.name || `PRC Hardware - ${b.name}`,
    tagline:
      staticMatch?.tagline ||
      (branchCodeUpper === 'DEL' || branchCodeUpper === 'DELHI_WORKS'
        ? 'Main Corporate Works & Central Logistics Hub'
        : 'Fulfillment Branch & Logistics Depot'),
    address:
      b.address ||
      staticMatch?.address ||
      'H-3, J.R. Complex, Gate No 4, Mela Ram Farm, Mandoli',
    city: b.city || staticMatch?.city || 'Delhi',
    state: branchState,
    stateCode,
    pincode:
      b.pincode ||
      staticMatch?.pincode ||
      (stateCode === '27' ? '421302' : stateCode === '19' ? '700001' : '110093'),
    gstin,
    email: b.email || staticMatch?.email || 'billing@pacifichardware.com',
    phone: b.phone || staticMatch?.phone || '+91 11 2233 4455',
    bankName:
      staticMatch?.bankName ||
      (stateCode === '27'
        ? 'ICICI Bank Ltd'
        : stateCode === '19'
        ? 'Axis Bank Ltd'
        : 'HDFC Bank Ltd'),
    accountName: 'Pacific Products and Solutions',
    accountNumber:
      staticMatch?.accountNumber ||
      (stateCode === '27'
        ? '001105023456'
        : stateCode === '19'
        ? '91902008899112'
        : '50200088991122'),
    ifscCode:
      staticMatch?.ifscCode ||
      (stateCode === '27'
        ? 'ICIC0000011'
        : stateCode === '19'
        ? 'UTIB0000019'
        : 'HDFC0001234'),
    branch: staticMatch?.branch || `${b.city || 'Central Works'}, India`,
    upiId:
      staticMatch?.upiId ||
      (stateCode === '27' ? 'prchardware@icici' : 'prchardware@hdfcbank'),
  };
}

export function ProformaInvoiceCreateView({ onBack, onSaved, initialInvoice }: Props) {
  const isEditing = Boolean(initialInvoice && initialInvoice.id);

  // Fulfillment Facilities (Loaded dynamically from Inventory Page)
  const [facilities, setFacilities] = useState<ProformaFacility[]>([
    PROFORMA_FACILITIES.DELHI_WORKS,
    PROFORMA_FACILITIES.MUMBAI_DEPOT,
  ]);
  const [selectedFacilityCode, setSelectedFacilityCode] = useState<string>(
    initialInvoice?.facilityCode || 'DELHI_WORKS'
  );
  const [loadingFacilities, setLoadingFacilities] = useState<boolean>(false);

  // Active facility object
  const facility = useMemo(() => {
    return (
      facilities.find(
        (f) =>
          f.code.toUpperCase() === selectedFacilityCode.toUpperCase() ||
          f.id === selectedFacilityCode
      ) ||
      facilities[0] ||
      PROFORMA_FACILITIES.DELHI_WORKS
    );
  }, [facilities, selectedFacilityCode]);

  // Customer Search & Details
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchType, setCustomerSearchType] = useState<'ALL' | 'GSTIN' | 'EMAIL' | 'PHONE' | 'COMPANY'>('ALL');
  const [customerResults, setCustomerResults] = useState<B2BCustomerSearchResult[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(
    initialInvoice?.customerId || undefined
  );
  const [selectedCustomer, setSelectedCustomer] = useState<B2BCustomerSearchResult | null>(null);
  const [customerSavedAddresses, setCustomerSavedAddresses] = useState<CustomerSavedAddressSummary[]>([]);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [customerName, setCustomerName] = useState(initialInvoice?.customerName || '');
  const [companyName, setCompanyName] = useState(initialInvoice?.companyName || '');
  const [customerEmail, setCustomerEmail] = useState(initialInvoice?.customerEmail || '');
  const [customerPhone, setCustomerPhone] = useState(initialInvoice?.customerPhone || '');
  const [customerGstin, setCustomerGstin] = useState(initialInvoice?.customerGstin || '');
  const [placeOfSupply, setPlaceOfSupply] = useState(initialInvoice?.placeOfSupply || 'Delhi');
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState(initialInvoice?.placeOfSupplyCode || '07');
  const [billingAddress, setBillingAddress] = useState(initialInvoice?.billingAddress || '');
  const [shippingAddress, setShippingAddress] = useState(initialInvoice?.shippingAddress || '');
  const [sameAsBilling, setSameAsBilling] = useState(
    !initialInvoice?.shippingAddress || initialInvoice.shippingAddress === initialInvoice.billingAddress
  );

  // Customer-Specific B2B Pricing Matrix Map (Loaded automatically upon customer selection)
  const [customerPricingMap, setCustomerPricingMap] = useState<Record<string, {
    customPrice: number;
    hasCustomPrice: boolean;
    standardPrice: number;
    discountPercent: number;
    minQuantity?: number;
    notes?: string | null;
  }>>({});
  const [loadingCustomPrices, setLoadingCustomPrices] = useState(false);

  // Dates & Commercial Terms
  const [issueDate, setIssueDate] = useState(
    initialInvoice?.issueDate ? new Date(initialInvoice.issueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState(
    initialInvoice?.validUntil ? new Date(initialInvoice.validUntil).toISOString().slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [poReference, setPoReference] = useState(initialInvoice?.poReference || '');
  const [quoteReference, setQuoteReference] = useState(initialInvoice?.quoteReference || '');
  const [advancePercentage, setAdvancePercentage] = useState<number>(initialInvoice?.advancePercentage ?? 30);
  const [shippingCharges, setShippingCharges] = useState<number>(initialInvoice?.shippingCharges ?? 0);
  const [shippingGstRate, setShippingGstRate] = useState<number>(18);
  const [deliveryTimeline, setDeliveryTimeline] = useState(
    initialInvoice?.deliveryTimeline || 'Immediate dispatch within 5-7 working days'
  );
  const [notes, setNotes] = useState(initialInvoice?.notes || '');

  // Line Items (Initialized with initialInvoice items if editing, else empty array)
  const [items, setItems] = useState<DraftLineItem[]>(() => {
    if (initialInvoice && Array.isArray(initialInvoice.items) && initialInvoice.items.length > 0) {
      return initialInvoice.items.map((it) => ({
        productId: it.productId,
        sku: it.sku || 'SKU-001',
        productName: it.productName,
        description: it.description,
        hsnCode: it.hsnCode || '83024110',
        unit: it.unit || 'PCS',
        quantity: it.quantity || 1,
        unitPrice: Number(it.unitPrice || (it as any).unitRate || 0),
        discount: Number(it.discount || 0),
        gstRate: Number(it.gstRate || (it as any).igstRate || 18),
      }));
    }
    return [];
  });

  // Categories & Product Search
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_CATEGORY_OPTIONS);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Load Fulfillment Facilities dynamically from Inventory Page (inventoryApi.getBranches)
  useEffect(() => {
    const fetchFulfillmentFacilities = async () => {
      setLoadingFacilities(true);
      try {
        const res = await inventoryApi.getBranches({ isActive: true });
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          const mappedFacilities = res.data.map(mapBranchToProformaFacility);
          setFacilities(mappedFacilities);
          // Set first facility as default
          if (mappedFacilities.length > 0) {
            setSelectedFacilityCode(mappedFacilities[0].code);
          }
        }
      } catch (err) {
        console.warn('Could not load inventory fulfillment facilities:', err);
      } finally {
        setLoadingFacilities(false);
      }
    };

    fetchFulfillmentFacilities();
  }, []);

  // 2. Load Categories on mount
  useEffect(() => {
    getCachedCategories()
      .then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          const dynamicOptions = cats.map((c) => ({
            label: c.name,
            slug: c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
          }));
          const merged = [...DEFAULT_CATEGORY_OPTIONS];
          dynamicOptions.forEach((opt) => {
            if (!merged.some((m) => m.slug === opt.slug)) {
              merged.push(opt);
            }
          });
          setCategoryOptions(merged);
        }
      })
      .catch((err) => {
        console.warn('Could not load cached categories:', err);
      });
  }, []);

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

  // Debounced Product Search with Category Filter
  useEffect(() => {
    let active = true;
    setSearchingProduct(true);
    const timer = setTimeout(async () => {
      try {
        const results = await proformaService.searchProducts(productSearch, selectedCategory);
        if (active) {
          setProductResults(results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setSearchingProduct(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [productSearch, selectedCategory]);

    // Handle Customer Selection
  const handleSelectCustomer = async (c: B2BCustomerSearchResult) => {
    setSelectedCustomerId(c.id);
    setSelectedCustomer(c);
    setCustomerName(c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim());
    setCompanyName(c.companyName || c.name);
    setCustomerEmail(c.email || '');
    setCustomerPhone(c.phone || '');
    setCustomerGstin(c.gstin || '');
    if (c.billingAddress) setBillingAddress(c.billingAddress);
    if (c.shippingAddress) setShippingAddress(c.shippingAddress);
    if (c.state) setPlaceOfSupply(c.state);
    if (c.stateCode) setPlaceOfSupplyCode(c.stateCode);
    if (c.addresses && c.addresses.length > 0) setCustomerSavedAddresses(c.addresses);

    // Clear search query
    setCustomerSearch('');
    setIsCustomerDropdownOpen(false);
    setCustomerResults([]);

    // Trigger B2B custom pricing matrix parallel fetch
    const lookupKey = c.id || c.email || c.phone;
    if (lookupKey) {
      fetchAndApplyCustomerPricing(lookupKey);
    } else {
      setCustomerPricingMap({});
    }

    // Automatically in background fetch complete 360 customer profile to get all saved addresses
    if (c.id && !c.id.startsWith('quote-')) {
      proformaService.getCustomerFullDetails(c.id).then((full) => {
        if (full) {
          setSelectedCustomer(full);
          if (full.companyName && !c.companyName) setCompanyName(full.companyName);
          if (full.gstin && !c.gstin) setCustomerGstin(full.gstin);
          if (full.addresses && full.addresses.length > 0) {
            setCustomerSavedAddresses(full.addresses);
          }
          if (full.billingAddress) {
            setBillingAddress(full.billingAddress);
          }
          if (full.shippingAddress) {
            setShippingAddress(full.shippingAddress);
          }
          if (full.state) setPlaceOfSupply(full.state);
          if (full.stateCode) setPlaceOfSupplyCode(full.stateCode);
        }
      }).catch((err) => {
        console.warn('Could not auto-fetch customer address:', err);
      });
    }
  };

  /**
   * Parallel Fetch: Loads all product custom B2B prices for the chosen customer
   * and auto-applies them to line items.
   */
  const fetchAndApplyCustomerPricing = async (targetIdOrEmail: string) => {
    if (!targetIdOrEmail) return;
    setLoadingCustomPrices(true);
    try {
      const pricingRes = await b2bPricingApi.getCustomerPricing(targetIdOrEmail);
      const pItems = pricingRes?.data?.items || pricingRes?.items || pricingRes?.data || [];
      const pMap: Record<string, any> = {};

      if (Array.isArray(pItems)) {
        pItems.forEach((it: any) => {
          const hasCustom = Boolean(it.hasCustomPrice || (it.customPrice && Number(it.customPrice) > 0));
          const rule = {
            customPrice: Number(it.customPrice || it.price),
            hasCustomPrice: hasCustom,
            standardPrice: Number(it.standardPrice || it.salePrice || it.price),
            discountPercent: Number(it.discountPercent || 0),
            minQuantity: it.minQuantity || 1,
            notes: it.notes || null,
          };
          if (it.productId) pMap[it.productId] = rule;
          if (it.id) pMap[it.id] = rule;
          if (it.sku) pMap[it.sku.toLowerCase()] = rule;
          if (it.slug) pMap[it.slug.toLowerCase()] = rule;
          if (it.name) pMap[it.name.toLowerCase().trim()] = rule;
        });
      }
      setCustomerPricingMap(pMap);

      // Automatically update existing line items if any were already selected
      setItems((prevItems) =>
        prevItems.map((item) => {
          const rule =
            (item.productId && pMap[item.productId]) ||
            (item.sku && pMap[item.sku.toLowerCase()]) ||
            (item.productName && pMap[item.productName.toLowerCase().trim()]);

          if (rule && rule.hasCustomPrice && rule.customPrice > 0) {
            return {
              ...item,
              unitPrice: rule.customPrice,
              isCustomB2BPrice: true,
              customB2BDiscountPercent: rule.discountPercent,
            };
          }
          return item;
        })
      );
    } catch (pErr) {
      console.warn('Could not load B2B custom prices for customer:', pErr);
      setCustomerPricingMap({});
    } finally {
      setLoadingCustomPrices(false);
    }
  };

  // Handle Clear / Change Customer
  const handleClearCustomer = () => {
    setSelectedCustomerId(undefined);
    setSelectedCustomer(null);
    setCustomerPricingMap({});
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

  // Handle Product Selection into line items (With Customer-Specific B2B Pricing Lookup)
  const handleAddProduct = (p: ProductSearchResult) => {
    const customRule =
      customerPricingMap[p.id] ||
      (p.sku ? customerPricingMap[p.sku.toLowerCase()] : undefined) ||
      (p.name ? customerPricingMap[p.name.toLowerCase().trim()] : undefined);
    const hasCustomPrice = Boolean(customRule && customRule.hasCustomPrice && customRule.customPrice > 0);
    const effectiveUnitPrice = hasCustomPrice ? customRule.customPrice : Number(p.price || 0);

    const existingIndex = items.findIndex(
      (i) =>
        (i.productId && i.productId === p.id) ||
        (i.sku && i.sku.toLowerCase() === p.sku.toLowerCase())
    );

    if (existingIndex >= 0) {
      setItems((prev) => {
        const next = [...prev];
        const currentQty = Number(next[existingIndex].quantity) || 1;
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: currentQty + 1,
          unitPrice: effectiveUnitPrice,
          isCustomB2BPrice: hasCustomPrice,
          customB2BDiscountPercent: hasCustomPrice ? customRule?.discountPercent : undefined,
        };
        return next;
      });
    } else {
      const newItem: DraftLineItem = {
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        description: p.description || '',
        hsnCode: p.hsnCode || '83024110',
        unit: p.unit || 'PCS',
        quantity: 1,
        unitPrice: effectiveUnitPrice,
        discount: 0,
        gstRate: p.gstRate || 18,
        thumbnail: p.thumbnail || (p.images && p.images[0]),
        isCustomB2BPrice: hasCustomPrice,
        customB2BDiscountPercent: hasCustomPrice ? customRule?.discountPercent : undefined,
      };
      setItems((prev) => [...prev, newItem]);
    }

    setProductSearch('');
    setIsProductDropdownOpen(false);
  };

  // Quantity Stepper Change Handler
  const handleQuantityChange = (index: number, newQty: number) => {
    const parsed = Number(newQty);
    const validQty = isNaN(parsed) || parsed < 1 ? 1 : Math.floor(parsed);
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: validQty };
      return next;
    });
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

    const shipping = Math.max(0, Number(shippingCharges) || 0);
    const shippingRate = Number(shippingGstRate !== undefined ? shippingGstRate : 18);
    let shippingCgst = 0;
    let shippingSgst = 0;
    let shippingIgst = 0;

    if (shipping > 0 && shippingRate > 0) {
      if (isInterState) {
        shippingIgst = Math.round((shipping * shippingRate) / 100);
      } else {
        shippingCgst = Math.round((shipping * (shippingRate / 2)) / 100);
        shippingSgst = Math.round((shipping * (shippingRate / 2)) / 100);
      }
    }

    cgst += shippingCgst;
    sgst += shippingSgst;
    igst += shippingIgst;

    const taxableAmount = subtotal + shipping;
    const taxTotal = cgst + sgst + igst;
    const grandTotal = taxableAmount + taxTotal;
    const advPct = Math.min(100, Math.max(0, Number(advancePercentage) || 0));
    const advanceAmount = Math.round((grandTotal * advPct) / 100);
    const balanceAmount = Math.max(0, grandTotal - advanceAmount);

    return {
      subtotal,
      shippingCharges: shipping,
      shippingGstRate: shippingRate,
      shippingGstAmount: shippingCgst + shippingSgst + shippingIgst,
      taxableAmount,
      cgst,
      sgst,
      igst,
      taxTotal,
      grandTotal,
      advanceAmount,
      balanceAmount,
    };
  }, [items, isInterState, shippingCharges, shippingGstRate, advancePercentage]);

  // Submit Handler
  const handleGeneratePI = async () => {
    setErrorMsg('');
    if (!companyName.trim() && !customerName.trim()) {
      setErrorMsg('Customer or Company Name is mandatory.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Please add at least one hardware product to generate the Proforma Invoice.');
      return;
    }
    if (items.some((it) => !it.productName.trim() || it.quantity <= 0)) {
      setErrorMsg('Please fill out all product names and positive quantities.');
      return;
    }

    setIsSubmitting(true);
    try {
      const advPct = Math.min(100, Math.max(0, Number(advancePercentage) || 0));
      const payload: CreateProformaInvoicePayload = {
        facilityCode: facility.code,
        facility,
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
        paymentTerms: `${advPct}% Advance against Proforma Invoice, balance before dispatch`,
        advancePercentage: advPct,
        shippingCharges: totals.shippingCharges,
        shippingGstRate: totals.shippingGstRate,
        notes: notes.trim() || undefined,
        items,
      };

      let result: ProformaInvoice;
      if (isEditing && initialInvoice?.id) {
        result = await proformaService.updateProformaInvoice(initialInvoice.id, payload);
      } else {
        result = await proformaService.createProformaInvoice(payload);
      }
      onSaved(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save Proforma Invoice. Please check all fields.');
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
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md border ${
                isEditing
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-[#8B5CF6]/20 text-[#C4B5FD] border-[#8B5CF6]/30'
              }`}>
                {isEditing ? 'PROFORMA EDITOR' : 'PROFORMA GENERATOR'}
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {isEditing ? `Edit Proforma Invoice: ${initialInvoice?.piNumber}` : 'Create Proforma Invoice (PI)'}
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isEditing
                ? 'Modify line items, quantities, custom B2B prices, commercial terms, or customer details for this Proforma Invoice.'
                : 'Issue an official Commercial Proforma Invoice with inventory fulfillment facility routing, B2B customer auto-fill, and GST computation.'}
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
                <RefreshCw size={14} className="animate-spin" /> {isEditing ? 'Saving Changes...' : 'Generating PI...'}
              </>
            ) : (
              <>
                <Sparkles size={14} /> {isEditing ? 'Save & Update Proforma Invoice' : 'Generate & Issue PI'}
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

      {/* ─── 1. FACILITY SELECTION CARD (LINKED WITH INVENTORY FULFILLMENT FACILITIES) ─── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272A] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Warehouse size={16} className="text-[#8B5CF6]" /> 1. Select Origin Dispatch Facility (Fulfillment Facilities)
            </h2>
            <p className="text-xs text-zinc-400">
              Directly linked with Inventory Fulfillment Facilities. Sets billing entity works, registered warehouse address, GST State Code (IGST vs CGST+SGST), and RTGS bank transfer details.
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#A78BFA] bg-[#8B5CF6]/10 px-2.5 py-1 rounded-full border border-[#8B5CF6]/20 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-[#8B5CF6]" />
            <span>Active: {facility.name}</span>
          </span>
        </div>

        {loadingFacilities ? (
          <div className="p-6 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-[#8B5CF6]" />
            <span>Loading active fulfillment facilities from inventory...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((fac, idx) => {
              const isSelected =
                facility.code.toUpperCase() === fac.code.toUpperCase() ||
                facility.id === fac.id;

              return (
                <div
                  key={fac.id || fac.code || idx}
                  onClick={() => setSelectedFacilityCode(fac.code || fac.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 space-y-2.5 relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#8B5CF6]/10 border-[#8B5CF6] shadow-md shadow-purple-950/20 ring-1 ring-[#8B5CF6]/50'
                      : 'bg-[#27272A]/40 border-[#27272A] hover:border-zinc-600 hover:bg-[#27272A]/70'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono shrink-0">
                          {fac.code || `FACILITY 0${idx + 1}`}
                        </span>
                        <strong className="text-xs text-white truncate block">
                          {fac.name}
                        </strong>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={18} className="text-[#8B5CF6] shrink-0" />
                      )}
                    </div>

                    <p className="text-[11.5px] text-zinc-300 leading-relaxed line-clamp-2">
                      {fac.address}, {fac.city} - {fac.pincode}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>GSTIN: <span className="font-mono text-zinc-200 font-bold">{fac.gstin}</span></span>
                      <span className="font-mono text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800/50 px-1.5 py-0.2 rounded">
                        State: {fac.stateCode} ({fac.state})
                      </span>
                    </div>
                    <div className="truncate text-[10.5px]">
                      <span className="text-zinc-500">Bank:</span> {fac.bankName} • <span className="font-mono text-zinc-300">A/C: {fac.accountNumber}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 2. B2B CUSTOMER SEARCH & ADDRESS AUTO-FILL ───────────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 space-y-4">
        <div className="border-b border-[#27272A] pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-[#8B5CF6]" /> 2. B2B Customer Account & Delivery Address
            </h2>
            <p className="text-xs text-zinc-400">
              Search by 15-digit GSTIN, client email, phone, or company name to instantly pull registered billing & shipping addresses.
            </p>
          </div>
          {selectedCustomer && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 size={12} /> B2B Account Linked
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
              {isCustomerDropdownOpen && customerSearch.trim().length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-zinc-800 animate-in fade-in zoom-in-98 duration-150">
                  <div className="px-3 py-1.5 bg-[#121214] text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between border-b border-zinc-800">
                    <span>
                      {customerResults.length > 0
                        ? `Matching B2B Clients (${customerResults.length})`
                        : 'B2B Client Search'}
                    </span>
                    <span className="text-[#A78BFA] font-bold">
                      {customerResults.length > 0 ? 'Click to Select Account' : 'Strictly B2B Only'}
                    </span>
                  </div>

                  {searchingCustomer ? (
                    <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-[#8B5CF6]" />
                      <span>Searching B2B customer accounts...</span>
                    </div>
                  ) : customerResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-400 space-y-1">
                      <p className="font-bold text-zinc-300">No B2B customer accounts found</p>
                      <p className="text-[11px] text-zinc-500">
                        Query "{customerSearch}" did not match any registered B2B clients, GSTINs, or enterprise accounts.
                      </p>
                    </div>
                  ) : (
                    customerResults.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-3 hover:bg-[#8B5CF6]/15 cursor-pointer transition-colors flex items-center justify-between text-xs group"
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-white font-bold group-hover:text-[#A78BFA] transition-colors truncate">
                              {c.companyName || c.name}
                            </strong>
                            {c.gstin ? (
                              <span className="font-mono text-[10px] bg-purple-950/80 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800/60 font-bold">
                                GSTIN: {c.gstin}
                              </span>
                            ) : (
                              <span className="text-[9.5px] text-purple-300 bg-purple-950/50 border border-purple-800/40 px-1.5 py-0.2 rounded font-bold">
                                B2B ACCOUNT
                              </span>
                            )}
                            {c.addresses && c.addresses.length > 0 && (
                              <span className="text-[9.5px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded">
                                {c.addresses.length} Saved Address{c.addresses.length > 1 ? 'es' : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5">
                            <span>👤 {c.name}</span>
                            {c.email && (
                              <>
                                <span>•</span>
                                <span>✉️ {c.email}</span>
                              </>
                            )}
                            {c.phone && (
                              <>
                                <span>•</span>
                                <span>📞 {c.phone}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>📍 {c.city}, {c.state} ({c.stateCode || '07'})</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#A78BFA] bg-[#8B5CF6]/20 group-hover:bg-[#8B5CF6] group-hover:text-white border border-[#8B5CF6]/30 px-2.5 py-1 rounded-lg shrink-0 transition-all">
                          Select Account →
                        </span>
                      </div>
                    ))
                  )}
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
      {/* (Requires Customer Selection First; Replicated with B2B Custom Pricing Matrix) */}
      {(() => {
        const isCustomerSelected = Boolean(
          selectedCustomerId ||
          (companyName.trim() && (customerEmail.trim() || customerPhone.trim())) ||
          customerName.trim()
        );
        const customPriceRulesCount = Object.values(customerPricingMap).filter((v) => v.hasCustomPrice).length;

        return (
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 space-y-4">
            <div className="border-b border-[#27272A] pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Package size={16} className="text-[#8B5CF6]" /> 3. Line Items & Product Selector ({items.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  {isCustomerSelected
                    ? `Catalog unlocked. Showing custom B2B contract pricing for ${companyName || customerName}.`
                    : 'Product selection is locked. Please select a B2B customer account above first.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddCustomItem}
                disabled={!isCustomerSelected}
                title={!isCustomerSelected ? 'Select a customer in Step 2 to add items' : 'Add custom item'}
                className="px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-40 disabled:hover:bg-[#27272A] text-white text-xs font-bold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-all disabled:cursor-not-allowed"
              >
                <Plus size={13} /> Add Custom Line Item
              </button>
            </div>

            {/* Customer Requirement Notice / B2B Pricing Status Banner */}
            {!isCustomerSelected ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-4.5 flex items-start gap-3.5 text-amber-200 animate-in fade-in duration-150">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Lock size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-300 text-xs tracking-wide uppercase flex items-center gap-1.5">
                    Product Selection Locked — Select Customer First
                  </h4>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    By default, product catalog search and selection are disabled until a customer is selected in <strong>Step 2 (Customer & Buyer Details)</strong>. Once a customer is selected, product search will automatically enable and load that customer's pre-negotiated <strong>B2B Custom Pricing</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-purple-950/30 border border-purple-800/40 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#A78BFA] shrink-0">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span>B2B Contract Pricing Matrix Active for:</span>
                      <span className="text-[#C4B5FD] font-mono">{companyName || customerName}</span>
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      {loadingCustomPrices ? (
                        <span className="flex items-center gap-1 text-[#C4B5FD]">
                          <RefreshCw size={11} className="animate-spin" /> Fetching customer pricing matrix...
                        </span>
                      ) : customPriceRulesCount > 0 ? (
                        <span>
                          Found <strong className="text-emerald-400">{customPriceRulesCount} custom pricing rules</strong> for this client. Contract rates will be applied automatically upon selection.
                        </span>
                      ) : (
                        <span>Standard B2B wholesale tier rates apply. You can also manually adjust unit rates below.</span>
                      )}
                    </p>
                  </div>
                </div>
                {customPriceRulesCount > 0 && !loadingCustomPrices && (
                  <span className="text-[10.5px] bg-emerald-950 text-emerald-300 border border-emerald-700/80 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shrink-0">
                    <Tag size={12} className="text-emerald-400" />
                    {customPriceRulesCount} Custom Prices Loaded
                  </span>
                )}
              </div>
            )}

            {/* Product Catalog Search & Category Filter Combobox */}
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 ${!isCustomerSelected ? 'opacity-50 pointer-events-none' : ''}`}>
              
              {/* Category Filter */}
              <div className="relative">
                <select
                  disabled={!isCustomerSelected}
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setIsProductDropdownOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#27272A]/50 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-white font-bold focus:outline-none appearance-none cursor-pointer pr-9 disabled:cursor-not-allowed"
                >
                  {categoryOptions.map((c) => (
                    <option key={c.slug} value={c.slug} className="bg-[#18181B] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>

              {/* Search Bar with Autocomplete Dropdown */}
              <div className="sm:col-span-2 relative" ref={productDropdownRef}>
                <div className="relative">
                  {isCustomerSelected ? (
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  ) : (
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
                  )}
                  <input
                    type="text"
                    disabled={!isCustomerSelected}
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsProductDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (isCustomerSelected) setIsProductDropdownOpen(true);
                    }}
                    placeholder={
                      !isCustomerSelected
                        ? '🔒 Select a B2B customer in Step 2 above to unlock product search...'
                        : 'Search active catalog by product name, SKU, or HSN...'
                    }
                    className="w-full pl-10 pr-10 py-2.5 bg-[#27272A]/50 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-all disabled:cursor-not-allowed disabled:bg-zinc-900/40"
                  />
                  {searchingProduct && (
                    <RefreshCw size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B5CF6] animate-spin" />
                  )}
                </div>

                {/* Product Dropdown Results with B2B Custom Price Badge */}
                {isProductDropdownOpen && isCustomerSelected && (
                  <div className="absolute z-30 left-0 right-0 mt-1.5 bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-zinc-800 animate-in fade-in zoom-in-98 duration-150">
                    <div className="px-3.5 py-2 bg-[#121214] text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800">
                      <span>
                        {productResults.length > 0
                          ? `Matching Catalog Products (${productResults.length})`
                          : 'No Matching Products'}
                      </span>
                      <span className="text-[#A78BFA] font-bold">Click to Add / Increment Qty</span>
                    </div>

                    {searchingProduct ? (
                      <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-[#8B5CF6]" />
                        <span>Searching catalog database...</span>
                      </div>
                    ) : productResults.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-400">
                        No hardware products found matching current query and category filter.
                      </div>
                    ) : (
                      productResults.map((p) => {
                        const customRule =
                          customerPricingMap[p.id] ||
                          (p.sku ? customerPricingMap[p.sku.toLowerCase()] : undefined) ||
                          (p.name ? customerPricingMap[p.name.toLowerCase().trim()] : undefined);
                        const hasCustomPrice = Boolean(customRule && customRule.hasCustomPrice && customRule.customPrice > 0);
                        const effectivePrice = hasCustomPrice ? customRule.customPrice : Number(p.price || 0);

                        return (
                          <div
                            key={p.id}
                            onClick={() => handleAddProduct(p)}
                            className="p-3 hover:bg-[#8B5CF6]/15 cursor-pointer transition-colors flex items-center justify-between text-xs group"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                              {p.thumbnail ? (
                                <img
                                  src={p.thumbnail}
                                  alt={p.name}
                                  className="w-10 h-10 object-cover rounded-lg border border-zinc-700 shrink-0 bg-zinc-900"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-zinc-800/80 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-700 shrink-0">
                                  <Building2 size={16} />
                                </div>
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <strong className="text-white font-bold group-hover:text-[#A78BFA] transition-colors truncate block">
                                  {p.name}
                                </strong>
                                <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-zinc-300 font-bold">SKU: {p.sku}</span>
                                  <span>•</span>
                                  <span className="font-mono text-zinc-400">HSN: {p.hsnCode}</span>
                                  {p.category && (
                                    <>
                                      <span>•</span>
                                      <span className="text-purple-300">{p.category}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 space-y-1">
                              <div className="flex items-center justify-end gap-1.5">
                                {hasCustomPrice ? (
                                  <div className="space-y-0.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-xs font-black text-emerald-400 font-mono">
                                        ₹{effectivePrice.toLocaleString('en-IN')}
                                      </span>
                                      <span className="text-[9px] font-extrabold text-emerald-300 bg-emerald-950 border border-emerald-700 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                        <Tag size={9} /> B2B CUSTOM PRICE
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 line-through">
                                      Standard: ₹{Number(p.price || 0).toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="text-xs font-black text-white font-mono">
                                      ₹{p.price.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[9px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/80 px-1.5 py-0.2 rounded">
                                      B2B RATE
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  Stock: {p.stock} {p.unit}
                                </span>
                                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md transition-all group-hover:bg-emerald-500/25">
                                  + Add to PI
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

        {/* Mobile Line Item Touch Cards (Small Screens, Replicated from Storefront) */}
        <div className="md:hidden space-y-2.5 pt-1">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400 bg-[#121214] rounded-xl border border-[#27272A]">
              No line items added yet. Search products above to add items to this Proforma Invoice.
            </div>
          ) : (
            items.map((item, idx) => {
              const lineSubtotal = Math.round(Number(item.quantity || 0) * Number(item.unitPrice || 0));
              const taxable = Math.max(0, lineSubtotal - Number(item.discount || 0));
              const gst = Math.round((taxable * Number(item.gstRate || 18)) / 100);
              const total = taxable + gst;

              return (
                <div
                  key={idx}
                  className="bg-[#121214] p-3.5 rounded-xl border border-[#27272A] space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.productName}
                          className="w-10 h-10 object-cover rounded-lg border border-zinc-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 shrink-0">
                          <Package size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                          placeholder="Item Name"
                          className="w-full bg-transparent font-bold text-xs text-white focus:outline-none focus:border-b border-[#8B5CF6]"
                        />
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                          <span>SKU: {item.sku}</span>
                          <span>•</span>
                          <span>HSN: {item.hsnCode}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded-lg bg-rose-500/10 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-800">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-bold block">Quantity Stepper</label>
                      <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900 w-fit">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 flex items-center justify-center font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                          title="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                          className="w-10 text-center font-mono font-bold text-xs bg-transparent border-x border-zinc-700 py-0.5 focus:outline-none text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center font-bold text-zinc-300 hover:bg-zinc-800 transition-colors"
                          title="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] text-zinc-400 font-mono">
                          ₹{Number(item.unitPrice || 0).toLocaleString('en-IN')} / {item.unit}
                        </span>
                        {item.isCustomB2BPrice && (
                          <span className="text-[8.5px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-1 rounded">
                            B2B
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-black text-xs text-white block">
                        ₹{total.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Line Items Table (Replicated with Quantity Steppers & Thumbnails) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-[#27272A] bg-[#121214]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#18181B] border-b border-[#27272A] text-[11px] font-bold text-zinc-400 uppercase">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">Hardware Product & SKU</th>
                <th className="p-3 w-28">HSN Code</th>
                <th className="p-3 w-20">Unit</th>
                <th className="p-3 w-36 text-center">Quantity</th>
                <th className="p-3 w-32 text-right">Unit Rate (₹)</th>
                <th className="p-3 w-20 text-center">GST %</th>
                <th className="p-3 w-32 text-right">Line Total (₹)</th>
                <th className="p-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-zinc-500">
                    No line items added yet. Use the category filter or search bar above to append hardware products to this PI.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const lineSubtotal = Math.round(Number(item.quantity || 0) * Number(item.unitPrice || 0));
                  const taxable = Math.max(0, lineSubtotal - Number(item.discount || 0));
                  const gst = Math.round((taxable * Number(item.gstRate || 18)) / 100);
                  const total = taxable + gst;

                  return (
                    <tr key={idx} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="p-3 text-center text-zinc-500 font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.productName}
                              className="w-9 h-9 object-cover rounded-lg border border-zinc-700 shrink-0 bg-zinc-900"
                            />
                          ) : (
                            <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 shrink-0">
                              <Package size={15} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                              placeholder="Product title / description"
                              className="w-full px-2 py-1 bg-[#27272A]/40 border border-[#27272A] rounded-lg text-white font-bold text-xs focus:outline-none focus:border-[#8B5CF6]"
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="text"
                                value={item.sku}
                                onChange={(e) => handleUpdateItem(idx, 'sku', e.target.value)}
                                placeholder="SKU"
                                className="w-32 px-1.5 py-0.5 bg-transparent text-[10.5px] font-mono text-zinc-400 border border-zinc-800 rounded focus:outline-none focus:border-zinc-600"
                              />
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                                placeholder="Optional specification / details"
                                className="flex-1 px-1.5 py-0.5 bg-transparent text-[10px] text-zinc-500 border border-zinc-800 rounded focus:outline-none focus:border-zinc-600"
                              />
                            </div>
                          </div>
                        </div>
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
                      <td className="p-3 text-center">
                        {/* Interactive Stepper (Replicated from B2B Quotation Form) */}
                        <div className="inline-flex items-center border border-zinc-700 rounded-xl overflow-hidden bg-zinc-900 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 flex items-center justify-center font-bold text-zinc-300 hover:bg-[#8B5CF6] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500 transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                            className="w-12 text-center font-mono font-bold text-xs bg-zinc-950 border-x border-zinc-700 py-1 focus:outline-none text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center font-bold text-zinc-300 hover:bg-[#8B5CF6] hover:text-white transition-colors"
                            title="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="space-y-1">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
                            className="w-24 px-2 py-1.5 bg-[#27272A]/40 border border-[#27272A] rounded-lg text-white font-mono text-right text-xs focus:outline-none"
                          />
                          {item.isCustomB2BPrice && (
                            <span className="text-[9px] text-emerald-400 font-bold block flex items-center justify-end gap-0.5">
                              <Tag size={9} /> B2B Price
                            </span>
                          )}
                        </div>
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
                          className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Remove Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  })()}

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

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                  <CreditCard size={13} className="text-[#8B5CF6]" />
                  <span>Advance Payment Terms Percentage (%) *</span>
                </label>
                <span className="text-[11px] font-mono text-purple-300 font-bold">
                  {advancePercentage}% Advance Deposit
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-36">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={advancePercentage}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setAdvancePercentage(isNaN(v) ? 0 : Math.min(100, Math.max(0, v)));
                    }}
                    placeholder="Custom %"
                    className="w-full px-3 py-1.5 bg-[#27272A]/60 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white font-mono font-bold text-xs focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs font-bold">%</span>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {[10, 25, 30, 50, 70, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setAdvancePercentage(pct)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        advancePercentage === pct
                          ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-xs'
                          : 'bg-[#27272A]/40 text-zinc-400 border-[#27272A] hover:bg-[#27272A] hover:text-zinc-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
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
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center justify-between border-b border-[#27272A] pb-3">
              <span>Financials & Tax Summary</span>
              <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full ${
                isInterState ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST + SGST)'}
              </span>
            </h2>

            {/* Customizable Transportation & Shipping Charges */}
            <div className="p-3 bg-[#121214] border border-[#27272A] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <Truck size={13} className="text-[#8B5CF6]" /> Transportation & Shipping Charges
                </span>
                <span className="text-[10.5px] font-mono text-purple-300">
                  {shippingCharges > 0 ? `+ ₹${Number(shippingCharges).toLocaleString('en-IN')}` : 'Optional'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={shippingCharges || ''}
                    onChange={(e) => setShippingCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Freight Amount (₹)"
                    className="w-full pl-6 pr-2.5 py-1.5 bg-[#27272A]/50 border border-[#27272A] focus:border-[#8B5CF6] rounded-lg text-white font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <select
                    value={shippingGstRate}
                    onChange={(e) => setShippingGstRate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-[#27272A]/50 border border-[#27272A] focus:border-[#8B5CF6] rounded-lg text-white font-mono text-xs focus:outline-none"
                  >
                    <option value={18}>Freight GST: 18%</option>
                    <option value={12}>Freight GST: 12%</option>
                    <option value={5}>Freight GST: 5%</option>
                    <option value={0}>Freight GST: 0% (Exempt)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Calculation Breakdown */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span>Products Basic Subtotal:</span>
                <span className="font-mono font-bold text-white">₹{totals.subtotal.toLocaleString('en-IN')}</span>
              </div>

              {totals.shippingCharges > 0 && (
                <div className="flex justify-between text-zinc-300">
                  <span>Transportation & Freight Charges:</span>
                  <span className="font-mono font-bold text-white">₹{totals.shippingCharges.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-300 border-t border-zinc-800/80 pt-1.5">
                <span>Total Taxable Value:</span>
                <span className="font-mono font-bold text-white">₹{totals.taxableAmount.toLocaleString('en-IN')}</span>
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
                <span>Grand Total (Incl. GST):</span>
                <span className="font-mono text-base text-purple-400">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl space-y-1.5 mt-2">
                <div className="flex justify-between text-xs font-bold text-purple-200">
                  <span>Commercial Advance Payable ({advancePercentage}%):</span>
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
