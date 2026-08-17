import React, { useState, useEffect, useMemo } from "react";
import {
  Coins,
  Search,
  Building2,
  Percent,
  RefreshCw,
  Save,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingDown,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Filter,
} from "lucide-react";
import { b2bPricingApi, usersApi } from "../api/adminApi";
import type { B2BCustomerPricingItem, B2BCustomerPricingMatrix } from "../types/admin";

interface B2BPricingPageProps {
  initialCustomerId?: string;
  onNavigateUsers?: () => void;
}

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
  gstin?: string | null;
  role?: { name: string; slug: string } | null;
}

function broadcastB2BPriceUpdate(customerId?: string) {
  try {
    localStorage.setItem("prc_b2b_pricing_updated", String(Date.now()));
    window.dispatchEvent(new CustomEvent("prc_b2b_pricing_updated", { detail: { customerId } }));
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("prc_b2b_pricing_channel");
      channel.postMessage({ type: "B2B_PRICING_UPDATED", customerId, timestamp: Date.now() });
      channel.close();
    }
  } catch {}
}

export const B2BPricingPage: React.FC<B2BPricingPageProps> = ({
  initialCustomerId,
  onNavigateUsers,
}) => {
  // State
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || "");
  const [customerSearch, setCustomerSearch] = useState("");

  const [pricingData, setPricingData] = useState<B2BCustomerPricingMatrix | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);

  // Local draft changes: Map<productId, { price: number; minQuantity: number; notes: string }>
  const [draftChanges, setDraftChanges] = useState<
    Map<string, { price: number; minQuantity: number; notes: string; dirty: boolean }>
  >(new Map());

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "custom_only" | "retail_only">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Bulk Discount Modal
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(15);
  const [discountCategory, setDiscountCategory] = useState<string>("all");
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  // Notifications / Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load B2B and all customers
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await usersApi.list({ limit: 100 });
      if (res.success && res.data) {
        const userList = Array.isArray(res.data) ? res.data : res.data.data || [];
        const opts: CustomerOption[] = userList.map((u: any) => ({
          id: u.id,
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
          email: u.email,
          companyName: u.companyName,
          gstin: u.gstin,
          role: u.role,
        }));
        setCustomers(opts);

        // Pre-select first B2B or first customer if not set
        if (!selectedCustomerId && opts.length > 0) {
          const firstB2B = opts.find(
            (c) =>
              c.role?.slug === "b2b-customer" ||
              c.role?.slug === "b2b_customer" ||
              c.companyName ||
              c.gstin
          );
          setSelectedCustomerId(firstB2B ? firstB2B.id : opts[0].id);
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load customers", "error");
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Load pricing matrix when selected customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerPricing(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const loadCustomerPricing = async (userId: string) => {
    setLoadingPricing(true);
    setDraftChanges(new Map());
    try {
      const res = await b2bPricingApi.getCustomerPricing(userId);

      // Normalise response shape — data may live at res.data or at top-level
      const pricingPayload =
        res.data && typeof res.data === "object" && "items" in res.data
          ? res.data
          : (res as any).items !== undefined
          ? res
          : null;

      if (pricingPayload) {
        setPricingData(pricingPayload);
      } else if (res.success === false || res.error) {
        showToast(res.message || "Failed to load customer pricing", "error");
      } else {
        // Unknown shape — store whatever came back and let the UI handle it
        setPricingData(res.data || res);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load pricing matrix", "error");
    } finally {
      setLoadingPricing(false);
    }
  };

  // Get current active price & MOQ for a product (draft takes precedence)
  const getProductValues = (item: B2BCustomerPricingItem) => {
    const draft = draftChanges.get(item.productId);
    if (draft) {
      const currentPrice = draft.price;
      const discount =
        item.standardPrice > 0
          ? Number((((item.standardPrice - currentPrice) / item.standardPrice) * 100).toFixed(2))
          : 0;
      return {
        price: draft.price,
        minQuantity: draft.minQuantity,
        notes: draft.notes,
        isCustom: true,
        discountPercent: discount,
        isDirty: draft.dirty,
      };
    }

    return {
      price: item.hasCustomPrice ? item.customPrice! : item.standardPrice,
      minQuantity: item.minQuantity || 1,
      notes: item.notes || "",
      isCustom: item.hasCustomPrice,
      discountPercent: item.discountPercent,
      isDirty: false,
    };
  };

  // Update draft price
  const handlePriceChange = (item: B2BCustomerPricingItem, newPriceVal: number) => {
    const safePrice = isNaN(newPriceVal) || newPriceVal < 0 ? 0 : newPriceVal;
    const current = getProductValues(item);

    setDraftChanges((prev) => {
      const next = new Map(prev);
      next.set(item.productId, {
        price: safePrice,
        minQuantity: current.minQuantity,
        notes: current.notes,
        dirty: true,
      });
      return next;
    });
  };

  // Update MOQ
  const handleMoqChange = (item: B2BCustomerPricingItem, newMoq: number) => {
    const safeMoq = isNaN(newMoq) || newMoq < 1 ? 1 : Math.floor(newMoq);
    const current = getProductValues(item);

    setDraftChanges((prev) => {
      const next = new Map(prev);
      next.set(item.productId, {
        price: current.price,
        minQuantity: safeMoq,
        notes: current.notes,
        dirty: true,
      });
      return next;
    });
  };

  // Revert / Delete single custom price
  const handleRevertToRetail = async (item: B2BCustomerPricingItem) => {
    if (!selectedCustomerId) return;

    if (item.hasCustomPrice) {
      try {
        const res = await b2bPricingApi.deleteProductPrice(selectedCustomerId, item.productId);
        if (res.success) {
          showToast(`Reverted "${item.name}" to standard retail price`);
          setDraftChanges((prev) => {
            const next = new Map(prev);
            next.delete(item.productId);
            return next;
          });
          broadcastB2BPriceUpdate(selectedCustomerId);
          loadCustomerPricing(selectedCustomerId);
        }
      } catch (err: any) {
        showToast(err.message || "Failed to remove custom price", "error");
      }
    } else {
      // Just clear local draft
      setDraftChanges((prev) => {
        const next = new Map(prev);
        next.delete(item.productId);
        return next;
      });
    }
  };

  // Save all modified draft changes
  const handleSaveAll = async () => {
    if (!selectedCustomerId || draftChanges.size === 0) return;

    setSavingBulk(true);
    try {
      const payload = Array.from(draftChanges.entries()).map(([productId, val]) => ({
        productId,
        price: val.price,
        minQuantity: val.minQuantity,
        notes: val.notes || undefined,
      }));

      const res = await b2bPricingApi.bulkSetPrices(selectedCustomerId, payload);

      // Treat any non-error response as success (backend may omit `success` field)
      const isSuccess =
        res.success === true ||
        res.success === undefined ||
        res.status === "success" ||
        res.message?.toLowerCase().includes("success");

      if (isSuccess && !res.error) {
        showToast(`Successfully saved ${payload.length} custom product prices!`);
        setDraftChanges(new Map());
        broadcastB2BPriceUpdate(selectedCustomerId);
        await loadCustomerPricing(selectedCustomerId);
      } else {
        showToast(res.message || "Failed to save prices", "error");
        // Still reload to show current server state
        broadcastB2BPriceUpdate(selectedCustomerId);
        await loadCustomerPricing(selectedCustomerId);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save custom prices", "error");
    } finally {
      setSavingBulk(false);
    }
  };

  // Apply flat discount tool
  const handleApplyDiscount = async () => {
    if (!selectedCustomerId) return;
    setApplyingDiscount(true);
    try {
      const res = await b2bPricingApi.applyFlatDiscount(selectedCustomerId, {
        discountPercent,
        categoryId: discountCategory === "all" ? undefined : discountCategory,
      });

      // Treat any non-error response as success (backend may omit `success` field)
      const isSuccess =
        res.success === true ||
        res.success === undefined ||
        res.status === "success" ||
        res.message?.toLowerCase().includes("success");

      if (isSuccess && !res.error) {
        const appliedCount = res.data?.appliedCount ?? res.appliedCount ?? "all";
        showToast(
          `Applied flat ${discountPercent}% discount to ${appliedCount} products!`
        );
        setShowDiscountModal(false);
        setDraftChanges(new Map());
        broadcastB2BPriceUpdate(selectedCustomerId);
        await loadCustomerPricing(selectedCustomerId);
      } else {
        showToast(res.message || "Failed to apply discount", "error");
        // Still reload to reflect any partial server changes
        broadcastB2BPriceUpdate(selectedCustomerId);
        await loadCustomerPricing(selectedCustomerId);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to apply discount", "error");
    } finally {
      setApplyingDiscount(false);
    }
  };

  // Extract unique categories for filter
  const categories = useMemo(() => {
    if (!pricingData?.items) return [];
    const catMap = new Map<string, string>();
    pricingData.items.forEach((it) => {
      if (it.categoryId && it.categoryName) {
        catMap.set(it.categoryId, it.categoryName);
      }
    });
    return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));
  }, [pricingData]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!pricingData?.items) return [];
    return pricingData.items.filter((item) => {
      const vals = getProductValues(item);

      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q);

      // Category match
      const matchesCategory =
        categoryFilter === "all" || item.categoryId === categoryFilter;

      // Type match
      let matchesType = true;
      if (filterType === "custom_only") {
        matchesType = vals.isCustom || vals.isDirty;
      } else if (filterType === "retail_only") {
        matchesType = !vals.isCustom && !vals.isDirty;
      }

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [pricingData, searchQuery, categoryFilter, filterType, draftChanges]);

  // Dirty count
  const dirtyCount = Array.from(draftChanges.values()).filter((v) => v.dirty).length;

  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-5 pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border bg-white dark:bg-[#18181B] text-slate-800 dark:text-[#FAFAFA] border-slate-200 dark:border-[#27272A] animate-in fade-in slide-in-from-top-2">
          {toast.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-tr-2xl rounded-bl-2xl bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6] flex-shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
                B2B Custom Pricing Matrix
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#8B5CF6] uppercase tracking-wider">
                Per-Client Rates
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#71717A] mt-0.5">
              Set and manage customer-specific contract prices, minimum order quantities (MOQ), and volume discounts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => selectedCustomerId && loadCustomerPricing(selectedCustomerId)}
            disabled={loadingPricing || !selectedCustomerId}
            title="Refresh pricing"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw size={15} className={loadingPricing ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => setShowDiscountModal(true)}
            disabled={!selectedCustomerId || loadingPricing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-tr-xl rounded-bl-xl bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-[#3F3F46] text-xs font-bold text-slate-800 dark:text-[#FAFAFA] transition-colors"
          >
            <Percent size={14} className="text-[#8B5CF6]" />
            Bulk Discount Tool
          </button>

          <button
            onClick={handleSaveAll}
            disabled={dirtyCount === 0 || savingBulk}
            className="flex items-center gap-2 px-5 py-2.5 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-[#8B5CF6]/25 transition-all"
          >
            {savingBulk ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save Changes {dirtyCount > 0 && `(${dirtyCount})`}
          </button>
        </div>
      </div>

      {/* Customer Selection Banner */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Customer Dropdown / Selector */}
          <div className="flex-1 min-w-[280px]">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-[#71717A] uppercase tracking-wider mb-1.5">
              Select B2B / Business Customer
            </label>
            <div className="relative">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                disabled={loadingCustomers}
                className="w-full appearance-none bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition-colors"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `🏢 ${c.companyName} — ` : ""}
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Active Customer Profile Badge */}
          {pricingData?.customer && (
            <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-[#27272A]/50 border border-slate-100 dark:border-[#27272A] rounded-xl p-3 px-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center font-bold text-sm">
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                      {pricingData.customer.companyName || pricingData.customer.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                      {pricingData.customer.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-[#71717A]">
                    {pricingData.customer.email} {pricingData.customer.phone ? `· ${pricingData.customer.phone}` : ""}
                  </p>
                </div>
              </div>

              {pricingData.customer.gstin && (
                <div className="border-l border-slate-200 dark:border-[#3F3F46] pl-4">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-[#71717A] block">
                    GSTIN
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-[#E4E4E7]">
                    {pricingData.customer.gstin}
                  </span>
                </div>
              )}

              <div className="border-l border-slate-200 dark:border-[#3F3F46] pl-4">
                <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-[#71717A] block">
                  Custom Prices
                </span>
                <span className="text-xs font-extrabold text-[#8B5CF6]">
                  {pricingData.customPricesCount} / {pricingData.totalProducts} products
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Matrix Table Container */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-tr-2xl rounded-bl-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#18181B]">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search product, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6] transition-colors"
            />
          </div>

          {/* Filter Buttons & Category Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
            <div className="flex items-center bg-slate-200/70 dark:bg-[#27272A] p-0.5 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterType === "all"
                    ? "bg-white dark:bg-[#18181B] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900"
                }`}
              >
                All ({pricingData?.totalProducts || 0})
              </button>
              <button
                onClick={() => setFilterType("custom_only")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterType === "custom_only"
                    ? "bg-white dark:bg-[#18181B] text-[#8B5CF6] shadow-xs"
                    : "text-slate-600 dark:text-[#A1A1AA] hover:text-[#8B5CF6]"
                }`}
              >
                Custom Priced ({pricingData?.customPricesCount || 0})
              </button>
            </div>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#27272A]/50 border-b border-slate-100 dark:border-[#27272A] text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Retail Price</th>
                <th className="py-3 px-4 text-center">B2B Contract Price (₹)</th>
                <th className="py-3 px-4 text-center">Discount</th>
                <th className="py-3 px-4 text-center">MOQ</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]/60">
              {loadingPricing ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-[#71717A]">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#8B5CF6]" />
                    <p className="text-xs font-semibold">Loading product catalog & custom rates...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-[#52525B]">
                    <Coins size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold">No products match your filter</p>
                    <p className="text-xs mt-1 text-slate-400">Try changing search keywords or category</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const values = getProductValues(item);
                  const isDiscounted = values.discountPercent > 0;

                  return (
                    <tr
                      key={item.productId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-[#27272A]/30 transition-colors ${
                        values.isDirty ? "bg-[#8B5CF6]/5" : ""
                      }`}
                    >
                      {/* Product Name & Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Coins size={16} className="text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-slate-900 dark:text-[#FAFAFA] truncate">
                              {item.name}
                            </p>
                            <span className="font-mono text-[10px] text-slate-400 dark:text-[#71717A]">
                              SKU: {item.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-[#A1A1AA] whitespace-nowrap">
                        {item.categoryName}
                      </td>

                      {/* Standard Retail Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-500 dark:text-[#71717A] whitespace-nowrap">
                        ₹{item.standardPrice.toLocaleString("en-IN")}
                      </td>

                      {/* B2B Custom Price Input */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center relative max-w-[140px]">
                          <span className="absolute left-3 text-xs font-bold text-slate-400 pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={values.price}
                            onChange={(e) =>
                              handlePriceChange(item, parseFloat(e.target.value))
                            }
                            className={`w-full bg-slate-50 dark:bg-[#27272A] border rounded-lg pl-7 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                              values.isCustom || values.isDirty
                                ? "border-[#8B5CF6] bg-[#8B5CF6]/5"
                                : "border-slate-200 dark:border-[#3F3F46]"
                            }`}
                          />
                        </div>
                      </td>

                      {/* Discount % Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isDiscounted ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                            <TrendingDown size={11} />
                            -{values.discountPercent}%
                          </span>
                        ) : values.price > item.standardPrice ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                            +{Math.abs(values.discountPercent)}%
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">Retail</span>
                        )}
                      </td>

                      {/* MOQ (Min Quantity) */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          min="1"
                          value={values.minQuantity}
                          onChange={(e) =>
                            handleMoqChange(item, parseInt(e.target.value, 10))
                          }
                          className="w-16 text-center bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-lg py-1.5 text-xs font-mono font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {(values.isCustom || values.isDirty) && (
                          <button
                            type="button"
                            onClick={() => handleRevertToRetail(item)}
                            title="Revert to standard retail price"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <RotateCcw size={12} /> Revert
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Matrix Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#18181B] text-xs text-slate-500 dark:text-[#71717A]">
          <div className="flex items-center gap-2">
            <span>Showing <b>{filteredItems.length}</b> products</span>
            <span>·</span>
            <span className="text-[#8B5CF6] font-bold">
              {pricingData?.customPricesCount || 0} customized
            </span>
          </div>

          <div className="flex items-center gap-3">
            {dirtyCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle size={13} /> {dirtyCount} unsaved changes
              </span>
            )}
            <button
              onClick={handleSaveAll}
              disabled={dirtyCount === 0 || savingBulk}
              className="flex items-center gap-1.5 px-4 py-2 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white font-bold transition-all shadow-sm"
            >
              <Save size={13} /> Save All
            </button>
          </div>
        </div>
      </div>

      {/* ══ BULK DISCOUNT MODAL ═══════════════════════════════════════════════ */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#18181B] w-full max-w-md rounded-tr-2xl rounded-bl-2xl shadow-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#27272A]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6]">
                  <Percent size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                    Apply Bulk Flat Discount
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-[#71717A]">
                    Instantly set percentage off catalog retail for this customer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Discount Percentage (% off retail)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    step="0.5"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    %
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  {[5, 10, 15, 20, 25, 30].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercent(pct)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-colors ${
                        discountPercent === pct
                          ? "bg-[#8B5CF6] border-[#8B5CF6] text-white"
                          : "border-slate-200 dark:border-[#3F3F46] text-slate-600 dark:text-[#A1A1AA]"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Apply To
                </label>
                <select
                  value={discountCategory}
                  onChange={(e) => setDiscountCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="all">All Catalog Products</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      Category: {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-200">
                ⚠️ This will calculate and overwrite custom prices for this customer at{" "}
                <b>{discountPercent}% off</b> retail catalog price.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  disabled={applyingDiscount || discountPercent <= 0}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-tr-xl rounded-bl-xl shadow-md shadow-[#8B5CF6]/25 transition-colors"
                >
                  {applyingDiscount ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Apply {discountPercent}% Discount
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
