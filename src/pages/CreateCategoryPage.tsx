import React, { useState, useEffect } from "react";
import {
  Home,
  ChevronRight,
  ArrowLeft,
  FolderTree,
  RotateCcw,
  X,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Eye,
  EyeOff,
  Hash,
  FileText,
  Tag,
  LayoutList,
  Globe,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { fetchAdminApi } from "../api/adminApi";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface CreateCategoryForm {
  name: string;
  slug: string;
  description: string;
  position: number | "";
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  isVisible: boolean;
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
}

interface FieldError {
  name?: string;
  slug?: string;
  description?: string;
  position?: string;
  status?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const INITIAL_FORM: CreateCategoryForm = {
  name: "",
  slug: "",
  description: "",
  position: "",
  status: "ACTIVE",
  isVisible: true,
  seo: { metaTitle: "", metaDescription: "" },
};

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                       */
/* ------------------------------------------------------------------ */
function FieldRow({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
          {label}
        </label>
        {required && <span className="text-rose-500 text-xs leading-none">*</span>}
      </div>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-slate-400 dark:text-[#52525B] flex items-center gap-1">
          <Info size={10} />
          {hint}
        </p>
      )}
      {error && (
        <p className="text-[11px] text-rose-500 dark:text-rose-400 flex items-center gap-1 font-medium">
          <AlertTriangle size={10} />
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export function CreateCategoryPage() {
  const { setCurrentView } = useAdminAuth();

  const [form, setForm] = useState<CreateCategoryForm>(INITIAL_FORM);
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [charCounts, setCharCounts] = useState({ name: 0, description: 0 });

  /* Auto-generate slug from name */
  useEffect(() => {
    if (!slugEdited && form.name) {
      setForm((f) => ({ ...f, slug: generateSlug(f.name) }));
    }
  }, [form.name, slugEdited]);

  /* Char counters */
  useEffect(() => {
    setCharCounts({ name: form.name.length, description: form.description.length });
  }, [form.name, form.description]);

  /* ---- Validation ---- */
  const validate = (): boolean => {
    const e: FieldError = {};
    if (!form.name.trim()) {
      e.name = "Category name is required.";
    } else if (form.name.trim().length < 10) {
      e.name = "Name must be at least 10 characters.";
    } else if (form.name.trim().length > 25) {
      e.name = "Name must not exceed 25 characters.";
    }

    if (!form.slug.trim()) {
      e.slug = "Slug is required.";
    }

    if (!form.description.trim()) {
      e.description = "Description is required.";
    } else if (form.description.trim().length > 250) {
      e.description = "Description must not exceed 250 characters.";
    }

    if (form.position === "" || form.position === undefined) {
      e.position = "Position is required.";
    } else if (Number(form.position) < 1 || !Number.isInteger(Number(form.position))) {
      e.position = "Position must be a positive integer.";
    }

    if (!form.status) {
      e.status = "Status is required.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---- Reset ---- */
  const handleReset = () => {
    setForm(INITIAL_FORM);
    setSlugEdited(false);
    setErrors({});
    setApiError(null);
    setSuccess(false);
  };

  /* ---- Submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccess(false);
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        position: Number(form.position),
        displayOrder: Number(form.position),
        status: form.status,
        isVisible: form.isVisible,
        visible: form.isVisible,
        seo: {
          metaTitle: form.seo.metaTitle.trim() || form.name.trim(),
          metaDescription: form.seo.metaDescription.trim() || form.description.trim(),
        },
      };

      const res = await fetchAdminApi("/categories", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const resAny = res as any;
      const isFailed =
        resAny?.success === false ||
        (resAny?.error && typeof resAny?.error !== "undefined") ||
        (typeof resAny?.statusCode === "number" && resAny.statusCode >= 400) ||
        (typeof resAny?.status === "number" && resAny.status >= 400);

      if (isFailed) {
        const errMsg =
          (typeof resAny?.error === "string" ? resAny.error : resAny?.error?.message) ||
          resAny?.message ||
          "Failed to create category.";
        setApiError(errMsg);
      } else {
        setSuccess(true);

        // Prepend created category into localStorage list cache for zero-latency UI update
        try {
          const createdCat = {
            id: resAny?.data?.id || resAny?.category?.id || resAny?.id || `CAT-${Date.now()}`,
            name: form.name.trim(),
            slug: form.slug.trim(),
            description: form.description.trim(),
            position: Number(form.position),
            displayOrder: Number(form.position),
            status: form.status,
            isVisible: form.isVisible,
            visible: form.isVisible,
            seo: payload.seo,
            createdAt: new Date().toISOString(),
          };
          const cachedRaw = localStorage.getItem("prc_admin_categories_list");
          const cachedList = cachedRaw ? JSON.parse(cachedRaw) : [];
          localStorage.setItem("prc_admin_categories_list", JSON.stringify([createdCat, ...cachedList]));
        } catch {}

        setTimeout(() => {
          setCurrentView("categories");
        }, 1200);
      }
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const inputBase =
    "w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 dark:placeholder-[#52525B] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition-colors";
  const inputError = "border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20";

  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Breadcrumb */}
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
            Create Category
          </h3>
          <nav className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-[#71717A]">
            <Home size={11} className="text-slate-400 dark:text-[#52525B]" />
            <ChevronRight size={11} className="text-slate-300 dark:text-[#52525B]" />
            <button
              onClick={() => setCurrentView("categories")}
              className="hover:text-[#8B5CF6] transition-colors font-medium"
            >
              Categories
            </button>
            <ChevronRight size={11} className="text-slate-300 dark:text-[#52525B]" />
            <span className="text-[#8B5CF6] font-semibold">Create New</span>
          </nav>
        </div>

        {/* Right: Back button */}
        <button
          type="button"
          onClick={() => setCurrentView("categories")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#27272A] text-slate-700 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] dark:hover:text-[#8B5CF6] bg-white dark:bg-[#18181B] transition-all self-start sm:self-auto flex-shrink-0"
        >
          <ArrowLeft size={14} />
          Back to Categories
        </button>
      </div>

      {/* ── Success Banner ─────────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          Category created successfully! Redirecting to categories list...
        </div>
      )}

      {/* ── API Error Banner ────────────────────────────────── */}
      {apiError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-sm font-semibold">
          <AlertTriangle size={18} className="flex-shrink-0" />
          {apiError}
        </div>
      )}

      {/* ── Form ────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: Main Fields (2/3 width) ────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Card 1: Basic Info */}
            <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-[#27272A] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 flex items-center justify-center">
                  <Tag size={14} className="text-[#8B5CF6]" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-[#FAFAFA]">Basic Information</span>
              </div>
              <div className="p-5 space-y-4">

                {/* Category Name */}
                <FieldRow
                  label="Category Name"
                  required
                  hint="Between 10 and 25 characters"
                  error={errors.name}
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v.length <= 25) {
                          setForm((f) => ({ ...f, name: v }));
                          if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
                        }
                      }}
                      placeholder="e.g. Door Hardware & Fittings"
                      className={`${inputBase} ${errors.name ? inputError : ""} pr-12`}
                    />
                    <span
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold tabular-nums ${
                        charCounts.name < 10 || charCounts.name > 25
                          ? "text-rose-400"
                          : "text-emerald-500 dark:text-emerald-400"
                      }`}
                    >
                      {charCounts.name}/25
                    </span>
                  </div>
                </FieldRow>

                {/* Slug */}
                <FieldRow
                  label="URL Slug"
                  required
                  hint="Auto-generated from name — edit to override"
                  error={errors.slug}
                >
                  <div className={`flex items-center rounded-xl border ${errors.slug ? "border-rose-400 dark:border-rose-500" : "border-slate-200 dark:border-[#27272A]"} bg-slate-50 dark:bg-[#09090B] focus-within:border-[#8B5CF6] focus-within:ring-2 focus-within:ring-[#8B5CF6]/20 transition-colors overflow-hidden`}>
                    <span className="px-3.5 text-xs text-slate-400 dark:text-[#52525B] border-r border-slate-200 dark:border-[#27272A] py-2.5 bg-slate-100 dark:bg-[#27272A] select-none font-mono font-bold">/</span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => {
                        setSlugEdited(true);
                        setForm((f) => ({ ...f, slug: generateSlug(e.target.value) }));
                        if (errors.slug) setErrors((er) => ({ ...er, slug: undefined }));
                      }}
                      placeholder="door-hardware-fittings"
                      className="flex-1 px-3.5 py-2.5 text-sm bg-transparent text-[#8B5CF6] dark:text-[#A855F7] font-mono focus:outline-none placeholder-slate-400 dark:placeholder-[#52525B]"
                    />
                    {slugEdited && (
                      <button
                        type="button"
                        onClick={() => { setSlugEdited(false); setForm((f) => ({ ...f, slug: generateSlug(f.name) })); }}
                        className="px-3 text-[11px] text-slate-400 hover:text-[#8B5CF6] transition-colors font-medium mr-1"
                        title="Reset to auto-generated"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </div>
                </FieldRow>

                {/* Description */}
                <FieldRow
                  label="Description"
                  required
                  hint="Max 250 characters"
                  error={errors.description}
                >
                  <div className="relative">
                    <textarea
                      value={form.description}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v.length <= 250) {
                          setForm((f) => ({ ...f, description: v }));
                          if (errors.description) setErrors((er) => ({ ...er, description: undefined }));
                        }
                      }}
                      placeholder="Brief description of what products are in this category..."
                      rows={4}
                      className={`${inputBase} resize-none ${errors.description ? inputError : ""}`}
                    />
                    <span
                      className={`absolute bottom-3 right-3.5 text-[10px] font-bold tabular-nums ${
                        charCounts.description > 250
                          ? "text-rose-400"
                          : charCounts.description > 220
                          ? "text-amber-500"
                          : "text-slate-400 dark:text-[#52525B]"
                      }`}
                    >
                      {charCounts.description}/250
                    </span>
                  </div>
                </FieldRow>
              </div>
            </div>

            {/* Card 2: SEO Meta */}
            <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-[#27272A] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center">
                  <Globe size={14} className="text-blue-500" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 dark:text-[#FAFAFA]">SEO & Meta Tags</span>
                  <p className="text-[10px] text-slate-400 dark:text-[#52525B] mt-0.5">Optional — defaults to name & description if left blank</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <FieldRow label="Meta Title">
                  <input
                    type="text"
                    value={form.seo.metaTitle}
                    onChange={(e) => setForm((f) => ({ ...f, seo: { ...f.seo, metaTitle: e.target.value } }))}
                    placeholder="Category meta title for search engines..."
                    className={inputBase}
                  />
                </FieldRow>
                <FieldRow label="Meta Description">
                  <textarea
                    value={form.seo.metaDescription}
                    onChange={(e) => setForm((f) => ({ ...f, seo: { ...f.seo, metaDescription: e.target.value } }))}
                    placeholder="Short meta description for SEO (150-160 chars recommended)..."
                    rows={3}
                    className={`${inputBase} resize-none`}
                  />
                </FieldRow>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Settings Panel (1/3 width) ───────────── */}
          <div className="space-y-5">

            {/* Card: Publish Settings */}
            <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-[#27272A] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center">
                  <LayoutList size={14} className="text-emerald-500" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-[#FAFAFA]">Publish Settings</span>
              </div>
              <div className="p-5 space-y-5">

                {/* Status */}
                <FieldRow label="Status" required error={errors.status}>
                  <div className="grid grid-cols-3 gap-2">
                    {(["ACTIVE", "INACTIVE", "DRAFT"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setForm((f) => ({ ...f, status: s })); if (errors.status) setErrors((er) => ({ ...er, status: undefined })); }}
                        className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                          form.status === s
                            ? s === "ACTIVE"
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                              : s === "INACTIVE"
                              ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20"
                              : "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                            : "bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
                        }`}
                      >
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </FieldRow>

                {/* Position */}
                <FieldRow
                  label="Display Position"
                  required
                  hint="Positive integer (e.g. 1, 2, 3…)"
                  error={errors.position}
                >
                  <div className="relative">
                    <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#52525B]" />
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.position}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({ ...f, position: v === "" ? "" : Number(v) }));
                        if (errors.position) setErrors((er) => ({ ...er, position: undefined }));
                      }}
                      placeholder="1"
                      className={`${inputBase} pl-9 ${errors.position ? inputError : ""}`}
                    />
                  </div>
                </FieldRow>

                {/* Visibility Toggle */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
                    Visibility <span className="text-rose-500">*</span>
                  </span>
                  <div
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#09090B] cursor-pointer hover:border-[#8B5CF6] transition-colors group"
                    onClick={() => setForm((f) => ({ ...f, isVisible: !f.isVisible }))}
                  >
                    <div className="flex items-center gap-2.5">
                      {form.isVisible
                        ? <Eye size={16} className="text-[#8B5CF6]" />
                        : <EyeOff size={16} className="text-slate-400 dark:text-[#52525B]" />
                      }
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA]">
                          {form.isVisible ? "Visible on Storefront" : "Hidden from Storefront"}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-[#52525B]">
                          {form.isVisible ? "Customers can browse this category" : "Category is hidden from customers"}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {form.isVisible
                        ? <ToggleRight size={28} className="text-[#8B5CF6]" />
                        : <ToggleLeft size={28} className="text-slate-300 dark:text-[#52525B]" />
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Live Preview */}
            <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-[#27272A] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 flex items-center justify-center">
                  <FolderTree size={14} className="text-[#8B5CF6]" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-[#FAFAFA]">Live Preview</span>
              </div>
              <div className="p-5">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#8B5CF6]/5 to-purple-50 dark:from-[#8B5CF6]/10 dark:to-[#1F1929] border border-[#8B5CF6]/20 text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-[#8B5CF6] text-white flex items-center justify-center font-black text-lg mx-auto shadow-lg shadow-[#8B5CF6]/25">
                    {form.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-[#FAFAFA] leading-tight">
                      {form.name || <span className="text-slate-300 dark:text-[#52525B] font-normal italic">Category name...</span>}
                    </p>
                    <p className="text-[11px] font-mono text-[#8B5CF6] dark:text-[#A855F7] mt-1">
                      /{form.slug || <span className="opacity-50">slug...</span>}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      form.status === "ACTIVE"
                        ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                        : form.status === "DRAFT"
                        ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                        : "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                    }`}>
                      {form.status}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      form.isVisible
                        ? "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                        : "bg-slate-100 dark:bg-[#27272A] text-slate-500 dark:text-[#71717A] border-slate-200 dark:border-[#27272A]"
                    }`}>
                      {form.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Buttons Bar ─────────────────────────────── */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-[#52525B]">
            <Info size={12} />
            <span>All required fields must be filled before creating the category.</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Cancel */}
            <button
              type="button"
              onClick={() => setCurrentView("categories")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] border border-transparent hover:border-slate-200 dark:hover:border-[#27272A] transition-all"
            >
              <X size={14} />
              Cancel
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#09090B] hover:border-rose-300 dark:hover:border-rose-500/50 hover:text-rose-500 dark:hover:text-rose-400 transition-all"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || success}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#8B5CF6]/25 transition-all"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : success ? (
                <CheckCircle2 size={15} />
              ) : (
                <Save size={15} />
              )}
              {saving ? "Creating..." : success ? "Created!" : "Create Category"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
