import React, { useState, useEffect, useCallback } from "react";
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
  Loader2,
  RefreshCw,
  Check,
  Shield,
  Key,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { rolesApi } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import type { Role, Permission, PermissionGroup } from "../types/admin";

/* ─── Toast ────────────────────────────────────────────────────────────────── */
interface Toast { id: number; type: "success" | "error"; msg: string; }
let _tid = 0;
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((type: "success" | "error", msg: string) => {
    const id = ++_tid;
    setToasts((p) => [...p, { id, type, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

/* ─── Skeletons ─────────────────────────────────────────────────────────────── */
function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-[#27272A] animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-[#3F3F46]" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-[#3F3F46]" />
        <div className="h-2.5 w-40 rounded bg-slate-100 dark:bg-[#27272A]" />
      </div>
    </div>
  );
}

function PermSkeleton() {
  return (
    <div className="space-y-3 animate-pulse p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-slate-100 dark:border-[#27272A] overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-[#27272A]/60 flex items-center gap-2">
            <div className="h-3.5 w-3.5 rounded bg-slate-200 dark:bg-[#3F3F46]" />
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-[#3F3F46]" />
          </div>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[1,2,3,4].map((j) => <div key={j} className="h-8 rounded-lg bg-slate-100 dark:bg-[#27272A]" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Module colours ────────────────────────────────────────────────────────── */
const MOD_CLR: Record<string, string> = {
  users: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  roles: "text-violet-600 bg-violet-50 dark:bg-violet-900/20",
  products: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
  categories: "text-green-600 bg-green-50 dark:bg-green-900/20",
  orders: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
  banners: "text-pink-600 bg-pink-50 dark:bg-pink-900/20",
  settings: "text-slate-600 bg-slate-100 dark:bg-slate-900/30",
  reports: "text-teal-600 bg-teal-50 dark:bg-teal-900/20",
  auth: "text-red-600 bg-red-50 dark:bg-red-900/20",
};
const modClr = (m: string) => MOD_CLR[m.toLowerCase()] ?? "text-[#8B5CF6] bg-[#8B5CF6]/10";

/* ══════════════════════════════════════════════════════════════════════════════
   RolesPage
══════════════════════════════════════════════════════════════════════════════ */
export function RolesPage() {
  const { toasts, add: toast } = useToast();
  const { adminUser } = useAdminAuth();
  // role may arrive as "super_admin" string OR as {slug:"super_admin"} object
  const roleValue = adminUser?.role;
  const roleSlug = typeof roleValue === "object" && roleValue !== null
    ? (roleValue as any).slug ?? (roleValue as any).name ?? ""
    : roleValue ?? "";
  const isSuperAdmin = roleSlug === "super_admin";

  /* ── State ── */
  const [roles, setRoles]               = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [allPerms, setAllPerms]         = useState<PermissionGroup[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const [selected, setSelected]                 = useState<Role | null>(null);
  const [rolePerms, setRolePerms]               = useState<Set<string>>(new Set());
  const [loadingDetail, setLoadingDetail]       = useState(false);
  const [savingPerms, setSavingPerms]           = useState(false);
  const [collapsed, setCollapsed]               = useState<Set<string>>(new Set());

  /* modal */
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<Role | null>(null);
  const [fName, setFName]           = useState("");
  const [fDesc, setFDesc]           = useState("");
  const [savingModal, setSavingModal] = useState(false);

  /* delete */
  const [delRole, setDelRole]         = useState<Role | null>(null);
  const [confirming, setConfirming]   = useState(false);

  /* inline edit */
  const [editDetail, setEditDetail]   = useState(false);
  const [dName, setDName]             = useState("");
  const [dDesc, setDDesc]             = useState("");
  const [savingDetail, setSavingDetail] = useState(false);

  /* ── Fetchers ── */
  useEffect(() => { loadRoles(); loadAllPerms(); }, []);

  const loadRoles = async () => {
    setLoadingRoles(true);
    const res = await rolesApi.list();
    setLoadingRoles(false);
    const data = res?.data ?? (Array.isArray(res) ? res : null);
    if (data) setRoles(data);
    else toast("error", res?.message || "Failed to load roles");
  };

  const loadAllPerms = async () => {
    setLoadingPerms(true);
    const res = await rolesApi.listPermissions();
    setLoadingPerms(false);
    const data = res?.data ?? (Array.isArray(res) ? res : null);
    if (data) setAllPerms(data);
  };

  const selectRole = async (role: Role) => {
    setSelected(role);
    setDName(role.name); setDDesc(role.description ?? "");
    setEditDetail(false);
    setLoadingDetail(true);
    const res = await rolesApi.getById(role.id);
    setLoadingDetail(false);
    const detail: Role = res?.data ?? res;
    if (detail?.permissions) {
      setRolePerms(new Set(detail.permissions.map((p: Permission) => p.id)));
      setSelected({ ...role, ...detail });
    }
  };

  /* ── Modal helpers ── */
  const openCreate = () => { setEditing(null); setFName(""); setFDesc(""); setShowModal(true); };
  const openEdit   = (r: Role, e: React.MouseEvent) => {
    e.stopPropagation(); setEditing(r); setFName(r.name); setFDesc(r.description ?? ""); setShowModal(true);
  };

  const submitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim()) return;
    setSavingModal(true);
    try {
      if (editing) {
        const res = await rolesApi.update(editing.id, { name: fName.trim(), description: fDesc.trim() || undefined });
        if (res?.success === false) throw new Error(res.message);
        toast("success", "Role updated");
        if (selected?.id === editing.id) setSelected((p) => p ? { ...p, name: fName.trim(), description: fDesc.trim() } : p);
      } else {
        const res = await rolesApi.create({ name: fName.trim(), description: fDesc.trim() || undefined });
        if (res?.success === false) throw new Error(res.message);
        toast("success", "Role created");
      }
      setShowModal(false);
      loadRoles();
    } catch (err: any) {
      toast("error", err.message || "Something went wrong");
    } finally { setSavingModal(false); }
  };

  /* ── Delete ── */
  const doDelete = async () => {
    if (!delRole) return;
    setConfirming(true);
    const res = await rolesApi.delete(delRole.id);
    setConfirming(false);
    if (res?.success === false) toast("error", res.message || "Delete failed");
    else {
      toast("success", "Role deleted");
      if (selected?.id === delRole.id) setSelected(null);
      loadRoles();
    }
    setDelRole(null);
  };

  /* ── Permission toggles ── */
  const togglePerm = (id: string) =>
    setRolePerms((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleModule = (g: PermissionGroup) => {
    const ids = g.permissions.map((p) => p.id);
    const allOn = ids.every((id) => rolePerms.has(id));
    setRolePerms((p) => { const n = new Set(p); if (allOn) ids.forEach((id) => n.delete(id)); else ids.forEach((id) => n.add(id)); return n; });
  };

  const savePerms = async () => {
    if (!selected) return;
    setSavingPerms(true);
    const res = await rolesApi.updatePermissions(selected.id, [...rolePerms]);
    setSavingPerms(false);
    if (res?.success === false) toast("error", res.message || "Save failed");
    else toast("success", "Permissions saved");
  };

  /* ── Inline detail save ── */
  const saveDetail = async () => {
    if (!selected || !dName.trim()) return;
    setSavingDetail(true);
    const res = await rolesApi.update(selected.id, { name: dName.trim(), description: dDesc.trim() || undefined });
    setSavingDetail(false);
    if (res?.success === false) { toast("error", res.message || "Update failed"); return; }
    toast("success", "Role updated");
    setSelected((p) => p ? { ...p, name: dName.trim(), description: dDesc.trim() } : p);
    setRoles((p) => p.map((r) => r.id === selected.id ? { ...r, name: dName.trim(), description: dDesc.trim() } : r));
    setEditDetail(false);
  };

  /* ── Derived ── */
  const modState = (g: PermissionGroup) => {
    const ids = g.permissions.map((p) => p.id);
    const n = ids.filter((id) => rolePerms.has(id)).length;
    return n === 0 ? "none" : n === ids.length ? "all" : "some";
  };

  /* ══════════════════════════════════════════════════════════════════════════
     JSX
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 112px)" }}>

      {/* Toast */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold pointer-events-auto border ${
            t.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-200"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200"
          }`}>
            {t.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
            {t.msg}
          </div>
        ))}
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6]/10 flex items-center justify-center">
            <ShieldCheck size={20} className="text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight">Roles & Permissions</h1>
            <p className="text-xs text-slate-500 dark:text-[#71717A]">Define access levels and assign granular permissions to roles</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRoles} title="Refresh" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors">
            <RefreshCw size={15} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold px-4 py-2 rounded-tr-xl rounded-bl-xl shadow-md shadow-[#8B5CF6]/25 transition-colors">
            <Plus size={14} /> Create Role
          </button>
        </div>
      </div>

      {/* Two-panel */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* LEFT — role list */}
        <div className="w-full md:w-72 lg:w-80 flex-shrink-0 flex flex-col bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-tr-2xl rounded-bl-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-[#27272A] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-[#71717A] uppercase tracking-wider">All Roles</span>
              <span className="text-[10px] font-bold bg-[#8B5CF6]/10 text-[#8B5CF6] px-2 py-0.5 rounded-full">{roles.length}</span>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6] hover:bg-[#8B5CF6]/10 px-2 py-1 rounded-lg transition-colors"
            >
              <Plus size={13} /> Add Role
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingRoles ? (
              <><RowSkeleton /><RowSkeleton /><RowSkeleton /><RowSkeleton /></>
            ) : roles.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 dark:text-[#52525B]">
                <Shield size={32} strokeWidth={1.5} />
                <p className="text-sm font-medium">No roles yet</p>
                <button onClick={openCreate} className="text-xs text-[#8B5CF6] hover:underline">Create first role</button>
              </div>
            ) : roles.map((role) => {
              const active = selected?.id === role.id;
              return (
                <button key={role.id} onClick={() => selectRole(role)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-l-2 transition-all group ${
                    active
                      ? "bg-[#8B5CF6]/8 border-l-[#8B5CF6] border-b-slate-50 dark:border-b-[#27272A]/60"
                      : "border-l-transparent border-b-slate-50 dark:border-b-[#27272A]/60 hover:bg-slate-50 dark:hover:bg-[#27272A]/50"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    active ? "bg-[#8B5CF6] text-white" : "bg-slate-100 dark:bg-[#27272A] text-slate-400 dark:text-[#71717A]"
                  }`}>
                    {role.isSystem ? <Lock size={14} /> : <Shield size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold truncate ${active ? "text-[#8B5CF6]" : "text-slate-800 dark:text-[#FAFAFA]"}`}>
                        {role.name}
                      </span>
                      {role.isSystem && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-wide flex-shrink-0">
                          System
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-400 dark:text-[#52525B] truncate">{role.slug}</span>
                      <span className="text-[10px] text-slate-400 dark:text-[#52525B] flex items-center gap-0.5 flex-shrink-0">
                        <Users size={9} />{role.userCount}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {!role.isSystem && (
                      <>
                        <span onClick={(e) => openEdit(role, e)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 cursor-pointer transition-colors" title="Edit Role">
                          <Edit2 size={12} />
                        </span>
                        <span onClick={(e) => { e.stopPropagation(); setDelRole(role); }}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                            role.userCount > 0 ? "text-slate-200 dark:text-[#3F3F46] cursor-not-allowed" : "text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          }`} title="Delete Role">
                          <Trash2 size={12} />
                        </span>
                      </>
                    )}
                    {!active && <ChevronRight size={13} className="text-slate-300 dark:text-[#3F3F46]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — permission matrix */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-tr-2xl rounded-bl-2xl overflow-hidden shadow-sm min-w-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-[#52525B]">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-[#27272A] flex items-center justify-center">
                <Key size={28} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-[#A1A1AA]">Select a role</p>
                <p className="text-xs mt-1">Click any role on the left to manage its permissions</p>
              </div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-[#27272A] flex-shrink-0">
                {editDetail ? (
                  <div className="space-y-2">
                    <input value={dName} onChange={(e) => setDName(e.target.value)}
                      className="w-full text-sm font-bold bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-lg px-3 py-2 text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                      placeholder="Role name" />
                    <input value={dDesc} onChange={(e) => setDDesc(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-lg px-3 py-2 text-slate-600 dark:text-[#A1A1AA] focus:outline-none focus:border-[#8B5CF6]"
                      placeholder="Description (optional)" />
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveDetail} disabled={savingDetail}
                        className="flex items-center gap-1.5 text-xs font-bold bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                        {savingDetail ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                      </button>
                      <button onClick={() => setEditDetail(false)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-[#FAFAFA]">{selected.name}</h2>
                        {selected.isSystem && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-wide">
                            Core Role
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#71717A] mt-0.5">
                        {selected.description || <span className="italic opacity-60">No description</span>}
                        <span className="ml-2 font-mono text-[10px] opacity-50">{selected.slug}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-[#52525B] mt-1.5 flex items-center gap-1.5">
                        <Users size={10} /> {selected.userCount} user{selected.userCount !== 1 ? "s" : ""} assigned
                        <span className="opacity-40">·</span>
                        <span className="text-[#8B5CF6] font-semibold">{rolePerms.size}</span> permissions active
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = allPerms.flatMap((g) => g.permissions.map((p) => p.id));
                          setRolePerms(new Set(allIds));
                        }}
                        className="text-[10px] font-bold text-[#8B5CF6] hover:bg-[#8B5CF6]/10 px-2 py-1 rounded transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setRolePerms(new Set())}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors"
                      >
                        Clear All
                      </button>
                      <button onClick={() => setEditDetail(true)}
                        className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 px-2 py-1 rounded transition-colors" title="Edit role name & description">
                        <Edit2 size={12} /> Edit Name
                      </button>
                      {!selected.isSystem && (
                        <button onClick={() => setDelRole(selected)}
                          className="flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors" title="Delete role">
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Permission matrix */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {(loadingDetail || loadingPerms) ? <PermSkeleton /> : allPerms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-20 text-slate-400 dark:text-[#52525B]">
                    <Key size={28} strokeWidth={1.5} />
                    <p className="text-sm">No permissions found</p>
                  </div>
                ) : allPerms.map((group) => {
                  const state = modState(group);
                  const isOpen = !collapsed.has(group.module);
                  return (
                    <div key={group.module} className="rounded-xl border border-slate-200 dark:border-[#27272A] overflow-hidden">
                      {/* Module header */}
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-[#27272A]/50 cursor-pointer select-none"
                        onClick={() => setCollapsed((p) => { const n = new Set(p); n.has(group.module) ? n.delete(group.module) : n.add(group.module); return n; })}>
                        <button onClick={(e) => { e.stopPropagation(); toggleModule(group); }}
                          className="flex-shrink-0">
                          {state === "all" ? <CheckSquare size={14} className="text-[#8B5CF6]" />
                            : state === "some" ? <Minus size={14} className="text-[#8B5CF6]" />
                            : <Square size={14} className="text-slate-300 dark:text-[#52525B]" />}
                        </button>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${modClr(group.module)}`}>
                          {group.module}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#71717A]">
                          {group.permissions.filter((p) => rolePerms.has(p.id)).length}/{group.permissions.length}
                        </span>
                        <div className="flex-1" />
                        {isOpen ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                      </div>
                      {/* Checkboxes */}
                      {isOpen && (
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                          {group.permissions.map((perm) => {
                            const checked = rolePerms.has(perm.id);
                            return (
                              <button key={perm.id}
                                onClick={() => togglePerm(perm.id)}
                                title={perm.description || perm.slug}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium border transition-all cursor-pointer ${checked
                                  ? "bg-[#8B5CF6]/8 border-[#8B5CF6]/30 text-[#8B5CF6] dark:bg-[#8B5CF6]/15 dark:border-[#8B5CF6]/40"
                                  : "bg-white dark:bg-[#18181B] border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-[#A1A1AA] hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/5"
                                }`}>
                                {checked
                                  ? <CheckSquare size={13} className="text-[#8B5CF6] flex-shrink-0" />
                                  : <Square size={13} className="text-slate-300 dark:text-[#52525B] flex-shrink-0" />}
                                <span className="truncate">{perm.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-[#27272A] flex items-center justify-between flex-shrink-0 bg-slate-50/50 dark:bg-[#27272A]/20">
                <p className="text-xs text-slate-500 dark:text-[#71717A]">
                  <span className="font-bold text-slate-700 dark:text-[#A1A1AA]">{rolePerms.size}</span> permissions selected
                </p>
                <button onClick={savePerms} disabled={savingPerms}
                  className="flex items-center gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-xs font-bold px-5 py-2 rounded-tr-xl rounded-bl-xl shadow-md shadow-[#8B5CF6]/20 transition-colors">
                  {savingPerms ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Permissions
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ CREATE / EDIT MODAL ═══════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#18181B] w-full max-w-md rounded-tr-2xl rounded-bl-2xl shadow-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#27272A]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                  {editing ? <Edit2 size={14} className="text-[#8B5CF6]" /> : <Plus size={14} className="text-[#8B5CF6]" />}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                    {editing ? "Edit Role" : "Create New Role"}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-[#71717A]">
                    {editing ? "Update role name & description" : "Add a new role to the system"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitModal} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input value={fName} onChange={(e) => setFName(e.target.value)} required maxLength={50}
                  placeholder="e.g. Content Manager"
                  className="w-full bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={3}
                  placeholder="Brief description of what this role can do…"
                  className="w-full bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6] resize-none transition-colors" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={savingModal || !fName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-tr-xl rounded-bl-xl shadow-md shadow-[#8B5CF6]/25 transition-colors">
                  {savingModal ? <Loader2 size={14} className="animate-spin" /> : editing ? <Save size={14} /> : <Plus size={14} />}
                  {editing ? "Save Changes" : "Create Role"}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE MODAL ══════════════════════════════════════════════════════ */}
      {delRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#18181B] w-full max-w-sm rounded-tr-2xl rounded-bl-2xl shadow-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#FAFAFA] mb-1">Delete Role?</h3>
              <p className="text-xs text-slate-500 dark:text-[#71717A] leading-relaxed">
                This will permanently delete{" "}
                <span className="font-bold text-slate-700 dark:text-[#A1A1AA]">"{delRole.name}"</span>.
                {delRole.userCount > 0 && (
                  <span className="block mt-1.5 text-red-500 font-medium">
                    ⚠ This role has {delRole.userCount} assigned user{delRole.userCount > 1 ? "s" : ""} and cannot be deleted.
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              {delRole.userCount === 0 && (
                <button onClick={doDelete} disabled={confirming}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-tr-xl rounded-bl-xl transition-colors">
                  {confirming ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                </button>
              )}
              <button onClick={() => setDelRole(null)}
                className="flex-1 text-sm font-semibold text-slate-600 dark:text-[#A1A1AA] py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors">
                {delRole.userCount > 0 ? "Close" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
