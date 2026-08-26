import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  ShieldAlert,
  X,
  AlertCircle,
  Tag,
} from "lucide-react";
import { materialsApi } from "../api/adminApi";
import { MaterialItem } from "../types/admin";

export function MaterialsPage() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    shortName: "",
    gradeBadge: "",
    tagline: "",
    description: "",
    specsText: "",
    isActive: true,
    position: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await materialsApi.list();
      if (res && res.success && Array.isArray(res.data)) {
        setMaterials(res.data);
      } else {
        setMaterials([]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load materials catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setFormData({
      name: "",
      slug: "",
      shortName: "",
      gradeBadge: "",
      tagline: "",
      description: "",
      specsText: "",
      isActive: true,
      position: materials.length + 1,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: MaterialItem) => {
    setEditingMaterial(m);
    setFormData({
      name: m.name,
      slug: m.slug,
      shortName: m.shortName || "",
      gradeBadge: m.gradeBadge || "",
      tagline: m.tagline || "",
      description: m.description || "",
      specsText: Array.isArray(m.specs) ? m.specs.join("\n") : "",
      isActive: m.isActive,
      position: m.position || 0,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!editingMaterial) {
      const generatedSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormData((prev) => ({ ...prev, name: val, slug: generatedSlug }));
    } else {
      setFormData((prev) => ({ ...prev, name: val }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError("Material name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError(null);

      const specs = formData.specsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        shortName: formData.shortName.trim() || null,
        gradeBadge: formData.gradeBadge.trim() || null,
        tagline: formData.tagline.trim() || null,
        description: formData.description.trim() || null,
        specs,
        isActive: formData.isActive,
        position: Number(formData.position) || 0,
      };

      if (editingMaterial) {
        await materialsApi.update(editingMaterial.id, payload);
      } else {
        await materialsApi.create(payload);
      }

      setIsModalOpen(false);
      await loadMaterials();
    } catch (err: any) {
      setModalError(err?.message || "Failed to save material record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (m: MaterialItem) => {
    const updatedStatus = !m.isActive;
    // Optimistic UI update
    setMaterials((prev) =>
      prev.map((item) => (item.id === m.id ? { ...item, isActive: updatedStatus } : item))
    );

    try {
      await materialsApi.update(m.id, { isActive: updatedStatus });
    } catch {
      // Revert if error
      setMaterials((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, isActive: m.isActive } : item))
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await materialsApi.delete(id);
      setDeletingId(null);
      await loadMaterials();
    } catch (err: any) {
      alert(err?.message || "Failed to delete material");
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (statusFilter === "ACTIVE" && !m.isActive) return false;
      if (statusFilter === "INACTIVE" && m.isActive) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesSlug = m.slug.toLowerCase().includes(q);
        const matchesShort = m.shortName?.toLowerCase().includes(q);
        const matchesBadge = m.gradeBadge?.toLowerCase().includes(q);
        if (!matchesName && !matchesSlug && !matchesShort && !matchesBadge) return false;
      }
      return true;
    });
  }, [materials, statusFilter, search]);

  const activeCount = materials.filter((m) => m.isActive).length;
  const inactiveCount = materials.length - activeCount;
  const totalProducts = materials.reduce((acc, m) => acc + (m.productCount || 0), 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
              Materials Master
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Manage architectural materials, technical specs, and storefront navbar visibility from a single source of truth.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10 active:scale-95"
        >
          <Plus size={16} />
          Add Material
        </button>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex flex-col justify-between">
          <span className="text-xs text-zinc-400 font-medium">Total Materials</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-zinc-100">{materials.length}</span>
            <span className="text-[11px] text-zinc-500">defined</span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex flex-col justify-between">
          <span className="text-xs text-emerald-400 font-medium">Active in Storefront</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-400">{activeCount}</span>
            <span className="text-[11px] text-zinc-500">live on navbar</span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex flex-col justify-between">
          <span className="text-xs text-zinc-400 font-medium">Inactive</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-zinc-400">{inactiveCount}</span>
            <span className="text-[11px] text-zinc-500">hidden</span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex flex-col justify-between">
          <span className="text-xs text-amber-400 font-medium">Assigned Products</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-400">{totalProducts}</span>
            <span className="text-[11px] text-zinc-500">catalog items</span>
          </div>
        </div>
      </div>

      {/* ─── Search & Controls ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#18181B] p-3 rounded-2xl border border-[#27272A]">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search material name, slug, grade..."
            className="w-full bg-[#09090B] border border-[#27272A] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab === "ALL" ? "All Materials" : tab === "ACTIVE" ? "Active Only" : "Inactive Only"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Materials List / Table ─────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400 animate-pulse bg-[#18181B] rounded-2xl border border-[#27272A]">
          Loading materials catalog...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 flex items-center gap-3">
          <ShieldAlert size={20} />
          <span>{error}</span>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 bg-[#18181B] rounded-2xl border border-[#27272A] space-y-3">
          <Layers size={32} className="mx-auto text-zinc-600" />
          <p className="text-sm font-medium">No materials found matching criteria</p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400"
          >
            Add New Material
          </button>
        </div>
      ) : (
        <div className="bg-[#18181B] rounded-2xl border border-[#27272A] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#09090B] border-b border-[#27272A] text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Material Name & Slug</th>
                  <th className="py-3 px-4">Grade Badge</th>
                  <th className="py-3 px-4">Specifications</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4 text-center">Storefront Visibility</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/60 text-zinc-300">
                {filteredMaterials.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="py-3.5 px-4 font-mono text-zinc-500">#{m.position}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                        {m.name}
                        {m.shortName && (
                          <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">
                            {m.shortName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 mt-0.5">/material/{m.slug}</div>
                      {m.description && (
                        <p className="text-[11px] text-zinc-400/80 line-clamp-1 max-w-sm mt-0.5">
                          {m.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {m.gradeBadge ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Tag size={10} />
                          {m.gradeBadge}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {Array.isArray(m.specs) && m.specs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {m.specs.slice(0, 2).map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 truncate max-w-[130px]"
                            >
                              {s}
                            </span>
                          ))}
                          {m.specs.length > 2 && (
                            <span className="text-[9px] text-zinc-500">+{m.specs.length - 2} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-zinc-300 font-mono">
                        <Package size={12} className="text-zinc-500" />
                        {m.productCount || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(m)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                          m.isActive
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700"
                        }`}
                        title={m.isActive ? "Click to disable from navbar" : "Click to show on navbar"}
                      >
                        {m.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {m.isActive ? "Active in Navbar" : "Disabled"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                          title="Edit Material"
                        >
                          <Edit2 size={14} />
                        </button>
                        {deletingId === m.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="px-2 py-1 rounded bg-rose-600 text-white font-bold text-[10px]"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(m.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Material"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Add / Edit Modal ───────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#27272A]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100 text-base">
                    {editingMaterial ? "Edit Material" : "Create New Material"}
                  </h3>
                  <p className="text-xs text-zinc-400">Single source of truth for architectural material grades.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Material Name <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="e.g. 304 Grade Stainless Steel"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    URL Slug <span className="text-zinc-500 text-[10px] font-normal">(Navbar route)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g. 304-grade-stainless-steel"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Short Name / Code
                  </label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, shortName: e.target.value }))}
                    placeholder="e.g. SS 304"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Grade Badge Text
                  </label>
                  <input
                    type="text"
                    value={formData.gradeBadge}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gradeBadge: e.target.value }))}
                    placeholder="e.g. Architectural Grade, Marine Grade"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g. Architectural Grade Stainless Steel"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Comprehensive description of metallurgical qualities and typical usage..."
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Technical Specifications <span className="text-zinc-500 text-[10px] font-normal">(One spec per line)</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.specsText}
                  onChange={(e) => setFormData((prev) => ({ ...prev, specsText: e.target.value }))}
                  placeholder="18/8 Austenitic Stainless Steel&#10;High Corrosion Resistance&#10;ASTM A240 Certified"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-center pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.position}
                    onChange={(e) => setFormData((prev) => ({ ...prev, position: Number(e.target.value) }))}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="modal-isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="modal-isActive" className="text-xs font-semibold text-zinc-200 cursor-pointer">
                    Active in Storefront Navbar
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold hover:bg-amber-400 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingMaterial ? "Update Material" : "Create Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
