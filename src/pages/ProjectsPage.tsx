import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Video,
  Image as ImageIcon,
  MapPin,
  Globe2,
  Sparkles,
  X,
  Check,
  AlertCircle,
  MoveUp,
  MoveDown,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { projectsService } from "../api/projectsService";
import { ProjectItem } from "../types/admin";

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isPanIndiaFilter, setIsPanIndiaFilter] = useState("ALL");

  // Summary Metrics
  const [totalProjects, setTotalProjects] = useState(0);
  const [citiesCount, setCitiesCount] = useState(0);
  const [panIndiaCount, setPanIndiaCount] = useState(0);
  const [featuredCount, setFeaturedCount] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formClientName, setFormClientName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCity, setFormCity] = useState("Delhi NCR");
  const [formState, setFormState] = useState("Delhi");
  const [formRegion, setFormRegion] = useState("North");
  const [formIsPanIndia, setFormIsPanIndia] = useState(false);
  const [formCategory, setFormCategory] = useState("Corporate Offices & Tech Parks");
  const [formDescription, setFormDescription] = useState("");
  const [formCompletionYear, setFormCompletionYear] = useState("2023");
  const [formProductsUsed, setFormProductsUsed] = useState<string[]>([]);
  const [productInput, setProductInput] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [seeding, setSeeding] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  const CATEGORIES = [
    "Corporate Offices & Tech Parks",
    "Government & Infrastructure",
    "Sports & Stadiums",
    "Educational Institutions",
    "Healthcare & Hospitals",
    "Commercial & Retail Malls",
    "Automotive Flagships",
    "Residential & Clubhouses",
    "Hotels & Hospitality",
    "Gym & Fitness",
  ];

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit: 200 };
      if (search.trim()) params.search = search.trim();
      if (categoryFilter !== "ALL") params.category = categoryFilter;
      if (cityFilter !== "ALL") params.city = cityFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (isPanIndiaFilter === "YES") params.isPanIndia = "true";
      if (isPanIndiaFilter === "NO") params.isPanIndia = "false";

      const res = await projectsService.listProjects(params);
      if (res && res.projects) {
        setProjects(res.projects);
        setTotalProjects(res.pagination?.total ?? res.projects.length);

        // Compute metrics
        const cities = new Set<string>();
        let panIndia = 0;
        let featured = 0;
        res.projects.forEach((p: ProjectItem) => {
          if (p.isPanIndia) panIndia++;
          else if (p.city) cities.add(p.city);
          if (p.isFeatured) featured++;
        });
        setCitiesCount(cities.size);
        setPanIndiaCount(panIndia);
        setFeaturedCount(featured);
      }
    } catch (err: any) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, cityFilter, statusFilter, isPanIndiaFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setFormName("");
    setFormClientName("");
    setFormLocation("");
    setFormCity("Bangalore");
    setFormState("Karnataka");
    setFormRegion("South");
    setFormIsPanIndia(false);
    setFormCategory("Corporate Offices & Tech Parks");
    setFormDescription("");
    setFormCompletionYear("2024");
    setFormProductsUsed(["Heavy Duty Floor Springs", "Frameless Glass Clamps"]);
    setFormImages([
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop",
    ]);
    setFormVideoUrl("");
    setFormIsFeatured(false);
    setFormStatus("ACTIVE");
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: ProjectItem) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormClientName(project.clientName);
    setFormLocation(project.location || "");
    setFormCity(project.city);
    setFormState(project.state);
    setFormRegion(project.region || "");
    setFormIsPanIndia(project.isPanIndia);
    setFormCategory(project.category);
    setFormDescription(project.description || "");
    setFormCompletionYear(project.completionYear || "");
    setFormProductsUsed(project.productsUsed || []);
    setFormImages(project.images && project.images.length > 0 ? project.images : []);
    setFormVideoUrl(project.videoUrl || "");
    setFormIsFeatured(project.isFeatured);
    setFormStatus(project.status);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleAddProductTag = () => {
    if (!productInput.trim()) return;
    if (!formProductsUsed.includes(productInput.trim())) {
      setFormProductsUsed([...formProductsUsed, productInput.trim()]);
    }
    setProductInput("");
  };

  const handleRemoveProductTag = (tag: string) => {
    setFormProductsUsed(formProductsUsed.filter((t) => t !== tag));
  };

  const handleAddImage = () => {
    if (!imageUrlInput.trim()) return;
    try {
      new URL(imageUrlInput.trim());
      setFormImages([...formImages, imageUrlInput.trim()]);
      setImageUrlInput("");
      setModalError(null);
    } catch {
      setModalError("Please enter a valid image URL (e.g. https://example.com/photo.jpg)");
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormImages(formImages.filter((_, i) => i !== index));
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formImages.length) return;
    const updated = [...formImages];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setFormImages(updated);
  };

  const handleSetCoverImage = (index: number) => {
    handleMoveImage(index, 0);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formClientName.trim() || !formCity.trim() || !formState.trim()) {
      setModalError("Project Name, Client Name, City, and State are mandatory.");
      return;
    }

    if (formImages.length < 2) {
      setModalError("At least 2 project images are mandatory before publishing a project.");
      return;
    }

    try {
      setSaving(true);
      setModalError(null);

      const payload = {
        name: formName.trim(),
        clientName: formClientName.trim(),
        location: formLocation.trim() || null,
        city: formCity.trim(),
        state: formState.trim(),
        region: formRegion.trim() || null,
        isPanIndia: formIsPanIndia,
        category: formCategory,
        description: formDescription.trim() || null,
        completionYear: formCompletionYear.trim() || null,
        productsUsed: formProductsUsed,
        images: formImages,
        videoUrl: formVideoUrl.trim() || null,
        isFeatured: formIsFeatured,
        status: formStatus,
      };

      if (editingProject) {
        await projectsService.updateProject(editingProject.id, payload);
      } else {
        await projectsService.createProject(payload);
      }

      setIsModalOpen(false);
      await loadProjects();
    } catch (err: any) {
      setModalError(err.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (id: string) => {
    try {
      await projectsService.toggleFeatured(id);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isFeatured: !p.isFeatured } : p))
      );
    } catch (err: any) {
      alert("Failed to toggle featured status: " + err.message);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await projectsService.toggleStatus(id);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : p
        )
      );
    } catch (err: any) {
      alert("Failed to toggle status: " + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) return;
    try {
      await projectsService.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert("Failed to delete project: " + err.message);
    }
  };

  const handleSeedDatabase = async () => {
    if (
      !window.confirm(
        "Sync 130+ Completed Projects into PostgreSQL database? Existing identical records will be preserved."
      )
    )
      return;
    try {
      setSeeding(true);
      const res = await projectsService.seedProjects(false);
      setSeedSuccessMsg(res?.message || "Seeding completed successfully.");
      await loadProjects();
      setTimeout(() => setSeedSuccessMsg(null), 5000);
    } catch (err: any) {
      alert("Seeding failed: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  // Distinct cities for filter dropdown
  const uniqueCities = Array.from(new Set(projects.map((p) => p.city))).filter(Boolean).sort();

  return (
    <div className="space-y-6">
      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#34150F] p-6 rounded-2xl shadow-lg border border-[#D39858]/20">
        <div>
          <div className="flex items-center gap-2 text-[#D39858] text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 size={16} />
            <span>Enterprise Portfolio &amp; Map Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EACEAA] tracking-tight">
            Our Clients &amp; Completed Projects
          </h1>
          <p className="text-sm text-[#EACEAA]/70 mt-1">
            Manage landmark architectural installations, client organizations, multi-image galleries, and interactive India map locations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSeedDatabase}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85431E]/40 hover:bg-[#85431E] text-[#EACEAA] text-xs font-bold border border-[#D39858]/30 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={14} className={seeding ? "animate-spin" : ""} />
            <span>{seeding ? "Syncing..." : "Sync 130+ Projects"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D39858] hover:bg-[#EACEAA] text-[#34150F] text-xs font-extrabold transition-all active:scale-95 shadow-md hover:shadow-[#D39858]/20"
          >
            <Plus size={16} />
            <span>Add New Project</span>
          </button>
        </div>
      </div>

      {seedSuccessMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-sm">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <span>{seedSuccessMsg}</span>
        </div>
      )}

      {/* ─── KPI Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#34150F]/10 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Projects</span>
            <Building2 size={18} className="text-[#85431E]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#34150F] mt-2">{totalProjects}</p>
          <span className="text-[11px] text-emerald-600 font-medium">All active installations</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#34150F]/10 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Cities Covered</span>
            <MapPin size={18} className="text-[#D39858]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#34150F] mt-2">{citiesCount}+</p>
          <span className="text-[11px] text-gray-500 font-medium">National footprint hubs</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#34150F]/10 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Pan India Accounts</span>
            <Globe2 size={18} className="text-[#85431E]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#34150F] mt-2">{panIndiaCount}</p>
          <span className="text-[11px] text-gray-500 font-medium">Multi-state clients</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#34150F]/10 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Featured Showcases</span>
            <Star size={18} className="text-amber-500 fill-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#34150F] mt-2">{featuredCount}</p>
          <span className="text-[11px] text-gray-500 font-medium">Flagship installations</span>
        </div>
      </div>

      {/* ─── Search & Filter Controls ─── */}
      <div className="p-4 rounded-2xl bg-white border border-[#34150F]/10 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project, client, or city..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#85431E]"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by project category"
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#85431E]"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            aria-label="Filter by project city"
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#85431E]"
          >
            <option value="ALL">All Cities</option>
            {uniqueCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Pan India / Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by publication status"
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#85431E]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active (Published)</option>
            <option value="INACTIVE">Inactive (Hidden)</option>
          </select>
        </div>
      </div>

      {/* ─── Projects Data Table ─── */}
      <div className="bg-white rounded-2xl border border-[#34150F]/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-500 flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-[#85431E]" />
            <p className="text-sm">Loading projects portfolio...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center text-gray-500 space-y-3">
            <Building2 size={36} className="mx-auto text-gray-300" />
            <p className="text-base font-semibold text-gray-700">No projects found</p>
            <p className="text-xs text-gray-400">Try adjusting your search or filters, or click "Sync 130+ Projects".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#34150F]/5 text-[#34150F] text-xs font-bold uppercase tracking-wider border-b border-[#34150F]/10">
                <tr>
                  <th className="px-4 py-3.5">Cover &amp; Project</th>
                  <th className="px-4 py-3.5">Client</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5 text-center">Media</th>
                  <th className="px-4 py-3.5 text-center">Featured</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-[#FAF7F2] transition-colors">
                    {/* Cover & Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={proj.images[0] || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=200&auto=format&fit=crop"}
                          alt={proj.name}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0 shadow-2xs"
                        />
                        <div>
                          <p className="font-bold text-[#34150F] line-clamp-1">{proj.name}</p>
                          <p className="text-xs text-gray-400">Year: {proj.completionYear || "N/A"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3 font-semibold text-gray-800">{proj.clientName}</td>

                    {/* Location */}
                    <td className="px-4 py-3">
                      {proj.isPanIndia ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Globe2 size={12} /> Pan India
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin size={12} className="text-[#85431E] flex-shrink-0" />
                          <span>
                            {proj.city}, {proj.state}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-medium text-[#85431E] bg-[#EACEAA]/40 px-2.5 py-1 rounded-full border border-[#85431E]/20 whitespace-nowrap">
                        {proj.category}
                      </span>
                    </td>

                    {/* Media Count */}
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1" title={`${proj.images.length} images`}>
                          <ImageIcon size={14} className="text-gray-400" />
                          {proj.images.length}
                        </span>
                        {proj.videoUrl && (
                          <span title="Video attached" className="text-rose-500">
                            <Video size={14} />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Featured Toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(proj.id)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                        title={proj.isFeatured ? "Unmark as featured" : "Mark as featured"}
                      >
                        <Star
                          size={18}
                          className={
                            proj.isFeatured
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-300 hover:text-amber-400"
                          }
                        />
                      </button>
                    </td>

                    {/* Status Toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(proj.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                          proj.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {proj.status === "ACTIVE" ? (
                          <>
                            <Eye size={12} /> Active
                          </>
                        ) : (
                          <>
                            <EyeOff size={12} /> Hidden
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(proj)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#D39858]/20 text-gray-600 hover:text-[#34150F] transition-colors"
                          title="Edit Project"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(proj.id, proj.name)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-rose-100 text-gray-600 hover:text-rose-600 transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Create / Edit Project Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col my-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#34150F] text-[#EACEAA] rounded-t-3xl flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Building2 size={20} className="text-[#D39858]" />
                <h3 className="text-lg font-bold">
                  {editingProject ? "Edit Completed Project" : "Add New Completed Project"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#EACEAA]/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProject} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {modalError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* General Project Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Reliance JIO Regional HQ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#85431E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Client / Organization *
                  </label>
                  <input
                    type="text"
                    required
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    placeholder="e.g. Reliance JIO / Tata Sons"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#85431E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Completion Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#85431E] focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Completion Year
                  </label>
                  <input
                    type="text"
                    value={formCompletionYear}
                    onChange={(e) => setFormCompletionYear(e.target.value)}
                    placeholder="e.g. 2023"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#85431E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Location Details & Pan India */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#85431E]" />
                    <span className="font-bold text-gray-800 text-xs uppercase">
                      Geographic Location (For Interactive India Map)
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsPanIndia}
                      onChange={(e) => setFormIsPanIndia(e.target.checked)}
                      className="rounded text-[#85431E] focus:ring-[#85431E]"
                    />
                    <span className="text-xs font-bold text-amber-900">Pan India Account</span>
                  </label>
                </div>

                {!formIsPanIndia ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        placeholder="e.g. Bangalore"
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#85431E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={formState}
                        onChange={(e) => setFormState(e.target.value)}
                        placeholder="e.g. Karnataka"
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#85431E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Location / Zone</label>
                      <input
                        type="text"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder="e.g. Electronic City"
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#85431E] focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-800 italic">
                    This project operates across multiple Indian states and will appear with an animated national beacon on the interactive map.
                  </p>
                )}
              </div>

              {/* Products Used (Tags) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  PRC Hardware Products Installed
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={productInput}
                    onChange={(e) => setProductInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddProductTag();
                      }
                    }}
                    placeholder="Type fitting name and press Add (e.g. Heavy Duty Floor Spring)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#85431E] focus:outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddProductTag}
                    className="px-4 py-2 bg-[#85431E] text-white text-xs font-bold rounded-xl hover:bg-[#34150F]"
                  >
                    Add Fitting
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-gray-50 border border-gray-200 rounded-xl">
                  {formProductsUsed.length === 0 ? (
                    <span className="text-xs text-gray-400">No hardware fittings listed yet.</span>
                  ) : (
                    formProductsUsed.map((prod) => (
                      <span
                        key={prod}
                        className="inline-flex items-center gap-1 text-xs font-medium bg-[#EACEAA]/50 text-[#34150F] px-2.5 py-1 rounded-full border border-[#85431E]/20"
                      >
                        <span>{prod}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductTag(prod)}
                          className="text-gray-500 hover:text-rose-600"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Project Description &amp; Scope
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Architectural glazing installation details, floor springs, partition layout..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#85431E] focus:outline-none text-xs"
                />
              </div>

              {/* Multi-Image Manager (Mandatory Min 2 Images) */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-[#85431E]" />
                    <span className="font-bold text-gray-800 text-xs uppercase">
                      Project Images Gallery (Minimum 2 Images Required *)
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      formImages.length >= 2
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {formImages.length} Image{formImages.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Paste image URL (https://...)"
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#85431E] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-4 py-1.5 bg-[#85431E] text-white text-xs font-bold rounded-xl hover:bg-[#34150F]"
                  >
                    Add Image
                  </button>
                </div>

                {/* Thumbnails Rail */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {formImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-xl overflow-hidden border border-gray-300 bg-white shadow-2xs aspect-video"
                    >
                      <img src={url} alt={`Project Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-[#34150F] text-[#EACEAA] text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow">
                          Cover
                        </span>
                      )}

                      {/* Controls Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(idx)}
                            className="p-1 rounded bg-amber-500 text-white text-[10px] hover:bg-amber-600"
                            title="Set as Cover"
                          >
                            <Star size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white/20 text-white hover:bg-white/40 disabled:opacity-30"
                          title="Move Left"
                        >
                          <MoveUp size={12} className="-rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, idx + 1)}
                          disabled={idx === formImages.length - 1}
                          className="p-1 rounded bg-white/20 text-white hover:bg-white/40 disabled:opacity-30"
                          title="Move Right"
                        >
                          <MoveDown size={12} className="-rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="p-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                          title="Delete Image"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Video Support (16:9 Landscape) */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Video size={16} className="text-[#85431E]" />
                  <span className="font-bold text-gray-800 text-xs uppercase">
                    Project Video (Optional — 16:9 Landscape)
                  </span>
                </div>
                <input
                  type="url"
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  placeholder="e.g. https://www.youtube.com/watch?v=... or https://vimeo.com/... or direct .mp4 URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#85431E] focus:outline-none text-xs"
                />
                {formVideoUrl && (
                  <p className="text-[11px] text-gray-500">
                    Video will be presented in full 16:9 landscape format within the Project Details Modal.
                  </p>
                )}
              </div>

              {/* Publication Settings */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-gray-700">Mark as Featured Showcase Project</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-700">Status:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#85431E] focus:outline-none"
                  >
                    <option value="ACTIVE">Active (Published)</option>
                    <option value="INACTIVE">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#34150F] hover:bg-[#4A1F17] text-[#EACEAA] font-extrabold text-xs transition-all active:scale-95 disabled:opacity-50 shadow-md"
                >
                  {saving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingProject ? "Save Changes" : "Publish Project"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
