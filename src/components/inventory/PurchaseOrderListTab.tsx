import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Printer,
  Download,
  Mail,
  Package,
  Eye,
  Pencil,
  History,
  Building2,
  Warehouse,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { Branch, Supplier, ProductItem } from '../../types/admin';
import type {
  PurchaseOrder,
  PurchaseOrderMetrics,
  PoStatus,
} from '../../types/purchaseOrder';
import { purchaseOrderApi } from '../../api/purchaseOrderApi';
import {
  printPurchaseOrder,
} from '../../utils/purchaseOrderPdfGenerator';
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal';
import { PurchaseOrderPreviewModal } from './PurchaseOrderPreviewModal';
import { SendPoEmailModal } from './SendPoEmailModal';
import { ReceivePoGoodsModal } from './ReceivePoGoodsModal';
import { PoTimelineModal } from './PoTimelineModal';
import { PRC_LOGO_DATA_URL } from '../../assets/logo.base64';
import { PACIFIC_LOGO_DATA_URL } from '../../assets/pacific_logo.base64';

export interface PurchaseOrderListTabProps {
  suppliers: Supplier[];
  branches: Branch[];
  products: ProductItem[];
  preSelectedSupplierId?: string;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export const PurchaseOrderListTab: React.FC<PurchaseOrderListTabProps> = ({
  suppliers,
  branches,
  products,
  preSelectedSupplierId,
  onShowSuccess,
  onShowError,
}) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<PoStatus | 'ALL'>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>(preSelectedSupplierId || 'ALL');

  const [metrics, setMetrics] = useState<PurchaseOrderMetrics>({
    total: 0,
    draft: 0,
    sent: 0,
    acknowledged: 0,
    partiallyReceived: 0,
    received: 0,
    cancelled: 0,
  });

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  const [previewModalPo, setPreviewModalPo] = useState<PurchaseOrder | null>(null);
  const [emailModalPo, setEmailModalPo] = useState<PurchaseOrder | null>(null);
  const [receiveModalPo, setReceiveModalPo] = useState<PurchaseOrder | null>(null);
  const [timelineModalPo, setTimelineModalPo] = useState<PurchaseOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await purchaseOrderApi.listPurchaseOrders({
        page,
        limit: 20,
        search: searchQuery.trim() || undefined,
        status: statusFilter,
        supplierId: supplierFilter !== 'ALL' ? supplierFilter : undefined,
        companyEntity: companyFilter !== 'ALL' ? companyFilter : undefined,
        branchId: branchFilter !== 'ALL' ? branchFilter : undefined,
      });

      if (res.success && res.data) {
        setOrders(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
          setTotalCount(res.pagination.total);
        }
        if (res.metrics) {
          setMetrics(res.metrics);
        }
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, supplierFilter, companyFilter, branchFilter, onShowError]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCreateSuccess = (savedPo: PurchaseOrder, openPreview?: boolean) => {
    setCreateModalOpen(false);
    setEditingPo(null);
    onShowSuccess(`Purchase Order #${savedPo.poNumber} saved successfully`);
    fetchOrders();
    if (openPreview) {
      setPreviewModalPo(savedPo);
    }
  };

  const handleEmailSuccess = () => {
    const poNum = emailModalPo?.poNumber;
    setEmailModalPo(null);
    onShowSuccess(`Purchase Order #${poNum} dispatched via email`);
    fetchOrders();
  };

  const handleReceiveSuccess = (updatedPo: PurchaseOrder) => {
    setReceiveModalPo(null);
    onShowSuccess(`Goods receipt recorded for PO #${updatedPo.poNumber}. Branch stock updated.`);
    fetchOrders();
  };

  const getStatusBadge = (status: PoStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
      case 'SENT':
        return 'bg-blue-950/60 text-blue-300 border border-blue-500/30';
      case 'ACKNOWLEDGED':
        return 'bg-purple-950/60 text-purple-300 border border-purple-500/30';
      case 'PARTIALLY_RECEIVED':
        return 'bg-amber-950/60 text-amber-300 border border-amber-500/30';
      case 'RECEIVED':
        return 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30';
      case 'CANCELLED':
        return 'bg-rose-950/60 text-rose-300 border border-rose-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300';
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ── KPI Metrics Deck ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Total Orders</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">{metrics.total}</div>
          <div className="text-[10px] text-indigo-500 mt-0.5">Commercial Procurement</div>
        </div>

        <div className="p-3 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Drafts (Pending)</div>
          <div className="text-xl font-bold text-zinc-300 font-mono mt-0.5">{metrics.draft}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Editable before sending</div>
        </div>

        <div className="p-3 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Sent to Supplier</div>
          <div className="text-xl font-bold text-blue-400 font-mono mt-0.5">{metrics.sent}</div>
          <div className="text-[10px] text-blue-500/80 mt-0.5">Emailed with PDF</div>
        </div>

        <div className="p-3 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Partially Received</div>
          <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">{metrics.partiallyReceived}</div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">Shipments in transit</div>
        </div>

        <div className="p-3 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Fulfilled & Closed</div>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{metrics.received}</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Stock added to depot</div>
        </div>
      </div>

      {/* ── Filter & Actions Bar ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by PO #, Supplier name, or item SKU..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              className="p-2 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-[#3F3F46] text-slate-700 dark:text-zinc-300 rounded-xl transition text-xs"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => {
                setEditingPo(null);
                setCreateModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 shrink-0"
            >
              <Plus size={15} />
              <span>+ Create Purchase Order</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as PoStatus | 'ALL');
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-zinc-300 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Received / Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Company Entity Filter */}
          <select
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-zinc-300 outline-none"
          >
            <option value="ALL">All Issuing Entities</option>
            <option value="PACIFIC_PRODUCTS">Pacific Products & Solutions</option>
            <option value="PRC_HARDWARE">PRC Hardware</option>
          </select>

          {/* Supplier Filter */}
          <select
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-zinc-300 outline-none"
          >
            <option value="ALL">All Suppliers / Vendors</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-zinc-300 outline-none"
          >
            <option value="ALL">All Receiving Depots</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city || 'Delhi'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table & Cards View ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <span>Loading Purchase Orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
            <p className="font-bold text-slate-700 dark:text-zinc-300">No Purchase Orders found</p>
            <p className="text-xs text-slate-500 mt-1">Create your first PO or adjust your filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-3">Issuing Brand</th>
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-3">Receiving Depot</th>
                  <th className="py-3 px-3">Items Summary</th>
                  <th className="py-3 px-4 text-right">Order Value</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {orders.map((po) => {
                  const fullPoNo = po.revision > 0 ? `${po.poNumber}-R${po.revision}` : po.poNumber;
                  const totalUnits = po.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
                  const receivedUnits = po.items.reduce((sum, it) => sum + (it.quantityReceived || 0), 0);
                  const isPacific = po.companyEntity === 'PACIFIC_PRODUCTS';

                  return (
                    <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition">
                      {/* PO Number & Date */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{fullPoNo}</span>
                          {po.revision > 0 && (
                            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              R{po.revision}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-500">
                          {new Date(po.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Issuing Brand */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={po.companyLogo === 'prc' ? PRC_LOGO_DATA_URL : PACIFIC_LOGO_DATA_URL}
                            alt="Brand Logo"
                            className="w-5 h-5 object-contain bg-white rounded p-0.5 border border-zinc-700"
                          />
                          <span className="font-semibold text-slate-900 dark:text-white text-[11px]">
                            {isPacific ? 'Pacific Products' : 'PRC Hardware'}
                          </span>
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{po.supplier?.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-500">
                          {po.supplier?.contactPerson ? `${po.supplier.contactPerson} • ` : ''}{po.supplier?.email || 'No email'}
                        </div>
                      </td>

                      {/* Receiving Depot */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-zinc-200">{po.branch?.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-500">{po.branch?.city || 'Delhi'}</div>
                      </td>

                      {/* Items Summary */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-zinc-300">
                          {po.items.length} {po.items.length === 1 ? 'line' : 'lines'} ({totalUnits} pcs)
                        </div>
                        {po.status === 'PARTIALLY_RECEIVED' && (
                          <div className="text-[10px] text-amber-500 font-mono">
                            {receivedUnits}/{totalUnits} received
                          </div>
                        )}
                      </td>

                      {/* Order Value */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{Number(po.grandTotal).toLocaleString('en-IN')}
                        <div className="text-[9px] text-slate-500 font-normal">
                          {po.isInterState ? 'Incl. IGST' : 'Incl. CGST+SGST'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(po.status)}`}>
                          {po.status}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Preview PDF */}
                          <button
                            onClick={() => setPreviewModalPo(po)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                            title="Preview Print-Ready PDF"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Print Direct */}
                          <button
                            onClick={() => printPurchaseOrder(po)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                            title="Print Document"
                          >
                            <Printer size={14} />
                          </button>

                          {/* Email Dispatch */}
                          <button
                            onClick={() => setEmailModalPo(po)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                            title="Send / Resend Email to Supplier"
                          >
                            <Mail size={14} />
                          </button>

                          {/* Receive Goods (for sent / acknowledged / partial) */}
                          {['SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
                            <button
                              onClick={() => setReceiveModalPo(po)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                              title="Receive Goods into Depot Stock"
                            >
                              <Package size={14} />
                            </button>
                          )}

                          {/* Edit (allowed for draft; or creates revision if sent) */}
                          {!['RECEIVED', 'CANCELLED'].includes(po.status) && (
                            <button
                              onClick={() => {
                                setEditingPo(po);
                                setCreateModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                              title={po.status === 'DRAFT' ? 'Edit Draft PO' : 'Revise PO (-R1)'}
                            >
                              <Pencil size={14} />
                            </button>
                          )}

                          {/* Timeline / Audit History */}
                          <button
                            onClick={() => setTimelineModalPo(po)}
                            className="p-1.5 text-slate-400 hover:text-purple-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                            title="View Audit Trail & Dispatches"
                          >
                            <History size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#09090B] flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span>
              Showing {orders.length} of {totalCount} orders
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-lg disabled:opacity-40"
              >
                Prev
              </button>
              <span className="font-mono">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals Mounted Dynamically ─────────────────────────────────────── */}
      {createModalOpen && (
        <CreatePurchaseOrderModal
          po={editingPo}
          suppliers={suppliers}
          branches={branches}
          products={products}
          onClose={() => {
            setCreateModalOpen(false);
            setEditingPo(null);
          }}
          onSuccess={handleCreateSuccess}
        />
      )}

      {previewModalPo && (
        <PurchaseOrderPreviewModal
          po={previewModalPo}
          onClose={() => setPreviewModalPo(null)}
          onOpenEmailModal={(po) => setEmailModalPo(po)}
        />
      )}

      {emailModalPo && (
        <SendPoEmailModal
          po={emailModalPo}
          onClose={() => setEmailModalPo(null)}
          onSuccess={handleEmailSuccess}
        />
      )}

      {receiveModalPo && (
        <ReceivePoGoodsModal
          po={receiveModalPo}
          onClose={() => setReceiveModalPo(null)}
          onSuccess={handleReceiveSuccess}
        />
      )}

      {timelineModalPo && (
        <PoTimelineModal
          po={timelineModalPo}
          onClose={() => setTimelineModalPo(null)}
        />
      )}
    </div>
  );
};
