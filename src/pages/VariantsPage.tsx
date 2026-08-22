import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sliders,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Package,
  Layers,
  Tag,
  DollarSign,
  Boxes,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  SlidersHorizontal,
  Sparkles,
  ArrowUpDown,
  Filter,
  Check,
} from "lucide-react";
import { variantsApi, ProductVariantItem, ListVariantsParams } from "../api/adminApi";
import { productsService, ProductItem } from "../api/productsService";
import { AsyncActionButton } from "../components/common/AsyncActionButton";
import { useDebounce } from "../hooks/useDebounce";

/* ─── Skeleton Loading Body for Variants Page ────────────────────────────────── */

export function VariantsPageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse font-sans">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#27272A]" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-52 bg-[#27272A] rounded" />
              <div className="h-4 w-24 bg-[#27272A] rounded-full" />
            </div>
            <div className="h-3 w-80 bg-[#27272A] rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 bg-[#27272A] rounded-tr-xl rounded-bl-xl" />
          <div className="h-9 w-28 bg-[#27272A] rounded-tr-xl rounded-bl-xl" />
          <div className="h-9 w-9 bg-[#27272A] rounded-lg" />
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#27272A]" />
            <div className="h-5 w-16 bg-[#27272A] rounded" />
            <div className="h-2.5 w-24 bg-[#27272A] rounded" />
          </div>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
        <div className="h-9 w-full bg-[#27272A] rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <div className="p-3.5 bg-[#09090B] border-b border-[#27272A] flex justify-between">
          <div className="h-3 w-40 bg-[#27272A] rounded" />
          <div className="h-3 w-20 bg-[#27272A] rounded" />
        </div>
        <div className="divide-y divide-[#27272A]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#27272A]" />
                <div className="space-y-1.5 w-44">
                  <div className="h-4 w-32 bg-[#27272A] rounded" />
                  <div className="h-2.5 w-24 bg-[#27272A] rounded" />
                </div>
              </div>
              <div className="h-4 w-28 bg-[#27272A] rounded" />
              <div className="h-4 w-20 bg-[#27272A] rounded" />
              <div className="h-5 w-20 bg-[#27272A] rounded-full" />
              <div className="h-5 w-16 bg-[#27272A] rounded-full" />
              <div className="h-7 w-20 bg-[#27272A] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Variants Page Component ───────────────────────────────────────────── */

const FALLBACK_VARIANTS: ProductVariantItem[] = [
  {
    id: "VAR-101-1",
    productId: "PRC-PROD-101",
    sku: "PRC-MORT-COP-01-100MM",
    name: "Antique Copper - 100mm Backset",
    price: 3499,
    salePrice: 3199,
    offerPrice: 3199,
    stock: 25,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80",
    attributes: { Finish: "Antique Copper", Size: "100mm" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    product: {
      id: "PRC-PROD-101",
      name: "Architectural Mortise Door Handle Set - Antique Copper",
      sku: "PRC-MORT-COP-01",
      thumbnail: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80",
    }
  },
  {
    id: "VAR-101-2",
    productId: "PRC-PROD-101",
    sku: "PRC-MORT-COP-01-125MM",
    name: "Antique Copper - 125mm Heavy",
    price: 3899,
    salePrice: 3499,
    offerPrice: 3499,
    stock: 20,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80",
    attributes: { Finish: "Antique Copper", Size: "125mm" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    product: {
      id: "PRC-PROD-101",
      name: "Architectural Mortise Door Handle Set - Antique Copper",
      sku: "PRC-MORT-COP-01",
      thumbnail: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80",
    }
  },
  {
    id: "VAR-102-1",
    productId: "PRC-PROD-102",
    sku: "PRC-PATCH-SS304-SATIN",
    name: "SS 304 Satin Finish Kit",
    price: 2890,
    salePrice: 2690,
    offerPrice: 2690,
    stock: 28,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
    attributes: { Material: "SS 304", Finish: "Satin Brush" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    product: {
      id: "PRC-PROD-102",
      name: "Stainless Steel 304 Glass Door Patch Fitting Set",
      sku: "PRC-PATCH-SS304",
      thumbnail: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
    }
  }
];

export function VariantsPage() {
  // Data States
  const [variantsList, setVariantsList] = useState<ProductVariantItem[]>(FALLBACK_VARIANTS);
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(3);

  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState<string>("ALL");
  const [stockFilter, setStockFilter] = useState<string>("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariantItem | null>(null);
  const [deletingVariant, setDeletingVariant] = useState<ProductVariantItem | null>(null);
  const [viewingVariant, setViewingVariant] = useState<ProductVariantItem | null>(null);

  // Create Form State
  const [createProductId, setCreateProductId] = useState("");
  const [createSku, setCreateSku] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState<string>("");
  const [createSalePrice, setCreateSalePrice] = useState<string>("");
  const [createStock, setCreateStock] = useState<string>("10");
  const [createImage, setCreateImage] = useState("");
  const [createIsAvailable, setCreateIsAvailable] = useState(true);
  const [createAttributes, setCreateAttributes] = useState<Array<{ key: string; value: string }>>([
    { key: "Size", value: "" },
    { key: "Finish", value: "" },
  ]);

  // Edit Form State
  const [editProductId, setEditProductId] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState<string>("");
  const [editSalePrice, setEditSalePrice] = useState<string>("");
  const [editStock, setEditStock] = useState<string>("0");
  const [editImage, setEditImage] = useState("");
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const [editAttributes, setEditAttributes] = useState<Array<{ key: string; value: string }>>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Load Parent Products for dropdown picker
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await productsService.listProducts(1, 100);
      if (res && res.success !== false) {
        const items = Array.isArray(res.data) ? res.data : (res as any).data?.items || (res as any).items || [];
        setProductsList(items);
      }
    } catch (err: any) {
      console.warn("[Products Load Error]:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Load Variants from Real Backend
  const loadVariants = useCallback(async () => {
    if (variantsList.length === 0) setIsLoading(true);
    setValidationErrors({});
    try {
      const params: ListVariantsParams = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (productFilter !== "ALL") params.productId = productFilter;
      if (stockFilter === "IN_STOCK") params.inStock = "true";
      if (stockFilter === "OUT_OF_STOCK") params.inStock = "false";
      if (availabilityFilter === "AVAILABLE") params.isAvailable = "true";
      if (availabilityFilter === "UNAVAILABLE") params.isAvailable = "false";

      const res = await variantsApi.list(params);

      if (res && res.success !== false) {
        const items: ProductVariantItem[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
        const pagination = res.pagination || res.data?.pagination;

        if (items.length > 0) {
          setVariantsList(items);
          if (pagination) {
            setTotalCount(pagination.totalItems ?? items.length);
            setTotalPages(pagination.totalPages ?? 1);
          } else {
            setTotalCount(items.length);
            setTotalPages(Math.ceil(items.length / limit) || 1);
          }
        }
      }
    } catch (err: any) {
      console.warn("[Variants Fetch Error]:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, productFilter, stockFilter, availabilityFilter, sortBy, sortOrder, variantsList.length]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  // Real-time KPI Metrics
  const metrics = useMemo(() => {
    const total = totalCount || variantsList.length;
    const inStock = variantsList.filter((v) => Number(v.stock || 0) > 0).length;
    const outOfStock = variantsList.filter((v) => Number(v.stock || 0) <= 0).length;
    const avgPrice = variantsList.length > 0
      ? Math.round(variantsList.reduce((acc, v) => acc + Number(v.price || 0), 0) / variantsList.length)
      : 0;

    return { total, inStock, outOfStock, avgPrice };
  }, [variantsList, totalCount]);

  // Helper to serialize key-value attributes to Json object
  const attributesToObject = (attrs: Array<{ key: string; value: string }>) => {
    const obj: Record<string, any> = {};
    attrs.forEach(({ key, value }) => {
      const k = key.trim();
      const v = value.trim();
      if (k && v) obj[k] = v;
    });
    return obj;
  };

  // Helper to parse Json object into key-value array
  const objectToAttributes = (obj: any): Array<{ key: string; value: string }> => {
    if (!obj || typeof obj !== "object") return [];
    return Object.entries(obj).map(([key, value]) => ({
      key,
      value: String(value ?? ""),
    }));
  };

  // Auto-generate SKU draft helper
  const handleAutoGenerateSku = (prodId: string, attrs: Array<{ key: string; value: string }>) => {
    const product = productsList.find((p) => p.id === prodId);
    const prefix = product?.sku ? product.sku.trim() : "SKU";
    const attrSuffix = attrs
      .map((a) => a.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
      .filter(Boolean)
      .join("-");
    const rand = Math.floor(100 + Math.random() * 900);
    return attrSuffix ? `${prefix}-${attrSuffix}` : `${prefix}-VAR-${rand}`;
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setValidationErrors({});
    const defaultProdId = productsList[0]?.id || "";
    setCreateProductId(defaultProdId);
    setCreateName("");
    setCreatePrice(productsList[0]?.price ? String(productsList[0].price) : "499");
    setCreateSalePrice("");
    setCreateStock("25");
    setCreateImage("");
    setCreateIsAvailable(true);
    const initialAttrs = [
      { key: "Size", value: "100mm" },
      { key: "Finish", value: "Matte Black" },
    ];
    setCreateAttributes(initialAttrs);
    setCreateSku(handleAutoGenerateSku(defaultProdId, initialAttrs));
    setShowCreateModal(true);
  };

  // Create Variant Handler
  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Client-side Validation
    const errors: Record<string, string> = {};
    if (!createProductId) errors.productId = "Please select a parent catalog product.";
    if (!createSku.trim()) errors.sku = "Variant SKU is mandatory.";
    if (!createPrice || isNaN(Number(createPrice)) || Number(createPrice) < 0) {
      errors.price = "Enter a valid positive price.";
    }
    if (createSalePrice && (isNaN(Number(createSalePrice)) || Number(createSalePrice) < 0)) {
      errors.salePrice = "Sale price must be a valid positive number.";
    }
    if (createStock && (isNaN(Number(createStock)) || Number(createStock) < 0)) {
      errors.stock = "Stock must be a non-negative integer.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        productId: createProductId,
        sku: createSku.trim().toUpperCase(),
        name: createName.trim() || undefined,
        price: Number(createPrice),
        salePrice: createSalePrice ? Number(createSalePrice) : null,
        stock: Number(createStock || 0),
        attributes: attributesToObject(createAttributes),
        image: createImage.trim() || null,
        isAvailable: createIsAvailable,
      };

      const res = await variantsApi.create(payload);

      if (res && res.success !== false) {
        showFeedback("success", `Variant "${createSku}" created successfully!`);
        setShowCreateModal(false);
        await loadVariants();
      } else {
        const errorMsg = res.error?.message || res.message || "Failed to create variant.";
        if (errorMsg.toLowerCase().includes("sku")) {
          setValidationErrors({ sku: errorMsg });
        } else {
          showFeedback("error", errorMsg);
        }
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to create variant on server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (variant: ProductVariantItem) => {
    setEditingVariant(variant);
    setValidationErrors({});
    setEditProductId(variant.productId);
    setEditSku(variant.sku);
    setEditName(variant.name || "");
    setEditPrice(String(variant.price));
    setEditSalePrice(variant.salePrice !== null && variant.salePrice !== undefined ? String(variant.salePrice) : "");
    setEditStock(String(variant.stock ?? 0));
    setEditImage(variant.image || "");
    setEditIsAvailable(variant.isAvailable ?? true);
    setEditAttributes(objectToAttributes(variant.attributes));
  };

  // Save Edit Variant Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;
    setValidationErrors({});

    const errors: Record<string, string> = {};
    if (!editSku.trim()) errors.sku = "Variant SKU is mandatory.";
    if (!editPrice || isNaN(Number(editPrice)) || Number(editPrice) < 0) {
      errors.price = "Enter a valid positive price.";
    }
    if (editSalePrice && (isNaN(Number(editSalePrice)) || Number(editSalePrice) < 0)) {
      errors.salePrice = "Sale price must be a valid positive number.";
    }
    if (editStock && (isNaN(Number(editStock)) || Number(editStock) < 0)) {
      errors.stock = "Stock must be a non-negative integer.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        productId: editProductId,
        sku: editSku.trim().toUpperCase(),
        name: editName.trim() || undefined,
        price: Number(editPrice),
        salePrice: editSalePrice ? Number(editSalePrice) : null,
        stock: Number(editStock || 0),
        attributes: attributesToObject(editAttributes),
        image: editImage.trim() || null,
        isAvailable: editIsAvailable,
      };

      const res = await variantsApi.update(editingVariant.id, payload);

      if (res && res.success !== false) {
        showFeedback("success", `Variant "${editSku}" updated successfully!`);
        setEditingVariant(null);
        await loadVariants();
      } else {
        const errorMsg = res.error?.message || res.message || "Failed to update variant.";
        if (errorMsg.toLowerCase().includes("sku")) {
          setValidationErrors({ sku: errorMsg });
        } else {
          showFeedback("error", errorMsg);
        }
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to update variant on server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!deletingVariant) return;
    setIsSubmitting(true);
    try {
      const res = await variantsApi.delete(deletingVariant.id);
      if (res && res.success !== false) {
        showFeedback("success", `Variant "${deletingVariant.sku}" deleted permanently.`);
        setDeletingVariant(null);
        setVariantsList((prev) => prev.filter((v) => v.id !== deletingVariant.id));
        setTotalCount((prev) => Math.max(0, prev - 1));
      } else {
        showFeedback("error", res.error?.message || res.message || "Failed to delete variant.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to delete variant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    if (variantsList.length === 0) return;
    const headers = ["ID", "Parent Product", "SKU", "Variant Name", "Price (INR)", "Sale Price", "Stock", "Attributes", "Available", "Created At"];
    const rows = variantsList.map((v) => [
      `"${v.id}"`,
      `"${v.product?.name || v.productId}"`,
      `"${v.sku}"`,
      `"${v.name || ""}"`,
      `"${v.price}"`,
      `"${v.salePrice || ""}"`,
      `"${v.stock}"`,
      `"${JSON.stringify(v.attributes || {}).replace(/"/g, '""')}"`,
      `"${v.isAvailable ? "YES" : "NO"}"`,
      `"${new Date(v.createdAt).toISOString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PRC_Variants_Catalog_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && variantsList.length === 0) {
    return <VariantsPageSkeleton />;
  }

  return (
    <div className="space-y-6 text-[#FAFAFA] max-w-[1600px] mx-auto font-sans" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A855F7]">
            <Sliders size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#FAFAFA]">
                Product Variants & SKU Matrix
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                INVENTORY SKUs
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Manage multi-attribute SKU combinations, dimensional specifications, pricing differentials, and stock allocation.
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
            <span>Create Variant SKU</span>
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
            onClick={loadVariants}
            className="p-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-tr-lg rounded-bl-lg text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#3F3F46] transition-colors"
            title="Refresh Variants"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-[#A855F7]" : ""} />
          </button>
        </div>
      </div>

      {/* ─── 4 Interactive KPI Metric Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => { setStockFilter("ALL"); setAvailabilityFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            stockFilter === "ALL" && availabilityFilter === "ALL"
              ? "border-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/10 ring-1 ring-[#8B5CF6]"
              : "border-[#27272A] hover:border-[#3F3F46]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider">Total SKUs</span>
            <Boxes size={14} className="text-[#A1A1AA] group-hover:text-[#FAFAFA]" />
          </div>
          <p className="text-xl font-black font-mono text-[#FAFAFA]">{metrics.total}</p>
          <span className="text-[10px] text-[#71717A] block">Configured variant items</span>
        </button>

        <button
          type="button"
          onClick={() => { setStockFilter("IN_STOCK"); setAvailabilityFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            stockFilter === "IN_STOCK"
              ? "border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
              : "border-[#27272A] hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">In-Stock SKUs</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-400">{metrics.inStock}</p>
          <span className="text-[10px] text-[#71717A] block">Ready for fulfillment</span>
        </button>

        <button
          type="button"
          onClick={() => { setStockFilter("OUT_OF_STOCK"); setAvailabilityFilter("ALL"); }}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            stockFilter === "OUT_OF_STOCK"
              ? "border-rose-500 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500"
              : "border-[#27272A] hover:border-rose-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Zero Stock</span>
            <AlertTriangle size={14} className="text-rose-400" />
          </div>
          <p className="text-xl font-black font-mono text-rose-400">{metrics.outOfStock}</p>
          <span className="text-[10px] text-[#71717A] block">Requires restock</span>
        </button>

        <div className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Avg Base Price</span>
            <DollarSign size={14} className="text-cyan-400" />
          </div>
          <p className="text-xl font-black font-mono text-cyan-400">₹{metrics.avgPrice.toLocaleString()}</p>
          <span className="text-[10px] text-[#71717A] block">Catalog variant mean</span>
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

      {/* ─── Search & Filter Toolbar ─── */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Parent Product Selector Filter */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <span className="text-[11px] font-bold text-[#A1A1AA] flex items-center gap-1">
              <ShoppingBag size={13} className="text-[#8B5CF6]" />
              <span>Parent Product:</span>
            </span>
            <select
              value={productFilter}
              onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
              className="bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Catalog Products ({productsList.length})</option>
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Stock & Availability Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 bg-[#09090B] p-1 rounded-xl border border-[#27272A]">
              {[
                { id: "ALL", label: "All Stock" },
                { id: "IN_STOCK", label: "In Stock" },
                { id: "OUT_OF_STOCK", label: "Out of Stock" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => { setStockFilter(pill.id); setPage(1); }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    stockFilter === pill.id
                      ? "bg-[#8B5CF6] text-white shadow"
                      : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 bg-[#09090B] p-1 rounded-xl border border-[#27272A]">
              {[
                { id: "ALL", label: "All Status" },
                { id: "AVAILABLE", label: "Available" },
                { id: "UNAVAILABLE", label: "Hidden" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => { setAvailabilityFilter(pill.id); setPage(1); }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    availabilityFilter === pill.id
                      ? "bg-purple-950/60 text-purple-300 border border-purple-500/40"
                      : "text-[#71717A] hover:text-[#FAFAFA]"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search variants by SKU, Variant Name, or Parent Product..."
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

      {/* ─── Main Variants Table ─── */}
      <div className="rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Variant SKU & Item</th>
                <th className="py-3.5 px-4">Parent Product</th>
                <th className="py-3.5 px-4">Attributes & Options</th>
                <th className="py-3.5 px-4 text-right">Price (INR)</th>
                <th className="py-3.5 px-4 text-center">Stock Level</th>
                <th className="py-3.5 px-4 text-center">Availability</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {variantsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-[#71717A]">
                    <Sliders size={36} className="mx-auto mb-3 text-[#3F3F46]" />
                    <p className="font-bold text-sm text-[#FAFAFA]">No Product Variants Found</p>
                    <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm mx-auto">
                      {searchQuery || productFilter !== "ALL" || stockFilter !== "ALL"
                        ? "No variants matched your current search filters. Try clearing filters or creating a new variant."
                        : "Your catalog currently has no custom product variants defined. Click 'Create Variant SKU' to start."}
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow"
                    >
                      <Plus size={14} />
                      <span>Create First Variant</span>
                    </button>
                  </td>
                </tr>
              ) : (
                variantsList.map((variant) => {
                  const hasStock = Number(variant.stock || 0) > 0;
                  const attrEntries = Object.entries(variant.attributes || {});

                  return (
                    <tr key={variant.id} className="hover:bg-[#27272A]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#09090B] border border-[#27272A] overflow-hidden flex items-center justify-center flex-shrink-0">
                            {variant.image ? (
                              <img src={variant.image} alt={variant.sku} className="w-full h-full object-cover" />
                            ) : variant.product?.thumbnail ? (
                              <img src={variant.product.thumbnail} alt={variant.sku} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={16} className="text-[#71717A]" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold font-mono text-[#FAFAFA] text-xs">
                              {variant.sku}
                            </p>
                            <p className="text-[11px] text-[#A1A1AA] line-clamp-1">
                              {variant.name || "Default Variant Option"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-xs text-[#FAFAFA] line-clamp-1">
                          {variant.product?.name || "Catalog Product"}
                        </p>
                        <p className="text-[10px] font-mono text-[#71717A]">
                          SKU: {variant.product?.sku || "N/A"}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {attrEntries.length === 0 ? (
                            <span className="text-[10px] text-[#71717A]">No custom attributes</span>
                          ) : (
                            attrEntries.map(([k, v]) => (
                              <span
                                key={k}
                                className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#27272A] border border-[#3F3F46] text-purple-300 font-mono"
                              >
                                {k}: {String(v)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <p className="font-mono font-bold text-xs text-[#FAFAFA]">
                          ₹{Number(variant.price).toLocaleString()}
                        </p>
                        {variant.salePrice !== null && variant.salePrice !== undefined && Number(variant.salePrice) > 0 && (
                          <p className="text-[10px] font-mono text-emerald-400">
                            Sale: ₹{Number(variant.salePrice).toLocaleString()}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono ${
                            hasStock
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                              : "bg-rose-950/80 text-rose-400 border border-rose-500/40"
                          }`}
                        >
                          {variant.stock} Units
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            variant.isAvailable
                              ? "bg-purple-950/60 text-[#A855F7] border border-purple-500/30"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {variant.isAvailable ? "Active" : "Hidden"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingVariant(variant)}
                            className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-lg transition-colors"
                            title="Inspect Details"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(variant)}
                            className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-amber-400 rounded-lg transition-colors"
                            title="Edit Variant"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingVariant(variant)}
                            className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 rounded-lg transition-colors"
                            title="Delete Variant Permanently"
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

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="p-3.5 bg-[#09090B] border-t border-[#27272A] flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>
              Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total variants)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-40 rounded-lg border border-[#27272A] text-[#FAFAFA] font-bold flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-40 rounded-lg border border-[#27272A] text-[#FAFAFA] font-bold flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: CREATE VARIANT MODAL ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <Sliders size={16} className="text-[#8B5CF6]" />
                <span>Create New Product Variant</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateVariant} className="space-y-3.5 overflow-y-auto pr-1 text-xs flex-1">
              {/* Parent Product Selector */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Select Parent Product *</label>
                <select
                  required
                  value={createProductId}
                  onChange={(e) => {
                    setCreateProductId(e.target.value);
                    setCreateSku(handleAutoGenerateSku(e.target.value, createAttributes));
                  }}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — [Base SKU: {p.sku}]
                    </option>
                  ))}
                </select>
                {validationErrors.productId && (
                  <p className="text-[10px] text-rose-400 font-bold">{validationErrors.productId}</p>
                )}
              </div>

              {/* SKU & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold flex items-center justify-between">
                    <span>Variant SKU *</span>
                    <button
                      type="button"
                      onClick={() => setCreateSku(handleAutoGenerateSku(createProductId, createAttributes))}
                      className="text-[9px] text-[#8B5CF6] hover:underline font-bold"
                    >
                      Generate
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={createSku}
                    onChange={(e) => setCreateSku(e.target.value)}
                    placeholder="e.g. SS-HINGE-100-BLK"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {validationErrors.sku && (
                    <p className="text-[10px] text-rose-400 font-bold">{validationErrors.sku}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Variant Name (Optional)</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. 100mm Matte Black Stainless"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* Price, Sale Price, Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Base Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={createPrice}
                    onChange={(e) => setCreatePrice(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {validationErrors.price && (
                    <p className="text-[10px] text-rose-400 font-bold">{validationErrors.price}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Sale Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createSalePrice}
                    onChange={(e) => setCreateSalePrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Inventory Stock *</label>
                  <input
                    type="number"
                    required
                    value={createStock}
                    onChange={(e) => setCreateStock(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* Dynamic Attributes Key-Value Builder */}
              <div className="space-y-2 pt-2 border-t border-[#27272A]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase text-[#A855F7] tracking-wider">
                    Variant Attributes & Specifications
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateAttributes([...createAttributes, { key: "", value: "" }])}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Add Attribute</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto p-2 bg-[#09090B] rounded-xl border border-[#27272A]">
                  {createAttributes.map((attr, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Attribute (e.g. Size, Color)"
                        value={attr.key}
                        onChange={(e) => {
                          const next = [...createAttributes];
                          next[idx].key = e.target.value;
                          setCreateAttributes(next);
                        }}
                        className="w-1/2 bg-[#18181B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 150mm, Chrome)"
                        value={attr.value}
                        onChange={(e) => {
                          const next = [...createAttributes];
                          next[idx].value = e.target.value;
                          setCreateAttributes(next);
                        }}
                        className="w-1/2 bg-[#18181B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                      />
                      {createAttributes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCreateAttributes(createAttributes.filter((_, i) => i !== idx))}
                          className="p-1.5 text-rose-400 hover:text-rose-300"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Image & Availability */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Image URL</label>
                  <input
                    type="text"
                    value={createImage}
                    onChange={(e) => setCreateImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Catalog Visibility</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateIsAvailable(true)}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all text-xs ${
                        createIsAvailable ? "bg-[#8B5CF6] text-white" : "bg-[#09090B] text-[#71717A] border border-[#27272A]"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateIsAvailable(false)}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all text-xs ${
                        !createIsAvailable ? "bg-[#8B5CF6] text-white" : "bg-[#09090B] text-[#71717A] border border-[#27272A]"
                      }`}
                    >
                      Hidden
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl font-bold shadow"
                >
                  {isSubmitting ? "Persisting..." : "Create Variant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT VARIANT MODAL ─── */}
      {editingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <Edit2 size={16} className="text-amber-400" />
                <span>Edit Variant SKU: {editingVariant.sku}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingVariant(null)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 overflow-y-auto pr-1 text-xs flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {validationErrors.sku && (
                    <p className="text-[10px] text-rose-400 font-bold">{validationErrors.sku}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Variant Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Base Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Sale Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSalePrice}
                    onChange={(e) => setEditSalePrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Inventory Stock *</label>
                  <input
                    type="number"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* Dynamic Attributes */}
              <div className="space-y-2 pt-2 border-t border-[#27272A]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase text-[#A855F7] tracking-wider">
                    Attributes Configuration
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditAttributes([...editAttributes, { key: "", value: "" }])}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Add Field</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto p-2 bg-[#09090B] rounded-xl border border-[#27272A]">
                  {editAttributes.map((attr, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Attribute Key"
                        value={attr.key}
                        onChange={(e) => {
                          const next = [...editAttributes];
                          next[idx].key = e.target.value;
                          setEditAttributes(next);
                        }}
                        className="w-1/2 bg-[#18181B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                      />
                      <input
                        type="text"
                        placeholder="Attribute Value"
                        value={attr.value}
                        onChange={(e) => {
                          const next = [...editAttributes];
                          next[idx].value = e.target.value;
                          setEditAttributes(next);
                        }}
                        className="w-1/2 bg-[#18181B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                      />
                      <button
                        type="button"
                        onClick={() => setEditAttributes(editAttributes.filter((_, i) => i !== idx))}
                        className="p-1.5 text-rose-400 hover:text-rose-300"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image & Visibility */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Image URL</label>
                  <input
                    type="text"
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Visibility</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditIsAvailable(true)}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all text-xs ${
                        editIsAvailable ? "bg-[#8B5CF6] text-white" : "bg-[#09090B] text-[#71717A] border border-[#27272A]"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsAvailable(false)}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all text-xs ${
                        !editIsAvailable ? "bg-[#8B5CF6] text-white" : "bg-[#09090B] text-[#71717A] border border-[#27272A]"
                      }`}
                    >
                      Hidden
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEditingVariant(null)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl font-bold shadow"
                >
                  {isSubmitting ? "Saving..." : "Save Variant Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DELETE VARIANT MODAL ─── */}
      {deletingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-sm text-[#FAFAFA]">Delete Variant SKU Permanently?</h3>
            <p className="text-xs text-[#A1A1AA]">
              Are you sure you want to delete SKU <strong>"{deletingVariant.sku}"</strong> ({deletingVariant.name || "Variant"}) from the database? This cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingVariant(null)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs text-[#FAFAFA] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow"
              >
                {isSubmitting ? "Deleting..." : "Yes, Delete Variant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DRAWER: INSPECT VARIANT ─── */}
      {viewingVariant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border-l border-[#27272A] w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">
                    SKU Details
                  </span>
                  <h2 className="text-lg font-bold font-mono text-[#FAFAFA]">
                    {viewingVariant.sku}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingVariant(null)}
                  className="p-1.5 rounded-lg bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Variant Name</span>
                  <p className="font-bold text-[#FAFAFA]">{viewingVariant.name || "Default Option"}</p>
                </div>

                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Parent Catalog Product</span>
                  <p className="font-bold text-[#FAFAFA]">{viewingVariant.product?.name || "Product"}</p>
                  <p className="font-mono text-[10px] text-[#71717A]">Base SKU: {viewingVariant.product?.sku || "N/A"}</p>
                </div>

                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Pricing & Stock</span>
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-bold text-cyan-400">Price: ₹{Number(viewingVariant.price).toLocaleString()}</p>
                    <p className="font-mono font-bold text-emerald-400">Stock: {viewingVariant.stock} Units</p>
                  </div>
                </div>

                <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-2">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Attributes JSON</span>
                  <pre className="p-2 bg-[#18181B] rounded-lg text-[10px] font-mono text-purple-300 overflow-x-auto">
                    {JSON.stringify(viewingVariant.attributes || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="border-t border-[#27272A] pt-4 mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const target = viewingVariant;
                  setViewingVariant(null);
                  handleOpenEdit(target);
                }}
                className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow"
              >
                Edit Variant
              </button>
              <button
                type="button"
                onClick={() => setViewingVariant(null)}
                className="w-full py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs text-[#FAFAFA] font-bold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
