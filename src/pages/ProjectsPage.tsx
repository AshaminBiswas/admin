import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronRight as BreadArrow,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { projectsService } from "../api/projectsService";
import { ProjectItem } from "../types/admin";
import { useDebounce } from "../hooks/useDebounce";

export function ProjectsPage() {
  // Instant hydration from local cache
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    try {
      const cached = localStorage.getItem("prc_admin_projects_cache");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(projects.length === 0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isPanIndiaFilter, setIsPanIndiaFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<ProjectItem | null>(null);

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
  const [formCompletionYear, setFormCompletionYear] = useState("2024");
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
    "Industrial & Logistics",
  ];

  const loadProjects = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setIsSyncing(true);

      const params: any = { limit: 250 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (categoryFilter !== "ALL") params.category = categoryFilter;
      if (cityFilter !== "ALL") params.city = cityFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (isPanIndiaFilter === "YES") params.isPanIndia = "true";
      if (isPanIndiaFilter === "NO") params.isPanIndia = "false";

      const res = await projectsService.listProjects(params);
      const list = res?.projects || [];

      if (list.length > 0 || !debouncedSearch) {
        setProjects(list);
        setTotalProjects(res.pagination?.total ?? list.length);

        try {
          if (!debouncedSearch && categoryFilter === "ALL" && cityFilter === "ALL" && statusFilter === "ALL") {
            localStorage.setItem("prc_admin_projects_cache", JSON.stringify(list));
          }
        } catch {}

        // Compute metrics
        const cities = new Set<string>();
        let panIndia = 0;
        let featured = 0;
        list.forEach((p: ProjectItem) => {
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
      setIsSyncing(false);
    }
  }, [debouncedSearch, categoryFilter, cityFilter, statusFilter, isPanIndiaFilter]);

  useEffect(() => {
    loadProjects(projects.length > 0);
  }, [loadProjects]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryFilter, cityFilter, statusFilter, isPanIndiaFilter]);

  // Filtered & Paginated Display
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return projects.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [projects, currentPage]);

  const totalPages = Math.max(1, Math.ceil(projects.length / ITEMS_PER_PAGE));

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setFormName("");
    setFormClientName("");
    setFormLocation("");
    setFormCity("Bengaluru");
    setFormState("Karnataka");
    setFormRegion("South");
    setFormIsPanIndia(false);
    setFormCategory("Corporate Offices & Tech Parks");
    setFormDescription("");
    setFormCompletionYear("2024");
    setFormProductsUsed(["SS 304 Restroom Cubicle Partition Hardware", "Heavy Duty Hydraulic Floor Springs"]);
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
      setModalError("Please enter a valid image URL (e.g. https://images.unsplash.com/...)");
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
      setModalError("At least 2 project images are mandatory before publishing.");
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
      await loadProjects(true);
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

  const handleDelete = async () => {
    if (!deleteConfirmProject) return;
    try {
      await projectsService.deleteProject(deleteConfirmProject.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteConfirmProject.id));
      setDeleteConfirmProject(null);
    } catch (err: any) {
      alert("Failed to delete project: " + err.message);
    }
  };

  const handleSeedDatabase = async () => {
    if (
      !window.confirm(
        "Sync 200 Researched Landmark Projects into database? Existing identical records will be updated safely."
      )
    )
      return;
    try {
      setSeeding(true);
      const res = await projectsService.seedProjects(false);
      setSeedSuccessMsg(res?.message || "Successfully synchronized 200 projects with database.");
      await loadProjects(false);
      setTimeout(() => setSeedSuccessMsg(null), 5000);
    } catch (err: any) {
      alert("Sync failed: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  // Distinct cities for filter dropdown
  const uniqueCities = useMemo(() => {
    return Array.from(new Set(projects.map((p) => p.city))).filter(Boolean).sort();
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb Navigation ─── */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#71717A]">
        <div className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-[#FAFAFA] transition-colors cursor-pointer">
          <Home size={13} />
          <span>Dashboard</span>
        </div>
        <BreadArrow size={12} className="text-slate-400 dark:text-[#52525B]" />
        <span className="font-semibold text-slate-900 dark:text-[#FAFAFA]">Completed Projects</span>
      </div>

      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#18181B] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 size={15} />
            <span>National Architectural Portfolio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
            Completed Projects &amp; Map Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#71717A] mt-1">
            Manage landmark installations, client portfolios, multi-photo galleries, and interactive India map locations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSeedDatabase}
            disabled={seeding || isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#27272A]/70 hover:bg-slate-100 dark:hover:bg-[#27272A] text-slate-700 dark:text-[#E4E4E7] text-xs font-bold border border-slate-200 dark:border-[#3F3F46] transition-all active:scale-95 disabled:opacity-50"
            title="Re-sync master 200 dataset into database"
          >
            <RefreshCw size={13} className={seeding || isSyncing ? "animate-spin text-amber-500" : ""} />
            <span>{seeding ? "Syncing..." : "Sync 200 Projects"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all active:scale-95 shadow-sm shadow-amber-500/20"
          >
            <Plus size={15} />
            <span>Add New Project</span>
          </button>
        </div>
      </div>

      {seedSuccessMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
          <span>{seedSuccessMsg}</span>
        </div>
      )}

      {/* ─── KPI Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#71717A] text-[11px] font-bold uppercase tracking-wider">
            <span>Total Projects</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Building2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#FAFAFA] mt-1.5">{totalProjects || projects.length}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">All active installations</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#71717A] text-[11px] font-bold uppercase tracking-wider">
            <span>Cities Covered</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <MapPin size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#FAFAFA] mt-1.5">{citiesCount || uniqueCities.length}+</p>
          <span className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">National footprint hubs</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#71717A] text-[11px] font-bold uppercase tracking-wider">
            <span>Pan India Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Globe2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#FAFAFA] mt-1.5">{panIndiaCount}</p>
          <span className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">Multi-state clients</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#71717A] text-[11px] font-bold uppercase tracking-wider">
            <span>Featured Showcases</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Star size={16} className="fill-violet-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#FAFAFA] mt-1.5">{featuredCount}</p>
          <span className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">Flagship installations</span>
        </div>
      </div>

      {/* ─── Search & Filter Controls ─── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#71717A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project, client, or city..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 dark:placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by project category"
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
          >
            <option value="ALL">All Categories ({CATEGORIES.length})</option>
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
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
          >
            <option value="ALL">All Cities ({uniqueCities.length})</option>
            {uniqueCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Publication Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by publication status"
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active (Published)</option>
            <option value="INACTIVE">Inactive (Hidden)</option>
          </select>
        </div>

        {/* Active Filters Row */}
        {(search || categoryFilter !== "ALL" || cityFilter !== "ALL" || statusFilter !== "ALL") && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#27272A] text-xs">
            <span className="text-slate-500 dark:text-[#71717A]">
              Showing <strong className="text-slate-900 dark:text-[#FAFAFA]">{projects.length}</strong> matching projects
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryFilter("ALL");
                setCityFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ─── Projects Data Table ─── */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xs overflow-hidden">
        {loading && projects.length === 0 ? (
          <div className="py-20 text-center text-slate-500 dark:text-[#71717A] flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-amber-500" />
            <p className="text-xs font-semibold">Loading projects portfolio...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-[#71717A] space-y-3">
            <Building2 size={36} className="mx-auto text-slate-300 dark:text-[#3F3F46]" />
            <p className="text-sm font-bold text-slate-800 dark:text-[#FAFAFA]">No projects found</p>
            <p className="text-xs text-slate-400 dark:text-[#71717A]">Try adjusting your search or filters, or click "Sync 200 Projects".</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-[#27272A]">
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
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                  {paginatedProjects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50/80 dark:hover:bg-[#27272A]/50 transition-colors">
                      {/* Cover & Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={proj.images[0] || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=200&auto=format&fit=crop"}
                            alt={proj.name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-[#27272A] flex-shrink-0 shadow-2xs"
                          />
                          <div className="max-w-[220px]">
                            <p className="font-bold text-slate-900 dark:text-[#FAFAFA] line-clamp-1">{proj.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-[#71717A]">Year: {proj.completionYear || "N/A"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-[#E4E4E7] max-w-[180px]">
                        <span className="line-clamp-1">{proj.clientName}</span>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        {proj.isPanIndia ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            <Globe2 size={11} /> Pan India
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#A1A1AA]">
                            <MapPin size={13} className="text-amber-500 flex-shrink-0" />
                            <span>
                              {proj.city}, {proj.state}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="inline-block text-[11px] font-medium text-slate-700 dark:text-[#A1A1AA] bg-slate-100 dark:bg-[#27272A] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#3F3F46] whitespace-nowrap">
                          {proj.category}
                        </span>
                      </td>

                      {/* Media Count */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-[#71717A] font-medium">
                          <span className="flex items-center gap-1" title={`${proj.images.length} images`}>
                            <ImageIcon size={13} className="text-slate-400 dark:text-[#52525B]" />
                            {proj.images.length}
                          </span>
                          {proj.videoUrl && (
                            <span title="Video attached" className="text-rose-500">
                              <Video size={13} />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Featured Toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(proj.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
                          title={proj.isFeatured ? "Unmark as featured" : "Mark as featured"}
                        >
                          <Star
                            size={16}
                            className={
                              proj.isFeatured
                                ? "text-amber-500 fill-amber-500"
                                : "text-slate-300 dark:text-[#3F3F46] hover:text-amber-400"
                            }
                          />
                        </button>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(proj.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
                            proj.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-slate-100 dark:bg-[#27272A] text-slate-500 dark:text-[#71717A] border-slate-200 dark:border-[#3F3F46] hover:bg-slate-200 dark:hover:bg-[#3F3F46]"
                          }`}
                        >
                          {proj.status === "ACTIVE" ? (
                            <>
                              <Eye size={11} /> Active
                            </>
                          ) : (
                            <>
                              <EyeOff size={11} /> Hidden
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(proj)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-[#71717A] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
                            title="Edit Project"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmProject(proj)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-[#71717A] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ─── Pagination Toolbar ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-[#27272A] bg-slate-50/50 dark:bg-[#09090B]/50">
              <span className="text-xs text-slate-500 dark:text-[#71717A]">
                Showing <strong className="text-slate-900 dark:text-[#FAFAFA]">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{" "}
                <strong className="text-slate-900 dark:text-[#FAFAFA]">{Math.min(currentPage * ITEMS_PER_PAGE, projects.length)}</strong> of{" "}
                <strong className="text-slate-900 dark:text-[#FAFAFA]">{projects.length}</strong> projects
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] text-slate-700 dark:text-[#E4E4E7] hover:bg-slate-50 dark:hover:bg-[#27272A] disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="flex items-center gap-1 text-xs">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 3 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg font-bold transition-colors ${
                          currentPage === pageNum
                            ? "bg-amber-500 text-white"
                            : "text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] text-slate-700 dark:text-[#E4E4E7] hover:bg-slate-50 dark:hover:bg-[#27272A] disabled:opacity-40 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Create / Edit Project Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#18181B] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#27272A] w-full max-w-3xl max-h-[90vh] flex flex-col my-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#27272A] bg-slate-50 dark:bg-[#09090B] rounded-t-3xl flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA]">
                    {editingProject ? "Edit Landmark Project" : "Add New Landmark Project"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#71717A]">
                    Configure project details, client, photos, and location coordinates
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-[#71717A] dark:hover:text-[#FAFAFA] hover:bg-slate-200/50 dark:hover:bg-[#27272A] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProject} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {modalError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* General Project Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-[#A1A1AA] uppercase mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Reliance JIO Regional HQ"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-[#A1A1AA] uppercase mb-1">
                    Client / Organization *
                  </label>
                  <input
                    type="text"
                    required
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    placeholder="e.g. Reliance Industries Limited"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Completion Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-[#A1A1AA] uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-[#A1A1AA] uppercase mb-1">
                    Completion Year
                  </label>
                  <input
                    type="text"
                    value={formCompletionYear}
                    onChange={(e) => setFormCompletionYear(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                  />
                </div>
              </div>

              {/* Location Details & Pan India */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-amber-500" />
                    <span className="font-bold text-slate-800 dark:text-[#FAFAFA] text-[11px] uppercase">
                      Geographic Location (For Interactive India Map)
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsPanIndia}
                      onChange={(e) => setFormIsPanIndia(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Pan India Account</span>
                  </label>
                </div>

                {!formIsPanIndia ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-[#71717A] mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        placeholder="e.g. Bengaluru"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-[#71717A] mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={formState}
                        onChange={(e) => setFormState(e.target.value)}
                        placeholder="e.g. Karnataka"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-[#71717A] mb-1">Location / Zone</label>
                      <input
                        type="text"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder="e.g. Electronic City Phase 1"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                    This project operates across multiple Indian states and appears with a nationwide beacon.
                  </p>
                )}
              </div>

              {/* Products Used (Tags) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-[#A1A1AA] uppercase mb-1">
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
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddProductTag}
                    className="px-4 py-2 bg-slate-800 dark:bg-[#27272A] text-white text-xs font-bold rounded-xl hover:bg-slate-700 dark:hover:bg-[#3F3F46] transition-colors"
                  >
                    Add Fitting
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl">
                  {formProductsUsed.length === 0 ? (
                    <span className="text-xs text-slate-400 dark:text-[#71717A]">No hardware fittings listed yet.</span>
                  ) : (
                    formProductsUsed.map((prod) => (
                      <span
                        key={prod}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/20"
                      >
                        <span>{prod}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductTag(prod)}
                          className="text-amber-500 hover:text-rose-500 transition-colors"
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
                <label className="block text-[11px] font-bold text-slate-700 dark:text-[#A1A1AA] uppercase mb-1">
                  Project Description &amp; Installation Scope
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Architectural glazing installation details, floor springs, partition layout..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none text-xs leading-relaxed"
                />
              </div>

              {/* Multi-Image Manager (Mandatory Min 2 Images) */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={15} className="text-amber-500" />
                    <span className="font-bold text-slate-800 dark:text-[#FAFAFA] text-[11px] uppercase">
                      Project Images Gallery (Minimum 2 Photos Required *)
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      formImages.length >= 2
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
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
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                  >
                    Add Image
                  </button>
                </div>

                {/* Thumbnails Rail */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {formImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-2xs aspect-video"
                    >
                      <img src={url} alt={`Project Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow">
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
                            <Star size={11} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white/20 text-white hover:bg-white/40 disabled:opacity-30"
                          title="Move Left"
                        >
                          <MoveUp size={11} className="-rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, idx + 1)}
                          disabled={idx === formImages.length - 1}
                          className="p-1 rounded bg-white/20 text-white hover:bg-white/40 disabled:opacity-30"
                          title="Move Right"
                        >
                          <MoveDown size={11} className="-rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="p-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                          title="Delete Image"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Video Support (16:9 Landscape) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-2.5">
                <div className="flex items-center gap-2">
                  <Video size={14} className="text-rose-500" />
                  <span className="font-bold text-slate-800 dark:text-[#FAFAFA] text-[11px] uppercase">
                    Project Video (Optional — 16:9 Landscape)
                  </span>
                </div>
                <input
                  type="url"
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  placeholder="e.g. https://www.youtube.com/watch?v=... or direct MP4 URL"
                  className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none text-xs"
                />
              </div>

              {/* Publication Settings */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-[#27272A]">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-[#FAFAFA]">Mark as Featured Showcase</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#FAFAFA]">Status:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-amber-500/30 focus:outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">Active (Published)</option>
                    <option value="INACTIVE">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-[#3F3F46] text-slate-700 dark:text-[#A1A1AA] font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50 shadow-sm shadow-amber-500/20"
                >
                  {saving && <RefreshCw size={13} className="animate-spin" />}
                  <span>{editingProject ? "Save Changes" : "Publish Project"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteConfirmProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272A] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 flex-shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA]">Delete Project</h3>
                <p className="text-xs text-slate-500 dark:text-[#71717A]">This action will permanently delete this record.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#A1A1AA]">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-[#FAFAFA]">"{deleteConfirmProject.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProject(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-[#3F3F46] text-slate-700 dark:text-[#A1A1AA] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
