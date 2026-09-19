import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  FileText,
  HelpCircle,
  Layers,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Warehouse,
  X,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Receipt,
  Truck,
} from 'lucide-react';
import { b2bOrdersApi } from '../api/b2bOrdersApi';
import { fetchAdminApi, inventoryApi, usersApi } from '../api/adminApi';
import { B2BOrder } from '../types/admin';

export interface CreateB2BOrderPageProps {
  onBack: () => void;
  onOrderCreated?: (order?: B2BOrder) => void;
}

interface SelectedLineItem {
  productId: string;
  sku: string;
  name: string;
  thumbnail?: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  isCustomPrice: boolean;
  discount: number;
  taxRate: number;
  lineTotal: number;
  availableStock: number;
}

export function CreateB2BOrderPage({ onBack, onOrderCreated }: CreateB2BOrderPageProps) {
  // ─── Customer State ──────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerB2bPrices, setCustomerB2bPrices] = useState<Map<string, number>>(new Map());

  // ─── Branch / Facility State ────────────────────────────────────────────────
  const [branches, setBranches] = useState<{ id: string; name: string; code: string; city?: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // ─── Product Catalog & Selection State ──────────────────────────────────────
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [categories, setCategories] = useState<string[]>([]);

  // ─── Order Line Items ───────────────────────────────────────────────────────
  const [lineItems, setLineItems] = useState<SelectedLineItem[]>([]);

  // ─── Commercial Details ─────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [sourcePoNumber, setSourcePoNumber] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  // ─── Submission State ───────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Helper: Strict B2B Customer Validator ───────────────────────────────────
  const isB2BCustomer = (u: any): boolean => {
    if (!u) return false;
    const hasCompany = Boolean(u.companyName && String(u.companyName).trim().length > 0);
    const hasGstin = Boolean(u.gstin && String(u.gstin).trim().length > 0);
    const roleSlug =
      typeof u.role === 'object' && u.role !== null
        ? String(u.role.slug || u.role.name || '')
        : String(u.role || u.roleSlug || '');
    const cleanRole = roleSlug.toLowerCase().replace(/[-_]/g, '');
    const isB2bRole = ['b2bbuyer', 'b2bcustomer', 'enterprise', 'wholesale', 'commercial'].includes(cleanRole);
    return hasCompany || hasGstin || isB2bRole;
  };

  // ─── 1. Load Initial Data (Customers, Branches, Catalog) ───────────────────
  useEffect(() => {
    const initData = async () => {
      setLoadingCustomers(true);
      setLoadingCatalog(true);

      try {
        // Load Branches
        const branchRes = await inventoryApi.getBranches({ isActive: true });
        if (branchRes.success && branchRes.data) {
          const bList = Array.isArray(branchRes.data) ? branchRes.data : [];
          setBranches(bList);
          if (bList.length > 0 && !selectedBranchId) {
            setSelectedBranchId(bList[0].id);
          }
        }

        // Load Customers — strictly filter to B2B enterprise accounts only
        const custRes = await usersApi.list({ type: 'customer', limit: 250 });
        if (custRes?.success && custRes.data) {
          const cList = Array.isArray(custRes.data)
            ? custRes.data
            : custRes.data.items || custRes.data.users || [];
          // Strictly keep only B2B enterprise accounts — NO B2C retail customers
          const b2bOnly = cList.filter(isB2BCustomer);
          setCustomers(b2bOnly);
        }

        // Load Master Product Catalog from /products (correct IDs, names, prices, stock)
        const [prodRes, catRes] = await Promise.allSettled([
          fetchAdminApi<any>('/products?limit=250'),
          fetchAdminApi<any>('/categories'),
        ]);

        if (prodRes.status === 'fulfilled' && prodRes.value) {
          const raw = prodRes.value;
          const items: any[] = Array.isArray(raw.data)
            ? raw.data
            : raw.data?.items || raw.data?.products || raw.items || raw.products || [];
          setCatalogProducts(items);
          if (catRes.status === 'fulfilled') {
            const catRaw = catRes.value;
            const cats: any[] = Array.isArray(catRaw.data)
              ? catRaw.data
              : catRaw.data?.categories || catRaw.categories || [];
            setCategories(cats.map((c: any) => c.name || c.title).filter(Boolean));
          } else {
            // Derive unique categories from product catalog
            const catSet = new Set<string>();
            items.forEach((p: any) => {
              const cat = p.category?.name || p.categoryName;
              if (cat) catSet.add(cat);
            });
            setCategories(Array.from(catSet));
          }
        }
      } catch (err: any) {
        console.warn('[CreateB2BOrderPage] Init error:', err);
      } finally {
        setLoadingCustomers(false);
        setLoadingCatalog(false);
      }
    };

    initData();
  }, []);

  // ─── 2. Fetch Live Branch Stock Whenever Branch or Catalog Changes ───────────
  useEffect(() => {
    if (!selectedBranchId || catalogProducts.length === 0) return;

    const fetchBranchStock = async () => {
      setLoadingStock(true);
      try {
        const productIds = catalogProducts.map((p: any) => p.id).filter(Boolean);
        if (productIds.length === 0) return;

        const res = await b2bOrdersApi.checkProductStock(selectedBranchId, productIds);
        if (res.success && Array.isArray(res.data)) {
          const map = new Map<string, number>();
          res.data.forEach((s: any) => {
            map.set(s.productId, Number(s.availableStock ?? 0));
          });
          // For products not returned by checkProductStock, fall back to catalog stock
          catalogProducts.forEach((p: any) => {
            if (!map.has(p.id)) {
              map.set(p.id, Number(p.stock || 0));
            }
          });
          setStockMap(map);
        } else {
          // Fallback: use catalog stock for all products
          const fallback = new Map<string, number>();
          catalogProducts.forEach((p: any) => fallback.set(p.id, Number(p.stock || 0)));
          setStockMap(fallback);
        }
      } catch (err) {
        console.warn('[CreateB2BOrderPage] Stock check error:', err);
        const fallback = new Map<string, number>();
        catalogProducts.forEach((p: any) => fallback.set(p.id, Number(p.stock || 0)));
        setStockMap(fallback);
      } finally {
        setLoadingStock(false);
      }
    };

    fetchBranchStock();
  }, [selectedBranchId, catalogProducts]);

  // ─── 3. Fetch Customer Negotiated B2B Rates When Customer Changes ────────────
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerB2bPrices(new Map());
      return;
    }

    const loadNegotiatedPrices = async () => {
      try {
        const res = await fetchAdminApi<any>(`/b2b-pricing/customer/${selectedCustomer.id}`);
        if (res.success && res.data) {
          const priceItems = Array.isArray(res.data) ? res.data : res.data.products || res.data.items || [];
          const map = new Map<string, number>();
          priceItems.forEach((p: any) => {
            const price = Number(p.customPrice || p.price || 0);
            if (price > 0) {
              map.set(p.productId || p.id, price);
            }
          });
          setCustomerB2bPrices(map);
        }
      } catch (err) {
        console.warn('[CreateB2BOrderPage] Failed to fetch custom pricing:', err);
        setCustomerB2bPrices(new Map());
      }
    };

    loadNegotiatedPrices();

    // Auto-fill shipping address from customer
    const addr = selectedCustomer.address || selectedCustomer.shippingAddress || selectedCustomer.billingAddress || '';
    if (typeof addr === 'string') {
      setShippingAddress(addr);
    } else if (typeof addr === 'object' && addr !== null) {
      setShippingAddress([addr.line1 || addr.addressLine1, addr.city, addr.state, addr.pincode || addr.postalCode].filter(Boolean).join(', '));
    }
  }, [selectedCustomer]);

  // ─── Helper: Get Available Stock for Product in Selected Branch ─────────────
  const getBranchAvailableStock = (prod: any): number => {
    if (!prod) return 0;
    // Prefer live branch-specific stock from stockMap
    if (stockMap.has(prod.id)) {
      return stockMap.get(prod.id) ?? 0;
    }
    // Fallback to catalog master stock
    return Number(prod.stock || prod.availableStock || 0);
  };

  // ─── Helper: Compute Customer Unit Price ─────────────────────────────────────
  const getProductPrice = (prod: any): { price: number; isCustom: boolean; original: number } => {
    const original = Number(prod.salePrice || prod.price || prod.sellingPrice || 0);
    const custom = customerB2bPrices.get(prod.id);
    if (custom !== undefined && custom > 0) {
      return { price: custom, isCustom: true, original };
    }
    return { price: original, isCustom: false, original };
  };

  // ─── Filtered Customers for Autocomplete (B2B only, already pre-filtered) ───
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers.slice(0, 12);
    return customers.filter((c: any) => {
      const company = (c.companyName || '').toLowerCase();
      const gstin = (c.gstin || '').toLowerCase();
      const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      return company.includes(q) || gstin.includes(q) || name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [customers, customerSearch]);

  // ─── Filtered Products for Catalog Picker ───────────────────────────────────
  const filteredCatalog = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return catalogProducts.filter((p: any) => {
      if (categoryFilter !== 'ALL') {
        const cat = (p.category?.name || p.categoryName || p.category || '').toLowerCase();
        if (!cat.includes(categoryFilter.toLowerCase())) return false;
      }
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [catalogProducts, productSearch, categoryFilter]);

  // ─── Add Product to Line Items ───────────────────────────────────────────────
  const handleAddProduct = (prod: any, qty: number = 1) => {
    const { price, isCustom, original } = getProductPrice(prod);
    const availStock = getBranchAvailableStock(prod);

    setLineItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === prod.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + qty;
        const lineSub = Number((updated[existingIdx].unitPrice * newQty * (1 - updated[existingIdx].discount / 100)).toFixed(2));
        const lineTax = Number((lineSub * (updated[existingIdx].taxRate / 100)).toFixed(2));
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          lineTotal: Number((lineSub + lineTax).toFixed(2)),
        };
        return updated;
      } else {
        const lineSub = Number((price * qty).toFixed(2));
        const lineTax = Number((lineSub * 0.18).toFixed(2));
        return [
          ...prev,
          {
            productId: prod.id,
            sku: prod.sku || prod.id,
            name: prod.name,
            thumbnail: prod.thumbnail || prod.images?.[0],
            category: prod.category?.name || prod.categoryName,
            quantity: qty,
            unitPrice: price,
            originalPrice: original,
            isCustomPrice: isCustom,
            discount: 0,
            taxRate: 18,
            lineTotal: Number((lineSub + lineTax).toFixed(2)),
            availableStock: availStock,
          },
        ];
      }
    });
  };

  // ─── Update Item Quantity ───────────────────────────────────────────────────
  const handleUpdateQuantity = (idx: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(idx);
      return;
    }
    setLineItems((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      const lineSub = Number((item.unitPrice * newQty * (1 - item.discount / 100)).toFixed(2));
      const lineTax = Number((lineSub * (item.taxRate / 100)).toFixed(2));
      updated[idx] = {
        ...item,
        quantity: newQty,
        lineTotal: Number((lineSub + lineTax).toFixed(2)),
      };
      return updated;
    });
  };

  // ─── Update Item Price Override ─────────────────────────────────────────────
  const handleUpdatePrice = (idx: number, newPrice: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      const lineSub = Number((newPrice * item.quantity * (1 - item.discount / 100)).toFixed(2));
      const lineTax = Number((lineSub * (item.taxRate / 100)).toFixed(2));
      updated[idx] = {
        ...item,
        unitPrice: newPrice,
        isCustomPrice: true,
        lineTotal: Number((lineSub + lineTax).toFixed(2)),
      };
      return updated;
    });
  };

  // ─── Update Item Discount ───────────────────────────────────────────────────
  const handleUpdateDiscount = (idx: number, discountPercent: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      const lineSub = Number((item.unitPrice * item.quantity * (1 - discountPercent / 100)).toFixed(2));
      const lineTax = Number((lineSub * (item.taxRate / 100)).toFixed(2));
      updated[idx] = {
        ...item,
        discount: discountPercent,
        lineTotal: Number((lineSub + lineTax).toFixed(2)),
      };
      return updated;
    });
  };

  // ─── Remove Item ────────────────────────────────────────────────────────────
  const handleRemoveItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Financial Calculations ─────────────────────────────────────────────────
  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    lineItems.forEach((item) => {
      const gross = item.unitPrice * item.quantity;
      const disc = gross * (item.discount / 100);
      const taxable = gross - disc;
      const tax = taxable * (item.taxRate / 100);

      subtotal += gross;
      discountTotal += disc;
      taxTotal += tax;
    });

    const grandTotal = subtotal - discountTotal + taxTotal;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      taxableSubtotal: Number((subtotal - discountTotal).toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
    };
  }, [lineItems]);

  // ─── Submit Wholesale Order ─────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedCustomer) {
      setErrorMessage('Please select a B2B enterprise customer for this order.');
      return;
    }

    if (!selectedBranchId) {
      setErrorMessage('Please select a fulfillment branch / warehouse.');
      return;
    }

    if (lineItems.length === 0) {
      setErrorMessage('Please add at least one product line item to the order.');
      return;
    }

    setIsSubmitting(true);

    try {
      const clientRequestId = `admin-b2b-order-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        clientRequestId,
        customerId: selectedCustomer.id,
        branchId: selectedBranchId,
        paymentMethod,
        sourcePoId: sourcePoNumber.trim() || undefined,
        items: lineItems.map((item) => ({
          productId: item.productId,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
          taxPercent: item.taxRate,
        })),
        notes: [
          sourcePoNumber ? `Client PO #: ${sourcePoNumber.trim()}` : null,
          shippingAddress ? `Shipping Address: ${shippingAddress.trim()}` : null,
          adminNotes ? `Admin Notes: ${adminNotes.trim()}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
      };

      const res = await b2bOrdersApi.adminCreateB2BOrder(payload);

      if (res.success && res.data) {
        setSuccessMessage(`Order #${res.data.orderNumber} successfully created and confirmed! Stock has been reserved.`);
        setTimeout(() => {
          if (onOrderCreated) onOrderCreated(res.data);
          else onBack();
        }, 1800);
      } else {
        setErrorMessage(res.error?.message || 'Failed to create offline B2B order.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while creating the order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto">
      {/* Top Header & Breadcrumbs */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-2">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back to B2B Orders
            </button>
            <ChevronRight size={12} />
            <span className="text-violet-400 font-bold">New Offline Wholesale Order</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Boxes size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Create Offline B2B Order
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Direct wholesale order creation with real-time branch inventory check, customer custom pricing, and instant confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* Top Fast Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-[#27272A] hover:bg-[#3F3F46] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={isSubmitting || lineItems.length === 0 || !selectedCustomer}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
              isSubmitting || lineItems.length === 0 || !selectedCustomer
                ? 'bg-zinc-700 opacity-60 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Creating Order...
              </>
            ) : (
              <>
                <Check size={16} />
                Confirm & Create B2B Order (₹{totals.grandTotal.toLocaleString('en-IN')})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error & Success Feedback Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Grid: Customer & Facility (Left) | Order Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Customer Selection & Product Selector */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Customer Account & Facility */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-violet-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  1. Enterprise Customer & Fulfillment Hub
                </h2>
              </div>
              <span className="text-[11px] font-bold text-zinc-400">Step 1 of 3</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Autocomplete Dropdown */}
              <div className="relative">
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Select B2B Customer <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search by Company, GSTIN, Name, Phone..."
                    value={selectedCustomer ? `${selectedCustomer.companyName || selectedCustomer.firstName + ' ' + (selectedCustomer.lastName || '')} (${selectedCustomer.phone || selectedCustomer.email})` : customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSelectedCustomer(null);
                      setCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                  />
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch('');
                        setCustomerDropdownOpen(true);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Customer Dropdown Results */}
                {customerDropdownOpen && !selectedCustomer && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl bg-[#09090B] border border-[#27272A] shadow-2xl z-30 divide-y divide-[#27272A]">
                    {loadingCustomers ? (
                      <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-violet-400" /> Loading enterprises...
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-400">
                        No customer accounts found matching &quot;{customerSearch}&quot;
                      </div>
                    ) : (
                      filteredCustomers.map((c: any) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerDropdownOpen(false);
                            setCustomerSearch('');
                          }}
                          className="p-3 hover:bg-[#27272A] cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">
                              {c.companyName || `${c.firstName} ${c.lastName || ''}`}
                            </span>
                            {c.gstin && (
                              <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded-sm bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                GST: {c.gstin}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-3 mt-1">
                            <span>👤 {c.firstName} {c.lastName}</span>
                            {c.phone && <span>📞 {c.phone}</span>}
                            <span>✉️ {c.email}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Fulfillment Branch Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Fulfillment Facility / Warehouse <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Warehouse size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code}) — {b.city || 'Primary Hub'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Selected Customer Dossier Preview Banner */}
            {selectedCustomer && (
              <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName || ''}`}
                    </span>
                    {selectedCustomer.gstin && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        GSTIN: {selectedCustomer.gstin}
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-400 flex items-center gap-4 text-[11px]">
                    <span>Contact: {selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                    <span>Phone: {selectedCustomer.phone || 'N/A'}</span>
                    <span>Email: {selectedCustomer.email}</span>
                  </div>
                </div>

                {customerB2bPrices.size > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                    <Coins size={14} className="text-emerald-400" />
                    <span>{customerB2bPrices.size} Negotiated B2B Rates Active</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Production-Ready Product Catalog Picker */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-violet-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  2. Select Products & Check Available Stock
                </h2>
              </div>
              <span className="text-[11px] font-bold text-zinc-400">Step 2 of 3</span>
            </div>

            {/* Product Search & Category Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search products by SKU, name, Finish (SS, NA, Nylon)..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {categories.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      categoryFilter === 'ALL'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-[#27272A] text-zinc-400 hover:text-white'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.slice(0, 5).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                        categoryFilter === cat
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-[#27272A] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Catalog Grid */}
            {loadingCatalog ? (
              <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-violet-400" /> Loading product matrix...
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No products found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {filteredCatalog.slice(0, 20).map((prod: any) => {
                  const { price, isCustom, original } = getProductPrice(prod);
                  const availStock = getBranchAvailableStock(prod);
                  const isAdded = lineItems.some((item) => item.productId === prod.id);

                  return (
                    <div
                      key={prod.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isAdded
                          ? 'bg-violet-950/20 border-violet-500/40'
                          : 'bg-[#09090B] border-[#27272A] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-[#18181B] border border-[#27272A] overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {prod.thumbnail || prod.images?.[0] ? (
                            <img
                              src={prod.thumbnail || prod.images?.[0]}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={20} className="text-zinc-600" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-xs font-bold text-white truncate">{prod.name}</h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                            <span className="font-mono bg-zinc-800 px-1 rounded">{prod.sku}</span>
                            {prod.finish && (
                              <span className="px-1 rounded bg-violet-500/10 text-violet-300 font-semibold">
                                {prod.finish}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-xs font-black text-white">
                              ₹{price.toLocaleString('en-IN')}
                            </span>
                            {isCustom && (
                              <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                                B2B Rate (MRP ₹{original.toLocaleString('en-IN')})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stock & Add Action */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {loadingStock ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-700/40 text-zinc-400 border border-zinc-600/20 flex items-center gap-1">
                            <RefreshCw size={8} className="animate-spin" /> Checking...
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              availStock > 10
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : availStock > 0
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {availStock > 10
                              ? `✓ ${availStock} in Stock`
                              : availStock > 0
                              ? `⚠ Only ${availStock} Left`
                              : '✕ Out of Stock'}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleAddProduct(prod, 1)}
                          disabled={availStock <= 0 && !loadingStock}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1 ${
                            availStock <= 0 && !loadingStock
                              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                              : 'bg-violet-600 hover:bg-violet-500 text-white'
                          }`}
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 3: Order Line Items Matrix */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-violet-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  3. Order Line Items ({lineItems.length})
                </h2>
              </div>
              {lineItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLineItems([])}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  Clear All Items
                </button>
              )}
            </div>

            {lineItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500 space-y-2 border-2 border-dashed border-[#27272A] rounded-xl">
                <Package size={32} className="mx-auto text-zinc-600" />
                <p>No products added to this B2B order yet.</p>
                <p className="text-zinc-600">Select items from the catalog above to add to this order.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#09090B] text-zinc-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Available</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price (₹)</th>
                      <th className="py-2.5 px-3 text-right">Disc %</th>
                      <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]">
                    {lineItems.map((item, idx) => (
                      <tr key={item.productId} className="hover:bg-[#27272A]/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-[#09090B] border border-[#27272A] overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {item.thumbnail ? (
                                <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={16} className="text-zinc-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white">{item.name}</div>
                              <div className="text-[10px] font-mono text-zinc-400">{item.sku}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.availableStock >= item.quantity
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}
                          >
                            {item.availableStock} in Hub
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1 bg-[#09090B] border border-[#27272A] rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                              className="px-2 py-0.5 text-zinc-400 hover:text-white font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value) || 1)}
                              className="w-12 text-center bg-transparent text-white font-bold text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                              className="px-2 py-0.5 text-zinc-400 hover:text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdatePrice(idx, parseFloat(e.target.value) || 0)}
                              className="w-20 text-right py-1 px-1.5 rounded bg-[#09090B] border border-[#27272A] text-xs font-bold text-white focus:outline-none focus:border-violet-500"
                            />
                            {item.isCustomPrice && (
                              <span className="text-[9px] text-emerald-400 font-bold">B2B Rate</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => handleUpdateDiscount(idx, parseFloat(e.target.value) || 0)}
                            className="w-14 text-right py-1 px-1.5 rounded bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-violet-500"
                          />
                        </td>

                        <td className="py-3 px-3 text-right font-black text-white">
                          ₹{item.lineTotal.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Commercial Terms & Live Financial Breakdown */}
        <div className="space-y-6">
          {/* Card: Commercial & Billing Details */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-[#27272A] pb-3">
              <CreditCard size={18} className="text-violet-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Commercial Terms
              </h3>
            </div>

            <div className="space-y-3.5">
              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Payment Terms / Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT / RTGS)</option>
                  <option value="cheque">Cheque / Demand Draft</option>
                  <option value="credit_terms">Commercial Credit (Net-30 Terms)</option>
                  <option value="upi">UPI / Instant QR</option>
                  <option value="cash">Cash / Offline Settlement</option>
                </select>
              </div>

              {/* Client PO Reference # */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Customer PO / Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-2026-DEL-089"
                  value={sourcePoNumber}
                  onChange={(e) => setSourcePoNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Delivery / Shipping Address */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Shipping Delivery Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street, City, State, PIN Code..."
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {/* Admin Internal Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Internal Notes & Dispatch Directives
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions for warehouse dispatch team..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Card: Sticky Financial Summary */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#18181B] to-[#27272A] border border-[#3F3F46] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#3F3F46] pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Order Valuation Summary
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                18% GST Matrix
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Items:</span>
                <span className="font-bold text-white">{lineItems.reduce((s, i) => s + i.quantity, 0)} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Gross Subtotal:</span>
                <span className="font-bold text-white">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Line Discounts:</span>
                  <span className="font-bold">-₹{totals.discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-400">Taxable Amount:</span>
                <span className="font-bold text-white">₹{totals.taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">GST (18%):</span>
                <span className="font-bold text-white">₹{totals.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="pt-3 border-t border-[#3F3F46] flex items-baseline justify-between">
                <div>
                  <div className="text-xs font-bold uppercase text-zinc-400">Grand Total (Net)</div>
                  <div className="text-[10px] text-zinc-500">Including all taxes & duties</div>
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting || lineItems.length === 0 || !selectedCustomer}
                className={`w-full py-3 rounded-xl font-black text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isSubmitting || lineItems.length === 0 || !selectedCustomer
                    ? 'bg-zinc-700 opacity-60 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Submitting Order...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Confirm & Submit B2B Order
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] transition-all"
              >
                Discard & Return
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
