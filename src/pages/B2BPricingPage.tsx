import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Building,
} from "lucide-react";
import { b2bPricingApi, usersApi } from "../api/adminApi";
import type { B2BCustomerPricingItem, B2BCustomerPricingMatrix } from "../types/admin";
import { useDebounce } from "../hooks/useDebounce";

/* ─── Skeleton Loading Body for B2B Pricing ─────────────────────────────────── */

export function B2BPricingPageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#27272A]"></div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-64 bg-[#27272A] rounded"></div>
              <div className="h-4 w-28 bg-[#27272A] rounded-full"></div>
            </div>
            <div className="h-3 w-80 bg-[#27272A] rounded"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-44 bg-[#27272A] rounded-tr-xl rounded-bl-xl"></div>
          <div className="h-9 w-9 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
        </div>
      </div>

      {/* Customer Picker Skeleton */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 max-w-md">
          <div className="h-3 w-32 bg-[#27272A] rounded"></div>
          <div className="h-9 w-full bg-[#27272A] rounded-xl"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 bg-[#27272A] rounded-xl"></div>
          <div className="h-9 w-32 bg-[#27272A] rounded-xl"></div>
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#27272A]"></div>
            <div className="h-5 w-16 bg-[#27272A] rounded"></div>
            <div className="h-2.5 w-24 bg-[#27272A] rounded"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <div className="p-3.5 bg-[#09090B] border-b border-[#27272A] flex justify-between">
          <div className="h-3 w-40 bg-[#27272A] rounded"></div>
          <div className="h-3 w-20 bg-[#27272A] rounded"></div>
        </div>
        <div className="divide-y divide-[#27272A]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-56">
                <div className="w-10 h-10 rounded-lg bg-[#27272A]"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 bg-[#27272A] rounded"></div>
                  <div className="h-2.5 w-20 bg-[#27272A] rounded"></div>
                </div>
              </div>
              <div className="h-4 w-20 bg-[#27272A] rounded"></div>
              <div className="h-7 w-28 bg-[#27272A] rounded-lg"></div>
              <div className="h-7 w-20 bg-[#27272A] rounded-lg"></div>
              <div className="h-7 w-20 bg-[#27272A] rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main B2B Pricing Component ─────────────────────────────────────────────── */

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
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || "");

  const [productsList, setProductsList] = useState<B2BCustomerPricingItem[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);

  // Local draft edits: Map<productId, { price: number; minQuantity: number; notes: string; dirty: boolean }>
  const [draftChanges, setDraftChanges] = useState<
    Map<string, { price: number; minQuantity: number; notes: string; dirty: boolean }>
  >(new Map());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterType, setFilterType] = useState<"all" | "custom_only" | "retail_only">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  // Bulk Category Discount Modal
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(15);
  const [discountCategory, setDiscountCategory] = useState<string>("all");
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  // Feedback notifications
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Customers
  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const res = await usersApi.list({ limit: 100 });
      if (res && res.success !== false) {
        const userList = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.users || [];
        const opts: CustomerOption[] = userList.map((u: any) => ({
          id: u.id,
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
          email: u.email,
          companyName: u.companyName,
          gstin: u.gstin,
          role: u.role,
        }));
        setCustomers(opts);
        if (opts.length > 0) {
          setSelectedCustomerId((prev) => {
            if (prev) return prev;
            const firstB2B = opts.find((c) => Boolean(c.companyName || c.gstin)) || opts[0];
            return firstB2B ? firstB2B.id : "";
          });
        }
      }
    } catch (err: any) {
      console.error("[B2B Customers Load Error]:", err);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Load Pricing Matrix for Selected Customer
  const loadPricingMatrix = useCallback(async (customerId: string) => {
    if (!customerId) return;
    setLoadingPricing(true);
    try {
      const res = await b2bPricingApi.getCustomerPricing(customerId);
      if (res && res.success !== false) {
        const items: B2BCustomerPricingItem[] = Array.isArray(res.data)
          ? res.data
          : res.data?.items || res.data?.products || [];
        setProductsList(items);
        setDraftChanges(new Map());
      } else {
        showToast(res.message || "Failed to load pricing matrix for customer", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load pricing matrix", "error");
    } finally {
      setLoadingPricing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadPricingMatrix(selectedCustomerId);
    }
  }, [selectedCustomerId, loadPricingMatrix]);

  // Filtered categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    productsList.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set).sort();
  }, [productsList]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return productsList.filter((item) => {
      const draft = draftChanges.get(item.productId);
      const isCustom = draft ? draft.price !== item.standardPrice : item.hasCustomPrice;

      if (filterType === "custom_only" && !isCustom) return false;
      if (filterType === "retail_only" && isCustom) return false;

      if (categoryFilter !== "all" && item.categoryName !== categoryFilter) return false;

      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(query);
        const matchSku = item.sku?.toLowerCase().includes(query);
        if (!matchName && !matchSku) return false;
      }

      return true;
    });
  }, [productsList, draftChanges, filterType, categoryFilter, debouncedSearchQuery]);

  // Pagination slice
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;

  // Stats calculation
  const stats = useMemo(() => {
    let customCount = 0;
    let totalDiscount = 0;

    productsList.forEach((p) => {
      const draft = draftChanges.get(p.productId);
      const effectivePrice = draft ? draft.price : (p.customPrice ?? p.standardPrice);
      const isCustom = draft ? draft.price !== p.standardPrice : p.hasCustomPrice;

      if (isCustom) {
        customCount++;
        const disc = Math.max(0, ((p.standardPrice - effectivePrice) / (p.standardPrice || 1)) * 100);
        totalDiscount += disc;
      }
    });

    const unsavedCount = Array.from(draftChanges.values()).filter((d) => d.dirty).length;
    const avgDiscount = customCount > 0 ? Math.round(totalDiscount / customCount) : 0;

    return {
      totalProducts: productsList.length,
      customCount,
      unsavedCount,
      avgDiscount,
    };
  }, [productsList, draftChanges]);

  // Price change handler
  const handlePriceChange = (productId: string, price: number, defaultMoq: number) => {
    const existing = draftChanges.get(productId) || {
      price,
      minQuantity: defaultMoq || 1,
      notes: "",
      dirty: false,
    };
    const product = productsList.find((p) => p.productId === productId);
    const isDirty = product ? price !== (product.customPrice ?? product.standardPrice) : true;

    setDraftChanges(
      new Map(
        draftChanges.set(productId, {
          ...existing,
          price: Math.max(0, price),
          dirty: isDirty,
        })
      )
    );
  };

  // MOQ change handler
  const handleMoqChange = (productId: string, minQuantity: number, defaultPrice: number) => {
    const existing = draftChanges.get(productId) || {
      price: defaultPrice,
      minQuantity,
      notes: "",
      dirty: false,
    };
    const product = productsList.find((p) => p.productId === productId);
    const isDirty = product ? minQuantity !== (product.minQuantity || 1) : true;

    setDraftChanges(
      new Map(
        draftChanges.set(productId, {
          ...existing,
          minQuantity: Math.max(1, minQuantity),
          dirty: isDirty,
        })
      )
    );
  };

  // Reset row to retail
  const handleResetRow = (productId: string) => {
    const product = productsList.find((p) => p.productId === productId);
    if (!product) return;
    setDraftChanges(
      new Map(
        draftChanges.set(productId, {
          price: product.standardPrice,
          minQuantity: 1,
          notes: "",
          dirty: true,
        })
      )
    );
  };

  // Save single product price
  const handleSaveSingle = async (productId: string) => {
    if (!selectedCustomerId) return;
    const draft = draftChanges.get(productId);
    const product = productsList.find((p) => p.productId === productId);
    if (!product) return;

    const priceToSet = draft ? draft.price : (product.customPrice ?? product.standardPrice);
    const moqToSet = draft ? draft.minQuantity : product.minQuantity || 1;

    try {
      const res = await b2bPricingApi.setProductPrice(selectedCustomerId, {
        productId,
        price: priceToSet,
        minQuantity: moqToSet,
        notes: draft?.notes || undefined,
      });

      if (res && res.success !== false) {
        showToast(`Saved rate for "${product.name}"`);
        broadcastB2BPriceUpdate(selectedCustomerId);
        await loadPricingMatrix(selectedCustomerId);
      } else {
        showToast(res.message || "Failed to save rate", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Save error", "error");
    }
  };

  // Save all bulk changes
  const handleSaveBulk = async () => {
    if (!selectedCustomerId || stats.unsavedCount === 0) return;
    setSavingBulk(true);

    const itemsToSave: { productId: string; price: number; minQuantity?: number; notes?: string }[] = [];
    draftChanges.forEach((val, key) => {
      if (val.dirty) {
        itemsToSave.push({
          productId: key,
          price: val.price,
          minQuantity: val.minQuantity,
          notes: val.notes || undefined,
        });
      }
    });

    try {
      const res = await b2bPricingApi.bulkSetPrices(selectedCustomerId, itemsToSave);
      if (res && res.success !== false) {
        showToast(`Successfully updated ${itemsToSave.length} B2B custom rates!`);
        broadcastB2BPriceUpdate(selectedCustomerId);
        await loadPricingMatrix(selectedCustomerId);
      } else {
        showToast(res.message || "Bulk save failed", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Bulk save error", "error");
    } finally {
      setSavingBulk(false);
    }
  };

  // Apply Category Discount
  const handleApplyCategoryDiscount = () => {
    setApplyingDiscount(true);
    const factor = (100 - discountPercent) / 100;
    const newDrafts = new Map(draftChanges);

    productsList.forEach((p) => {
      if (discountCategory === "all" || p.categoryName === discountCategory) {
        const discountedPrice = Math.round(p.standardPrice * factor * 100) / 100;
        newDrafts.set(p.productId, {
          price: discountedPrice,
          minQuantity: p.minQuantity || 1,
          notes: `${discountPercent}% wholesale discount applied`,
          dirty: true,
        });
      }
    });

    setDraftChanges(newDrafts);
    setApplyingDiscount(false);
    setShowDiscountModal(false);
    showToast(`Calculated ${discountPercent}% discount across catalog. Review and click "Save Matrix".`);
  };

  if (loadingCustomers && customers.length === 0) {
    return <B2BPricingPageSkeleton />;
  }

  return (
    <div className="space-y-6 text-[#FAFAFA] max-w-[1600px] mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A855F7]">
            <Coins size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#FAFAFA]">
                B2B Custom Pricing & Wholesale Matrix
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                PRICE GOVERNANCE
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Override retail list prices, configure client tier discounts, set Minimum Order Quantities (MOQ), and synchronize live buyer catalogs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateUsers && (
            <button
              type="button"
              onClick={onNavigateUsers}
              className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold text-xs px-3.5 py-2 rounded-tr-xl rounded-bl-xl transition-all border border-[#3F3F46] flex items-center gap-1.5 shadow-sm"
            >
              <Building2 size={14} />
              <span>Back to Directory</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadPricingMatrix(selectedCustomerId)}
            className="p-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-tr-lg rounded-bl-lg text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#3F3F46] transition-colors"
            title="Refresh Matrix"
          >
            <RefreshCw size={16} className={loadingPricing ? "animate-spin text-[#A855F7]" : ""} />
          </button>
        </div>
      </div>

      {/* ─── Customer Selection Bar ─── */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 flex-1 max-w-lg">
          <label className="text-[11px] uppercase font-bold text-[#A855F7] tracking-wider flex items-center gap-1.5">
            <Building2 size={13} />
            <span>Select Target B2B Enterprise / Buyer</span>
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] font-semibold"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName ? `${c.companyName} — ${c.name}` : `${c.name} (${c.email})`}
                {c.gstin ? ` [GST: ${c.gstin}]` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDiscountModal(true)}
            className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold text-xs px-4 py-2.5 rounded-tr-xl rounded-bl-xl transition-all border border-[#3F3F46] flex items-center gap-1.5 shadow-sm"
          >
            <Percent size={14} className="text-[#A855F7]" />
            <span>Batch Category Discount</span>
          </button>

          <button
            type="button"
            disabled={stats.unsavedCount === 0 || savingBulk}
            onClick={handleSaveBulk}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-tr-xl rounded-bl-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Save size={14} />
            <span>{savingBulk ? "Saving Matrix…" : `Save Matrix (${stats.unsavedCount} Edits)`}</span>
          </button>
        </div>
      </div>

      {/* ─── 4 Interactive KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider">Catalog Products</span>
          <p className="text-xl font-black font-mono text-[#FAFAFA]">{stats.totalProducts}</p>
          <span className="text-[10px] text-[#71717A] block">Available for customization</span>
        </div>

        <button
          type="button"
          onClick={() => setFilterType(filterType === "custom_only" ? "all" : "custom_only")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            filterType === "custom_only"
              ? "border-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/10 ring-1 ring-[#8B5CF6]"
              : "border-[#27272A] hover:border-[#3F3F46]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">Custom Rates</span>
            <Coins size={14} className="text-[#A855F7]" />
          </div>
          <p className="text-xl font-black font-mono text-[#A855F7]">{stats.customCount}</p>
          <span className="text-[10px] text-[#71717A] block">Active client overrides</span>
        </button>

        <div className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Avg Discount</span>
          <p className="text-xl font-black font-mono text-emerald-400">{stats.avgDiscount}%</p>
          <span className="text-[10px] text-[#71717A] block">Across custom priced items</span>
        </div>

        <div className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Pending Saves</span>
          <p className="text-xl font-black font-mono text-amber-400">{stats.unsavedCount}</p>
          <span className="text-[10px] text-[#71717A] block">Unsaved local modifications</span>
        </div>
      </div>

      {/* Notifications */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
            toast.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/80 border-rose-500/40 text-rose-300"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─── Search & Filter Toolbar ─── */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 bg-[#09090B] p-1 rounded-xl border border-[#27272A]">
            {[
              { id: "all", label: "All Items" },
              { id: "custom_only", label: "Custom Overrides Only" },
              { id: "retail_only", label: "Standard Retail Only" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setFilterType(tab.id as any); setCurrentPage(1); }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  filterType === tab.id
                    ? "bg-[#8B5CF6] text-white shadow"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A1A1AA]">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by Name or SKU..."
            className="w-full pl-10 pr-9 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Pricing Matrix Table ─── */}
      <div className="rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Hardware Item & SKU</th>
                <th className="py-3.5 px-4">Standard Retail</th>
                <th className="py-3.5 px-4">B2B Custom Rate (₹)</th>
                <th className="py-3.5 px-4 text-center">Min Order Qty (MOQ)</th>
                <th className="py-3.5 px-4 text-center">Discount / Margin</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#71717A]">
                    <Coins size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                    No products matching search criteria.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod) => {
                  const draft = draftChanges.get(prod.productId);
                  const effectivePrice = draft ? draft.price : (prod.customPrice ?? prod.standardPrice);
                  const effectiveMoq = draft ? draft.minQuantity : prod.minQuantity || 1;
                  const isDirty = draft?.dirty;
                  const isCustom = draft ? draft.price !== prod.standardPrice : prod.hasCustomPrice;

                  const discountPct =
                    prod.standardPrice > 0
                      ? Math.round(((prod.standardPrice - effectivePrice) / prod.standardPrice) * 100)
                      : 0;

                  return (
                    <tr
                      key={prod.productId}
                      className={`hover:bg-[#27272A]/40 transition-colors ${
                        isDirty ? "bg-amber-950/20" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {prod.thumbnail ? (
                            <img
                              src={prod.thumbnail}
                              alt={prod.name}
                              className="w-10 h-10 object-cover rounded-lg border border-[#27272A] bg-[#09090B]"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#27272A] flex items-center justify-center text-[#71717A]">
                              <Layers size={16} />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-[#FAFAFA]">{prod.name}</p>
                            <span className="text-[11px] font-mono text-[#A1A1AA]">{prod.sku}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[#A1A1AA] line-through font-semibold">
                          ₹{prod.standardPrice.toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="relative max-w-[130px]">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#71717A]">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={effectivePrice}
                            onChange={(e) =>
                              handlePriceChange(
                                prod.productId,
                                parseFloat(e.target.value) || 0,
                                prod.minQuantity || 1
                              )
                            }
                            className={`w-full pl-6 pr-2 py-1.5 bg-[#09090B] border rounded-lg text-xs font-mono font-bold focus:outline-none ${
                              isCustom
                                ? "border-purple-500/60 text-purple-300 ring-1 ring-purple-500/30"
                                : "border-[#27272A] text-[#FAFAFA]"
                            }`}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          min="1"
                          value={effectiveMoq}
                          onChange={(e) =>
                            handleMoqChange(
                              prod.productId,
                              parseInt(e.target.value, 10) || 1,
                              effectivePrice
                            )
                          }
                          className="w-16 px-2 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-xs font-mono font-bold text-center text-[#FAFAFA] focus:outline-none"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {discountPct > 0 ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-mono">
                            -{discountPct}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#71717A]">Standard</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => handleResetRow(prod.productId)}
                              className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA] rounded-lg transition-colors"
                              title="Reset to Standard Retail"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSaveSingle(prod.productId)}
                            className="px-2.5 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-bold text-xs transition-all shadow"
                            title="Save Row"
                          >
                            Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-[#A1A1AA]">
            Showing page <strong className="text-[#FAFAFA]">{currentPage}</strong> of <strong className="text-[#FAFAFA]">{totalPages}</strong> ({filteredProducts.length} filtered items)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-40 disabled:cursor-not-allowed border border-[#27272A] rounded-lg text-[#FAFAFA] font-bold"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-40 disabled:cursor-not-allowed border border-[#27272A] rounded-lg text-[#FAFAFA] font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL: BATCH CATEGORY DISCOUNT ─── */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <Percent size={16} className="text-[#8B5CF6]" />
                <span>Batch Category Discount Rule</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Select Target Category</label>
                <select
                  value={discountCategory}
                  onChange={(e) => setDiscountCategory(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="all">Entire Product Catalog (All Categories)</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Wholesale Discount Percentage (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.min(90, Math.max(1, parseInt(e.target.value) || 0)))}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#71717A] font-bold">
                    %
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#71717A] leading-relaxed">
                This rule will automatically recalculate custom B2B rates for all products in the selected category by deducting <strong>{discountPercent}%</strong> from each product's base retail price.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCategoryDiscount}
                  disabled={applyingDiscount}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl font-bold shadow"
                >
                  Apply Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
