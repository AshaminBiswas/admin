import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Ticket,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Copy,
  Check,
  Download,
  Percent,
  DollarSign,
  Tag,
  Calendar,
  Sparkles,
  Layers,
  ShoppingBag,
  User,
  Building2,
  Sliders,
  CheckSquare,
  Square,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  couponsService,
  CouponItem,
  CouponStats,
  CouponUsageDetail,
} from "../api/couponsService";
import { fetchAdminApi } from "../api/adminApi";
import { useDebounce } from "../hooks/useDebounce";
import { AsyncActionButton } from "../components/common/AsyncActionButton";

/* ─── Skeleton Loading Body for Coupons Page ────────────────────────────────── */
export function CouponsPageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#27272A]" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-64 bg-[#27272A] rounded" />
              <div className="h-4 w-28 bg-[#27272A] rounded-full" />
            </div>
            <div className="h-3 w-80 bg-[#27272A] rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 bg-[#27272A] rounded-tr-xl rounded-bl-xl" />
          <div className="h-9 w-28 bg-[#27272A] rounded-tr-xl rounded-bl-xl" />
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#27272A]" />
            <div className="h-5 w-12 bg-[#27272A] rounded" />
            <div className="h-2.5 w-24 bg-[#27272A] rounded" />
          </div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-3">
        <div className="h-8 w-64 bg-[#27272A] rounded" />
        <div className="h-10 w-full bg-[#27272A] rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-[#27272A] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Coupons & Offers Page Component ───────────────────────────────────── */
export function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PERCENTAGE" | "FIXED_AMOUNT">("ALL");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "STOREWIDE" | "SELECTIVE">("ALL");

  // Reference data for selective product offers
  const [catalogProducts, setCatalogProducts] = useState<Array<{ id: string; name: string; sku?: string }>>([]);
  const [catalogCategories, setCatalogCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [viewingCoupon, setViewingCoupon] = useState<CouponItem | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<CouponItem | null>(null);
  const [couponUsages, setCouponUsages] = useState<CouponUsageDetail[]>([]);
  const [isLoadingUsages, setIsLoadingUsages] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minOrderAmount, setMinOrderAmount] = useState<string>("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>("");
  const [usageLimit, setUsageLimit] = useState<string>("");
  const [perUserLimit, setPerUserLimit] = useState<string>("1");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  // Selective Product Offers Scope
  const [scopeType, setScopeType] = useState<"STOREWIDE" | "PRODUCTS" | "CATEGORIES">("STOREWIDE");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // ── Load Catalog Reference Data ─────────────────────────────────────────────
  const loadReferenceData = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetchAdminApi<any>("/products?limit=100"),
        fetchAdminApi<any>("/categories?limit=100"),
      ]);

      if (pRes && pRes.success !== false) {
        const pList = Array.isArray(pRes.data) ? pRes.data : pRes.data?.items || pRes.data?.products || [];
        setCatalogProducts(pList.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })));
      }

      if (cRes && cRes.success !== false) {
        const cList = Array.isArray(cRes.data) ? cRes.data : cRes.data?.items || cRes.data?.categories || [];
        setCatalogCategories(cList.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (e) {
      console.warn("[Reference Data Warning]:", e);
    }
  }, []);

  // ── Load Coupons & Stats ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        couponsService.listCoupons({
          limit: 100,
          search: debouncedSearch.trim() || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          discountType: typeFilter !== "ALL" ? typeFilter : undefined,
        }),
        couponsService.getStats(),
      ]);

      if (listRes && listRes.success !== false) {
        const items = Array.isArray(listRes.data) ? listRes.data : (listRes as any).items || [];
        setCoupons(items);
      }

      if (statsRes && statsRes.success !== false && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      console.error("[Coupons Fetch Error]:", err);
      setFeedback({ type: "error", text: "Failed to load promotional coupons & offers." });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, typeFilter]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Compute Filtered List ───────────────────────────────────────────────────
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const isSelective = (c.applicableProductIds && c.applicableProductIds.length > 0) ||
                          (c.applicableCategoryIds && c.applicableCategoryIds.length > 0);
      if (scopeFilter === "STOREWIDE" && isSelective) return false;
      if (scopeFilter === "SELECTIVE" && !isSelective) return false;
      return true;
    });
  }, [coupons, scopeFilter]);

  // ── Auto-Generate Promo Code ────────────────────────────────────────────────
  const handleGenerateCode = () => {
    const prefixes = ["PRC", "OFFER", "DEAL", "SAVE", "B2B", "HARDWARE"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setCode(`${randomPrefix}${randomNum}`);
  };

  // ── Clipboard Copy ──────────────────────────────────────────────────────────
  const handleCopyCode = (cCode: string) => {
    navigator.clipboard.writeText(cCode);
    setCopiedCode(cCode);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // ── Open Create Modal ───────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    handleGenerateCode();
    setDescription("");
    setDiscountType("PERCENTAGE");
    setDiscountValue(15);
    setMinOrderAmount("");
    setMaxDiscountAmount("");
    setUsageLimit("");
    setPerUserLimit("1");
    setStartDate("");
    setEndDate("");
    setIsActive(true);
    setScopeType("STOREWIDE");
    setSelectedProductIds([]);
    setSelectedCategoryIds([]);
    setShowCreateModal(true);
  };

  // ── Open Edit Modal ─────────────────────────────────────────────────────────
  const handleOpenEdit = (c: CouponItem) => {
    setEditingCoupon(c);
    setCode(c.code);
    setDescription(c.description || "");
    setDiscountType(c.discountType);
    setDiscountValue(Number(c.discountValue));
    setMinOrderAmount(c.minOrderAmount != null ? String(c.minOrderAmount) : "");
    setMaxDiscountAmount(c.maxDiscountAmount != null ? String(c.maxDiscountAmount) : "");
    setUsageLimit(c.usageLimit != null ? String(c.usageLimit) : "");
    setPerUserLimit(c.perUserLimit != null ? String(c.perUserLimit) : "1");
    setStartDate(c.startDate ? new Date(c.startDate).toISOString().slice(0, 16) : "");
    setEndDate(c.endDate ? new Date(c.endDate).toISOString().slice(0, 16) : "");
    setIsActive(c.isActive);

    const hasProds = c.applicableProductIds && c.applicableProductIds.length > 0;
    const hasCats = c.applicableCategoryIds && c.applicableCategoryIds.length > 0;
    if (hasProds) {
      setScopeType("PRODUCTS");
      setSelectedProductIds(c.applicableProductIds);
      setSelectedCategoryIds([]);
    } else if (hasCats) {
      setScopeType("CATEGORIES");
      setSelectedCategoryIds(c.applicableCategoryIds);
      setSelectedProductIds([]);
    } else {
      setScopeType("STOREWIDE");
      setSelectedProductIds([]);
      setSelectedCategoryIds([]);
    }
  };

  // ── Save New Coupon ─────────────────────────────────────────────────────────
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || discountValue <= 0) {
      setFeedback({ type: "error", text: "Please provide a valid coupon code and discount value." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await couponsService.createCoupon({
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : 1,
        applicableProductIds: scopeType === "PRODUCTS" ? selectedProductIds : [],
        applicableCategoryIds: scopeType === "CATEGORIES" ? selectedCategoryIds : [],
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        isActive,
      });

      if (res && res.success !== false) {
        setFeedback({ type: "success", text: `Coupon offer "${code}" created successfully.` });
        setShowCreateModal(false);
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.message || res.error?.message || "Failed to create coupon offer." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to create coupon offer." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Save Edited Coupon ───────────────────────────────────────────────────────
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await couponsService.updateCoupon(editingCoupon.id, {
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : 1,
        applicableProductIds: scopeType === "PRODUCTS" ? selectedProductIds : [],
        applicableCategoryIds: scopeType === "CATEGORIES" ? selectedCategoryIds : [],
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        isActive,
      });

      if (res && res.success !== false) {
        setFeedback({ type: "success", text: `Coupon offer "${code}" updated successfully.` });
        setEditingCoupon(null);
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.message || res.error?.message || "Failed to update coupon." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update coupon." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Quick Toggle Active Status ──────────────────────────────────────────────
  const handleToggleStatus = async (coupon: CouponItem) => {
    try {
      const res = await couponsService.toggleStatus(coupon.id);
      if (res && res.success !== false) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
        );
        setFeedback({
          type: "success",
          text: `Coupon "${coupon.code}" is now ${!coupon.isActive ? "Active" : "Inactive"}.`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to toggle status." });
    }
  };

  // ── Delete Coupon ───────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deletingCoupon) return;
    setIsSubmitting(true);
    try {
      const res = await couponsService.deleteCoupon(deletingCoupon.id);
      if (res && res.success !== false) {
        setFeedback({ type: "success", text: `Coupon "${deletingCoupon.code}" deleted permanently.` });
        setDeletingCoupon(null);
        setCoupons((prev) => prev.filter((c) => c.id !== deletingCoupon.id));
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to delete coupon." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Inspect Usage History ───────────────────────────────────────────────────
  const handleInspectUsages = async (coupon: CouponItem) => {
    setViewingCoupon(coupon);
    setIsLoadingUsages(true);
    try {
      const res = await couponsService.getUsages(coupon.id);
      if (res && res.success !== false && res.data) {
        setCouponUsages(res.data.usages || []);
      }
    } catch (e) {
      console.warn("[Usages Load Error]:", e);
    } finally {
      setIsLoadingUsages(false);
    }
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    if (coupons.length === 0) return;
    const headers = [
      "ID",
      "Code",
      "Description",
      "Discount Type",
      "Discount Value",
      "Min Order (INR)",
      "Max Cap (INR)",
      "Used Count",
      "Usage Limit",
      "Per User Limit",
      "Active",
      "Start Date",
      "End Date",
    ];

    const rows = coupons.map((c) => [
      `"${c.id}"`,
      `"${c.code}"`,
      `"${c.description || ""}"`,
      `"${c.discountType}"`,
      `"${c.discountValue}"`,
      `"${c.minOrderAmount || ""}"`,
      `"${c.maxDiscountAmount || ""}"`,
      `"${c.usedCount}"`,
      `"${c.usageLimit || "UNLIMITED"}"`,
      `"${c.perUserLimit || "1"}"`,
      `"${c.isActive ? "YES" : "NO"}"`,
      `"${c.startDate || ""}"`,
      `"${c.endDate || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PRC_Coupons_Offers_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && coupons.length === 0) {
    return <CouponsPageSkeleton />;
  }

  return (
    <div className="space-y-6 text-[#FAFAFA] max-w-[1600px] mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* ─── Header Banner ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A855F7]">
            <Ticket size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#FAFAFA]">
                Coupons & Promotional Offers Hub
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                ENTERPRISE DEALS
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Manage promo codes, B2B wholesale vouchers, selective product campaigns, and monitor redemption analytics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs px-4 py-2 rounded-tr-xl rounded-bl-xl transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={15} />
            <span>Create Coupon / Offer</span>
          </button>

          <AsyncActionButton
            mode="download"
            onAction={handleExportCSV}
            idleIcon={<Download size={14} />}
            idleLabel="Export CSV"
            loadingLabel="Exporting…"
            successLabel="Exported!"
            className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold text-xs px-3.5 py-2 rounded-tr-xl rounded-bl-xl transition-all border border-[#3F3F46] flex items-center gap-1.5 shadow-sm"
            variant="custom"
          />

          <button
            type="button"
            onClick={loadData}
            className="p-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-tr-lg rounded-bl-lg text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#3F3F46] transition-colors"
            title="Refresh Offers"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-[#A855F7]" : ""} />
          </button>
        </div>
      </div>

      {/* ─── 4 Interactive KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => { setStatusFilter("ALL"); setTypeFilter("ALL"); setScopeFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            statusFilter === "ALL" && typeFilter === "ALL" && scopeFilter === "ALL"
              ? "border-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/10 ring-1 ring-[#8B5CF6]"
              : "border-[#27272A] hover:border-[#3F3F46]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider">Total Coupons</span>
            <Ticket size={14} className="text-[#A1A1AA] group-hover:text-[#FAFAFA]" />
          </div>
          <p className="text-xl font-black font-mono text-[#FAFAFA]">{stats?.totalCoupons ?? coupons.length}</p>
          <span className="text-[10px] text-[#71717A] block">All configured promotions</span>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter("ACTIVE"); setTypeFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            statusFilter === "ACTIVE"
              ? "border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
              : "border-[#27272A] hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Live & Active</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-400">
            {stats?.activeCoupons ?? coupons.filter((c) => c.isActive && !c.isExpired).length}
          </p>
          <span className="text-[10px] text-[#71717A] block">Ready for checkout redemption</span>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter("EXPIRED"); setTypeFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            statusFilter === "EXPIRED"
              ? "border-rose-500 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500"
              : "border-[#27272A] hover:border-rose-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Expired / Inactive</span>
            <Clock size={14} className="text-rose-400" />
          </div>
          <p className="text-xl font-black font-mono text-rose-400">
            {stats?.expiredCoupons ?? coupons.filter((c) => !c.isActive || c.isExpired).length}
          </p>
          <span className="text-[10px] text-[#71717A] block">Ended promotions</span>
        </button>

        <div className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">Total Redemptions</span>
            <TrendingUp size={14} className="text-[#A855F7]" />
          </div>
          <p className="text-xl font-black font-mono text-[#A855F7]">
            {stats?.totalRedemptions ?? coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)}
          </p>
          <span className="text-[10px] text-[#71717A] block">Lifetime successful uses</span>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/80 border-rose-500/40 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ─── Search & Multi-Filter Toolbar ─── */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-[#09090B] p-1 rounded-xl border border-[#27272A]">
            {[
              { id: "ALL", label: "All Offers" },
              { id: "ACTIVE", label: "Active Deals" },
              { id: "INACTIVE", label: "Inactive" },
              { id: "EXPIRED", label: "Expired" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? "bg-[#8B5CF6] text-white shadow"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Discount Type & Scope Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-[#09090B] border border-[#27272A] text-[#FAFAFA] text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Types (Percentage & Fixed)</option>
              <option value="PERCENTAGE">Percentage (%) Only</option>
              <option value="FIXED_AMOUNT">Fixed Amount (₹) Only</option>
            </select>

            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as any)}
              className="bg-[#09090B] border border-[#27272A] text-[#FAFAFA] text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Scopes</option>
              <option value="STOREWIDE">Storewide (All Products)</option>
              <option value="SELECTIVE">Selective Product Offers</option>
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
            placeholder="Search by Coupon Code, Campaign Description, or Promo Terms..."
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

      {/* ─── Coupons Data Table ─── */}
      <div className="rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Coupon Code & Scope</th>
                <th className="py-3.5 px-4">Discount Rate</th>
                <th className="py-3.5 px-4">Min. Order & Limits</th>
                <th className="py-3.5 px-4">Usage & Quota</th>
                <th className="py-3.5 px-4">Validity Schedule</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#71717A]">
                    <Ticket size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                    No promotional coupons or offers found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => {
                  const isPercentage = c.discountType === "PERCENTAGE";
                  const isSelective = (c.applicableProductIds && c.applicableProductIds.length > 0) ||
                                      (c.applicableCategoryIds && c.applicableCategoryIds.length > 0);
                  const isExpired = c.isExpired || (c.endDate ? new Date(c.endDate) < new Date() : false);
                  const usagePct = c.usageLimit ? Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100)) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-[#27272A]/40 transition-colors">
                      {/* Code Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[#A855F7] tracking-wider text-xs bg-purple-950/60 px-2 py-1 rounded-lg border border-purple-500/30 flex items-center gap-1.5">
                            {c.code}
                            <button
                              type="button"
                              onClick={() => handleCopyCode(c.code)}
                              title="Copy Code"
                              className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                            >
                              {copiedCode === c.code ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </span>
                          {isSelective && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Selective
                            </span>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-[11px] text-[#A1A1AA] mt-1 line-clamp-1">
                            {c.description}
                          </p>
                        )}
                      </td>

                      {/* Discount Rate */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-emerald-400 text-sm flex items-center gap-1">
                          {isPercentage ? (
                            <>
                              <Percent size={13} />
                              <span>{c.discountValue}% OFF</span>
                            </>
                          ) : (
                            <>
                              <DollarSign size={13} />
                              <span>₹{Number(c.discountValue).toLocaleString("en-IN")} FLAT</span>
                            </>
                          )}
                        </p>
                        {isPercentage && c.maxDiscountAmount && (
                          <span className="text-[10px] text-[#71717A]">
                            Max cap: ₹{Number(c.maxDiscountAmount).toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Min Order & Limits */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#FAFAFA]">
                          {c.minOrderAmount
                            ? `₹${Number(c.minOrderAmount).toLocaleString("en-IN")}`
                            : "No Minimum"}
                        </p>
                        <span className="text-[10px] text-[#A1A1AA] block">
                          {c.perUserLimit ? `${c.perUserLimit} use/user` : "Unlimited/user"}
                        </span>
                      </td>

                      {/* Usage Progress */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 w-28">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-[#FAFAFA]">{c.usedCount}</span>
                            <span className="text-[#71717A]">
                              {c.usageLimit ? `/ ${c.usageLimit}` : "/ ∞"}
                            </span>
                          </div>
                          {c.usageLimit && (
                            <div className="w-full bg-[#09090B] h-1.5 rounded-full overflow-hidden border border-[#27272A]">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usagePct >= 90
                                    ? "bg-rose-500"
                                    : usagePct >= 70
                                    ? "bg-amber-500"
                                    : "bg-[#8B5CF6]"
                                }`}
                                style={{ width: `${usagePct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Validity Dates */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] space-y-0.5 font-mono">
                          {c.startDate && (
                            <span className="text-[#A1A1AA] block">
                              From: {new Date(c.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {c.endDate ? (
                            <span className={isExpired ? "text-rose-400 font-bold block" : "text-[#A1A1AA] block"}>
                              Till: {new Date(c.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold block">No Expiry Date</span>
                          )}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border transition-all ${
                            !c.isActive
                              ? "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                              : isExpired
                              ? "bg-rose-950/80 text-rose-400 border-rose-500/40 hover:bg-rose-900/60"
                              : "bg-emerald-950/80 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/60"
                          }`}
                          title="Click to toggle status"
                        >
                          {!c.isActive ? "Inactive" : isExpired ? "Expired" : "Active"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleInspectUsages(c)}
                            className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-lg transition-colors"
                            title="Inspect Redemptions"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-amber-400 rounded-lg transition-colors"
                            title="Edit Coupon Offer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCoupon(c)}
                            className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 rounded-lg transition-colors"
                            title="Delete Coupon"
                          >
                            <Trash2 size={13} />
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
      </div>

      {/* ─── MODAL 1: CREATE / EDIT COUPON MODAL ─── */}
      {(showCreateModal || editingCoupon) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <Ticket size={16} className="text-[#8B5CF6]" />
                <span>{editingCoupon ? "Edit Coupon & Promo Offer" : "Create New Coupon & Promo Offer"}</span>
              </h3>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setEditingCoupon(null); }}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={editingCoupon ? handleSaveEdit : handleCreateCoupon} className="space-y-4 text-xs">
              {/* Row 1: Code & Generator Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-[#A1A1AA] font-semibold">Promo Code *</label>
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="text-[10px] font-bold text-[#A855F7] hover:underline flex items-center gap-1"
                    >
                      <Sparkles size={10} />
                      Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PRCSUMMER25"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 font-mono font-bold text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Offer Title / Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. 15% discount on architectural hardware orders"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* Row 2: Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Discount Type *</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="PERCENTAGE">Percentage (%) OFF</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (₹) OFF</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">
                    Discount Value {discountType === "PERCENTAGE" ? "(%)" : "(₹)"} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder={discountType === "PERCENTAGE" ? "15" : "500"}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 font-mono text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                {discountType === "PERCENTAGE" ? (
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#A1A1AA] font-semibold">Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                      placeholder="e.g. 2000"
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 font-mono text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#A1A1AA] font-semibold">Min. Order Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                      placeholder="e.g. 2500"
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 font-mono text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                )}
              </div>

              {/* Row 3: Limits & Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {discountType === "PERCENTAGE" && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#A1A1AA] font-semibold">Min. Order Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                      placeholder="e.g. 2500"
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 font-mono text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Global Usage Quota</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="e.g. 500 (Blank for unlimited)"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 font-mono text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Limit Per Customer</label>
                  <input
                    type="number"
                    value={perUserLimit}
                    onChange={(e) => setPerUserLimit(e.target.value)}
                    placeholder="1"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 font-mono text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* Row 4: Validity Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Start Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">End Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* ── Selective Product / Category Scope Selector ── */}
              <div className="p-3.5 bg-[#09090B] border border-[#27272A] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#FAFAFA] flex items-center gap-1.5">
                    <Sliders size={14} className="text-[#8B5CF6]" />
                    <span>Applicable Scope (Selective Product Offers)</span>
                  </label>
                  <span className="text-[10px] text-[#71717A]">Target specific catalog items</span>
                </div>

                {/* Scope Radio Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "STOREWIDE", label: "All Products (Storewide)" },
                    { id: "PRODUCTS", label: "Selective Products" },
                    { id: "CATEGORIES", label: "Selective Categories" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setScopeType(tab.id as any)}
                      className={`py-2 px-2 text-center text-xs font-bold rounded-lg border transition-all ${
                        scopeType === tab.id
                          ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow"
                          : "bg-[#18181B] text-[#A1A1AA] border-[#27272A] hover:text-[#FAFAFA]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Selective Products Picker */}
                {scopeType === "PRODUCTS" && (
                  <div className="space-y-2 pt-2 border-t border-[#27272A]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#A1A1AA] font-semibold">
                        Selected Products ({selectedProductIds.length})
                      </span>
                      {selectedProductIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedProductIds([])}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 bg-[#18181B] p-2 rounded-lg border border-[#27272A]">
                      {catalogProducts.map((p) => {
                        const isChecked = selectedProductIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                              isChecked ? "bg-purple-950/60 text-purple-200" : "hover:bg-[#27272A]/50 text-[#FAFAFA]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductIds((prev) => [...prev, p.id]);
                                } else {
                                  setSelectedProductIds((prev) => prev.filter((id) => id !== p.id));
                                }
                              }}
                              className="accent-[#8B5CF6]"
                            />
                            <span className="text-xs truncate">{p.name}</span>
                            {p.sku && <span className="text-[10px] text-[#71717A] font-mono">({p.sku})</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selective Categories Picker */}
                {scopeType === "CATEGORIES" && (
                  <div className="space-y-2 pt-2 border-t border-[#27272A]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#A1A1AA] font-semibold">
                        Selected Categories ({selectedCategoryIds.length})
                      </span>
                      {selectedCategoryIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryIds([])}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 bg-[#18181B] p-2 rounded-lg border border-[#27272A]">
                      {catalogCategories.map((cat) => {
                        const isChecked = selectedCategoryIds.includes(cat.id);
                        return (
                          <label
                            key={cat.id}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                              isChecked ? "bg-purple-950/60 text-purple-200" : "hover:bg-[#27272A]/50 text-[#FAFAFA]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategoryIds((prev) => [...prev, cat.id]);
                                } else {
                                  setSelectedCategoryIds((prev) => prev.filter((id) => id !== cat.id));
                                }
                              }}
                              className="accent-[#8B5CF6]"
                            />
                            <span className="text-xs truncate">{cat.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-[#8B5CF6] w-4 h-4 rounded"
                  />
                  <span className="text-xs font-semibold text-[#FAFAFA]">Enable and activate this promo offer immediately</span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setEditingCoupon(null); }}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl font-bold shadow"
                >
                  {isSubmitting ? "Saving Offer..." : editingCoupon ? "Update Offer" : "Create Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: INSPECT USAGES & REDEMPTIONS MODAL ─── */}
      {viewingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#FAFAFA]">
                    Coupon Details: <span className="text-[#A855F7] font-mono">{viewingCoupon.code}</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {viewingCoupon.discountType === "PERCENTAGE" ? `${viewingCoupon.discountValue}% OFF` : `₹${viewingCoupon.discountValue} OFF`}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA]">
                  {viewingCoupon.description || "No specific promotion terms entered"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingCoupon(null)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[10px] text-[#71717A] block">Redemptions</span>
                <span className="font-bold font-mono text-sm text-[#FAFAFA]">
                  {viewingCoupon.usedCount} {viewingCoupon.usageLimit ? `/ ${viewingCoupon.usageLimit}` : ""}
                </span>
              </div>
              <div className="p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[10px] text-[#71717A] block">Min. Order</span>
                <span className="font-bold font-mono text-sm text-[#FAFAFA]">
                  {viewingCoupon.minOrderAmount ? `₹${Number(viewingCoupon.minOrderAmount).toLocaleString("en-IN")}` : "None"}
                </span>
              </div>
              <div className="p-2.5 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[10px] text-[#71717A] block">Per Customer Limit</span>
                <span className="font-bold font-mono text-sm text-[#FAFAFA]">
                  {viewingCoupon.perUserLimit || 1} use
                </span>
              </div>
            </div>

            {/* Redemption Log Table */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <h4 className="text-xs font-bold text-[#FAFAFA] flex items-center gap-1.5">
                <Clock size={13} className="text-[#A855F7]" />
                <span>Recent Customer Redemptions</span>
              </h4>

              <div className="flex-1 overflow-y-auto rounded-xl border border-[#27272A] bg-[#09090B]">
                {isLoadingUsages ? (
                  <div className="p-8 text-center text-xs text-[#71717A] animate-pulse">
                    Loading redemption records...
                  </div>
                ) : couponUsages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#71717A]">
                    No customer redemptions recorded for this coupon yet.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#18181B] text-[#A1A1AA] border-b border-[#27272A] text-[10px] uppercase font-bold">
                      <tr>
                        <th className="p-2.5">Customer</th>
                        <th className="p-2.5">Order</th>
                        <th className="p-2.5">Discount</th>
                        <th className="p-2.5 text-right">Redeemed At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A]">
                      {couponUsages.map((u) => (
                        <tr key={u.id} className="hover:bg-[#27272A]/40">
                          <td className="p-2.5">
                            <p className="font-bold text-[#FAFAFA]">
                              {u.user?.firstName} {u.user?.lastName}
                            </p>
                            <span className="text-[10px] text-[#71717A]">{u.user?.email}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="font-mono text-[#A855F7] font-bold">
                              {u.order?.orderNumber || "Direct Checkout"}
                            </span>
                            {u.order?.grandTotal && (
                              <span className="text-[10px] text-[#71717A] block">
                                Total: ₹{u.order.grandTotal.toLocaleString("en-IN")}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-bold text-emerald-400 font-mono">
                            {u.order?.discountAmount ? `₹${u.order.discountAmount.toLocaleString("en-IN")}` : "Applied"}
                          </td>
                          <td className="p-2.5 text-right font-mono text-[11px] text-[#A1A1AA]">
                            {new Date(u.usedAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setViewingCoupon(null)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DELETE CONFIRMATION MODAL ─── */}
      {deletingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#FAFAFA]">Delete Coupon Offer</h3>
                <p className="text-xs text-[#A1A1AA]">
                  Are you sure you want to permanently delete <strong className="text-rose-400 font-mono">{deletingCoupon.code}</strong>?
                </p>
              </div>
            </div>

            {deletingCoupon.usedCount > 0 && (
              <p className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-[11px] text-amber-300">
                ⚠️ Notice: This coupon has {deletingCoupon.usedCount} previous customer redemptions.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCoupon(null)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow"
              >
                {isSubmitting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
