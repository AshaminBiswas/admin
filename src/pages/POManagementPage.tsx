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
} from 'lucide-react';
import {
  PoClassification,
  PoManagementMetrics,
  PoPriority,
  PoStatus,
  PoSubmissionItem,
} from '../types/poManagement';
import { getPoSubmissions, getPoMetrics, syncInboundEmails } from '../api/poManagementService';
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
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

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
  // Receives po.created events fired by the server's background IMAP sync queue.
  // New items are silently pushed into pendingQueue — NOT into the visible table.
  // No loading spinners, no re-renders of the main list.
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
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">All Inbound</span>
            <Inbox size={16} className="text-[#8B5CF6]" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{metrics.totalReceived}</p>
          <p className="text-[10px] text-slate-500 dark:text-[#71717A]">Total processed emails</p>
        </div>

        {/* PO Detected */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs space-y-1">
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
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs space-y-1">
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
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">General Emails</span>
            <Mail size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-700 dark:text-[#D4D4D8] font-mono">{metrics.generalEmailCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-[#71717A]">Inquiries & non-PO</p>
        </div>

        {/* Urgent Attention */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Urgent Attention</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          </div>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">{metrics.urgentCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-[#71717A]">High priority orders</p>
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
                    <th className="py-3 px-4">PO Submission ID</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Customer & Company</th>
                    <th className="py-3 px-4">Email Subject</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Received</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenPo(item.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#27272A]/40 transition-colors cursor-pointer group"
                    >
                      {/* PO Submission ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {item.poSubmissionId ? (
                          <span className="text-[#8B5CF6] group-hover:underline">{item.poSubmissionId}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">GENERAL</span>
                        )}
                      </td>

                      {/* Classification Badge */}
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4 max-w-xs">
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
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4 text-slate-500 dark:text-[#A1A1AA] text-[11px] whitespace-nowrap">
                        {new Date(item.receivedAt).toLocaleDateString()}{' '}
                        <span className="text-[10px] text-slate-400">{new Date(item.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPo(item.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] font-bold text-[11px] hover:bg-[#8B5CF6] hover:text-white transition-colors"
                        >
                          View Email
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-[#27272A]">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenPo(item.id)}
                  className="p-4 space-y-2.5 hover:bg-slate-50 dark:hover:bg-[#27272A]/30 active:bg-slate-100 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#8B5CF6]">
                      {item.poSubmissionId || 'GENERAL'}
                    </span>
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
              ))}
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
