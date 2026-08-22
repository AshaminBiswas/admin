import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronRight as BreadArrow,
  X,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Package,
  Hash,
  Copy,
  Check,
  Tag,
  Link,
  ExternalLink,
  IndianRupee,
  Factory
} from "lucide-react";
import { fetchAdminApi } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import { ProductItem, Category } from "../types/admin";
import { syncProductUpdate } from "../utils/productSync";
import { useDebounce } from "../hooks/useDebounce";
import { getCachedCategories } from "../utils/referenceDataCache";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function normalizeStatus(status: string): "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK" {
  const s = status?.toUpperCase();
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "OUT_OF_STOCK") return "OUT_OF_STOCK";
  return "INACTIVE";
}

const PAGE_SIZE = 5;

/* ------------------------------------------------------------------ */
/*  Delete Confirm Modal                                                */
/* ------------------------------------------------------------------ */
interface DeleteModalProps {
  product: ProductItem;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteModal({ product, onClose, onDeleted }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetchAdminApi(`/products/${product.id}`, { method: "DELETE" });
      if (res?.success === false) {
        setError(res.message || "Failed to delete product.");
      } else {
        try {
          syncProductUpdate(product, "DELETE");
        } catch {}
        onDeleted();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} className="text-rose-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA]">Delete Product</h3>
              <p className="text-xs text-slate-500 dark:text-[#71717A] mt-0.5">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-sm text-slate-700 dark:text-[#A1A1AA]">
            Are you sure you want to delete{" "}
            <span className="font-bold text-slate-900 dark:text-[#FAFAFA]">"{product.name}"</span>?
          </p>
          {error && (
            <div className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60 transition-all"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  View Detail Drawer                                                  */
/* ------------------------------------------------------------------ */
interface ViewDrawerProps {
  product: ProductItem;
  categories: Category[];
  onClose: () => void;
  onEdit: () => void;
}

function ViewDrawer({ product: viewProduct, categories, onClose, onEdit }: ViewDrawerProps) {
  const [copied, setCopied] = useState(false);
  const st = normalizeStatus(viewProduct.status);

  const catName = categories.find((c) => String(c.id) === String(viewProduct.categoryId))?.name || viewProduct.categoryId || "Unknown Category";

  const details = [
    { icon: <Hash size={14} />, label: "Product ID", value: String(viewProduct.id), mono: true },
    { icon: <Tag size={14} />, label: "SKU", value: viewProduct.sku || "—", mono: true },
    { icon: <IndianRupee size={14} />, label: "Price", value: `₹${viewProduct.price?.toLocaleString('en-IN')}`, mono: true },
    { icon: <IndianRupee size={14} />, label: "Sale Price", value: (viewProduct.salesPrice || viewProduct.salePrice) ? `₹${(viewProduct.salesPrice || viewProduct.salePrice)?.toLocaleString('en-IN')}` : "—", mono: true },
    { icon: <Package size={14} />, label: "Stock Level", value: `${viewProduct.stock} units`, mono: false },
    { icon: <AlertTriangle size={14} />, label: "Reorder Level", value: viewProduct.reorderLevel ? `${viewProduct.reorderLevel} units` : "—", mono: false },
    { icon: <Tag size={14} />, label: "Category", value: catName, mono: false },
    { icon: <Factory size={14} />, label: "Manufacturer", value: viewProduct.manufacturerInfo?.manufacturerName || "—", mono: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative h-full w-full max-w-md bg-white dark:bg-[#18181B] border-l border-slate-200 dark:border-[#27272A] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideInRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#27272A] bg-gradient-to-r from-[#8B5CF6]/5 to-white dark:from-[#8B5CF6]/10 dark:to-[#18181B] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/20 border border-[#8B5CF6]/20 flex items-center justify-center">
              <Eye size={16} className="text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-[#FAFAFA]">Product Details</h2>
              <p className="text-[11px] text-slate-400 dark:text-[#71717A]">View full product information</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-5">
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white overflow-hidden">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] flex flex-col items-center justify-center overflow-hidden flex-shrink-0">
                  {viewProduct.thumbnail || viewProduct.image ? (
                    <img src={viewProduct.thumbnail || viewProduct.image} alt={viewProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={40} className="text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold leading-tight line-clamp-2">{viewProduct.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[11px] font-mono text-white/90 bg-black/20 px-2 py-0.5 rounded-md">
                      {viewProduct.sku}
                    </span>
                  </div>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-2 mt-4 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  st === "ACTIVE"
                    ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/30"
                    : st === "OUT_OF_STOCK"
                    ? "bg-amber-400/20 text-amber-200 border-amber-400/30"
                    : "bg-rose-400/20 text-rose-200 border-rose-400/30"
                }`}>
                  {st === "ACTIVE" ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                  {st}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-white/10 text-white/80 border-white/20">
                  {viewProduct.isVisible !== false ? "👁 Visible" : "🚫 Hidden"}
                </span>
                {viewProduct.isFeatured && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-fuchsia-400/20 text-fuchsia-200 border-fuchsia-400/30">
                    ★ Featured
                  </span>
                )}
                {viewProduct.isInOffer && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-rose-400/20 text-rose-200 border-rose-400/30">
                    🎁 Offer
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#52525B] mb-3">Product Information</p>
            {details.map(({ icon, label, value, mono }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-[#27272A] last:border-0">
                <div className="flex items-center gap-2 text-slate-400 dark:text-[#71717A]">
                  <span className="text-[#8B5CF6]/70">{icon}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
                </div>
                <span className={`text-xs font-bold text-right max-w-[55%] truncate ${
                  mono ? "font-mono text-[#8B5CF6] dark:text-[#A855F7]" : "text-slate-800 dark:text-[#FAFAFA]"
                }`}>{value}</span>
              </div>
            ))}
          </div>

          {viewProduct.description && (
            <div className="px-5 pb-4 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A]">Description</span>
              <p className="text-xs text-slate-700 dark:text-[#A1A1AA] leading-relaxed bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl p-3">
                {viewProduct.description}
              </p>
            </div>
          )}

          {viewProduct.tags && viewProduct.tags.length > 0 && (
             <div className="px-5 pb-4 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A]">Tags</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {viewProduct.tags.map(tag => (
                   <span key={tag} className="px-2.5 py-1 text-[10px] font-semibold bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-md border border-[#8B5CF6]/20">
                     {tag}
                   </span>
                ))}
              </div>
             </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-[#27272A] bg-slate-50 dark:bg-[#09090B] flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:bg-slate-200 dark:hover:bg-[#27272A] transition-colors">
            Close
          </button>
          <button type="button" onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all">
            <Pencil size={14} />
            Edit Product
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ProductsPage                                                   */
/* ------------------------------------------------------------------ */
export function ProductsPage() {
  const { setCurrentView } = useAdminAuth();

  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const saved = localStorage.getItem("prc_admin_products_list");
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed;
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem("prc_admin_categories_list");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters, Sort, Search
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<"name" | "price" | "stock" | "id">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, categoryFilter]);

  // Modals
  const [deleteModal, setDeleteModal] = useState<ProductItem | null>(null);
  const [viewDrawer, setViewDrawer] = useState<ProductItem | null>(null);

  const fetchData = useCallback(async () => {
    if (products.length === 0) setLoading(true);
    setIsSyncing(true);
    setError(null);
    try {
      // 1. Fetch Categories from session cache
      const cList = await getCachedCategories();
      if (cList.length > 0) {
        setCategories(cList);
      }

      // 2. Fetch Products
      const res = await fetchAdminApi<any>(`/products?limit=100`);

      if (res?.success !== false) {
        const raw = res?.data || res?.products || res;
        let list: ProductItem[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.products) ? raw.products : [];
        
        // Merge and preserve all edited and created products from cache
        try {
          const cachedRaw = localStorage.getItem("prc_admin_products_list") || localStorage.getItem("prc_shared_products_list");
          if (cachedRaw) {
            const cachedList: ProductItem[] = JSON.parse(cachedRaw);
            for (const cachedItem of cachedList) {
              if (cachedItem && (cachedItem.id || (cachedItem as any).apiId || cachedItem.sku)) {
                const idx = list.findIndex((p) => 
                  String(p.id) === String(cachedItem.id) || 
                  (p.sku && cachedItem.sku && String(p.sku).toLowerCase() === String(cachedItem.sku).toLowerCase()) ||
                  (p.id && (cachedItem as any).apiId && String(p.id) === String((cachedItem as any).apiId))
                );
                if (idx !== -1) {
                  list[idx] = { ...list[idx], ...cachedItem };
                } else {
                  list.unshift(cachedItem);
                }
              }
            }
          }
        } catch {}

        if (list.length > 0) {
          setProducts(list);
          try {
            localStorage.setItem("prc_admin_products_list", JSON.stringify(list));
            localStorage.setItem("prc_shared_products_list", JSON.stringify(list));
          } catch {}
        }
      } else if (products.length === 0) {
        setProducts([]);
      }
    } catch (err: any) {
      if (products.length === 0) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [products.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = React.useMemo(() => {
    return products
      .filter((p) => {
        const q = debouncedSearch.toLowerCase().trim();
        const matchSearch =
          !q ||
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          String(p.id).toLowerCase().includes(q);
        const matchStatus = statusFilter === "ALL" || normalizeStatus(p.status) === statusFilter;
        const matchCategory = categoryFilter === "ALL" || String(p.categoryId) === categoryFilter;
        return matchSearch && matchStatus && matchCategory;
      })
      .sort((a, b) => {
        let av: any, bv: any;
        if (sortField === "name") { av = a.name?.toLowerCase(); bv = b.name?.toLowerCase(); }
        else if (sortField === "price") { av = a.price ?? 0; bv = b.price ?? 0; }
        else if (sortField === "stock") { av = a.stock ?? 0; bv = b.stock ?? 0; }
        else { av = String(a.id); bv = String(b.id); }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [products, debouncedSearch, statusFilter, categoryFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = React.useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: string }) => (
    <ArrowUpDown
      size={12}
      className={`ml-1 inline-block transition-colors ${
        sortField === field ? "text-[#8B5CF6]" : "text-slate-300 dark:text-[#52525B]"
      }`}
    />
  );

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Products
            </h3>
            <nav className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-[#71717A]">
              <Home size={11} className="text-slate-400 dark:text-[#52525B]" />
              <BreadArrow size={11} className="text-slate-300 dark:text-[#52525B]" />
              <span className="text-[#8B5CF6] font-semibold">Products</span>
            </nav>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView("products-create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-lg shadow-[#8B5CF6]/25 transition-all self-start sm:self-auto flex-shrink-0"
          >
            <Plus size={15} />
            Create Product
          </button>
        </div>

        <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Package size={15} className="text-[#8B5CF6]" />
            <span className="text-xs font-bold text-slate-700 dark:text-[#FAFAFA] uppercase tracking-wider">
              All Products
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/20 text-[#8B5CF6] dark:text-[#A855F7] border border-[#8B5CF6]/20">
              {filtered.length}
            </span>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#52525B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by product name, SKU or ID..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 dark:placeholder-[#52525B] focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/20 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                showFilters
                  ? "bg-[#8B5CF6] text-white border-[#8B5CF6]"
                  : "bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
              }`}
            >
              <SlidersHorizontal size={13} />
              Filter
            </button>
            <button
              type="button"
              onClick={fetchData}
              className="p-2 rounded-lg text-xs border bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl px-4 py-3 flex flex-wrap items-center gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">Category:</span>
              <select
                 value={categoryFilter}
                 onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                 className="px-2 py-1.5 rounded-lg text-[11px] font-bold border bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] focus:border-[#8B5CF6] outline-none"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">Status:</span>
              {(["ALL", "ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s as any); setPage(1); }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    statusFilter === s
                      ? "bg-[#8B5CF6] text-white border-[#8B5CF6]"
                      : "bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
                  }`}
                >
                  {s === "ALL" ? "All" : s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 cursor-pointer select-none hover:text-[#8B5CF6]" onClick={() => handleSort("name")}>
                    Product <SortIcon field="name" />
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                  <th className="py-3.5 px-4 cursor-pointer select-none hover:text-[#8B5CF6]" onClick={() => handleSort("price")}>
                    Price <SortIcon field="price" />
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer select-none hover:text-[#8B5CF6]" onClick={() => handleSort("stock")}>
                    Stock <SortIcon field="stock" />
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={28} className="animate-spin text-[#8B5CF6]" />
                        <span className="text-slate-500 dark:text-[#71717A] text-xs font-medium">Loading products...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                          <AlertTriangle size={18} className="text-rose-500" />
                        </div>
                        <div>
                          <p className="text-slate-700 dark:text-[#FAFAFA] text-xs font-semibold">{error}</p>
                          <button onClick={fetchData} className="mt-2 text-[11px] text-[#8B5CF6] hover:underline font-semibold">
                            Try Again
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#27272A] flex items-center justify-center">
                          <Package size={18} className="text-slate-400 dark:text-[#52525B]" />
                        </div>
                        <p className="text-slate-500 dark:text-[#71717A] text-xs font-medium">
                          {search ? "No products match your search." : "No products found. Create one to get started."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((p) => {
                    const st = normalizeStatus(p.status);
                    const catName = categories.find(c => String(c.id) === String(p.categoryId))?.name || "Uncategorized";
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {p.image || p.images?.[0] ? (
                              <img src={p.image || p.images?.[0]} alt={p.name} className="w-9 h-9 object-cover rounded-lg border border-slate-200 dark:border-[#27272A]" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 flex items-center justify-center text-[#8B5CF6] font-black text-xs border border-[#8B5CF6]/20">
                                {p.name?.[0]?.toUpperCase() || "P"}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900 dark:text-[#FAFAFA] line-clamp-1">{p.name}</p>
                              <p className="text-[10px] font-mono text-[#8B5CF6] dark:text-[#A855F7]">{p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-[#A1A1AA] font-medium">{catName}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-[#FAFAFA]">₹{p.price?.toLocaleString('en-IN') || 0}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{p.stock} units</span>
                            {p.reorderLevel !== undefined && p.stock <= p.reorderLevel && (
                              <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20 flex items-center gap-1">
                                <AlertTriangle size={10} /> Low
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              st === "ACTIVE"
                                ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                                : st === "OUT_OF_STOCK"
                                ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                                : "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                            }`}
                          >
                            {st === "ACTIVE" ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                            {st.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewDrawer(p)} title="View Details" className="p-1.5 rounded-lg text-slate-400 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-colors">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => {
                                localStorage.setItem("prc_admin_edit_product", JSON.stringify(p));
                                setCurrentView("products-edit");
                              }}
                              title="Edit Product" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteModal(p)} title="Delete Product" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                              <Trash2 size={14} />
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

          {!loading && !error && filtered.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-[#09090B] border-t border-slate-200 dark:border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">
                Showing <span className="font-bold text-slate-700 dark:text-[#A1A1AA]">{(page - 1) * PAGE_SIZE + 1}</span> to <span className="font-bold text-slate-700 dark:text-[#A1A1AA]">{Math.min(page * PAGE_SIZE, filtered.length)}</span> out of <span className="font-bold text-slate-700 dark:text-[#A1A1AA]">{filtered.length}</span> results
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-white dark:bg-[#18181B] border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={13} /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button key={pg} onClick={() => setPage(pg)} className={`w-8 h-8 rounded-lg text-[11px] font-bold border transition-colors ${pg === page ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-md shadow-[#8B5CF6]/25" : "bg-white dark:bg-[#18181B] border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6]"}`}>
                    {pg}
                  </button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-white dark:bg-[#18181B] border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteModal && (
        <DeleteModal
          product={deleteModal}
          onClose={() => setDeleteModal(null)}
          onDeleted={() => {
            fetchData();
          }}
        />
      )}

      {viewDrawer && (
        <ViewDrawer
          product={viewDrawer}
          categories={categories}
          onClose={() => setViewDrawer(null)}
          onEdit={() => {
            localStorage.setItem("prc_admin_edit_product", JSON.stringify(viewDrawer));
            setViewDrawer(null);
            setCurrentView("products-edit");
          }}
        />
      )}
    </>
  );
}
