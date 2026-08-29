import React, { useState, useEffect } from 'react';
import {
  Bell,
  Inbox,
  FileCheck,
  HelpCircle,
  Mail,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Paperclip,
  Clock,
  Calendar,
  Building,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  SlidersHorizontal,
  X,
  Plus,
  Trash2,
  Eye,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  PoClassification,
  PoManagementMetrics,
  PoPriority,
  PoStatus,
  PoSubmissionItem,
} from '../types/poManagement';
import {
  getPoSubmissions,
  getPoMetrics,
  syncInboundEmails,
  deletePoSubmission,
  bulkDeletePoSubmissions,
} from '../api/poManagementService';
import { PODossierModal } from '../components/po-management/PODossierModal';
import { API_BASE_URL, getAdminToken } from '../api/adminApi';

interface POManagementPageProps {
  onViewPo?: (poId: string) => void;
}

export function POManagementPage({ onViewPo }: POManagementPageProps = {}) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PO_DETECTED' | 'POSSIBLE_PO' | 'GENERAL_EMAIL'>('ALL');
  const [items, setItems] = useState<PoSubmissionItem[]>([]);
  const [metrics, setMetrics] = useState<PoManagementMetrics>({
    totalReceived: 0,
    poDetectedCount: 0,
    possiblePoCount: 0,
    generalEmailCount: 0,
    newCount: 0,
    inReviewCount: 0,
    processingCount: 0,
    completedCount: 0,
    urgentCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  // ─── Bulk Selection State ──────────────────────────────────────────────────
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ─── Silent Background Queue ───────────────────────────────────────────────
  // New items from background sync silently accumulate here without triggering
  // any loading spinner or table re-render.
  const [pendingQueue, setPendingQueue] = useState<PoSubmissionItem[]>([]);
  const seenIdsRef = React.useRef<Set<string>>(new Set());

  const handleOpenPo = (id: string) => {
    if (onViewPo) {
      onViewPo(id);
    } else {
      setSelectedPoId(id);
    }
  };

  const handleDeletePo = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will permanently delete the email record and its attachments.`)) {
      return;
    }
    try {
      setDeletingId(id);
      await deletePoSubmission(id);
      seenIdsRef.current.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelectedRowIds((prev) => prev.filter((rowId) => rowId !== id));
      setPendingQueue((prev) => prev.filter((i) => i.id !== id));
      setTotalItems((prev) => Math.max(0, prev - 1));
      setMetrics((prev) => ({
        ...prev,
        totalReceived: Math.max(0, prev.totalReceived - 1),
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to delete PO submission');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Bulk Selection Handlers ────────────────────────────────────────────────
  const handleToggleSelectRow = (e: React.MouseEvent | React.ChangeEvent, id: string) => {
    e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAllRows = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const visibleIds = items.map((i) => i.id);
      setSelectedRowIds(Array.from(new Set([...selectedRowIds, ...visibleIds])));
    } else {
      const visibleIds = new Set(items.map((i) => i.id));
      setSelectedRowIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    const count = selectedRowIds.length;
    if (!window.confirm(`Are you sure you want to permanently delete all ${count} selected PO submission(s) and their attached documents? This action cannot be undone.`)) {
      return;
    }

    try {
      setBulkDeleting(true);
      const res = await bulkDeletePoSubmissions(selectedRowIds);
      const deletedSet = new Set(selectedRowIds);
      selectedRowIds.forEach((id) => seenIdsRef.current.delete(id));
      setItems((prev) => prev.filter((i) => !deletedSet.has(i.id)));
      setPendingQueue((prev) => prev.filter((i) => !deletedSet.has(i.id)));
      setSelectedRowIds([]);
      setTotalItems((prev) => Math.max(0, prev - count));
      setMetrics((prev) => ({
        ...prev,
        totalReceived: Math.max(0, prev.totalReceived - count),
      }));
      alert(`Successfully deleted ${res.deletedCount || count} PO submission(s)`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete selected items');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Flush the pending queue into the visible table (user-triggered or auto at page=1)
  const flushQueue = () => {
    if (pendingQueue.length === 0) return;
    if (page === 1 && !search && statusFilter === 'ALL' && priorityFilter === 'ALL') {
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const fresh = pendingQueue.filter((i) => !existingIds.has(i.id));
        return [...fresh, ...prev];
      });
      setMetrics((prev) => ({
        ...prev,
        totalReceived: prev.totalReceived + pendingQueue.length,
        newCount: prev.newCount + pendingQueue.filter((i) => i.status === 'NEW').length,
        poDetectedCount:
          prev.poDetectedCount + pendingQueue.filter((i) => i.classification === 'PO_DETECTED').length,
        possiblePoCount:
          prev.possiblePoCount + pendingQueue.filter((i) => i.classification === 'POSSIBLE_PO').length,
        generalEmailCount:
          prev.generalEmailCount + pendingQueue.filter((i) => i.classification === 'GENERAL_EMAIL').length,
      }));
    }
    setPendingQueue([]);
  };

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadSubmissions();
  }, [activeTab, statusFilter, priorityFilter, fromDate, toDate, page]);

  // ─── SSE Background Listener ───────────────────────────────────────────────
  // Receives po.created, po.updated, and po.deleted events fired by the server.
  // New items are silently pushed into pendingQueue — NOT into the visible table.
  // Deleted items are instantly removed from state in real-time.
  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;

    const sseUrl = `${API_BASE_URL}/events/stream?token=${encodeURIComponent(token)}`;
    let es: EventSource | null = null;

    try {
      es = new EventSource(sseUrl);

      es.addEventListener('po.created', (e: MessageEvent) => {
        try {
          const newItem = JSON.parse(e.data) as PoSubmissionItem;
          if (!newItem?.id || seenIdsRef.current.has(newItem.id)) return;
          seenIdsRef.current.add(newItem.id);

          // Silently push to queue — no table re-render, no loading state
          setPendingQueue((prev) => [newItem, ...prev]);
        } catch {
          // malformed SSE payload — ignore
        }
      });

      es.addEventListener('po.deleted', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (!payload?.id) return;
          seenIdsRef.current.delete(payload.id);
          setItems((prev) => prev.filter((i) => i.id !== payload.id));
          setPendingQueue((prev) => prev.filter((i) => i.id !== payload.id));
          setTotalItems((prev) => Math.max(0, prev - 1));
          setMetrics((prev) => ({
            ...prev,
            totalReceived: Math.max(0, prev.totalReceived - 1),
          }));
        } catch {
          // ignore
        }
      });
    } catch {
      // SSE not supported — background sync still works on server
    }

    return () => {
      es?.close();
    };
  }, []); // Mount once, never re-subscribe

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadSubmissions();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setPendingQueue([]); // Clear queue on explicit load
      const res = await getPoSubmissions({
        tab: activeTab,
        status: statusFilter !== 'ALL' ? (statusFilter as PoStatus) : undefined,
        priority: priorityFilter !== 'ALL' ? (priorityFilter as PoPriority) : undefined,
        search: search.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        limit: 15,
      });

      setItems(res.items);
      res.items.forEach((i) => seenIdsRef.current.add(i.id)); // Mark loaded items as seen
      setTotalPages(res.pagination.totalPages);
      setTotalItems(res.pagination.totalItems);
      if (res.metrics) setMetrics(res.metrics);
    } catch (err: any) {
      console.error('Failed to load PO submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEmails = async () => {
    try {
      setSyncing(true);
      await syncInboundEmails();
      // After manual sync, clear queue and do a clean reload
      await loadSubmissions();
    } catch (err: any) {
      alert(err.message || 'Failed to sync inbound emails');
    } finally {
      setSyncing(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters = search || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || fromDate || toDate;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#27272A]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight flex items-center gap-2.5">
            <Inbox className="text-[#8B5CF6]" size={26} />
            <span>PO Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A1A1AA] pt-1">
            Automated Inbound Business Email Ingestion, PO Classification, and Order Workflow Pipeline
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncEmails}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] text-xs font-bold text-slate-800 dark:text-[#FAFAFA] hover:border-[#8B5CF6] transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin text-[#8B5CF6]' : 'text-[#8B5CF6]'} />
            <span>{syncing ? 'Syncing Inbox...' : 'Sync Inbound Emails'}</span>
          </button>
        </div>
      </div>


      {/* ─── Background Queue Banner ─────────────────────────────────────────── */}
      {/* Appears only when the server's background IMAP sync has fetched new emails.
          The table does NOT auto-refresh. The user can choose when to view them.   */}
      {pendingQueue.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300 text-sm font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-violet-500 animate-pulse" />
            <span>
              <strong>{pendingQueue.length}</strong> new email{pendingQueue.length > 1 ? 's' : ''} received in
              background
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={flushQueue}
              className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors"
            >
              Show Now
            </button>
            <button
              onClick={() => setPendingQueue([])}
              className="p-1 rounded-md hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Inbound */}
        <div
          onClick={() => {
            setActiveTab('ALL');
            setStatusFilter('ALL');
            setPriorityFilter('ALL');
            setPage(1);
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-[#18181B] border transition-all cursor-pointer shadow-xs space-y-1 ${
            activeTab === 'ALL' && priorityFilter === 'ALL'
              ? 'border-[#8B5CF6] ring-2 ring-[#8B5CF6]/30'
              : 'border-slate-200 dark:border-[#27272A] hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">All Inbound</span>
            <Inbox size={16} className="text-[#8B5CF6]" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{metrics.totalReceived}</p>
          <p className="text-[10px] text-slate-500 dark:text-[#71717A]">Total processed emails</p>
        </div>

        {/* PO Detected */}
        <div
          onClick={() => {
            setActiveTab('PO_DETECTED');
            setPriorityFilter('ALL');
            setPage(1);
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-[#18181B] border transition-all cursor-pointer shadow-xs space-y-1 ${
            activeTab === 'PO_DETECTED' && priorityFilter !== 'URGENT'
              ? 'border-emerald-500 ring-2 ring-emerald-500/30'
              : 'border-slate-200 dark:border-[#27272A] hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Purchase Orders
            </span>
            <FileCheck size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{metrics.poDetectedCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-[#71717A]">High confidence POs</p>
        </div>

        {/* Possible PO */}
        <div
          onClick={() => {
            setActiveTab('POSSIBLE_PO');
            setPriorityFilter('ALL');
            setPage(1);
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-[#18181B] border transition-all cursor-pointer shadow-xs space-y-1 ${
            activeTab === 'POSSIBLE_PO' && priorityFilter !== 'URGENT'
              ? 'border-amber-500 ring-2 ring-amber-500/30'
              : 'border-slate-200 dark:border-[#27272A] hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Possible PO
            </span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">{metrics.possiblePoCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-[#71717A]">Requires manual review</p>
        </div>

        {/* General Emails */}
        <div
          onClick={() => {
            setActiveTab('GENERAL_EMAIL');
            setPriorityFilter('ALL');
            setPage(1);
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-[#18181B] border transition-all cursor-pointer shadow-xs space-y-1 ${
            activeTab === 'GENERAL_EMAIL' && priorityFilter !== 'URGENT'
              ? 'border-slate-500 ring-2 ring-slate-500/30'
              : 'border-slate-200 dark:border-[#27272A] hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">General Emails</span>
            <Mail size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-700 dark:text-[#D4D4D8] font-mono">{metrics.generalEmailCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-[#71717A]">Inquiries & non-PO</p>
        </div>

        {/* Urgent Attention (Clickable filter) */}
        <div
          onClick={() => {
            setPriorityFilter((prev) => (prev === 'URGENT' ? 'ALL' : 'URGENT'));
            setPage(1);
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-[#18181B] border transition-all cursor-pointer shadow-xs space-y-1 col-span-2 sm:col-span-1 ${
            priorityFilter === 'URGENT'
              ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-50/40 dark:bg-rose-950/30'
              : 'border-slate-200 dark:border-[#27272A] hover:border-rose-300 dark:hover:border-rose-800'
          }`}
          title="Click to filter by Urgent Attention"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
              <span>Urgent Attention</span>
              {priorityFilter === 'URGENT' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold">ACTIVE</span>
              )}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          </div>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">{metrics.urgentCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-[#71717A]">
            {priorityFilter === 'URGENT' ? 'Filtering urgent orders (click to reset)' : 'Click to filter urgent orders'}
          </p>
        </div>
      </div>

      {/* Tabs & Search Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#27272A] pb-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'All Received Emails', count: metrics.totalReceived },
            { id: 'PO_DETECTED', label: 'Purchase Orders', count: metrics.poDetectedCount },
            { id: 'POSSIBLE_PO', label: 'Possible PO (Review)', count: metrics.possiblePoCount },
            { id: 'GENERAL_EMAIL', label: 'General Emails', count: metrics.generalEmailCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20'
                  : 'bg-slate-100 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Live Search */}
          <div className="sm:col-span-4 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PRC-PO ID, Sender, Company, Email, Subject..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          {/* Status Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="UNDER_REVIEW">UNDER REVIEW</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="WAITING_FOR_CUSTOMER">WAITING FOR CUSTOMER</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ON_HOLD">ON HOLD</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">🚨 URGENT</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="sm:col-span-2 flex justify-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <X size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bulk Action Bar (when rows are selected) ─────────────────────────── */}
      {selectedRowIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-slate-900 dark:text-white shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#8B5CF6] text-white text-xs font-black">
              {selectedRowIds.length}
            </span>
            <span className="text-xs font-bold">
              {selectedRowIds.length} PO record{selectedRowIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedRowIds([])}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline font-semibold transition-colors ml-1"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} className={bulkDeleting ? 'animate-spin' : ''} />
              <span>{bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedRowIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="animate-spin text-[#8B5CF6] mx-auto" size={28} />
            <p className="text-xs font-semibold text-slate-500 dark:text-[#A1A1AA]">Loading received emails and PO records...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Inbox className="text-slate-300 dark:text-slate-600 mx-auto" size={44} />
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-[#E4E4E7]">No Records Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No matching inbound emails or Purchase Orders for the selected tab and filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#09090B] border-b border-slate-200 dark:border-[#27272A] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {/* Checkbox Header */}
                    <th className="py-3 pl-4 pr-2 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={items.length > 0 && items.every((i) => selectedRowIds.includes(i.id))}
                        onChange={handleSelectAllRows}
                        className="w-4 h-4 rounded border-slate-300 dark:border-[#3F3F46] text-[#8B5CF6] focus:ring-[#8B5CF6] cursor-pointer"
                        title="Select/Deselect All on this page"
                      />
                    </th>
                    <th className="py-3 px-3">PO Submission ID</th>
                    <th className="py-3 px-3">Classification</th>
                    <th className="py-3 px-3">Customer & Company</th>
                    <th className="py-3 px-3">Email Subject</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Received</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                  {items.map((item) => {
                    const isSelected = selectedRowIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleOpenPo(item.id)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-[#8B5CF6]/5 dark:bg-[#8B5CF6]/10'
                            : 'hover:bg-slate-50/80 dark:hover:bg-[#27272A]/40'
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-3.5 pl-4 pr-2 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectRow(e, item.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-[#3F3F46] text-[#8B5CF6] focus:ring-[#8B5CF6] cursor-pointer"
                          />
                        </td>

                        {/* PO Submission ID */}
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {item.poSubmissionId ? (
                            <span className="text-[#8B5CF6] group-hover:underline">{item.poSubmissionId}</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">GENERAL</span>
                          )}
                        </td>

                        {/* Classification Badge */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              item.classification === 'PO_DETECTED'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : item.classification === 'POSSIBLE_PO'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.classification === 'PO_DETECTED'
                              ? 'PO DETECTED'
                              : item.classification === 'POSSIBLE_PO'
                              ? 'POSSIBLE PO'
                              : 'GENERAL'}
                          </span>
                        </td>

                        {/* Customer & Company */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 dark:text-white">{item.customerName || item.customerEmail}</p>
                            {item.companyName && (
                              <p className="text-[11px] text-slate-500 dark:text-[#A1A1AA] flex items-center gap-1">
                                <Building size={10} /> {item.companyName}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 font-mono">{item.customerEmail}</p>
                          </div>
                        </td>

                        {/* Subject + Attachments */}
                        <td className="py-3.5 px-3 max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-800 dark:text-[#FAFAFA] truncate" title={item.subject}>
                              {item.subject}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              {item._count?.attachments ? (
                                <span className="flex items-center gap-1 text-[#8B5CF6]">
                                  <Paperclip size={10} /> {item._count.attachments} file(s)
                                </span>
                              ) : null}
                              {item._count?.emails && item._count.emails > 1 ? (
                                <span className="text-blue-500">{item._count.emails} emails in thread</span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              item.status === 'NEW'
                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : item.status === 'UNDER_REVIEW'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : item.status === 'PROCESSING'
                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                                : item.status === 'COMPLETED'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : item.status === 'CANCELLED'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-slate-500/15 text-slate-500'
                            }`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`text-[10px] font-extrabold uppercase ${
                              item.priority === 'URGENT'
                                ? 'text-rose-600 dark:text-rose-400 font-black'
                                : item.priority === 'HIGH'
                                ? 'text-orange-500'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.priority}
                          </span>
                        </td>

                        {/* Received Date */}
                        <td className="py-3.5 px-3 text-slate-500 dark:text-[#A1A1AA] text-[11px] whitespace-nowrap">
                          {new Date(item.receivedAt).toLocaleDateString()}{' '}
                          <span className="text-[10px] text-slate-400">{new Date(item.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>

                        {/* Actions: View Icon & Delete Icon */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPo(item.id);
                              }}
                              title="View Email & PO Dossier"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] hover:bg-[#8B5CF6] hover:text-white transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeletePo(e, item.id, item.poSubmissionId || item.subject)}
                              disabled={deletingId === item.id}
                              title="Delete PO / Email"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30"
                            >
                              <Trash2 size={15} className={deletingId === item.id ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View with Checkboxes & View Icon */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-[#27272A]">
              {items.map((item) => {
                const isSelected = selectedRowIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenPo(item.id)}
                    className={`p-4 space-y-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#8B5CF6]/5 dark:bg-[#8B5CF6]/10'
                        : 'hover:bg-slate-50 dark:hover:bg-[#27272A]/30 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleToggleSelectRow(e, item.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-[#3F3F46] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                        />
                        <span className="font-mono font-bold text-xs text-[#8B5CF6]">
                          {item.poSubmissionId || 'GENERAL'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            item.status === 'NEW'
                              ? 'bg-blue-500/15 text-blue-600'
                              : item.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-slate-500/15 text-slate-600'
                          }`}
                        >
                          {item.status}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPo(item.id);
                          }}
                          title="View Details"
                          className="p-1 rounded text-slate-500 hover:text-[#8B5CF6] transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePo(e, item.id, item.poSubmissionId || item.subject)}
                          disabled={deletingId === item.id}
                          title="Delete PO / Email"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{item.subject}</h4>
                      <p className="text-[11px] text-slate-500">{item.customerName || item.customerEmail}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-[#27272A]">
                      <span>{new Date(item.receivedAt).toLocaleDateString()}</span>
                      {item._count?.attachments ? (
                        <span className="text-[#8B5CF6] font-semibold">{item._count.attachments} attachment(s)</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-between text-xs text-slate-500 dark:text-[#A1A1AA]">
                <span>
                  Showing Page <strong className="text-slate-900 dark:text-white">{page}</strong> of{' '}
                  <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({totalItems} total records)
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-white disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-white disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Interactive PO Dossier Modal */}
      {selectedPoId && (
        <PODossierModal
          poId={selectedPoId}
          onClose={() => setSelectedPoId(null)}
          onUpdated={loadSubmissions}
        />
      )}
    </div>
  );
}
