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
  FolderTree,
  Save,
  Hash,
  ToggleLeft,
  ToggleRight,
  Tag,
  Link,
  LayoutList,
  Calendar,
  Package,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { fetchAdminApi } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface Category {
  id: string | number;
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  position?: number;
  status: "ACTIVE" | "INACTIVE" | "active" | "inactive";
  productsCount?: number;
  image?: string;
  parentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  categories?: T;
  message?: string;
  error?: any;
  total?: number;
  page?: number;
  limit?: number;
}

type SortField = "name" | "displayOrder" | "status" | "id";
type SortDir = "asc" | "desc";
type FilterStatus = "ALL" | "ACTIVE" | "INACTIVE";

const PAGE_SIZE = 5;
const BASE_API = "https://prc-backend-6sw7.onrender.com/api/v1";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function normalizeStatus(status: string): "ACTIVE" | "INACTIVE" {
  return status?.toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE";
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}



/* ------------------------------------------------------------------ */
/*  Delete Confirm Modal                                                */
/* ------------------------------------------------------------------ */
interface DeleteModalProps {
  category: Category;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteModal({ category, onClose, onDeleted }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetchAdminApi(`/categories/${category.id}`, { method: "DELETE" });
      if (res?.success === false) {
        setError(res.message || "Failed to delete category.");
      } else {
        // Immediately remove from localStorage cache
        try {
          const cachedRaw = localStorage.getItem("prc_admin_categories_list");
          if (cachedRaw) {
            const list = JSON.parse(cachedRaw);
            const filteredList = list.filter((c: any) => String(c.id) !== String(category.id));
            localStorage.setItem("prc_admin_categories_list", JSON.stringify(filteredList));
          }
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA]">Delete Category</h3>
              <p className="text-xs text-slate-500 dark:text-[#71717A] mt-0.5">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-sm text-slate-700 dark:text-[#A1A1AA]">
            Are you sure you want to delete{" "}
            <span className="font-bold text-slate-900 dark:text-[#FAFAFA]">"{category.name}"</span>?
            All associated data may be affected.
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
/*  View Detail Drawer — Full Redesign                                  */
/* ------------------------------------------------------------------ */
interface ViewDrawerProps {
  category: Category;
  onClose: () => void;
  onEdit: () => void;
}

function ViewDrawer({ category, onClose, onEdit }: ViewDrawerProps) {
  const [copied, setCopied] = useState(false);
  const st = normalizeStatus(category.status);

  const copySlug = () => {
    navigator.clipboard.writeText(`/${category.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const details = [
    { icon: <Hash size={14} />, label: "Category ID", value: String(category.id), mono: true },
    { icon: <Hash size={14} />, label: "Display Order", value: String(category.displayOrder ?? category.position ?? "—"), mono: false },
    { icon: <Package size={14} />, label: "Products Linked", value: category.productsCount !== undefined ? `${category.productsCount} products` : "—", mono: false },
    { icon: <ShieldCheck size={14} />, label: "Parent Category", value: category.parentId ? String(category.parentId) : "Root Level", mono: false },
    { icon: <Calendar size={14} />, label: "Created At", value: category.createdAt ? new Date(category.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—", mono: false },
    { icon: <Calendar size={14} />, label: "Last Updated", value: category.updatedAt ? new Date(category.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—", mono: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Drawer Panel */}
      <div
        className="relative h-full w-full max-w-md bg-white dark:bg-[#18181B] border-l border-slate-200 dark:border-[#27272A] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideInRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#27272A] bg-gradient-to-r from-[#8B5CF6]/5 to-white dark:from-[#8B5CF6]/10 dark:to-[#18181B] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/20 border border-[#8B5CF6]/20 flex items-center justify-center">
              <Eye size={16} className="text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-[#FAFAFA]">Category Details</h2>
              <p className="text-[11px] text-slate-400 dark:text-[#71717A]">View full category information</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Hero Banner */}
          <div className="px-5 pt-5">
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-lg">
                  {category.name?.[0]?.toUpperCase() || "C"}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold leading-tight truncate">{category.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button onClick={copySlug}
                      className="flex items-center gap-1 text-[11px] font-mono text-white/80 hover:text-white transition-colors">
                      <span>/{category.slug}</span>
                      {copied ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} className="opacity-60 hover:opacity-100" />}
                    </button>
                  </div>
                </div>
              </div>
              {/* Status + Visibility badges */}
              <div className="relative z-10 flex items-center gap-2 mt-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  st === "ACTIVE"
                    ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/30"
                    : "bg-rose-400/20 text-rose-200 border-rose-400/30"
                }`}>
                  {st === "ACTIVE" ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {st}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-white/10 text-white/80 border-white/20">
                  {(category as any)?.isVisible !== false ? "👁 Visible" : "🚫 Hidden"}
                </span>
              </div>
            </div>
          </div>

          {/* Detail List */}
          <div className="px-5 py-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#52525B] mb-3">Category Information</p>
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

          {/* Description */}
          {category.description && (
            <div className="px-5 pb-4 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A]">Description</span>
              <p className="text-xs text-slate-700 dark:text-[#A1A1AA] leading-relaxed bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl p-3">
                {category.description}
              </p>
            </div>
          )}

          {/* Slug URL block */}
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A]">
              <Link size={13} className="text-[#8B5CF6] flex-shrink-0" />
              <span className="text-[11px] font-mono text-[#8B5CF6] dark:text-[#A855F7] flex-1 truncate">/{category.slug}</span>
              <button onClick={copySlug}
                className="flex-shrink-0 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#27272A] text-slate-400 hover:text-[#8B5CF6] transition-colors">
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
              <a href={`/categories/${category.slug}`} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#27272A] text-slate-400 hover:text-[#8B5CF6] transition-colors">
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-[#27272A] bg-slate-50 dark:bg-[#09090B] flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:bg-slate-200 dark:hover:bg-[#27272A] transition-colors">
            Close
          </button>
          <button type="button" onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all">
            <Pencil size={14} />
            Edit Category
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

const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Door Hardware", slug: "door-hardware", description: "Premium architectural door handles, locks, and hinges", displayOrder: 1, status: "ACTIVE" },
  { id: "2", name: "Glass Fittings", slug: "glass-fittings", description: "Stainless steel patch fittings, connectors and spider fittings", displayOrder: 2, status: "ACTIVE" },
  { id: "3", name: "Cubicle Hardware", slug: "cubicle-hardware", description: "Commercial restroom toilet cubicle partitions and accessories", displayOrder: 3, status: "ACTIVE" },
  { id: "4", name: "Locker Hardware", slug: "locker-hardware", description: "Digital electronic and mechanical smart locker locks", displayOrder: 4, status: "ACTIVE" },
  { id: "5", name: "Shower Fittings", slug: "shower-fittings", description: "Frameless shower door hinges, seals, and support bars", displayOrder: 5, status: "ACTIVE" },
];

/* ------------------------------------------------------------------ */
/*  Main CategoriesPage                                                 */
/* ------------------------------------------------------------------ */
export function CategoriesPage() {
  const { setCurrentView } = useAdminAuth();

  // Instant hydration from localStorage cache or fallback
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem("prc_admin_categories_list");
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters, Sort, Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [sortField, setSortField] = useState<SortField>("displayOrder");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Modal states
  const [deleteModal, setDeleteModal] = useState<Category | null>(null);
  const [viewDrawer, setViewDrawer] = useState<Category | null>(null);

  /* ---- Fetch Categories with Background Refresh ---- */
  const fetchCategories = useCallback(async () => {
    // Only show full loading spinner if we don't have any cached categories
    if (categories.length === 0) {
      setLoading(true);
    }
    setIsSyncing(true);
    setError(null);
    try {
      const res = await fetchAdminApi<any>(`/categories?t=${Date.now()}`);
      const resAny = res as any;
      if (resAny?.success !== false) {
        // Handle various API response shapes
        const raw = resAny?.data || resAny?.categories || resAny;
        let list: Category[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.categories)
          ? raw.categories
          : [];

        // Map server item fields safely and fallback description from item.desc, item.seo, or local cache
        const existingMap = new Map(categories.map((c) => [String(c.id), c]));
        list = list.map((item: any) => {
          const cached = existingMap.get(String(item.id));
          return {
            ...item,
            description: item.description || item.desc || item.seo?.metaDescription || cached?.description || "",
            displayOrder: item.displayOrder ?? item.position ?? 1,
            position: item.position ?? item.displayOrder ?? 1,
            status: item.status || "ACTIVE",
            isVisible: item.isVisible ?? item.visible ?? true,
          };
        });

        // Retain locally created categories if backend list has not indexed them yet
        try {
          const cachedRaw = localStorage.getItem("prc_admin_categories_list");
          if (cachedRaw) {
            const cachedList: Category[] = JSON.parse(cachedRaw);
            for (const cachedItem of cachedList) {
              if (cachedItem && cachedItem.id) {
                const existsInServer = list.some((c) => String(c.id) === String(cachedItem.id));
                if (!existsInServer) {
                  list.unshift(cachedItem); // Retain new category at top of list
                }
              }
            }
          }
        } catch {}

        // Check if we have a freshly updated category saved in localStorage to merge
        try {
          const recentlyEditedRaw = localStorage.getItem("prc_admin_edit_category");
          if (recentlyEditedRaw) {
            const editedItem = JSON.parse(recentlyEditedRaw);
            if (editedItem && editedItem.id) {
              const idx = list.findIndex((c) => String(c.id) === String(editedItem.id));
              if (idx !== -1) {
                list[idx] = { ...list[idx], ...editedItem };
              }
            }
          }
        } catch {}

        setCategories(list);
        try {
          localStorage.setItem("prc_admin_categories_list", JSON.stringify(list));
        } catch {}
      } else if (categories.length === 0) {
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch (err: any) {
      if (categories.length === 0) {
        setCategories(DEFAULT_CATEGORIES);
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [categories.length]);

  useEffect(() => {
    fetchCategories();
  }, []);

  /* ---- Derived: filter + sort + paginate ---- */
  const filtered = categories
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        String(c.id).toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "ALL" || normalizeStatus(c.status) === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let av: any, bv: any;
      if (sortField === "name") { av = a.name?.toLowerCase(); bv = b.name?.toLowerCase(); }
      else if (sortField === "displayOrder") { av = a.displayOrder ?? a.position ?? 999; bv = b.displayOrder ?? b.position ?? 999; }
      else if (sortField === "status") { av = normalizeStatus(a.status); bv = normalizeStatus(b.status); }
      else { av = String(a.id); bv = String(b.id); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown
      size={12}
      className={`ml-1 inline-block transition-colors ${
        sortField === field ? "text-[#8B5CF6]" : "text-slate-300 dark:text-[#52525B]"
      }`}
    />
  );

  /* ---- Render ---- */
  return (
    <>
      <div className="space-y-5">
        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Categories
            </h3>
            <nav className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-[#71717A]">
              <Home size={11} className="text-slate-400 dark:text-[#52525B]" />
              <BreadArrow size={11} className="text-slate-300 dark:text-[#52525B]" />
              <span className="text-[#8B5CF6] font-semibold">Categories</span>
            </nav>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView("categories-create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-lg shadow-[#8B5CF6]/25 transition-all self-start sm:self-auto flex-shrink-0"
          >
            <Plus size={15} />
            Create Category
          </button>
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          {/* Left: "All Categories" label */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <FolderTree size={15} className="text-[#8B5CF6]" />
            <span className="text-xs font-bold text-slate-700 dark:text-[#FAFAFA] uppercase tracking-wider">
              All Categories
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/20 text-[#8B5CF6] dark:text-[#A855F7] border border-[#8B5CF6]/20">
              {filtered.length}
            </span>
          </div>

          {/* Center: Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#52525B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by category name, ID or slug..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 dark:placeholder-[#52525B] focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/20 transition-colors"
            />
          </div>

          {/* Right: Filter + Sort + Refresh */}
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
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-colors"
            >
              <ArrowUpDown size={13} />
              Sort
            </button>
            <button
              type="button"
              onClick={fetchCategories}
              className="p-2 rounded-lg text-xs border bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Filter Options (expandable) ───────────────────────────── */}
        {showFilters && (
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl px-4 py-3 flex flex-wrap items-center gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">Status:</span>
              {(["ALL", "ACTIVE", "INACTIVE"] as FilterStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    statusFilter === s
                      ? "bg-[#8B5CF6] text-white border-[#8B5CF6]"
                      : "bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
                  }`}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">Sort By:</span>
              {([
                { value: "displayOrder", label: "Order" },
                { value: "name", label: "Name" },
                { value: "status", label: "Status" },
                { value: "id", label: "ID" },
              ] as { value: SortField; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSort(opt.value)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    sortField === opt.value
                      ? "bg-[#8B5CF6] text-white border-[#8B5CF6]"
                      : "bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
                  }`}
                >
                  {opt.label} {sortField === opt.value ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Table ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-[#8B5CF6] transition-colors whitespace-nowrap"
                    onClick={() => handleSort("id")}
                  >
                    ID <SortIcon field="id" />
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-[#8B5CF6] transition-colors whitespace-nowrap"
                    onClick={() => handleSort("name")}
                  >
                    Name <SortIcon field="name" />
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Slug</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Description</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-[#8B5CF6] transition-colors whitespace-nowrap"
                    onClick={() => handleSort("displayOrder")}
                  >
                    Display Order <SortIcon field="displayOrder" />
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-[#8B5CF6] transition-colors whitespace-nowrap"
                    onClick={() => handleSort("status")}
                  >
                    Status <SortIcon field="status" />
                  </th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={28} className="animate-spin text-[#8B5CF6]" />
                        <span className="text-slate-500 dark:text-[#71717A] text-xs font-medium">Loading categories from API...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                          <AlertTriangle size={18} className="text-rose-500" />
                        </div>
                        <div>
                          <p className="text-slate-700 dark:text-[#FAFAFA] text-xs font-semibold">{error}</p>
                          <button
                            onClick={fetchCategories}
                            className="mt-2 text-[11px] text-[#8B5CF6] hover:underline font-semibold"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#27272A] flex items-center justify-center">
                          <FolderTree size={18} className="text-slate-400 dark:text-[#52525B]" />
                        </div>
                        <p className="text-slate-500 dark:text-[#71717A] text-xs font-medium">
                          {search ? "No categories match your search." : "No categories found. Create one to get started."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((cat) => {
                    const st = normalizeStatus(cat.status);
                    return (
                      <tr
                        key={cat.id}
                        className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors group"
                      >
                        {/* ID */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] text-[#8B5CF6] dark:text-[#A855F7] font-bold">
                            #{String(cat.id).slice(0, 8)}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 flex items-center justify-center text-[#8B5CF6] font-black text-[11px] flex-shrink-0">
                              {cat.name?.[0]?.toUpperCase() || "C"}
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-[#FAFAFA] text-xs leading-tight">
                              {cat.name}
                            </span>
                          </div>
                        </td>

                        {/* Slug */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] text-slate-500 dark:text-[#A1A1AA] bg-slate-100 dark:bg-[#09090B] px-2 py-0.5 rounded-md">
                            /{cat.slug}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 max-w-[180px]">
                          <p className="text-slate-500 dark:text-[#71717A] text-[11px] truncate">
                            {cat.description || <span className="italic opacity-50">No description</span>}
                          </p>
                        </td>

                        {/* Display Order */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black bg-slate-100 dark:bg-[#09090B] text-slate-700 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A]">
                            {cat.displayOrder ?? cat.position ?? "—"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              st === "ACTIVE"
                                ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                                : "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                            }`}
                          >
                            {st === "ACTIVE" ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {st}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setViewDrawer(cat)}
                              title="View Details"
                              className="p-1.5 rounded-lg text-slate-400 dark:text-[#71717A] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.setItem("prc_admin_edit_category", JSON.stringify(cat));
                                setCurrentView("categories-edit");
                              }}
                              title="Edit Category"
                              className="p-1.5 rounded-lg text-slate-400 dark:text-[#71717A] hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteModal(cat)}
                              title="Delete Category"
                              className="p-1.5 rounded-lg text-slate-400 dark:text-[#71717A] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
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

          {/* ── Table Footer: Pagination ─────────────────────────── */}
          {!loading && !error && filtered.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-[#09090B] border-t border-slate-200 dark:border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Left: Records info */}
              <p className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">
                Showing{" "}
                <span className="font-bold text-slate-700 dark:text-[#A1A1AA]">
                  {(page - 1) * PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-700 dark:text-[#A1A1AA]">
                  {Math.min(page * PAGE_SIZE, filtered.length)}
                </span>{" "}
                out of{" "}
                <span className="font-bold text-slate-700 dark:text-[#A1A1AA]">
                  {filtered.length}
                </span>{" "}
                results
              </p>

              {/* Right: Pagination controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-white dark:bg-[#18181B] border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={13} />
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold border transition-colors ${
                      pg === page
                        ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-md shadow-[#8B5CF6]/25"
                        : "bg-white dark:bg-[#18181B] border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-white dark:bg-[#18181B] border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals & Drawers ─────────────────────────────────────── */}


      {viewDrawer && (
        <ViewDrawer
          category={viewDrawer}
          onClose={() => setViewDrawer(null)}
          onEdit={() => {
            const cat = viewDrawer;
            localStorage.setItem("prc_admin_edit_category", JSON.stringify(cat));
            setViewDrawer(null);
            setCurrentView("categories-edit");
          }}
        />
      )}
    </>
  );
}
