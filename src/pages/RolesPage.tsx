import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Users,
  UserCog,
  ChevronRight,
  X,
  Save,
  CheckSquare,
  Square,
  Minus,
  AlertTriangle,
  RefreshCw,
  Check,
  Shield,
  Key,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Download,
  Copy,
  Search,
  Sliders,
  FolderLock,
  FileText,
  ShoppingBag,
  Calendar,
  MessageSquare,
  Settings,
  Activity,
  Tag,
  Eye,
  PlusCircle,
  PenTool,
  SlidersHorizontal,
  ShieldAlert,
  Crown,
} from "lucide-react";
import { rolesApi } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import type { Role, Permission, PermissionGroup } from "../types/admin";
import { useDebounce } from "../hooks/useDebounce";

/* ─── Skeleton Loading Body for Roles Page ───────────────────────────────────── */

export function RolesPageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#27272A]"></div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-60 bg-[#27272A] rounded"></div>
              <div className="h-4 w-28 bg-[#27272A] rounded-full"></div>
            </div>
            <div className="h-3 w-80 bg-[#27272A] rounded"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 bg-[#27272A] rounded-tr-xl rounded-bl-xl"></div>
          <div className="h-9 w-9 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#27272A]"></div>
            <div className="h-5 w-12 bg-[#27272A] rounded"></div>
            <div className="h-2.5 w-20 bg-[#27272A] rounded"></div>
          </div>
        ))}
      </div>

      {/* Split Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-4 rounded-2xl bg-[#18181B] border border-[#27272A] p-4 space-y-3">
          <div className="h-4 w-32 bg-[#27272A] rounded"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-[#27272A] rounded-xl"></div>
            ))}
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="lg:col-span-8 rounded-2xl bg-[#18181B] border border-[#27272A] p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
            <div className="h-5 w-48 bg-[#27272A] rounded"></div>
            <div className="h-8 w-28 bg-[#27272A] rounded-xl"></div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#27272A] rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CRUD Action Helper ─────────────────────────────────────────────────────── */
type CrudType = "create" | "read" | "update" | "delete" | "manage" | "other";

function getCrudType(slug: string): CrudType {
  const s = slug.toLowerCase();
  if (s.includes(".create") || s.startsWith("create.")) return "create";
  if (s.includes(".read") || s.startsWith("read.") || s.includes(".view")) return "read";
  if (s.includes(".update") || s.startsWith("update.") || s.includes(".edit") || s.includes(".adjust")) return "update";
  if (s.includes(".delete") || s.startsWith("delete.") || s.includes(".remove") || s.includes(".cancel")) return "delete";
  if (s.includes(".manage") || s.includes(".approve") || s.includes(".moderate") || s.includes(".sign")) return "manage";
  return "other";
}

function getCrudBadge(type: CrudType) {
  switch (type) {
    case "create":
      return (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-mono">
          CREATE
        </span>
      );
    case "read":
      return (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-500/30 font-mono">
          READ
        </span>
      );
    case "update":
      return (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/30 font-mono">
          UPDATE
        </span>
      );
    case "delete":
      return (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-500/30 font-mono">
          DELETE
        </span>
      );
    case "manage":
      return (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-400 border border-purple-500/30 font-mono">
          MANAGE
        </span>
      );
    default:
      return (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
          ACTION
        </span>
      );
  }
}

function getModuleIcon(module: string) {
  const m = module.toLowerCase();
  if (m.includes("user") || m.includes("auth")) return <Users size={14} />;
  if (m.includes("product") || m.includes("catalog") || m.includes("variant")) return <ShoppingBag size={14} />;
  if (m.includes("order") || m.includes("quote") || m.includes("po") || m.includes("invoice")) return <FileText size={14} />;
  if (m.includes("appointment")) return <Calendar size={14} />;
  if (m.includes("enquir")) return <MessageSquare size={14} />;
  if (m.includes("role") || m.includes("permission")) return <ShieldCheck size={14} />;
  if (m.includes("setting") || m.includes("config")) return <Settings size={14} />;
  if (m.includes("audit") || m.includes("report") || m.includes("dashboard")) return <Activity size={14} />;
  return <Layers size={14} />;
}

/* ─── Main Roles & Permissions Component ─────────────────────────────────────── */

export function RolesPage() {
  const { adminUser } = useAdminAuth();
  const rawRole = adminUser?.role as any;
  const loggedInRoleSlug = typeof rawRole === "object" && rawRole !== null
    ? (rawRole.slug ?? rawRole.name ?? "super_admin")
    : (rawRole ?? "super_admin");
  const isSuperAdminUser = (loggedInRoleSlug || "").toLowerCase().includes("super");

  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [allPerms, setAllPerms] = useState<PermissionGroup[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  // Search & Filter state
  const [roleSearch, setRoleSearch] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [selectedCrudFilter, setSelectedCrudFilter] = useState<"ALL" | CrudType>("ALL");
  const debouncedPermSearch = useDebounce(permSearch, 250);

  // Expanded Groups Set: BY DEFAULT EMPTY (All dropdowns are closed by default)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createRoleName, setCreateRoleName] = useState("");
  const [createRoleDesc, setCreateRoleDesc] = useState("");
  const [createPerms, setCreatePerms] = useState<Set<string>>(new Set());
  const [cloneSourceId, setCloneSourceId] = useState<string>("");
  const [createExpandedGroups, setCreateExpandedGroups] = useState<Set<string>>(new Set());

  // Edit Modal State
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");

  // Delete Modal State
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Check if selected role is Super Admin (immutable root access)
  const isSelectedSuperAdmin = useMemo(() => {
    if (!selectedRole) return false;
    const s = (selectedRole.slug || "").toLowerCase();
    const n = (selectedRole.name || "").toLowerCase();
    return s.includes("super") || n.includes("super admin");
  }, [selectedRole]);

  // Load Roles (clean decoupled fetch with NO dependency on selectedRole)
  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await rolesApi.list();
      if (res && res.success !== false) {
        const data: Role[] = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        setRoles(data);
        setSelectedRole((prev) => {
          if (!prev && data.length > 0) return data[0];
          if (prev) {
            const found = data.find((r) => r.id === prev.id);
            return found || data[0] || null;
          }
          return null;
        });
      }
    } catch (err: any) {
      console.error("[Roles Fetch Error]:", err);
      showFeedback("error", "Failed to load roles list.");
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  // Load Permissions (clean decoupled fetch)
  const loadPermissions = useCallback(async () => {
    setLoadingPerms(true);
    try {
      const res = await rolesApi.listPermissions();
      if (res && res.success !== false) {
        const groups: PermissionGroup[] = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        setAllPerms(groups);
      }
    } catch (err: any) {
      console.error("[Permissions Fetch Error]:", err);
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  // Initial Load on Mount
  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, [loadRoles, loadPermissions]);

  // Total Permissions in system
  const allSystemPermissionSlugs = useMemo(() => {
    const slugs: string[] = [];
    allPerms.forEach((g) => {
      g.permissions.forEach((p) => {
        slugs.push(p.slug || p.id);
      });
    });
    return slugs;
  }, [allPerms]);

  // Load Selected Role Permissions when selectedRole changes (without infinite loops)
  const selectedRoleId = selectedRole?.id;

  useEffect(() => {
    if (!selectedRoleId) return;
    let isCancelled = false;

    const fetchRolePermissions = async () => {
      const currentRole = roles.find((r) => r.id === selectedRoleId) || selectedRole;
      const isSuper =
        (currentRole?.slug || "").toLowerCase().includes("super") ||
        (currentRole?.name || "").toLowerCase().includes("super admin");

      if (isSuper) {
        const slugs: string[] = [];
        allPerms.forEach((g) => {
          g.permissions.forEach((p) => slugs.push(p.slug || p.id));
        });
        if (!isCancelled) setRolePerms(new Set(slugs));
        return;
      }

      setLoadingDetail(true);
      try {
        const res = await rolesApi.getById(selectedRoleId);
        if (!isCancelled && res && res.success !== false) {
          const rData = res.data ?? res;
          const pSlugs: string[] = (rData.permissions ?? []).map((p: any) =>
            typeof p === "string" ? p : p.slug ?? p.id
          );
          setRolePerms(new Set(pSlugs));
        }
      } catch (err: any) {
        if (!isCancelled) showFeedback("error", err.message || "Failed to load role permissions.");
      } finally {
        if (!isCancelled) setLoadingDetail(false);
      }
    };

    fetchRolePermissions();
    setExpandedGroups(new Set()); // Closed by default

    return () => {
      isCancelled = true;
    };
  }, [selectedRoleId, allPerms]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = roles.length;
    const system = roles.filter((r) => r.isSystem).length;
    const custom = roles.filter((r) => !r.isSystem).length;
    const totalPermsCount = allPerms.reduce((acc, g) => acc + (g.permissions?.length || 0), 0);
    return { total, system, custom, totalPermsCount };
  }, [roles, allPerms]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const q = roleSearch.toLowerCase();
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, roleSearch]);

  // Filtered Permissions by Search & CRUD
  const filteredPermissionGroups = useMemo(() => {
    const searchQ = debouncedPermSearch.toLowerCase().trim();

    return allPerms
      .map((g) => {
        const matchingPerms = g.permissions.filter((p) => {
          const type = getCrudType(p.slug || p.id);
          if (selectedCrudFilter !== "ALL" && type !== selectedCrudFilter) {
            return false;
          }
          if (!searchQ) return true;
          return (
            p.name.toLowerCase().includes(searchQ) ||
            p.slug.toLowerCase().includes(searchQ) ||
            (p.description && p.description.toLowerCase().includes(searchQ))
          );
        });

        return {
          ...g,
          permissions: matchingPerms,
        };
      })
      .filter((g) => g.permissions.length > 0);
  }, [allPerms, debouncedPermSearch, selectedCrudFilter]);

  // Toggle single permission for active role (blocked for Super Admin)
  const handleTogglePermission = (slug: string) => {
    if (isSelectedSuperAdmin) return;
    setRolePerms((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // Toggle all permissions for a group (blocked for Super Admin)
  const handleToggleGroup = (group: PermissionGroup) => {
    if (isSelectedSuperAdmin) return;
    const groupSlugs = group.permissions.map((p) => p.slug || p.id);
    const allChecked = groupSlugs.every((slug) => rolePerms.has(slug));

    setRolePerms((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        groupSlugs.forEach((s) => next.delete(s));
      } else {
        groupSlugs.forEach((s) => next.add(s));
      }
      return next;
    });
  };

  // Module-Level CRUD Selector
  const handleModuleCrudToggle = (group: PermissionGroup, crudType: CrudType) => {
    if (isSelectedSuperAdmin) return;
    const targetPerms = group.permissions.filter((p) => getCrudType(p.slug || p.id) === crudType);
    const targetSlugs = targetPerms.map((p) => p.slug || p.id);
    if (targetSlugs.length === 0) return;

    const allChecked = targetSlugs.every((s) => rolePerms.has(s));
    setRolePerms((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        targetSlugs.forEach((s) => next.delete(s));
      } else {
        targetSlugs.forEach((s) => next.add(s));
      }
      return next;
    });
  };

  // Global CRUD Selector
  const handleGlobalCrudToggle = (crudType: CrudType) => {
    if (isSelectedSuperAdmin) return;
    const targetSlugs: string[] = [];
    allPerms.forEach((g) => {
      g.permissions.forEach((p) => {
        if (getCrudType(p.slug || p.id) === crudType) {
          targetSlugs.push(p.slug || p.id);
        }
      });
    });

    const allChecked = targetSlugs.every((s) => rolePerms.has(s));
    setRolePerms((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        targetSlugs.forEach((s) => next.delete(s));
      } else {
        targetSlugs.forEach((s) => next.add(s));
      }
      return next;
    });
  };

  // Toggle Global All (blocked for Super Admin)
  const handleToggleGlobalAll = () => {
    if (isSelectedSuperAdmin) return;
    if (rolePerms.size === allSystemPermissionSlugs.length) {
      setRolePerms(new Set());
    } else {
      setRolePerms(new Set(allSystemPermissionSlugs));
    }
  };

  // Toggle Group Expand/Collapse
  const handleToggleGroupAccordion = (module: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allModules = allPerms.map((g) => g.module);
    setExpandedGroups(new Set(allModules));
  };

  const handleCollapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Save permissions (blocked for Super Admin)
  const handleSavePermissions = async () => {
    if (!selectedRole || isSelectedSuperAdmin) return;
    setSavingPerms(true);
    try {
      const res = await rolesApi.updatePermissions(selectedRole.id, Array.from(rolePerms));
      if (res && res.success !== false) {
        showFeedback("success", `Successfully updated permissions for ${selectedRole.name}.`);
        await loadRoles();
      } else {
        showFeedback("error", res.message || "Failed to update permissions.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to update permissions.");
    } finally {
      setSavingPerms(false);
    }
  };

  // Clone from role for create modal
  const handleCloneFromRole = async (sourceRoleId: string) => {
    setCloneSourceId(sourceRoleId);
    if (!sourceRoleId) {
      setCreatePerms(new Set());
      return;
    }

    try {
      const res = await rolesApi.getById(sourceRoleId);
      if (res && res.success !== false) {
        const rData = res.data ?? res;
        const pSlugs: string[] = (rData.permissions ?? []).map((p: any) =>
          typeof p === "string" ? p : p.slug ?? p.id
        );
        setCreatePerms(new Set(pSlugs));
      }
    } catch (err: any) {
      console.error("Clone error:", err);
    }
  };

  // Toggle permission in Create Modal
  const handleToggleCreatePerm = (slug: string) => {
    setCreatePerms((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleToggleCreateGroup = (group: PermissionGroup) => {
    const groupSlugs = group.permissions.map((p) => p.slug || p.id);
    const allChecked = groupSlugs.every((s) => createPerms.has(s));

    setCreatePerms((prev) => {
      const next = new Set(prev);
      if (allChecked) groupSlugs.forEach((s) => next.delete(s));
      else groupSlugs.forEach((s) => next.add(s));
      return next;
    });
  };

  const handleToggleCreateAccordion = (module: string) => {
    setCreateExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  // Submit Create Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRoleName.trim()) {
      showFeedback("error", "Please provide a role name.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await rolesApi.create({
        name: createRoleName.trim(),
        description: createRoleDesc.trim() || undefined,
        permissions: Array.from(createPerms),
      });

      if (res && res.success !== false) {
        showFeedback("success", `Custom role "${createRoleName}" created successfully!`);
        setShowCreateModal(false);
        setCreateRoleName("");
        setCreateRoleDesc("");
        setCreatePerms(new Set());
        setCloneSourceId("");
        setCreateExpandedGroups(new Set());
        await loadRoles();
      } else {
        showFeedback("error", res.message || "Failed to create role.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to create role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Role Metadata
  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editRoleName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await rolesApi.update(editingRole.id, {
        name: editRoleName.trim(),
        description: editRoleDesc.trim() || undefined,
      });

      if (res && res.success !== false) {
        showFeedback("success", `Role "${editRoleName}" updated successfully.`);
        setEditingRole(null);
        await loadRoles();
      } else {
        showFeedback("error", res.message || "Failed to update role.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to update role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete Role
  const handleConfirmDeleteRole = async () => {
    if (!deletingRole) return;
    setIsSubmitting(true);
    try {
      const res = await rolesApi.delete(deletingRole.id);
      if (res && res.success !== false) {
        showFeedback("success", `Role "${deletingRole.name}" deleted permanently.`);
        setDeletingRole(null);
        setRoles((prev) => prev.filter((r) => r.id !== deletingRole.id));
        if (selectedRole?.id === deletingRole.id) {
          setSelectedRole(roles.find((r) => r.id !== deletingRole.id) || null);
        }
      } else {
        showFeedback("error", res.message || res.error?.message || "Failed to delete role.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to delete role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingRoles && roles.length === 0) {
    return <RolesPageSkeleton />;
  }

  return (
    <div className="space-y-3 sm:space-y-5 md:space-y-6 text-[#FAFAFA] max-w-[1600px] mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#27272A] pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-tr-xl rounded-bl-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A855F7] flex-shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold text-[#FAFAFA]">
                Roles & RBAC Permissions
              </h1>
              <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                CRUD GOVERNANCE
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#A1A1AA]">
              Define custom privilege roles, grant granular Create, Read, Update, Delete actions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdminUser && (
            <button
              type="button"
              onClick={() => {
                setCreateRoleName("");
                setCreateRoleDesc("");
                setCreatePerms(new Set());
                setCloneSourceId("");
                setCreateExpandedGroups(new Set());
                setShowCreateModal(true);
              }}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs px-4 py-2 rounded-tr-xl rounded-bl-xl transition-all shadow-sm flex items-center gap-2"
            >
              <Plus size={15} />
              <span>Create Custom Role</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => { loadRoles(); loadPermissions(); }}
            className="p-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-tr-lg rounded-bl-lg text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#3F3F46] transition-colors"
            title="Refresh Roles"
          >
            <RefreshCw size={16} className={loadingRoles ? "animate-spin text-[#A855F7]" : ""} />
          </button>
        </div>
      </div>

      {/* Super Admin Privileges Callout Banner */}
      {isSuperAdminUser ? (
        <div className="p-3.5 bg-purple-950/20 border border-purple-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-amber-400" />
            <span>
              <strong>Super Admin Privilege:</strong> Only Super Administrators can define new custom roles, clone permission templates, and adjust RBAC security privileges.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateRoleName("");
              setCreateRoleDesc("");
              setCreatePerms(new Set());
              setCloneSourceId("");
              setCreateExpandedGroups(new Set());
              setShowCreateModal(true);
            }}
            className="text-[11px] font-bold text-[#A855F7] hover:text-purple-300 underline"
          >
            + Create Custom Role
          </button>
        </div>
      ) : (
        <div className="p-3 bg-zinc-900/80 border border-zinc-700 rounded-xl flex items-center gap-2 text-xs text-zinc-400">
          <Lock size={14} className="text-zinc-500" />
          <span>
            <strong>Read-Only Access:</strong> Custom role creation and permission modifications are restricted strictly to Super Administrators.
          </span>
        </div>
      )}

      {/* ─── 4 Interactive KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider">Defined Roles</span>
          <p className="text-xl font-black font-mono text-[#FAFAFA]">{metrics.total}</p>
          <span className="text-[10px] text-[#71717A] block">Total privilege templates</span>
        </div>

        <div className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">System Roles</span>
          <p className="text-xl font-black font-mono text-[#A855F7]">{metrics.system}</p>
          <span className="text-[10px] text-[#71717A] block">Protected core roles</span>
        </div>

        <div className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Custom Roles</span>
          <p className="text-xl font-black font-mono text-emerald-400">{metrics.custom}</p>
          <span className="text-[10px] text-[#71717A] block">Staff-tailored assignments</span>
        </div>

        <div className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Granular Perms</span>
          <p className="text-xl font-black font-mono text-cyan-400">{metrics.totalPermsCount}</p>
          <span className="text-[10px] text-[#71717A] block">Discrete CRUD scopes</span>
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

      {/* ─── Main Split View: Roles List & Permissions Matrix ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Left Column: Role Selector (4 Cols) ── */}
        <div className="lg:col-span-4 rounded-2xl bg-[#18181B] border border-[#27272A] p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
            <span className="text-[11px] uppercase font-bold text-[#A1A1AA] tracking-wider">
              Role Profiles ({roles.length})
            </span>
          </div>

          {/* Search Roles */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              placeholder="Filter roles by name..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
            />
            {roleSearch && (
              <button
                type="button"
                onClick={() => setRoleSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {filteredRoles.map((r) => {
              const isSelected = selectedRole?.id === r.id;
              const isSuper = (r.slug || "").toLowerCase().includes("super") || (r.name || "").toLowerCase().includes("super admin");

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRole(r)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? "bg-purple-950/30 border-[#8B5CF6] shadow-lg shadow-purple-900/10 ring-1 ring-[#8B5CF6]"
                      : "bg-[#09090B] border-[#27272A] hover:border-[#3F3F46]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSuper ? (
                        <Crown size={15} className="text-amber-400" />
                      ) : (
                        <Shield size={15} className={isSelected ? "text-[#A855F7]" : "text-[#71717A]"} />
                      )}
                      <p className="font-bold text-xs text-[#FAFAFA]">{r.name}</p>
                    </div>
                    {isSuper ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ROOT MASTER
                      </span>
                    ) : r.isSystem ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        SYSTEM
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                        CUSTOM
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#A1A1AA] line-clamp-1">
                    {r.description || `Configured permissions template for ${r.name}`}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#27272A]/40 text-[10px]">
                    <span className="text-[#71717A] flex items-center gap-1">
                      <Users size={11} /> {r.userCount ?? 0} active users
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateRoleName(`${r.name} (Copy)`);
                          setCreateRoleDesc(`Cloned permissions from ${r.name}`);
                          handleCloneFromRole(r.id);
                          setShowCreateModal(true);
                        }}
                        className="p-1 text-[#A1A1AA] hover:text-[#FAFAFA]"
                        title="Duplicate / Clone Role"
                      >
                        <Copy size={11} />
                      </button>
                      {!r.isSystem && !isSuper && isSuperAdminUser && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRole(r);
                              setEditRoleName(r.name);
                              setEditRoleDesc(r.description || "");
                            }}
                            className="p-1 text-amber-400 hover:text-amber-300"
                            title="Edit Role Metadata"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingRole(r)}
                            className="p-1 text-rose-400 hover:text-rose-300"
                            title="Permanently Delete Role"
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Column: Granular Permissions Matrix (8 Cols) ── */}
        <div className="lg:col-span-8 rounded-2xl bg-[#18181B] border border-[#27272A] p-6 space-y-5 shadow-lg">
          {selectedRole ? (
            <>
              {/* Role Header & Save Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#FAFAFA]">
                      Permissions for "{selectedRole.name}"
                    </h2>
                    {isSelectedSuperAdmin ? (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Crown size={12} />
                        <span>Root Access (Immutable)</span>
                      </span>
                    ) : selectedRole.isSystem ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        System Protected
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                        Custom Role Matrix
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    {isSelectedSuperAdmin ? (
                      <span className="text-amber-400 font-semibold">
                        Full unrestricted root privileges across all {allSystemPermissionSlugs.length} system operations by default.
                      </span>
                    ) : (
                      <>
                        <strong>{rolePerms.size}</strong> of {allSystemPermissionSlugs.length} discrete CRUD capabilities assigned to this role.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isSelectedSuperAdmin ? (
                    <div className="px-3.5 py-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                      <Lock size={13} />
                      <span>Full Access by Default</span>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleToggleGlobalAll}
                        className="px-3 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-xl font-bold text-xs border border-[#3F3F46] transition-all"
                      >
                        {rolePerms.size === allSystemPermissionSlugs.length ? "Deselect All" : "Grant All"}
                      </button>

                      <button
                        type="button"
                        disabled={savingPerms}
                        onClick={handleSavePermissions}
                        className="bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-tr-xl rounded-bl-xl transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Save size={14} />
                        <span>{savingPerms ? "Saving..." : "Save Role Permissions"}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ─── Super Admin Notice Banner ─── */}
              {isSelectedSuperAdmin && (
                <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                  <ShieldAlert size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-300">Root Master Role Immutable</p>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Super Admin cannot update or restrict his permissions. The Super Admin account possesses unconditional, root-level bypass across all endpoints and CRUD operations in the entire platform.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── Global CRUD Quick Toggle Filter Toolbar ─── */}
              <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider flex items-center gap-1">
                    <SlidersHorizontal size={12} className="text-[#A855F7]" />
                    <span>Global CRUD Batch Toggles:</span>
                  </span>

                  {!isSelectedSuperAdmin && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleGlobalCrudToggle("read")}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/40 transition-all flex items-center gap-1"
                      >
                        <Eye size={11} />
                        <span>Toggle All Read</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGlobalCrudToggle("create")}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1"
                      >
                        <PlusCircle size={11} />
                        <span>Toggle All Create</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGlobalCrudToggle("update")}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1"
                      >
                        <PenTool size={11} />
                        <span>Toggle All Update</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGlobalCrudToggle("delete")}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 transition-all flex items-center gap-1"
                      >
                        <Trash2 size={11} />
                        <span>Toggle All Delete</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Search & Accordion Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#27272A]/50">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                    <input
                      type="text"
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      placeholder="Filter permissions by name or slug..."
                      className="w-full pl-8 pr-7 py-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    {permSearch && (
                      <button
                        type="button"
                        onClick={() => setPermSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-[#18181B] p-1 rounded-lg border border-[#27272A] text-[10px]">
                      {(["ALL", "create", "read", "update", "delete"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setSelectedCrudFilter(mode)}
                          className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${
                            selectedCrudFilter === mode
                              ? "bg-[#8B5CF6] text-white"
                              : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={handleExpandAll}
                        className="px-2 py-1 rounded bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A]"
                      >
                        Expand All
                      </button>
                      <button
                        type="button"
                        onClick={handleCollapseAll}
                        className="px-2 py-1 rounded bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A]"
                      >
                        Collapse All
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Permission Groups (CLOSED BY DEFAULT) ─── */}
              <div className="space-y-3">
                {filteredPermissionGroups.map((group) => {
                  const groupSlugs = group.permissions.map((p) => p.slug || p.id);
                  const checkedCount = isSelectedSuperAdmin
                    ? groupSlugs.length
                    : groupSlugs.filter((s) => rolePerms.has(s)).length;
                  const isExpanded = expandedGroups.has(group.module); // Closed by default

                  return (
                    <div
                      key={group.module}
                      className="rounded-xl border border-[#27272A] bg-[#09090B] overflow-hidden shadow-sm transition-all"
                    >
                      {/* Accordion Header */}
                      <div className="p-3 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between">
                        <div
                          className="flex items-center gap-2 cursor-pointer select-none flex-1"
                          onClick={() => handleToggleGroupAccordion(group.module)}
                        >
                          <div className="p-1.5 rounded-lg bg-[#27272A] text-[#A855F7]">
                            {getModuleIcon(group.module)}
                          </div>
                          <span className="text-xs font-bold uppercase text-[#FAFAFA] tracking-wider">
                            {group.module}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-[#A855F7] border border-purple-500/20">
                            {checkedCount} / {groupSlugs.length} Granted
                          </span>
                        </div>

                        {/* Module-Level Quick Action Pills */}
                        <div className="flex items-center gap-2">
                          {!isSelectedSuperAdmin && (
                            <div className="hidden sm:flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleModuleCrudToggle(group, "read")}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30"
                                title="Toggle all Read permissions in this module"
                              >
                                Read
                              </button>
                              <button
                                type="button"
                                onClick={() => handleModuleCrudToggle(group, "create")}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30"
                                title="Toggle all Create permissions in this module"
                              >
                                Create
                              </button>
                              <button
                                type="button"
                                onClick={() => handleModuleCrudToggle(group, "update")}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30"
                                title="Toggle all Update permissions in this module"
                              >
                                Update
                              </button>
                              <button
                                type="button"
                                onClick={() => handleModuleCrudToggle(group, "delete")}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30"
                                title="Toggle all Delete permissions in this module"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleGroup(group)}
                                className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-950/50 hover:bg-purple-900/70 text-purple-300 border border-purple-500/40"
                              >
                                Toggle All
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleGroupAccordion(group.module)}
                            className="p-1 rounded bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                            title={isExpanded ? "Collapse dropdown" : "Expand dropdown"}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Dropdown Body: Rendered ONLY when expanded */}
                      {isExpanded && (
                        <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#09090B]">
                          {group.permissions.map((p) => {
                            const isChecked = isSelectedSuperAdmin ? true : rolePerms.has(p.slug || p.id);
                            const crudType = getCrudType(p.slug || p.id);

                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
                                  isSelectedSuperAdmin
                                    ? "bg-amber-950/15 border-amber-500/30 text-[#FAFAFA] cursor-default"
                                    : isChecked
                                    ? "bg-purple-950/20 border-purple-500/40 text-[#FAFAFA] cursor-pointer"
                                    : "bg-[#18181B]/40 border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={isSelectedSuperAdmin}
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(p.slug || p.id)}
                                  className="mt-0.5 rounded text-[#8B5CF6] focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="font-bold text-xs leading-tight text-[#FAFAFA]">
                                      {p.name}
                                    </p>
                                    {getCrudBadge(crudType)}
                                  </div>
                                  <span className="font-mono text-[10px] text-[#71717A] block">
                                    {p.slug}
                                  </span>
                                  {p.description && (
                                    <p className="text-[10px] text-[#A1A1AA] line-clamp-1">
                                      {p.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-[#71717A]">
              <Shield size={32} className="mx-auto mb-2 text-[#3F3F46]" />
              Select a role from the left list to inspect and configure security privileges.
            </div>
          )}
        </div>

      </div>

      {/* ─── MODAL 1: CREATE CUSTOM ROLE WITH PERMISSIONS MODAL ─── */}
      {showCreateModal && isSuperAdminUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#8B5CF6]" />
                <span>Create Custom Privilege Role</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 overflow-y-auto pr-1 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Role Name *</label>
                  <input
                    type="text"
                    required
                    value={createRoleName}
                    onChange={(e) => setCreateRoleName(e.target.value)}
                    placeholder="e.g. Warehouse Lead Dispatcher"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Clone Permissions from Role</label>
                  <select
                    value={cloneSourceId}
                    onChange={(e) => handleCloneFromRole(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="">Start from Blank Template</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.slug})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Role Description</label>
                <input
                  type="text"
                  value={createRoleDesc}
                  onChange={(e) => setCreateRoleDesc(e.target.value)}
                  placeholder="Operational scope, warehouse dispatches, quotation authorization..."
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* In-Modal Permissions Checklist (Dropdowns closed by default) */}
              <div className="space-y-2 pt-2 border-t border-[#27272A]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-[#A855F7] tracking-wider">
                    Select Initial Permissions ({createPerms.size} Granted)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (createPerms.size === allSystemPermissionSlugs.length) setCreatePerms(new Set());
                      else setCreatePerms(new Set(allSystemPermissionSlugs));
                    }}
                    className="text-[11px] font-bold text-purple-400 hover:text-purple-300"
                  >
                    {createPerms.size === allSystemPermissionSlugs.length ? "Clear All" : "Select All"}
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-[#09090B] rounded-xl border border-[#27272A]">
                  {allPerms.map((group) => {
                    const groupSlugs = group.permissions.map((p) => p.slug || p.id);
                    const isAll = groupSlugs.every((s) => createPerms.has(s));
                    const isExpanded = createExpandedGroups.has(group.module); // closed by default

                    return (
                      <div key={group.module} className="rounded-lg border border-[#27272A] bg-[#18181B] overflow-hidden">
                        <div className="p-2 flex items-center justify-between">
                          <div
                            className="flex items-center gap-2 cursor-pointer flex-1"
                            onClick={() => handleToggleCreateAccordion(group.module)}
                          >
                            <span className="text-[11px] font-bold uppercase text-[#FAFAFA]">
                              {group.module}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#27272A] text-[#A1A1AA]">
                              {group.permissions.filter((p) => createPerms.has(p.slug || p.id)).length}/{groupSlugs.length}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCreateGroup(group)}
                              className="text-[10px] text-purple-400 hover:text-purple-300 font-bold"
                            >
                              {isAll ? "Deselect" : "Select"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCreateAccordion(group.module)}
                              className="text-[#71717A] hover:text-[#FAFAFA]"
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-[#09090B] border-t border-[#27272A]">
                            {group.permissions.map((p) => {
                              const isChecked = createPerms.has(p.slug || p.id);
                              const crudType = getCrudType(p.slug || p.id);

                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                                    isChecked
                                      ? "bg-purple-950/30 border-purple-500/40 text-[#FAFAFA]"
                                      : "bg-[#18181B] border-[#27272A] text-[#A1A1AA]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleCreatePerm(p.slug || p.id)}
                                      className="rounded text-[#8B5CF6] focus:ring-0 cursor-pointer"
                                    />
                                    <span className="font-medium text-[11px] truncate">{p.name}</span>
                                  </div>
                                  {getCrudBadge(crudType)}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  {isSubmitting ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT ROLE METADATA MODAL ─── */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <Edit2 size={16} className="text-amber-400" />
                <span>Edit Role Metadata</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditRole} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Role Name *</label>
                <input
                  type="text"
                  required
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Description</label>
                <textarea
                  rows={3}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl p-3 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl font-bold shadow"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DELETE ROLE MODAL ─── */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-sm text-[#FAFAFA]">Delete Role Permanently?</h3>
            <p className="text-xs text-[#A1A1AA]">
              Are you sure you want to permanently delete role <strong>"{deletingRole.name}"</strong>? Any permissions linked will be removed from the database.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs text-[#FAFAFA] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRole}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow"
              >
                {isSubmitting ? "Deleting..." : "Yes, Delete Role"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
