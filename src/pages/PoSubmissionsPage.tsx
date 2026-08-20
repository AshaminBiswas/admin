import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileCheck,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye,
  Download,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Trash2,
  Lock,
  User,
  Building,
  Calendar,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Send,
  UserCheck,
  FileText,
  HelpCircle,
  PackageCheck,
  Truck,
  ArrowUpRight,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  getAdminPoSubmissions,
  getAdminPoSubmissionById,
  getPoSubmissionPdfSignedUrl,
  adminStartReview,
  adminUpsertLineItems,
  adminApproveSubmission,
  adminIssueAcknowledgement,
  adminRejectSubmission,
  adminRequestChangesOnSubmission,
  adminAssignSubmission,
  adminAddInternalNote,
  downloadAcknowledgementPdf,
  downloadAttachmentFile,
} from '../api/adminPoSubmissionsService';
import { usersService } from '../api/usersService';
import { productsService, ProductItem } from '../api/productsService';
import {
  AdminPoSubmission,
  AdminPoSubmissionDetail,
  AdminQueueMetrics,
  PoSubmissionStatus,
  PoSourceType,
  PoSubmissionLineItem,
} from '../types/poSubmissions';
import { AdminUser } from '../types/admin';
import { useDebounce } from '../hooks/useDebounce';
import { AsyncActionButton } from '../components/common/AsyncActionButton';

// ── Status Configuration ───────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  PoSubmissionStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  DRAFT: { label: 'Draft', bg: 'bg-zinc-800/60', text: 'text-zinc-300', border: 'border-zinc-700', dot: 'bg-zinc-400' },
  SUBMITTED: { label: 'Submitted (New)', bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-700/60', dot: 'bg-blue-400' },
  UNDER_REVIEW: { label: 'Under Review', bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-700/60', dot: 'bg-amber-400' },
  CHANGES_REQUESTED: { label: 'Changes Requested', bg: 'bg-orange-950/60', text: 'text-orange-300', border: 'border-orange-700/60', dot: 'bg-orange-400' },
  APPROVED: { label: 'Approved', bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/60', dot: 'bg-emerald-400' },
  ACKNOWLEDGED: { label: 'Acknowledged', bg: 'bg-teal-950/60', text: 'text-teal-300', border: 'border-teal-700/60', dot: 'bg-teal-400' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-950/60', text: 'text-red-300', border: 'border-red-700/60', dot: 'bg-red-400' },
  FULFILLMENT: { label: 'Fulfillment', bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-700/60', dot: 'bg-purple-400' },
};

export function PoSubmissionsPage() {
  const { setCurrentView } = useAdminAuth();

  // ── State: Queue & Filters ──────────────────────────────────────────────────
  const [submissions, setSubmissions] = useState<AdminPoSubmission[]>([]);
  const [metrics, setMetrics] = useState<AdminQueueMetrics>({
    ALL: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    CHANGES_REQUESTED: 0,
    APPROVED: 0,
    ACKNOWLEDGED: 0,
    REJECTED: 0,
    FULFILLMENT: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  // ── State: Detail Drawer ────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminPoSubmissionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null);

  // ── State: Line Items Builder (Split-pane) ──────────────────────────────────
  const [mappedItems, setMappedItems] = useState<
    Array<{
      id?: string;
      productId?: string | null;
      variantId?: string | null;
      description: string;
      sku?: string | null;
      unit: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number | null;
    }>
  >([]);
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebounce(productSearch, 300);
  const [productSearchResults, setProductSearchResults] = useState<ProductItem[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [savingLines, setSavingLines] = useState(false);

  // New item form draft
  const [newItem, setNewItem] = useState({
    productId: '',
    description: '',
    sku: '',
    unit: 'PCS',
    quantity: 1,
    unitPrice: 0,
  });

  // ── State: Action Modals ────────────────────────────────────────────────────
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [confirmMismatchCheckbox, setConfirmMismatchCheckbox] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  const [showAckModal, setShowAckModal] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [staffUsers, setStaffUsers] = useState<AdminUser[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState('');

  const [submittingAction, setSubmittingAction] = useState(false);

  // ── State: Feedback Banners ─────────────────────────────────────────────────
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setErrorMsg(msg);
      setSuccessMsg(null);
      setTimeout(() => setErrorMsg(null), 7000);
    }
  };

  // ── Load Queue Data ─────────────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPoSubmissions({
        status: statusFilter,
        sourceType: sourceFilter,
        search: debouncedSearch,
        page,
        limit: 15,
      });
      setSubmissions(res.items);
      setMetrics(res.metrics);
      setTotalPages(res.pagination.totalPages);
      setTotalItems(res.pagination.totalItems);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to fetch PO queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, debouncedSearch, page]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // ── Load Detail Data ────────────────────────────────────────────────────────
  const openDetail = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    setPdfSignedUrl(null);
    try {
      const res = await getAdminPoSubmissionById(id);
      setDetail(res);

      // Initialize mapped lines builder with existing line items
      const existing = (res.lineItems || []).map((li) => ({
        id: li.id,
        productId: li.productId,
        variantId: li.variantId,
        description: li.description,
        sku: li.sku,
        unit: li.unit || 'PCS',
        quantity: li.quantity,
        unitPrice: Number(li.unitPrice),
        taxRate: li.taxRate ? Number(li.taxRate) : null,
      }));
      setMappedItems(existing);

      // If PDF submission, fetch signed URL for inline iframe
      if (res.sourceType === 'PDF_UPLOAD' && res.attachments && res.attachments.length > 0) {
        try {
          const signRes = await getPoSubmissionPdfSignedUrl(id);
          setPdfSignedUrl(signRes.url);
        } catch {
          // Non-blocking
        }
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to load PO details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setMappedItems([]);
    setPdfSignedUrl(null);
  };

  // ── Product Typeahead Search ────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedProductSearch || debouncedProductSearch.length < 2) {
      setProductSearchResults([]);
      return;
    }

    const searchCatalog = async () => {
      setSearchingProducts(true);
      try {
        const res = await productsService.listProducts(1, 8);
        if (res.success && res.data) {
          const filtered = res.data.filter(
            (p) =>
              p.name.toLowerCase().includes(debouncedProductSearch.toLowerCase()) ||
              p.sku?.toLowerCase().includes(debouncedProductSearch.toLowerCase())
          );
          setProductSearchResults(filtered);
        }
      } catch {
        setProductSearchResults([]);
      } finally {
        setSearchingProducts(false);
      }
    };

    searchCatalog();
  }, [debouncedProductSearch]);

  const selectProductForDraft = (product: ProductItem) => {
    setNewItem({
      productId: product.id,
      description: product.name,
      sku: product.sku || '',
      unit: 'PCS',
      quantity: 1,
      unitPrice: product.price || 0,
    });
    setProductSearch('');
    setProductSearchResults([]);
  };

  const addLineItemToBuilder = () => {
    if (!newItem.description.trim()) {
      showNotification('error', 'Please enter a product description or select from catalog');
      return;
    }
    if (newItem.quantity < 1) {
      showNotification('error', 'Quantity must be at least 1');
      return;
    }

    setMappedItems((prev) => [
      ...prev,
      {
        productId: newItem.productId || null,
        description: newItem.description.trim(),
        sku: newItem.sku || null,
        unit: newItem.unit || 'PCS',
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
      },
    ]);

    // Reset draft form
    setNewItem({
      productId: '',
      description: '',
      sku: '',
      unit: 'PCS',
      quantity: 1,
      unitPrice: 0,
    });
  };

  const removeLineItem = (index: number) => {
    setMappedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Live Calculated Totals & Variance ───────────────────────────────────────
  const mappedTotalSum = useMemo(() => {
    return mappedItems.reduce((acc, item) => acc + Number(item.quantity) * Number(item.unitPrice), 0);
  }, [mappedItems]);

  const statedTotalNum = useMemo(() => {
    return detail?.statedTotal ? Number(detail.statedTotal) : null;
  }, [detail]);

  const varianceMetrics = useMemo(() => {
    if (!statedTotalNum || statedTotalNum === 0) return null;
    const diff = Math.abs(mappedTotalSum - statedTotalNum);
    const percent = (diff / statedTotalNum) * 100;
    return {
      diff,
      percent,
      isExact: diff < 0.01,
      isWithinThreshold: percent <= 2,
      isWarning: percent > 2 && percent <= 5,
      isSevere: percent > 5,
    };
  }, [mappedTotalSum, statedTotalNum]);

  // ── Save Mapped Line Items ──────────────────────────────────────────────────
  const handleSaveLineItems = async () => {
    if (!selectedId) return;
    if (mappedItems.length === 0) {
      showNotification('error', 'At least one line item is required');
      return;
    }

    setSavingLines(true);
    try {
      const res = await adminUpsertLineItems(selectedId, mappedItems);
      showNotification('success', `Saved ${res.lineItems.length} mapped order lines. Total: ₹${res.mappedTotal.toLocaleString('en-IN')}`);
      await openDetail(selectedId);
      loadQueue();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save line items');
    } finally {
      setSavingLines(false);
    }
  };

  // ── Admin Actions ───────────────────────────────────────────────────────────
  const handleStartReview = async () => {
    if (!selectedId) return;
    setSubmittingAction(true);
    try {
      await adminStartReview(selectedId);
      showNotification('success', 'PO moved to Under Review. You can now map catalog line items.');
      await openDetail(selectedId);
      loadQueue();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to start review');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedId) return;
    setSubmittingAction(true);
    try {
      await adminApproveSubmission(selectedId, { confirmMismatch: confirmMismatchCheckbox });
      setShowApproveModal(false);
      showNotification('success', 'PO Approved! Ready to issue formal Acknowledgement.');
      await openDetail(selectedId);
      loadQueue();
    } catch (err: any) {
      if (err.code === 'TOTAL_MISMATCH_REQUIRES_CONFIRMATION') {
        setShowApproveModal(true); // Open modal with confirmation checkbox
      } else {
        showNotification('error', err.message || 'Failed to approve PO');
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleIssueAcknowledgement = async () => {
    if (!selectedId) return;
    setSubmittingAction(true);
    try {
      const res = await adminIssueAcknowledgement(selectedId);
      setShowAckModal(false);
      showNotification('success', `Order Acknowledgement #${res.ackNumber} generated and emailed to customer!`);
      await openDetail(selectedId);
      loadQueue();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to issue acknowledgement');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedId || !rejectReason.trim()) {
      showNotification('error', 'Rejection reason is required');
      return;
    }
    setSubmittingAction(true);
    try {
      await adminRejectSubmission(selectedId, rejectReason.trim());
      setShowRejectModal(false);
      setRejectReason('');
      showNotification('success', 'PO has been rejected and customer notified');
      await openDetail(selectedId);
      loadQueue();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to reject PO');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedId || !changeReason.trim()) {
      showNotification('error', 'Clarification reason is required');
      return;
    }
    setSubmittingAction(true);
    try {
      await adminRequestChangesOnSubmission(selectedId, changeReason.trim());
      setShowChangesModal(false);
      setChangeReason('');
      showNotification('success', 'Changes requested from customer with detailed instructions');
      await openDetail(selectedId);
      loadQueue();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to request changes');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenAssignModal = async () => {
    setShowAssignModal(true);
    try {
      const res = await usersService.listUsers({ limit: 50 });
      if (res.success && res.data) {
        setStaffUsers(res.data);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleAssign = async () => {
    if (!selectedId || !selectedStaffId) {
      showNotification('error', 'Please select a staff member');
      return;
    }
    setSubmittingAction(true);
    try {
      await adminAssignSubmission(selectedId, selectedStaffId);
      setShowAssignModal(false);
      showNotification('success', 'Reviewer assigned successfully');
      await openDetail(selectedId);
      loadQueue();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to assign reviewer');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!selectedId || !internalNoteText.trim()) {
      showNotification('error', 'Note content cannot be empty');
      return;
    }
    setSubmittingAction(true);
    try {
      await adminAddInternalNote(selectedId, internalNoteText.trim());
      setShowNoteModal(false);
      setInternalNoteText('');
      showNotification('success', 'Internal note saved (hidden from customer)');
      await openDetail(selectedId);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to add note');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto text-[#FAFAFA] font-sans pb-12">
      {/* ─── Top Header & Title ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#FAFAFA]">Purchase Order Intake Queue</h1>
              <p className="text-xs text-[#A1A1AA]">
                Unified review for Form submissions and Native PDF uploads with catalog line item mapping
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadQueue}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] rounded-xl text-xs font-semibold text-[#FAFAFA] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── Feedback Banners ────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-950/60 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* ─── KPI Metrics Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { key: 'ALL', label: 'All Submissions', count: metrics.ALL, color: 'text-[#FAFAFA]', border: 'border-[#27272A]' },
          { key: 'SUBMITTED', label: 'New / Intake', count: metrics.SUBMITTED, color: 'text-blue-400', border: 'border-blue-500/30' },
          { key: 'UNDER_REVIEW', label: 'Under Review', count: metrics.UNDER_REVIEW, color: 'text-amber-400', border: 'border-amber-500/30' },
          { key: 'CHANGES_REQUESTED', label: 'Changes Req.', count: metrics.CHANGES_REQUESTED, color: 'text-orange-400', border: 'border-orange-500/30' },
          { key: 'APPROVED', label: 'Approved', count: metrics.APPROVED, color: 'text-emerald-400', border: 'border-emerald-500/30' },
          { key: 'ACKNOWLEDGED', label: 'Acknowledged', count: metrics.ACKNOWLEDGED, color: 'text-teal-400', border: 'border-teal-500/30' },
          { key: 'REJECTED', label: 'Rejected', count: metrics.REJECTED, color: 'text-red-400', border: 'border-red-500/30' },
        ].map((item) => {
          const isActive = statusFilter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                setStatusFilter(item.key);
                setPage(1);
              }}
              className={`p-3.5 rounded-xl bg-[#18181B] border transition-all text-left flex flex-col justify-between ${
                isActive ? `${item.border} ring-2 ring-amber-500/40 shadow-lg bg-[#27272A]/40` : 'border-[#27272A] hover:border-[#3F3F46]'
              }`}
            >
              <span className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider">{item.label}</span>
              <span className={`text-xl font-extrabold mt-1.5 ${item.color}`}>{item.count}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Filter & Search Bar ─────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
          <input
            type="text"
            placeholder="Search by submission #, PO #, customer name, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        {/* Source Mode Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-[#71717A] whitespace-nowrap mr-1">Source:</span>
          {[
            { key: 'ALL', label: 'All Sources' },
            { key: 'FORM', label: 'Portal Form' },
            { key: 'PDF_UPLOAD', label: 'PDF Upload' },
          ].map((src) => (
            <button
              key={src.key}
              onClick={() => {
                setSourceFilter(src.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                sourceFilter === src.key
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-[#09090B] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A]'
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Table Queue ─────────────────────────────────────────────────────── */}
      <div className="rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#09090B] border-b border-[#27272A] text-[#71717A] uppercase font-bold tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Submission Ref</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Customer PO #</th>
                <th className="py-3.5 px-4">Stated Total</th>
                <th className="py-3.5 px-4">Mapped Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Submitted</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="py-4 px-4">
                      <div className="h-4 bg-[#27272A] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#71717A]">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">No purchase order submissions found</p>
                    <p className="text-xs text-[#52525B] mt-1">Try clearing filters or search terms</p>
                  </td>
                </tr>
              ) : (
                submissions.map((po) => {
                  const cfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.SUBMITTED;
                  return (
                    <tr key={po.id} className="hover:bg-[#27272A]/40 transition-colors group">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        {po.submissionNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        {po.sourceType === 'PDF_UPLOAD' ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                            <Upload className="w-3 h-3" />
                            <span>PDF</span>
                            {po.hasPendingMapping && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="Catalog mapping required" />
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                            <FileText className="w-3 h-3" />
                            <span>FORM</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#FAFAFA]">
                          {po.customer.companyName || `${po.customer.firstName} ${po.customer.lastName}`}
                        </div>
                        <div className="text-[11px] text-[#71717A] truncate max-w-[180px]">{po.customer.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#FAFAFA]">
                        {po.customerPoNumber}
                      </td>
                      <td className="py-3.5 px-4 text-[#A1A1AA]">
                        {po.statedTotal ? `₹${Number(po.statedTotal).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#FAFAFA]">
                        {po.mappedTotal ? (
                          <span className="text-emerald-400">₹{Number(po.mappedTotal).toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-[#71717A] italic">Pending Map</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#71717A] text-[11px]">
                        {new Date(po.submittedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-[#A1A1AA]">
                        {po.assignee ? (
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <UserCheck className="w-3 h-3 text-amber-400" />
                            {po.assignee.firstName || po.assignee.email}
                          </span>
                        ) : (
                          <span className="text-[#52525B] text-[11px] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openDetail(po.id)}
                          className="px-3 py-1.5 bg-[#27272A] hover:bg-amber-500 hover:text-black rounded-lg text-xs font-bold text-[#FAFAFA] transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex items-center justify-between text-xs text-[#71717A]">
          <span>
            Showing {submissions.length} of {totalItems} submissions
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-[#18181B] border border-[#27272A] disabled:opacity-30 hover:bg-[#27272A] text-[#FAFAFA]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg bg-[#18181B] border border-[#27272A] disabled:opacity-30 hover:bg-[#27272A] text-[#FAFAFA]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Detail Review Drawer (Slide-in) ─────────────────────────────────── */}
      {selectedId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="w-full max-w-5xl bg-[#18181B] text-[#FAFAFA] border-l border-[#27272A] h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Drawer Header */}
            <div className="sticky top-0 z-20 p-5 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#FAFAFA]">
                      {detail?.submissionNumber || 'Loading...'}
                    </h2>
                    {detail && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          STATUS_CONFIG[detail.status]?.bg
                        } ${STATUS_CONFIG[detail.status]?.text} ${STATUS_CONFIG[detail.status]?.border}`}
                      >
                        {STATUS_CONFIG[detail.status]?.label}
                      </span>
                    )}
                    {detail?.sourceType === 'PDF_UPLOAD' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60 text-[10px] font-bold">
                        PDF Upload
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Customer PO: <strong className="text-[#A1A1AA]">{detail?.customerPoNumber}</strong> | Submitted by{' '}
                    <strong className="text-[#A1A1AA]">{detail?.customer.email}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={closeDetail}
                className="p-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            {loadingDetail || !detail ? (
              <div className="p-12 text-center text-[#71717A] space-y-3 animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
                <p>Loading submission details...</p>
              </div>
            ) : (
              <div className="p-6 space-y-6 flex-1">
                {/* ── Top Action Buttons Bar ── */}
                <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {/* State-specific primary workflow actions */}
                    {detail.status === 'SUBMITTED' && (
                      <button
                        onClick={handleStartReview}
                        disabled={submittingAction}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-md transition-colors"
                      >
                        Start Review
                      </button>
                    )}

                    {(detail.status === 'UNDER_REVIEW' || detail.status === 'CHANGES_REQUESTED') && (
                      <button
                        onClick={handleApprove}
                        disabled={submittingAction || mappedItems.length === 0}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-[#FAFAFA] font-bold text-xs rounded-xl shadow-md transition-colors inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve PO</span>
                      </button>
                    )}

                    {detail.status === 'APPROVED' && (
                      <button
                        onClick={() => setShowAckModal(true)}
                        disabled={submittingAction}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-[#FAFAFA] font-bold text-xs rounded-xl shadow-md transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Issue Formal Acknowledgement</span>
                      </button>
                    )}

                    {detail.acknowledgement && (
                      <AsyncActionButton
                        mode="download"
                        idleLabel={`Download Ack #${detail.acknowledgement.ackNumber}`}
                        loadingLabel="Preparing PDF..."
                        successLabel="Downloaded!"
                        variant="custom"
                        className="px-3.5 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold text-xs rounded-xl border border-teal-500/40"
                        onAction={async () => {
                          await downloadAcknowledgementPdf(detail.id, detail.acknowledgement!.ackNumber);
                        }}
                      />
                    )}
                  </div>

                  {/* Secondary actions: Reject, Request Changes, Assign, Note */}
                  <div className="flex items-center gap-2">
                    {detail.status !== 'REJECTED' && detail.status !== 'ACKNOWLEDGED' && (
                      <>
                        <button
                          onClick={() => setShowChangesModal(true)}
                          className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] border border-orange-500/30 text-orange-400 font-semibold text-xs rounded-xl"
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() => setShowRejectModal(true)}
                          className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] border border-red-500/30 text-red-400 font-semibold text-xs rounded-xl"
                        >
                          Reject PO
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleOpenAssignModal}
                      className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] font-semibold text-xs rounded-xl"
                    >
                      Assign Staff
                    </button>
                    <button
                      onClick={() => setShowNoteModal(true)}
                      className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] font-semibold text-xs rounded-xl"
                    >
                      + Internal Note
                    </button>
                  </div>
                </div>

                {/* ── Status Banner (if Changes Requested or Rejected) ── */}
                {detail.status === 'CHANGES_REQUESTED' && (
                  <div className="p-4 rounded-xl bg-orange-950/40 border border-orange-500/30 text-orange-300 text-xs space-y-1">
                    <span className="font-bold uppercase text-[10px] tracking-wider text-orange-400">
                      Changes Requested from Customer:
                    </span>
                    <p className="whitespace-pre-line text-[#FAFAFA]">{detail.changeRequestReason}</p>
                  </div>
                )}
                {detail.status === 'REJECTED' && (
                  <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs space-y-1">
                    <span className="font-bold uppercase text-[10px] tracking-wider text-red-400">
                      Rejection Reason:
                    </span>
                    <p className="whitespace-pre-line text-[#FAFAFA]">{detail.rejectionReason}</p>
                  </div>
                )}

                {/* ── Customer & PO Overview Grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase">Customer Account</span>
                    <p className="font-bold text-sm text-[#FAFAFA]">{detail.customer.companyName || `${detail.customer.firstName} ${detail.customer.lastName}`}</p>
                    <p className="text-xs text-[#A1A1AA]">{detail.customer.email}</p>
                    {detail.customer.phone && <p className="text-xs text-[#71717A]">Phone: {detail.customer.phone}</p>}
                    {detail.customer.gstin && <p className="text-xs text-amber-400 font-mono">GSTIN: {detail.customer.gstin}</p>}
                  </div>

                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase">Commercial Parameters</span>
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-[#71717A]">Stated Total:</span>
                      <span className="font-mono font-bold text-[#FAFAFA]">
                        {detail.statedTotal ? `₹${Number(detail.statedTotal).toLocaleString('en-IN')}` : 'Not Specified'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#71717A]">Mapped Total:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {detail.mappedTotal ? `₹${Number(detail.mappedTotal).toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#71717A]">Est. Delivery:</span>
                      <span className="font-medium text-[#FAFAFA]">
                        {detail.expectedDeliveryDate
                          ? new Date(detail.expectedDeliveryDate).toLocaleDateString('en-IN')
                          : 'TBD'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase">Assigned Staff</span>
                    <p className="font-bold text-sm text-[#FAFAFA]">
                      {detail.assignee ? `${detail.assignee.firstName} ${detail.assignee.lastName}` : 'Unassigned'}
                    </p>
                    <p className="text-xs text-[#71717A]">
                      Reviewer: {detail.reviewer ? `${detail.reviewer.firstName} ${detail.reviewer.lastName}` : 'None'}
                    </p>
                    {detail.approvedBy && (
                      <p className="text-xs text-emerald-400">
                        Approved by {detail.approver?.firstName || 'Admin'} on{' '}
                        {new Date(detail.approvedAt!).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Downstream Fulfillment Pipeline Bridge ── */}
                {detail.b2bPurchaseOrder && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-teal-950/40 via-[#18181B] to-indigo-950/40 border border-teal-500/30 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                          <PackageCheck className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#FAFAFA] uppercase tracking-wider flex items-center gap-2">
                            <span>Downstream Fulfillment Pipeline</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] lowercase font-normal">
                              linked
                            </span>
                          </h4>
                          <p className="text-[11px] text-[#A1A1AA]">
                            Master Fulfillment PO:{' '}
                            <span className="font-mono font-bold text-teal-300">{detail.b2bPurchaseOrder.poNumber}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          sessionStorage.setItem('selected_fulfillment_po_id', detail.b2bPurchaseOrder!.id);
                          setCurrentView('purchase-orders');
                        }}
                        className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-md"
                      >
                        <span>Open Fulfillment Desk</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Milestone Progress Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-[#09090B]/70 border border-[#27272A] space-y-0.5">
                        <div className="text-[#71717A] text-[10px] uppercase font-bold">1. Advance Payment</div>
                        <div className="font-semibold text-xs">
                          {detail.b2bPurchaseOrder.receipts?.[0]?.status === 'VERIFIED' ? (
                            <span className="text-emerald-400">✓ Verified</span>
                          ) : detail.b2bPurchaseOrder.receipts?.length ? (
                            <span className="text-amber-400">Receipt Under Review</span>
                          ) : (
                            <span className="text-zinc-400">Pending 30% Advance</span>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#09090B]/70 border border-[#27272A] space-y-0.5">
                        <div className="text-[#71717A] text-[10px] uppercase font-bold">2. Packing List</div>
                        <div className="font-semibold text-xs">
                          {detail.b2bPurchaseOrder.packingList ? (
                            <span className="text-emerald-400">✓ Generated</span>
                          ) : (
                            <span className="text-zinc-400">Awaiting Advance</span>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#09090B]/70 border border-[#27272A] space-y-0.5">
                        <div className="text-[#71717A] text-[10px] uppercase font-bold">3. E-Way & Dispatch</div>
                        <div className="font-semibold text-xs">
                          {detail.b2bPurchaseOrder.dispatch ? (
                            <span className="text-emerald-400">✓ Dispatched</span>
                          ) : (
                            <span className="text-zinc-400">Awaiting Logistics</span>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#09090B]/70 border border-[#27272A] space-y-0.5">
                        <div className="text-[#71717A] text-[10px] uppercase font-bold">4. GST Tax Invoice</div>
                        <div className="font-semibold text-xs">
                          {detail.b2bPurchaseOrder.invoice ? (
                            <span className="text-emerald-400">✓ Invoiced (IRIS)</span>
                          ) : (
                            <span className="text-zinc-400">Pending</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SPLIT-PANE REVIEW: Inline PDF Viewer + Order Lines Builder ── */}
                {detail.sourceType === 'PDF_UPLOAD' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>Native PDF Document & Catalog Line Item Mapping</span>
                      </h3>
                      {detail.attachments && detail.attachments[0] && (
                        <button
                          onClick={() => downloadAttachmentFile(detail.attachments[0].id, detail.attachments[0].originalFileName, true)}
                          className="text-xs font-semibold text-amber-400 hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open PDF in New Window</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[640px]">
                      {/* Left: Inline PDF Viewer */}
                      <div className="rounded-xl bg-[#09090B] border border-[#27272A] overflow-hidden flex flex-col h-full">
                        <div className="p-2.5 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between text-xs text-[#A1A1AA]">
                          <span>Original Customer PO Document</span>
                          <span className="text-[10px] text-[#71717A]">Scroll & zoom natively in viewer</span>
                        </div>
                        <div className="flex-1 bg-zinc-900 relative">
                          {pdfSignedUrl ? (
                            <iframe
                              src={pdfSignedUrl}
                              title="Customer PO PDF"
                              className="w-full h-full border-0"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-[#71717A] space-y-2 p-6 text-center">
                              <FileSpreadsheet className="w-12 h-12 text-zinc-700" />
                              <p className="text-xs">PDF stream preview loading...</p>
                              {detail.attachments && detail.attachments[0] && (
                                <button
                                  onClick={() => downloadAttachmentFile(detail.attachments[0].id, detail.attachments[0].originalFileName)}
                                  className="px-3 py-1.5 bg-[#27272A] hover:bg-amber-500 hover:text-black rounded-lg text-xs font-bold text-[#FAFAFA]"
                                >
                                  Download PDF File
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Build Order Lines Panel */}
                      <div className="rounded-xl bg-[#09090B] border border-[#27272A] flex flex-col h-full overflow-hidden">
                        <div className="p-3 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-xs text-[#FAFAFA]">Build & Map Order Lines</h4>
                            <p className="text-[10px] text-[#71717A]">
                              Match customer PDF items to internal catalog SKUs and verify pricing
                            </p>
                          </div>
                          <button
                            onClick={handleSaveLineItems}
                            disabled={savingLines || mappedItems.length === 0}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1"
                          >
                            {savingLines ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                            <span>Save Lines</span>
                          </button>
                        </div>

                        {/* Product Search & Line Creator */}
                        <div className="p-3 bg-[#18181B]/60 border-b border-[#27272A] space-y-2">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search internal product catalog by name or SKU..."
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              className="w-full px-3 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-xs text-[#FAFAFA] focus:border-amber-400 outline-none"
                            />
                            {searchingProducts && (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin absolute right-3 top-2 text-amber-400" />
                            )}
                            {productSearchResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#18181B] border border-[#27272A] rounded-lg shadow-2xl max-h-48 overflow-y-auto divide-y divide-[#27272A]">
                                {productSearchResults.map((prod) => (
                                  <button
                                    key={prod.id}
                                    type="button"
                                    onClick={() => selectProductForDraft(prod)}
                                    className="w-full px-3 py-2 text-left hover:bg-[#27272A] text-xs flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="font-bold text-[#FAFAFA]">{prod.name}</div>
                                      <div className="text-[10px] font-mono text-amber-400">SKU: {prod.sku}</div>
                                    </div>
                                    <div className="font-bold text-[#FAFAFA]">₹{prod.price?.toLocaleString('en-IN')}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-12 gap-2 text-xs">
                            <div className="col-span-6">
                              <input
                                type="text"
                                placeholder="Item description / name"
                                value={newItem.description}
                                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-xs text-[#FAFAFA] focus:border-amber-400 outline-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                value={newItem.quantity}
                                onChange={(e) => setNewItem({ ...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="w-full px-2.5 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-xs text-[#FAFAFA] text-center focus:border-amber-400 outline-none"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Unit Rate (₹)"
                                value={newItem.unitPrice}
                                onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2.5 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-xs text-[#FAFAFA] text-right focus:border-amber-400 outline-none"
                              />
                            </div>
                            <div className="col-span-1">
                              <button
                                type="button"
                                onClick={addLineItemToBuilder}
                                className="w-full h-full bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg flex items-center justify-center"
                                title="Add line item"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Mapped Line Items Table */}
                        <div className="flex-1 overflow-y-auto p-2">
                          {mappedItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[#71717A] text-xs p-6 text-center space-y-1">
                              <Plus className="w-8 h-8 opacity-20" />
                              <p className="font-semibold">No line items mapped yet</p>
                              <p className="text-[11px] text-[#52525B]">
                                Search products above or type custom line descriptions
                              </p>
                            </div>
                          ) : (
                            <table className="w-full text-xs text-left">
                              <thead className="text-[10px] text-[#71717A] uppercase border-b border-[#27272A]">
                                <tr>
                                  <th className="py-2 px-2">Item</th>
                                  <th className="py-2 px-2 text-center">Qty</th>
                                  <th className="py-2 px-2 text-right">Rate</th>
                                  <th className="py-2 px-2 text-right">Total</th>
                                  <th className="py-2 px-1"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#27272A]">
                                {mappedItems.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-[#27272A]/30">
                                    <td className="py-2 px-2">
                                      <div className="font-semibold text-[#FAFAFA] leading-tight">{item.description}</div>
                                      {item.sku && <span className="text-[10px] text-amber-400 font-mono">SKU: {item.sku}</span>}
                                    </td>
                                    <td className="py-2 px-2 text-center font-bold text-[#FAFAFA]">{item.quantity}</td>
                                    <td className="py-2 px-2 text-right text-[#A1A1AA]">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                                    <td className="py-2 px-2 text-right font-bold text-emerald-400">
                                      ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-2 px-1 text-right">
                                      <button
                                        onClick={() => removeLineItem(idx)}
                                        className="text-[#71717A] hover:text-red-400 p-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>

                        {/* Live Variance Calculation Footer */}
                        <div className="p-3 bg-[#18181B] border-t border-[#27272A] space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#A1A1AA]">Mapped Lines Total ({mappedItems.length} items):</span>
                            <span className="font-mono font-bold text-sm text-emerald-400">
                              ₹{mappedTotalSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {statedTotalNum ? (
                            <div className="flex justify-between items-center text-xs pt-1 border-t border-[#27272A]">
                              <span className="text-[#71717A]">PDF Stated Total:</span>
                              <span className="font-mono text-xs text-[#FAFAFA]">
                                ₹{statedTotalNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ) : null}

                          {varianceMetrics && (
                            <div
                              className={`p-2 rounded-lg text-xs flex items-center justify-between font-semibold ${
                                varianceMetrics.isWithinThreshold
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                  : varianceMetrics.isWarning
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                                  : 'bg-red-950/60 text-red-300 border border-red-500/30'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                {varianceMetrics.isWithinThreshold ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                )}
                                Variance: {varianceMetrics.percent.toFixed(1)}% (₹{varianceMetrics.diff.toLocaleString('en-IN')})
                              </span>
                              <span>
                                {varianceMetrics.isWithinThreshold
                                  ? 'Within 2% SLA ✓'
                                  : varianceMetrics.isWarning
                                  ? 'Warning (>2%)'
                                  : 'Mismatch Flag (>5%)'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Form PO Line Items (if Form intake) ── */}
                {detail.sourceType === 'FORM' && (
                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3">
                    <h3 className="font-bold text-xs text-[#FAFAFA] uppercase tracking-wider">
                      Submitted Order Line Items
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-[#71717A] uppercase border-b border-[#27272A]">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Description</th>
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Unit Rate</th>
                            <th className="py-2 px-3 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272A]">
                          {detail.lineItems.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="py-2.5 px-3 text-[#71717A]">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-[#FAFAFA]">{item.description}</td>
                              <td className="py-2.5 px-3 font-mono text-amber-400">{item.sku || '—'}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-[#FAFAFA]">{item.quantity}</td>
                              <td className="py-2.5 px-3 text-right text-[#A1A1AA]">
                                ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                ₹{Number(item.lineTotal).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Addresses Section ── */}
                {detail.billToAddress && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                      <span className="text-[10px] font-bold text-[#71717A] uppercase">Bill To Address</span>
                      <p className="font-bold text-xs text-[#FAFAFA]">{detail.billToAddress.attentionTo}</p>
                      {detail.billToAddress.companyName && <p className="text-xs text-[#A1A1AA]">{detail.billToAddress.companyName}</p>}
                      <p className="text-xs text-[#71717A]">{detail.billToAddress.addressLine1}</p>
                      <p className="text-xs text-[#71717A]">{detail.billToAddress.city}, {detail.billToAddress.state} - {detail.billToAddress.postalCode}</p>
                      <p className="text-xs text-[#71717A]">Phone: {detail.billToAddress.phone}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                      <span className="text-[10px] font-bold text-[#71717A] uppercase">Ship To Address</span>
                      <p className="font-bold text-xs text-[#FAFAFA]">{detail.shipToAddress?.attentionTo || detail.billToAddress.attentionTo}</p>
                      <p className="text-xs text-[#71717A]">{detail.shipToAddress?.addressLine1 || detail.billToAddress.addressLine1}</p>
                      <p className="text-xs text-[#71717A]">{detail.shipToAddress?.city || detail.billToAddress.city}, {detail.shipToAddress?.state || detail.billToAddress.state}</p>
                    </div>
                  </div>
                )}

                {/* ── Audit Trail & Internal Notes History ── */}
                <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-[#FAFAFA] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Audit Trail & Activity Log</span>
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {detail.logs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg text-xs space-y-1 border ${
                          log.isInternal
                            ? 'bg-amber-950/20 border-amber-500/30'
                            : 'bg-[#18181B] border-[#27272A]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#FAFAFA]">
                              {log.actor ? `${log.actor.firstName || log.actor.email}` : 'System'}
                            </span>
                            {log.isInternal && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                <Lock className="w-2.5 h-2.5" />
                                Internal Staff Note
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] font-mono">
                              {log.action}
                            </span>
                          </div>
                          <span className="text-[#71717A]">
                            {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </span>
                        </div>
                        {log.comment && <p className="text-[#D4D4D8]">{log.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: Approve PO (with Mismatch Guard) ───────────────────────── */}
      {showApproveModal && detail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Approve Purchase Order</h3>
                <p className="text-xs text-[#A1A1AA]">Ref: {detail.submissionNumber}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#71717A]">Mapped Items Total:</span>
                <span className="font-bold text-emerald-400 font-mono">₹{mappedTotalSum.toLocaleString('en-IN')}</span>
              </div>
              {statedTotalNum && (
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Customer Stated Total:</span>
                  <span className="font-bold text-[#FAFAFA] font-mono">₹{statedTotalNum.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {varianceMetrics && !varianceMetrics.isWithinThreshold && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Total Mismatch Detected ({varianceMetrics.percent.toFixed(1)}% variance)</span>
                </div>
                <p className="text-[11px] text-amber-200">
                  The mapped total differs by ₹{varianceMetrics.diff.toLocaleString('en-IN')}. Please verify before approving.
                </p>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmMismatchCheckbox}
                    onChange={(e) => setConfirmMismatchCheckbox(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400 bg-[#09090B]"
                  />
                  <span className="text-xs font-bold text-[#FAFAFA]">
                    I confirm this price variance is correct and approve anyway
                  </span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs font-semibold text-[#FAFAFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={submittingAction || Boolean(varianceMetrics && !varianceMetrics.isWithinThreshold && !confirmMismatchCheckbox)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 rounded-xl text-xs font-bold text-[#FAFAFA]"
              >
                {submittingAction ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Issue Formal Acknowledgement ───────────────────────────── */}
      {showAckModal && detail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Issue Order Acknowledgement</h3>
                <p className="text-xs text-[#A1A1AA]">Ref: {detail.submissionNumber}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs space-y-2">
              <p className="text-[#A1A1AA] leading-relaxed">
                This action generates the official, binding <strong>Order Acknowledgement PDF</strong> with QR code,
                stores the PDF as the system-of-record, and immediately emails it to{' '}
                <strong className="text-[#FAFAFA]">{detail.customer.email}</strong>.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setShowAckModal(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs font-semibold text-[#FAFAFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIssueAcknowledgement}
                disabled={submittingAction}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-xl text-xs font-bold text-[#FAFAFA] flex items-center gap-1.5"
              >
                {submittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{submittingAction ? 'Generating & Emailing...' : 'Generate & Email PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Request Changes ─────────────────────────────────────────── */}
      {showChangesModal && detail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Request Changes from Customer</h3>
                <p className="text-xs text-[#A1A1AA]">Ref: {detail.submissionNumber}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#A1A1AA]">
                Reason / Clarification Required (Mandatory)*
              </label>
              <textarea
                rows={4}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Specify what details are ambiguous or need adjustment in the customer PO..."
                className="w-full p-3 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] focus:border-amber-400 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setShowChangesModal(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs font-semibold text-[#FAFAFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestChanges}
                disabled={submittingAction || !changeReason.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 rounded-xl text-xs font-bold text-[#FAFAFA]"
              >
                {submittingAction ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: Reject PO ───────────────────────────────────────────────── */}
      {showRejectModal && detail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Reject Purchase Order</h3>
                <p className="text-xs text-[#A1A1AA]">Ref: {detail.submissionNumber}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#A1A1AA]">
                Rejection Reason (Mandatory)*
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State the commercial or inventory reason for rejection..."
                className="w-full p-3 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] focus:border-red-400 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs font-semibold text-[#FAFAFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={submittingAction || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-30 rounded-xl text-xs font-bold text-[#FAFAFA]"
              >
                {submittingAction ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: Assign Reviewer ─────────────────────────────────────────── */}
      {showAssignModal && detail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Assign Reviewer</h3>
                <p className="text-xs text-[#A1A1AA]">Ref: {detail.submissionNumber}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#A1A1AA]">Select Staff Member</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] focus:border-amber-400 outline-none"
              >
                <option value="">-- Choose Reviewer --</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName || ''} {u.lastName || ''} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs font-semibold text-[#FAFAFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={submittingAction || !selectedStaffId}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl disabled:opacity-30"
              >
                {submittingAction ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: Add Internal Note ──────────────────────────────────────── */}
      {showNoteModal && detail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Add Internal Note</h3>
                <p className="text-xs text-[#A1A1AA]">Hidden from customer account</p>
              </div>
            </div>

            <div className="space-y-2">
              <textarea
                rows={3}
                value={internalNoteText}
                onChange={(e) => setInternalNoteText(e.target.value)}
                placeholder="Internal verification notes, supplier stock check remarks, pricing comments..."
                className="w-full p-3 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] focus:border-amber-400 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs font-semibold text-[#FAFAFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddInternalNote}
                disabled={submittingAction || !internalNoteText.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl disabled:opacity-30"
              >
                {submittingAction ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
