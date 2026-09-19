import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Boxes,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  Building2,
  Trash2,
  ArrowRight,
  Eye,
  Edit3,
  Ban,
  ShieldCheck,
  Check,
  ChevronRight,
  FileText,
  Warehouse,
  History,
  X,
  ExternalLink,
} from 'lucide-react';
import { B2BOrder, B2BOrderItem, B2BOrderStatus } from '../types/admin';
import { b2bOrdersApi } from '../api/b2bOrdersApi';
import { fetchAdminApi, inventoryApi } from '../api/adminApi';
import { useAdminAuth } from '../context/AdminAuthContext';

export interface B2BOrdersPageProps {
  onCreateOfflineOrder?: () => void;
}

export function B2BOrdersPage({ onCreateOfflineOrder }: B2BOrdersPageProps = {}) {
  const { adminUser } = useAdminAuth();

  // Primary State
  const [orders, setOrders] = useState<B2BOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('pending_approval');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({
    customer_frontend: 0,
    admin_created: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 15 });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    pending_approval: 0,
    confirmed: 0,
    processing: 0,
    ready: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
  });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderForDossier, setSelectedOrderForDossier] = useState<B2BOrder | null>(null);
  const [approvingOrder, setApprovingOrder] = useState<B2BOrder | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<B2BOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState<B2BOrder | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [editingOrder, setEditingOrder] = useState<B2BOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Facilities
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await inventoryApi.getBranches({ isActive: true });
        if (res.success && res.data) {
          setBranches(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.warn('Failed to load branches:', err);
      }
    };
    loadBranches();
  }, []);

  // Fetch Orders
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await b2bOrdersApi.listB2BOrders({
        page,
        limit: pagination.limit,
        status: activeTab,
        branchId: selectedBranchId,
        search: debouncedSearch,
        source: selectedSource !== 'ALL' ? selectedSource : undefined,
      });

      if (res.success && res.data) {
        setOrders(res.data.items || []);
        if (res.data.pagination) {
          setPagination({
            total: res.data.pagination.total,
            totalPages: res.data.pagination.totalPages,
            limit: res.data.pagination.limit,
          });
        }
        if (res.data.statusCounts) {
          setStatusCounts(res.data.statusCounts);
        }
        if (res.data.sourceCounts) {
          setSourceCounts(res.data.sourceCounts);
        }
      } else {
        setError(res.error?.message || 'Failed to load B2B orders');
        setOrders([]);
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, pagination.limit, activeTab, selectedBranchId, selectedSource, debouncedSearch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Actions
  const handleApprove = async () => {
    if (!approvingOrder) return;
    setActionLoading(true);
    try {
      const res = await b2bOrdersApi.approveB2BOrder(approvingOrder.id);
      if (res.success) {
        showToast(`Order ${approvingOrder.orderNumber} successfully approved and stock deducted!`);
        setApprovingOrder(null);
        loadOrders();
      } else {
        showToast(res.error?.message || 'Failed to approve order', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error approving order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingOrder || !rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await b2bOrdersApi.rejectB2BOrder(rejectingOrder.id, rejectionReason.trim());
      if (res.success) {
        showToast(`Order ${rejectingOrder.orderNumber} rejected and reservations released.`);
        setRejectingOrder(null);
        setRejectionReason('');
        loadOrders();
      } else {
        showToast(res.error?.message || 'Failed to reject order', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error rejecting order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelConfirmed = async () => {
    if (!cancellingOrder) return;
    setActionLoading(true);
    try {
      const res = await b2bOrdersApi.adminCancelB2BOrder(cancellingOrder.id, cancellationReason.trim() || 'Cancelled by Super Admin');
      if (res.success) {
        showToast(`Order ${cancellingOrder.orderNumber} cancelled and stock returned to facility.`);
        setCancellingOrder(null);
        setCancellationReason('');
        loadOrders();
      } else {
        showToast(res.error?.message || 'Failed to cancel order', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error cancelling order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvanceStatus = async (order: B2BOrder, nextStatus: 'processing' | 'ready' | 'completed') => {
    try {
      const res = await b2bOrdersApi.updateB2BOrderStatus(order.id, nextStatus);
      if (res.success) {
        showToast(`Order ${order.orderNumber} moved to ${nextStatus}`);
        loadOrders();
      } else {
        showToast(res.error?.message || 'Failed to update status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Inspect Dossier
  const handleOpenDossier = async (orderId: string) => {
    try {
      const res = await b2bOrdersApi.getB2BOrder(orderId);
      if (res.success && res.data) {
        setSelectedOrderForDossier(res.data);
      }
    } catch (err) {
      console.warn('Failed to load full order dossier:', err);
    }
  };

  const getStatusBadge = (status: B2BOrderStatus) => {
    switch (status) {
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock size={12} /> Pending Approval
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={12} /> Confirmed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Boxes size={12} /> In Fulfillment
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Warehouse size={12} /> Ready for Dispatch
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
            <ShieldCheck size={12} /> Completed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle size={12} /> Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            <Ban size={12} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800 text-zinc-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2 text-sm font-semibold transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : 'bg-rose-950 border-rose-700 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toastMessage.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#18181B] to-[#27272A] border border-[#3F3F46] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Boxes size={20} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              B2B Order Management
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
              Wholesale Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Dual-channel order processing, real-time inventory reservation, and atomic Super Admin confirmation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onCreateOfflineOrder) {
              onCreateOfflineOrder();
            } else {
              setIsCreateModalOpen(true);
            }
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-900/30 transition-all flex-shrink-0"
        >
          <Plus size={16} />
          Create B2B Order (Offline)
        </button>
      </div>

      {/* Priority Queue Alert Banner */}
      {statusCounts.pending_approval > 0 && activeTab !== 'pending_approval' && (
        <div
          onClick={() => setActiveTab('pending_approval')}
          className="cursor-pointer p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-300 hover:bg-amber-500/15 transition-all shadow-sm"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <Clock size={16} className="text-amber-400 animate-spin" />
            <span>
              Action Required: <strong>{statusCounts.pending_approval} B2B Order(s)</strong> are waiting in the Pending Approval Queue!
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold underline">
            Review Queue <ChevronRight size={14} />
          </span>
        </div>
      )}

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => {
            setActiveTab('pending_approval');
            setPage(1);
          }}
          className="cursor-pointer p-4 rounded-2xl bg-[#18181B] hover:border-amber-500/50 border border-[#27272A] shadow-md flex items-center gap-3.5 transition-all"
        >
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending Approval</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">{statusCounts.pending_approval || 0}</div>
            <div className="text-[11px] text-zinc-500">Awaiting Super Admin</div>
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('confirmed');
            setPage(1);
          }}
          className="cursor-pointer p-4 rounded-2xl bg-[#18181B] hover:border-emerald-500/50 border border-[#27272A] shadow-md flex items-center gap-3.5 transition-all"
        >
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Confirmed & Active</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {(statusCounts.confirmed || 0) + (statusCounts.processing || 0) + (statusCounts.ready || 0)}
            </div>
            <div className="text-[11px] text-zinc-500">In fulfillment pipeline</div>
          </div>
        </div>

        <div
          onClick={() => {
            setSelectedSource(selectedSource === 'customer_frontend' ? 'ALL' : 'customer_frontend');
            setPage(1);
          }}
          className={`cursor-pointer p-4 rounded-2xl border shadow-md flex items-center gap-3.5 transition-all ${
            selectedSource === 'customer_frontend'
              ? 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/30'
              : 'bg-[#18181B] border-[#27272A] hover:border-cyan-500/40'
          }`}
        >
          <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <ExternalLink size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Storefront (Online)</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-300">{sourceCounts.customer_frontend || 0}</div>
            <div className="text-[11px] text-cyan-500/80 font-medium">Customer direct checkout</div>
          </div>
        </div>

        <div
          onClick={() => {
            setSelectedSource('ALL');
            setActiveTab('ALL');
            setPage(1);
          }}
          className="cursor-pointer p-4 rounded-2xl bg-[#18181B] hover:border-purple-500/40 border border-[#27272A] shadow-md flex items-center gap-3.5 transition-all"
        >
          <div className="p-3 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Warehouse size={20} />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total B2B Orders</div>
            <div className="text-xl sm:text-2xl font-black text-white">{pagination.total || 0}</div>
            <div className="text-[11px] text-zinc-500">Offline: {sourceCounts.admin_created || 0} | Online: {sourceCounts.customer_frontend || 0}</div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-3 sm:space-y-4 shadow-md">
        {/* Channel Source Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
          <div className="flex items-center gap-1.5 p-1 bg-[#09090B] rounded-xl border border-[#27272A]">
            <button
              type="button"
              onClick={() => {
                setSelectedSource('ALL');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedSource === 'ALL'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Channels ({pagination.total})
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedSource('customer_frontend');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedSource === 'customer_frontend'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>🌐 Storefront (Online)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px] font-black">
                {sourceCounts.customer_frontend || 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedSource('admin_created');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedSource === 'admin_created'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>🏢 Offline (Admin)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px] font-black">
                {sourceCounts.admin_created || 0}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-400 hidden sm:block">
            {selectedSource === 'customer_frontend' ? (
              <span className="text-cyan-400 font-semibold flex items-center gap-1">
                <span>🌐</span> Orders placed directly by registered B2B buyers via Storefront Cart & Quotes
              </span>
            ) : selectedSource === 'admin_created' ? (
              <span className="text-purple-400 font-semibold flex items-center gap-1">
                <span>🏢</span> Orders booked offline by Sales & Admin desk
              </span>
            ) : (
              <span>Showing all orders across online and offline channels</span>
            )}
          </div>
        </div>

        {/* Status Tab Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-0.5">
          {[
            { id: 'pending_approval', label: 'Pending Approval', count: statusCounts.pending_approval, isAlert: true },
            { id: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed },
            { id: 'processing', label: 'In Fulfillment', count: statusCounts.processing },
            { id: 'ready', label: 'Ready', count: statusCounts.ready },
            { id: 'completed', label: 'Completed', count: statusCounts.completed },
            { id: 'cancelled', label: 'Cancelled / Rejected', count: (statusCounts.cancelled || 0) + (statusCounts.rejected || 0) },
            { id: 'ALL', label: 'All Orders' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? tab.isAlert
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                    : 'bg-[#27272A] text-zinc-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                      isActive
                        ? 'bg-black/20 text-current'
                        : tab.isAlert
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Facility Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-[#27272A]">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by Order #, Customer, Company, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Facility Filter */}
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Facilities</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadOrders()}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-4">
        {loading ? (
          <div className="py-12 text-center text-zinc-400 text-sm flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-violet-500" />
            <span>Loading B2B wholesale orders...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => loadOrders()} className="underline font-bold">
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
            <Boxes size={36} className="text-zinc-600" />
            <div className="text-sm font-semibold text-zinc-300">No B2B orders match your filters</div>
            <div className="text-xs max-w-sm">
              {activeTab === 'pending_approval'
                ? 'All pending orders have been processed! Great job.'
                : 'Try adjusting your status tab, facility filter, or search query.'}
            </div>
          </div>
        ) : (
          <>
            {/* Mobile & Tablet Responsive Cards (Visible < lg) */}
            <div className="block lg:hidden space-y-3.5">
              {orders.map((o) => {
                const isPending = o.status === 'pending_approval';
                const isConfirmed = o.status === 'confirmed';

                return (
                  <div
                    key={o.id}
                    className="p-4 rounded-2xl bg-[#09090B] border border-[#27272A] hover:border-[#3F3F46] transition-all space-y-3 shadow-md"
                  >
                    {/* Header: Order # + Source Pill + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm tracking-tight">{o.orderNumber}</span>
                          {o.source === 'customer_frontend' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              🌐 Storefront (Online)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-500/15 text-violet-300 border border-violet-500/30">
                              🏢 Offline (Admin)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div>{getStatusBadge(o.status)}</div>
                    </div>

                    {/* Customer Info Card */}
                    <div className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1 text-xs">
                      <div className="font-bold text-zinc-200">
                        {o.customer?.companyName || `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim() || 'Valued Buyer'}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-2">
                        {o.customer?.phone && <span>📞 {o.customer.phone}</span>}
                        {o.customer?.email && <span>✉️ {o.customer.email}</span>}
                      </div>
                      {o.customer?.gstin && (
                        <div className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-[#27272A] text-[10px] font-mono text-zinc-300">
                          GSTIN: {o.customer.gstin}
                        </div>
                      )}
                    </div>

                    {/* Facility & Item Details */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#27272A]/70">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Warehouse size={13} className="text-violet-400" />
                        <span className="font-semibold text-zinc-300">{o.branch?.name || o.branch?.code || 'Delhi HQ'}</span>
                        <span>•</span>
                        <span>{o.items?.length || 0} line(s)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-white text-base">₹{o.grandTotal.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-zinc-500">Incl. 18% GST</div>
                      </div>
                    </div>

                    {/* Line Items Preview */}
                    {o.items && o.items.length > 0 && (
                      <div className="text-[11px] text-zinc-400 bg-black/30 px-2.5 py-1.5 rounded-lg border border-[#27272A]/40 truncate">
                        <span className="font-semibold text-zinc-300">Items: </span>
                        {o.items.map((i) => `${i.sku} (x${i.quantity})`).join(', ')}
                      </div>
                    )}

                    {/* Mobile Action Controls */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setApprovingOrder(o)}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Check size={14} />
                            <span>Approve Order</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingOrder(o)}
                            className="py-2 px-3 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1 border border-rose-500/30"
                          >
                            <X size={14} />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : isConfirmed ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(o, 'processing')}
                            className="flex-1 py-2 px-3 rounded-xl bg-blue-600/20 text-blue-300 font-bold text-xs border border-blue-500/30 flex items-center justify-center gap-1"
                          >
                            <span>Fulfill</span>
                            <ArrowRight size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingOrder(o)}
                            className="p-2 rounded-xl bg-[#27272A] text-amber-300 text-xs"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancellingOrder(o)}
                            className="p-2 rounded-xl bg-rose-500/10 text-rose-400 text-xs"
                            title="Cancel"
                          >
                            <Ban size={14} />
                          </button>
                        </>
                      ) : o.status === 'processing' ? (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStatus(o, 'ready')}
                          className="flex-1 py-2 px-3 rounded-xl bg-purple-600/20 text-purple-300 font-bold text-xs border border-purple-500/30 flex items-center justify-center gap-1"
                        >
                          <span>Mark Ready</span>
                          <ArrowRight size={13} />
                        </button>
                      ) : o.status === 'ready' ? (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStatus(o, 'completed')}
                          className="flex-1 py-2 px-3 rounded-xl bg-teal-600/20 text-teal-300 font-bold text-xs border border-teal-500/30 flex items-center justify-center gap-1"
                        >
                          <span>Complete Order</span>
                          <Check size={13} />
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleOpenDossier(o.id)}
                        className="py-2 px-3 rounded-xl bg-[#27272A] hover:bg-violet-600/20 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1"
                      >
                        <Eye size={14} />
                        <span>Dossier</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Visible >= lg) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-[#09090B] text-zinc-400 uppercase text-[10px] font-black border-b border-[#27272A]">
                  <tr>
                    <th className="py-3.5 px-3">Order Number & Channel</th>
                    <th className="py-3.5 px-3">Customer / Company</th>
                    <th className="py-3.5 px-3">Facility</th>
                    <th className="py-3.5 px-3">Lines & Items</th>
                    <th className="py-3.5 px-3">Grand Total</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {orders.map((o) => {
                    const isPending = o.status === 'pending_approval';
                    const isConfirmed = o.status === 'confirmed';

                    return (
                      <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Order Number & Source */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{o.orderNumber}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1">
                            <span>{new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span>•</span>
                            {o.source === 'customer_frontend' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                🌐 Storefront
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-500/15 text-violet-300 border border-violet-500/30">
                                🏢 Offline Admin
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Customer & Company */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-zinc-200">
                            {o.customer?.companyName || `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim() || 'Valued Buyer'}
                          </div>
                          <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{o.customer?.email}</span>
                            {o.customer?.phone && (
                              <>
                                <span>•</span>
                                <span>{o.customer.phone}</span>
                              </>
                            )}
                            {o.customer?.gstin && (
                              <span className="px-1.5 py-0.2 rounded bg-[#27272A] text-[10px] text-zinc-300 font-mono">
                                GST: {o.customer.gstin}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#27272A] font-semibold text-[11px] text-zinc-200">
                            <Warehouse size={12} className="text-violet-400" />
                            {o.branch?.name || o.branch?.code || 'Delhi HQ'}
                          </span>
                        </td>

                        {/* Items Summary */}
                        <td className="py-3.5 px-3">
                          <div className="font-medium text-zinc-300">
                            {o.items?.length || 0} line item(s)
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                            {o.items?.map((i) => `${i.sku} (${i.quantity})`).join(', ')}
                          </div>
                        </td>

                        {/* Grand Total */}
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-white text-sm">
                            ₹{o.grandTotal.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            Incl. 18% GST (₹{o.taxTotal.toLocaleString('en-IN')})
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3">
                          {getStatusBadge(o.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  title="Approve Order & Deduct Stock"
                                  onClick={() => setApprovingOrder(o)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-sm"
                                >
                                  <Check size={13} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  title="Reject Order & Release Stock"
                                  onClick={() => setRejectingOrder(o)}
                                  className="px-2 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1 border border-rose-500/30 transition-all"
                                >
                                  <X size={13} />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : isConfirmed ? (
                              <>
                                <button
                                  type="button"
                                  title="Edit Order Items"
                                  onClick={() => setEditingOrder(o)}
                                  className="p-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-amber-300 text-xs transition-colors"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Advance to Fulfillment"
                                  onClick={() => handleAdvanceStatus(o, 'processing')}
                                  className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-semibold text-[11px] border border-blue-500/30 flex items-center gap-1 transition-all"
                                >
                                  <span>Fulfill</span>
                                  <ArrowRight size={12} />
                                </button>
                                <button
                                  type="button"
                                  title="Cancel Confirmed Order"
                                  onClick={() => setCancellingOrder(o)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-colors"
                                >
                                  <Ban size={14} />
                                </button>
                              </>
                            ) : o.status === 'processing' ? (
                              <button
                                type="button"
                                onClick={() => handleAdvanceStatus(o, 'ready')}
                                className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-semibold text-[11px] border border-purple-500/30 flex items-center gap-1 transition-all"
                              >
                                <span>Mark Ready</span>
                                <ArrowRight size={12} />
                              </button>
                            ) : o.status === 'ready' ? (
                              <button
                                type="button"
                                onClick={() => handleAdvanceStatus(o, 'completed')}
                                className="px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 font-semibold text-[11px] border border-teal-500/30 flex items-center gap-1 transition-all"
                              >
                                <span>Complete</span>
                                <Check size={12} />
                              </button>
                            ) : null}

                            <button
                              type="button"
                              title="View Order Dossier"
                              onClick={() => handleOpenDossier(o.id)}
                              className="p-1.5 rounded-lg bg-[#27272A] hover:bg-violet-600/20 text-zinc-300 hover:text-violet-300 transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-[#27272A] text-xs text-zinc-400">
              <div>
                Showing {orders.length} of {pagination.total} orders
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-40 font-semibold"
                >
                  Previous
                </button>
                <span className="text-white font-bold">
                  Page {page} of {pagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-40 font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── CREATE B2B ORDER (OFFLINE) MODAL ──────────────────────────────── */}
      {isCreateModalOpen && (
        <CreateB2BOrderModal
          branches={branches}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            showToast('Offline B2B Order created and confirmed successfully!');
            loadOrders();
          }}
        />
      )}

      {/* ─── APPROVE CONFIRMATION DIALOG ──────────────────────────────────── */}
      {approvingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <span className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <CheckCircle2 size={24} />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Approve & Confirm B2B Order</h3>
                <p className="text-xs text-zinc-400">{approvingOrder.orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Confirming this order will permanently convert active stock reservations into physical deductions at{' '}
              <strong>{approvingOrder.branch?.name || 'the facility'}</strong> and write official stock movement audit entries.
            </p>

            <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Customer:</span>
                <span className="text-white font-medium">{approvingOrder.customer?.companyName || approvingOrder.customer?.email}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Grand Total:</span>
                <span className="text-emerald-400 font-extrabold">₹{approvingOrder.grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Items:</span>
                <span className="text-white">{approvingOrder.items?.length || 0} line(s)</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setApprovingOrder(null)}
                className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleApprove}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw size={13} className="animate-spin" />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REJECT CONFIRMATION DIALOG ───────────────────────────────────── */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <XCircle size={24} />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Reject B2B Order</h3>
                <p className="text-xs text-zinc-400">{rejectingOrder.orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Rejecting this order will release all held stock reservations with zero inventory movements. Please provide a clear rationale for the customer.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Rejection Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Requested credit terms exceeded limit, or delivery location outside regional SLA..."
                className="w-full p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setRejectingOrder(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-xs font-bold text-zinc-300"
              >
                Back
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={handleReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw size={13} className="animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CANCEL CONFIRMED ORDER DIALOG ────────────────────────────────── */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <Ban size={24} />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Cancel Confirmed Order</h3>
                <p className="text-xs text-zinc-400">{cancellingOrder.orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              This will soft-cancel the order and automatically restore physical on-hand stock for all line items back into{' '}
              <strong>{cancellingOrder.branch?.name || 'facility'}</strong> inventory with immutable{' '}
              <code className="text-amber-300">B2B_CANCELLATION</code> audit entries.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Cancellation Reason</label>
              <input
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Customer cancelled project scope..."
                className="w-full p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setCancellingOrder(null)}
                className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-xs font-bold text-zinc-300"
              >
                Back
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelConfirmed}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw size={13} className="animate-spin" />}
                Confirm Cancellation & Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT CONFIRMED ORDER MODAL ───────────────────────────────────── */}
      {editingOrder && (
        <EditB2BOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => {
            setEditingOrder(null);
            showToast('Order lines and inventory adjustments updated successfully!');
            loadOrders();
          }}
        />
      )}

      {/* ─── ORDER DOSSIER MODAL ──────────────────────────────────────────── */}
      {selectedOrderForDossier && (
        <OrderDossierModal
          order={selectedOrderForDossier}
          onClose={() => setSelectedOrderForDossier(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE B2B ORDER (OFFLINE) SUB-COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface CreateB2BOrderModalProps {
  branches: { id: string; name: string; code: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreateB2BOrderModal({ branches, onClose, onSuccess }: CreateB2BOrderModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [orderNotes, setOrderNotes] = useState('');
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [items, setItems] = useState<
    { productId: string; sku: string; name: string; quantity: number; unitPrice: number; discount: number; maxAvailable: number }[]
  >([]);
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selected branch when branches load
  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Load B2B Customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetchAdminApi('/users?limit=250');
        if (res.success && res.data) {
          const list = res.data.users || res.data.items || res.data;
          if (Array.isArray(list)) {
            // Strict B2B filter — companyName, gstin, or B2B role
            const b2bList = list.filter((u: any) => {
              const hasCompany = Boolean(u.companyName && String(u.companyName).trim().length > 0);
              const hasGstin = Boolean(u.gstin && String(u.gstin).trim().length > 0);
              const roleSlug =
                typeof u.role === 'object' && u.role !== null
                  ? String(u.role.slug || u.role.name || '')
                  : String(u.role || u.roleSlug || '');
              const cleanRole = roleSlug.toLowerCase().replace(/[-_]/g, '');
              const isB2bRole = ['b2bbuyer', 'b2bcustomer', 'enterprise', 'wholesale', 'commercial'].includes(cleanRole);
              return hasCompany || hasGstin || isB2bRole;
            });
            // NEVER fall back to the full list — only B2B accounts are valid here
            setCustomers(b2bList);
            if (b2bList.length > 0) setSelectedCustomerId(b2bList[0].id);
          }
        }
      } catch (e) {
        console.warn('Failed to load customers:', e);
      }
    };

    const fetchProducts = async () => {
      try {
        const res = await fetchAdminApi('/products?limit=100');
        if (res.success && res.data) {
          const list = res.data.items || res.data.products || res.data;
          if (Array.isArray(list)) {
            setAvailableProducts(list);
          }
        }
      } catch (e) {
        console.warn('Failed to load products:', e);
      }
    };

    fetchCustomers();
    fetchProducts();
  }, []);

  // Update Stock when Branch changes
  useEffect(() => {
    const updateStock = async () => {
      if (!selectedBranchId || availableProducts.length === 0) return;
      const ids = availableProducts.map((p) => p.id);
      try {
        const res = await b2bOrdersApi.checkProductStock(selectedBranchId, ids);
        if (res.success && res.data) {
          const map = new Map<string, number>();
          res.data.forEach((st) => map.set(st.productId, st.availableStock));
          setStockMap(map);
        }
      } catch (e) {
        console.warn('Failed to check stock:', e);
      }
    };
    updateStock();
  }, [selectedBranchId, availableProducts]);

  const handleAddItem = (product: any) => {
    const available = stockMap.get(product.id) || 0;
    const price = Number(product.salePrice || product.price || 0);

    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
        unitPrice: price,
        discount: 0,
        maxAvailable: available,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, val: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: val };
      })
    );
  };

  // Dynamic financial calculations based on selected taxRate
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [items]);

  const discountTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.discount || 0), 0);
  }, [items]);

  const taxTotal = useMemo(() => {
    const taxable = Math.max(0, subtotal - discountTotal);
    return Math.round(taxable * (taxRate / 100) * 100) / 100;
  }, [subtotal, discountTotal, taxRate]);

  const grandTotal = useMemo(() => {
    return Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;
  }, [subtotal, discountTotal, taxTotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer account');
      return;
    }
    if (!selectedBranchId) {
      setError('Please select a fulfilment facility');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one line item to the order');
      return;
    }

    setLoading(true);
    setError(null);

    // Client request id for idempotency
    const clientRequestId = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await b2bOrdersApi.adminCreateB2BOrder({
        clientRequestId,
        customerId: selectedCustomerId,
        branchId: selectedBranchId,
        paymentMethod,
        notes: orderNotes.trim() || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          taxRate,
          taxPercent: taxRate,
        })),
      });

      if (res.success) {
        onSuccess();
      } else {
        setError(res.error?.message || 'Failed to create offline order');
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting offline order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Plus size={18} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Create B2B Order (Offline)</h2>
              <p className="text-xs text-zinc-400">Places and confirms order on behalf of customer with immediate stock deduction.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-[#27272A]">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 font-semibold flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Customer & Branch Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                B2B Customer Partner <span className="text-emerald-400">*</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-white focus:outline-none focus:border-emerald-500"
              >
                {customers.length === 0 && <option value="">No registered customers found</option>}
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.companyName} (${c.firstName} ${c.lastName})` : `${c.firstName} ${c.lastName}`} - {c.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Fulfilment Facility / Branch <span className="text-emerald-400">*</span>
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-white focus:outline-none focus:border-emerald-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Method & GST Rate Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Payment Method / Commercial Terms
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="cheque">Cheque / Demand Draft</option>
                <option value="credit_terms">Commercial Credit (30 Days)</option>
                <option value="upi">UPI / Instant Payment</option>
                <option value="cash">Cash / Cash On Delivery</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Applicable GST Rate
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value={18}>18% GST (Standard Architectural Hardware)</option>
                <option value={12}>12% GST (Specified Commercial Fittings)</option>
                <option value={5}>5% GST (Basic Raw Materials / Scrap)</option>
                <option value={28}>28% GST (Luxury / Specialized Fixtures)</option>
                <option value={0}>0% GST (Tax-Exempt / SEZ Supply)</option>
              </select>
            </div>
          </div>

          {/* Order Notes / Project Details */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Order Notes / Delivery Instructions
            </label>
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="e.g. Project site address, contact person, or PO reference..."
              className="w-full p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Add Products Bar */}
          <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2">
            <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Boxes size={14} className="text-violet-400" />
              <span>Add Products from Catalog</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {availableProducts.slice(0, 15).map((p) => {
                const avail = stockMap.get(p.id) || 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddItem(p)}
                    className="px-2.5 py-1 rounded-lg bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[11px] text-zinc-200 flex items-center gap-2 transition-all text-left"
                  >
                    <span className="font-bold">{p.sku}</span>
                    <span className={`text-[10px] font-mono ${avail > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ({avail} in stock)
                    </span>
                    <Plus size={11} className="text-zinc-500" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-300">Order Line Items ({items.length})</div>
            {items.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 border border-dashed border-[#27272A] rounded-xl">
                No items added yet. Click a product above to add to order.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it, idx) => {
                  const taxable = Math.max(0, it.quantity * it.unitPrice - it.discount);
                  const lineTax = Math.round(taxable * (taxRate / 100) * 100) / 100;
                  const lineTot = Math.round((taxable + lineTax) * 100) / 100;

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">{it.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          SKU: {it.sku} • Available: <strong className="text-emerald-400">{it.maxAvailable}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-500">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                            className="w-16 p-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-white text-center"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-zinc-500">Rate (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.unitPrice}
                            onChange={(e) => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
                            className="w-20 p-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-white text-center"
                          />
                        </div>

                        <div className="text-right min-w-[70px]">
                          <div className="text-[10px] text-zinc-500">+{taxRate}% GST</div>
                          <div className="font-bold text-emerald-400">₹{lineTot.toLocaleString('en-IN')}</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Financial Totals Card */}
          <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal:</span>
              <span className="text-white font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Discounts:</span>
              <span className="text-white font-medium">-₹{discountTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Applicable GST ({taxRate}%):</span>
              <span className="text-amber-400 font-medium">+₹{taxTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-white pt-1.5 border-t border-[#27272A]">
              <span>Grand Total:</span>
              <span className="text-emerald-400">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-900/30 flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <RefreshCw size={13} className="animate-spin" />}
              Create & Deduct Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT CONFIRMED B2B ORDER MODAL (DELTA CALCULATIONS)
// ─────────────────────────────────────────────────────────────────────────────

interface EditB2BOrderModalProps {
  order: B2BOrder;
  onClose: () => void;
  onSuccess: () => void;
}

function EditB2BOrderModal({ order, onClose, onSuccess }: EditB2BOrderModalProps) {
  const [items, setItems] = useState<
    { orderItemId: string; productId: string; sku: string; quantity: number; origQty: number; unitPrice: number; isRemoved: boolean }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order.items) {
      setItems(
        order.items.map((i) => ({
          orderItemId: i.id,
          productId: i.productId,
          sku: i.sku,
          quantity: i.quantity,
          origQty: i.quantity,
          unitPrice: i.unitPrice,
          isRemoved: Boolean(i.isRemoved),
        }))
      );
    }
  }, [order]);

  const handleUpdateQty = (idx: number, qty: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, quantity: Math.max(0, qty) } : item))
    );
  };

  const handleToggleRemove = (idx: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, isRemoved: !item.isRemoved } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await b2bOrdersApi.adminEditB2BOrder(order.id, {
        items: items.map((i) => ({
          orderItemId: i.orderItemId,
          productId: i.productId,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          isRemoved: i.isRemoved,
        })),
      });

      if (res.success) {
        onSuccess();
      } else {
        setError(res.error?.message || 'Failed to update order');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating order lines');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Edit3 size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Edit Confirmed Order Items</h3>
              <p className="text-xs text-zinc-400">{order.orderNumber} • Delta stock movements will be logged</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-[#27272A]">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {items.map((it, idx) => {
              const delta = it.quantity - it.origQty;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    it.isRemoved
                      ? 'bg-rose-950/20 border-rose-800/40 opacity-60'
                      : 'bg-[#09090B] border-[#27272A]'
                  }`}
                >
                  <div>
                    <div className={`font-bold ${it.isRemoved ? 'line-through text-zinc-500' : 'text-white'}`}>
                      SKU: {it.sku}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Original: {it.origQty} | Delta:{' '}
                      <span className={delta > 0 ? 'text-amber-400 font-bold' : delta < 0 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      disabled={it.isRemoved}
                      value={it.quantity}
                      onChange={(e) => handleUpdateQty(idx, Number(e.target.value))}
                      className="w-16 p-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-white text-center font-bold"
                    />

                    <button
                      type="button"
                      onClick={() => handleToggleRemove(idx)}
                      className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
                        it.isRemoved
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      }`}
                    >
                      {it.isRemoved ? 'Undo' : 'Remove Line'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md flex items-center gap-1.5"
            >
              {loading && <RefreshCw size={13} className="animate-spin" />}
              Save Adjustments
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER DOSSIER MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface OrderDossierModalProps {
  order: B2BOrder;
  onClose: () => void;
}

function OrderDossierModal({ order, onClose }: OrderDossierModalProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'reservations' | 'movements'>('items');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Eye size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{order.orderNumber}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#27272A] text-zinc-300 uppercase">
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Created on {new Date(order.createdAt).toLocaleString('en-IN')} via {order.source}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-[#27272A]">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
              <div className="text-[10px] uppercase font-bold text-zinc-500">Customer Partner</div>
              <div className="font-bold text-white">{order.customer?.companyName || 'N/A'}</div>
              <div className="text-zinc-400">{order.customer?.firstName} {order.customer?.lastName}</div>
              <div className="text-zinc-400">{order.customer?.email}</div>
              {order.customer?.gstin && <div className="text-zinc-500 font-mono text-[10px]">GSTIN: {order.customer.gstin}</div>}
            </div>

            <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
              <div className="text-[10px] uppercase font-bold text-zinc-500">Fulfilment Facility</div>
              <div className="font-bold text-white">{order.branch?.name || 'Assigned Facility'}</div>
              {order.branch?.code && <div className="text-zinc-400">Code: {order.branch.code}</div>}
              {order.branch?.city && <div className="text-zinc-400">Location: {order.branch.city}</div>}
            </div>

            <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
              <div className="text-[10px] uppercase font-bold text-zinc-500">Commercial Summary</div>
              <div className="font-bold text-white">Grand Total: ₹{order.grandTotal.toLocaleString('en-IN')}</div>
              <div className="text-zinc-400">Subtotal: ₹{order.subtotal.toLocaleString('en-IN')}</div>
              <div className="text-amber-400">Taxes / GST: ₹{order.taxTotal.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 border-b border-[#27272A] pb-2">
            {[
              { id: 'items', label: `Order Lines (${order.items?.length || 0})` },
              { id: 'reservations', label: `Stock Reservations (${order.reservations?.length || 0})` },
              { id: 'movements', label: `Inventory Movements (${order.stockMovements?.length || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-[#09090B] text-zinc-400 hover:text-white border border-[#27272A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Items */}
          {activeTab === 'items' && (
            <div className="space-y-2">
              {order.items?.map((it) => (
                <div
                  key={it.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    it.isRemoved ? 'bg-rose-950/15 border-rose-800/30' : 'bg-[#09090B] border-[#27272A]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{it.product?.name || it.sku}</span>
                      {it.isRemoved && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                          Removed
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      SKU: {it.sku} • Rate: ₹{it.unitPrice} • Tax: ₹{it.tax}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-sm">₹{it.lineTotal.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] text-zinc-400">{it.quantity} unit(s)</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Reservations */}
          {activeTab === 'reservations' && (
            <div className="space-y-2">
              {order.reservations && order.reservations.length > 0 ? (
                order.reservations.map((res) => (
                  <div key={res.id} className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Item: {res.orderItemId}</div>
                      <div className="text-[11px] text-zinc-400">
                        Qty Reserved: <strong>{res.quantity}</strong> • Created: {new Date(res.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        res.status === 'consumed'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : res.status === 'released'
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {res.status.toUpperCase()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-zinc-500">No active stock reservations found.</div>
              )}
            </div>
          )}

          {/* Tab 3: Movements */}
          {activeTab === 'movements' && (
            <div className="space-y-2">
              {order.stockMovements && order.stockMovements.length > 0 ? (
                order.stockMovements.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{m.sku || m.productId}</span>
                        <span className="px-2 py-0.2 rounded bg-violet-600/20 text-violet-300 text-[10px] font-mono">
                          {m.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {m.notes || 'Stock ledger mutation'} • {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-zinc-300">
                        {m.previousQty} → {m.newQty}
                      </div>
                      <div className="text-xs font-bold text-amber-400">Qty: {m.quantity}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-zinc-500">No physical stock movements recorded yet.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
