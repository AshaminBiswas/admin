import React, { useState, useEffect, useCallback } from 'react';
import {
  getAdminPurchaseOrders,
  getAdminPurchaseOrderById,
  adminAcknowledgePayment,
  adminVerifyPayment,
  adminRejectReceipt,
  adminUpdatePurchaseOrder,
  downloadAdminPaymentReceipt,
  downloadAdminPoPdf,
  getAdvanceSetting,
  updateAdvanceSetting,
  getBankSettings,
  updateBankSetting,
  downloadAdminPackingListPdf,
  adminGenerateProformaInvoice,
  downloadAdminProformaInvoicePdf,
  adminGenerateTaxInvoiceIris,
  adminGenerateEwayBillIris,
  downloadAdminEwayBillPdf,
  adminDispatchPo,
  adminGenerateProductIssueList,
  downloadAdminProductIssueListPdf,
  adminRegenerateInvoice,
  downloadAdminInvoicePdf,
  adminDeletePurchaseOrder,
  adminUpdateCustomerAdvancePercentage,
  AdminPurchaseOrder,
  AdvanceSetting,
  BankSetting,
} from '../api/adminPoService';
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  Download,
  Eye,
  Sliders,
  X,
  Building,
  Truck,
  Check,
  RefreshCw,
  FileCheck,
  Receipt,
  Pencil,
  ExternalLink,
  Trash2,
  Package,
  CreditCard,
  Layers,
  FileSpreadsheet,
  QrCode,
  ClipboardList,
  Send,
} from 'lucide-react';
import { AsyncActionButton } from '../components/common/AsyncActionButton';

/* ─── Skeleton Loading Body for Detail View ────────────────────────────────── */

function PurchaseOrderDetailSkeleton() {
  return (
    <div className="p-6 space-y-6 flex-1 text-xs text-[#FAFAFA] animate-pulse">
      <div className="flex items-center space-x-2 text-[#A1A1AA] pb-1">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
        <span className="font-semibold text-[11px] text-[#A1A1AA]">Loading Purchase Order Details...</span>
      </div>

      <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-28 bg-[#27272A] rounded-xl"></div>
          <div className="h-8 w-36 bg-[#27272A] rounded-xl"></div>
          <div className="h-8 w-24 bg-[#27272A] rounded-xl"></div>
        </div>
        <div className="h-8 w-44 bg-[#27272A] rounded-xl"></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#09090B] p-4 rounded-xl border border-[#27272A]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-2.5 w-16 bg-[#27272A] rounded"></div>
            <div className="h-5 w-28 bg-[#27272A] rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Skeleton Loading Body for Full Page View ────────────────────────────────── */

export function PurchaseOrdersPageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#27272A]"></div>
          <div className="space-y-2">
            <div className="h-5 w-64 bg-[#27272A] rounded"></div>
            <div className="h-3 w-80 bg-[#27272A] rounded"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#27272A]"></div>
            <div className="h-5 w-12 bg-[#27272A] rounded"></div>
            <div className="h-2.5 w-20 bg-[#27272A] rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Purchase Orders Component ───────────────────────────────────────── */

export function PurchaseOrdersPage() {
  const [pos, setPos] = useState<AdminPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Detail Modal State
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [selectedPo, setSelectedPo] = useState<AdminPurchaseOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // PI Generation
  const [generatingPi, setGeneratingPi] = useState(false);

  // IRIS Tax Invoice
  const [generatingTaxInvoice, setGeneratingTaxInvoice] = useState(false);

  // IRIS E-Way Bill Modal
  const [ewayModalOpen, setEwayModalOpen] = useState(false);
  const [ewayVehicleNo, setEwayVehicleNo] = useState('DL01AB1234');
  const [ewayCarrierName, setEwayCarrierName] = useState('BlueDart Express');
  const [ewayTransDocNo, setEwayTransDocNo] = useState('');
  const [ewayDistanceKm, setEwayDistanceKm] = useState<number>(120);
  const [ewaySubmitting, setEwaySubmitting] = useState(false);

  // Product Issue List Modal
  const [issueListModalOpen, setIssueListModalOpen] = useState(false);
  const [issueReceivedBy, setIssueReceivedBy] = useState('Transporter Driver / Representative');
  const [issueVehicleNo, setIssueVehicleNo] = useState('');
  const [issueCarrierName, setIssueCarrierName] = useState('BlueDart Express');
  const [issueNotes, setIssueNotes] = useState('All architectural hardware goods inspected and dispatched intact.');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // Dispatch Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [carrierName, setCarrierName] = useState('BlueDart Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchedAt, setDispatchedAt] = useState(new Date().toISOString().slice(0, 10));
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);
  const [regeneratingInvoice, setRegeneratingInvoice] = useState(false);

  // Acknowledge Modal
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [ackAmount, setAckAmount] = useState<number>(0);
  const [ackUtr, setAckUtr] = useState('');
  const [ackMethod, setAckMethod] = useState<'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'CHEQUE' | 'OTHER'>('NEFT');
  const [ackDate, setAckDate] = useState(new Date().toISOString().slice(0, 10));
  const [ackRemarks, setAckRemarks] = useState('');
  const [ackSubmitting, setAckSubmitting] = useState(false);

  // Verify Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyConfirmedAmount, setVerifyConfirmedAmount] = useState<number>(0);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyBankCredit, setVerifyBankCredit] = useState(true);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  // Reject Receipt Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Edit PO Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPoRef, setEditPoRef] = useState('');
  const [editAdvancePercentage, setEditAdvancePercentage] = useState<number>(30);
  const [editShippingCost, setEditShippingCost] = useState<number>(0);
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editDeliveryInstructions, setEditDeliveryInstructions] = useState('');
  const [editAttentionTo, setEditAttentionTo] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editAddress1, setEditAddress1] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Settings Modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [advanceSetting, setAdvanceSetting] = useState<AdvanceSetting | null>(null);
  const [bankSettings, setBankSettings] = useState<BankSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadPos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPurchaseOrders({
        status: statusFilter,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      setPos(res.items);
      setTotalPages(res.pagination.totalPages);
      setTotalItems(res.pagination.total);
    } catch (err) {
      console.error('Failed to load POs:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    loadPos();
  }, [loadPos]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sessionPoId = sessionStorage.getItem('selected_fulfillment_po_id');
    if (sessionPoId) {
      sessionStorage.removeItem('selected_fulfillment_po_id');
      openDetail(sessionPoId);
      return;
    }
    const path = window.location.pathname;
    const match = path.match(/\/purchase-orders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      openDetail(match[1]);
    }
  }, []);

  async function openDetail(id: string) {
    setSelectedPoId(id);
    setDetailLoading(true);
    if (typeof window !== 'undefined' && window.location.pathname !== `/purchase-orders/${id}`) {
      window.history.pushState(null, '', `/purchase-orders/${id}`);
    }
    try {
      const data = await getAdminPurchaseOrderById(id);
      setSelectedPo(data);
      setAckAmount(Number(data.advanceAmount));
      setVerifyConfirmedAmount(Number(data.advanceAmount));
      if (data.ewayBill?.vehicleNumber) {
        setEwayVehicleNo(data.ewayBill.vehicleNumber);
        setIssueVehicleNo(data.ewayBill.vehicleNumber);
      }
      if (data.ewayBill?.transporterName) {
        setEwayCarrierName(data.ewayBill.transporterName);
        setIssueCarrierName(data.ewayBill.transporterName);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load PO details');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedPoId(null);
    setSelectedPo(null);
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/purchase-orders/')) {
      window.history.pushState(null, '', '/purchase-orders');
    }
  }

  async function handleAcknowledgeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPoId || !ackUtr) return;
    setAckSubmitting(true);
    try {
      await adminAcknowledgePayment(selectedPoId, {
        amountReceived: ackAmount,
        paymentReference: ackUtr,
        paymentMethod: ackMethod,
        paymentDate: ackDate,
        remarks: ackRemarks || undefined,
      });
      setAckModalOpen(false);
      setAckUtr('');
      setAckRemarks('');
      await openDetail(selectedPoId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge payment');
    } finally {
      setAckSubmitting(false);
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPoId) return;
    setVerifySubmitting(true);
    try {
      await adminVerifyPayment(selectedPoId, {
        confirmedAmount: verifyConfirmedAmount,
        confirmBankCredit: verifyBankCredit,
        verificationNotes: verifyNotes || undefined,
      });
      setVerifyModalOpen(false);
      setVerifyNotes('');
      await openDetail(selectedPoId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to verify payment');
    } finally {
      setVerifySubmitting(false);
    }
  }

  async function handleRejectReceiptSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPoId || !rejectReason) return;
    setRejectSubmitting(true);
    try {
      await adminRejectReceipt(selectedPoId, { rejectionReason: rejectReason });
      setRejectModalOpen(false);
      setRejectReason('');
      await openDetail(selectedPoId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to reject receipt');
    } finally {
      setRejectSubmitting(false);
    }
  }

  async function handleGeneratePiAction(poId: string) {
    if (!poId) return;
    setGeneratingPi(true);
    try {
      await adminGenerateProformaInvoice(poId);
      await openDetail(poId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to generate Proforma Invoice');
    } finally {
      setGeneratingPi(false);
    }
  }

  async function handleDownloadPi(poId: string, piNumber?: string) {
    try {
      await downloadAdminProformaInvoicePdf(poId, piNumber || `PI-${poId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to download Proforma Invoice PDF');
    }
  }

  async function handleGenerateTaxInvoiceIrisAction(poId: string) {
    if (!poId) return;
    setGeneratingTaxInvoice(true);
    try {
      await adminGenerateTaxInvoiceIris(poId);
      await openDetail(poId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to generate GST Tax Invoice via IRIS API');
    } finally {
      setGeneratingTaxInvoice(false);
    }
  }

  async function handleGenerateEwayBillSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPoId) return;
    setEwaySubmitting(true);
    try {
      await adminGenerateEwayBillIris(selectedPoId, {
        carrierName: ewayCarrierName,
        vehicleNumber: ewayVehicleNo,
        transporterDocNo: ewayTransDocNo || undefined,
        approxDistanceKm: Number(ewayDistanceKm) || 120,
      });
      setEwayModalOpen(false);
      await openDetail(selectedPoId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to generate E-Way Bill via IRIS API');
    } finally {
      setEwaySubmitting(false);
    }
  }

  async function handleDownloadEwayBill(poId: string, ewbNumber?: string) {
    try {
      await downloadAdminEwayBillPdf(poId, ewbNumber || 'EWB');
    } catch (err: any) {
      alert(err.message || 'Failed to download E-Way Bill PDF');
    }
  }

  async function handleDispatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPoId) return;
    setDispatchSubmitting(true);
    try {
      await adminDispatchPo(selectedPoId, {
        carrierName,
        trackingNumber: trackingNumber || undefined,
        dispatchedAt: dispatchedAt ? new Date(dispatchedAt).toISOString() : new Date().toISOString(),
        dispatchNotes: dispatchNotes || undefined,
      });
      setDispatchModalOpen(false);
      setTrackingNumber('');
      setDispatchNotes('');
      await openDetail(selectedPoId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch order');
    } finally {
      setDispatchSubmitting(false);
    }
  }

  async function handleGenerateIssueListSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPoId) return;
    setIssueSubmitting(true);
    try {
      await adminGenerateProductIssueList(selectedPoId, {
        carrierName: issueCarrierName,
        vehicleNumber: issueVehicleNo,
        receivedByName: issueReceivedBy,
        notes: issueNotes,
      });
      setIssueListModalOpen(false);
      await openDetail(selectedPoId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to generate Product Issue List');
    } finally {
      setIssueSubmitting(false);
    }
  }

  async function handleDownloadIssueList(poId: string, issueNumber?: string) {
    try {
      await downloadAdminProductIssueListPdf(poId, issueNumber || 'ISSUE');
    } catch (err: any) {
      alert(err.message || 'Failed to download Product Issue List PDF');
    }
  }

  function openEditModal(po: AdminPurchaseOrder) {
    setEditPoRef(po.customerPoReferenceNumber || '');
    setEditAdvancePercentage(po.advancePercentage || 30);
    setEditShippingCost(Number(po.shippingCost) || 0);
    setEditDeliveryDate(po.requestedDeliveryDate ? po.requestedDeliveryDate.slice(0, 10) : '');
    setEditDeliveryInstructions(po.deliveryInstructions || '');
    setEditAttentionTo(po.deliveryAddress?.attentionTo || po.billingAddress?.attentionTo || '');
    setEditCompanyName(po.deliveryAddress?.companyName || po.billingAddress?.companyName || '');
    setEditAddress1(po.deliveryAddress?.addressLine1 || po.billingAddress?.addressLine1 || '');
    setEditCity(po.deliveryAddress?.city || po.billingAddress?.city || '');
    setEditState(po.deliveryAddress?.state || po.billingAddress?.state || '');
    setEditPostalCode(po.deliveryAddress?.postalCode || po.billingAddress?.postalCode || '');
    setEditPhone(po.deliveryAddress?.phone || po.billingAddress?.phone || '');
    setEditEmail(po.deliveryAddress?.email || po.billingAddress?.email || '');
    setEditModalOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPo) return;
    setEditSubmitting(true);
    try {
      await adminUpdatePurchaseOrder(selectedPo.id, {
        customerPoReferenceNumber: editPoRef || undefined,
        advancePercentage: editAdvancePercentage,
        shippingCost: editShippingCost,
        requestedDeliveryDate: editDeliveryDate || undefined,
        deliveryInstructions: editDeliveryInstructions || undefined,
        deliveryAddress: {
          attentionTo: editAttentionTo || 'Purchasing Contact',
          companyName: editCompanyName || undefined,
          addressLine1: editAddress1,
          city: editCity,
          state: editState,
          postalCode: editPostalCode,
          phone: editPhone,
          email: editEmail || 'contact@client.com',
          country: 'India',
        },
      });

      // Also persist customer specific default advance %
      if (selectedPo.customerId && editAdvancePercentage) {
        await adminUpdateCustomerAdvancePercentage(selectedPo.customerId, editAdvancePercentage).catch(() => {});
      }

      setEditModalOpen(false);
      await openDetail(selectedPo.id);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to update Purchase Order');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleViewReceipt(poId: string, poNumber: string) {
    try {
      await downloadAdminPaymentReceipt(poId, poNumber, true);
    } catch (err: any) {
      alert(err.message || 'Failed to view payment receipt');
    }
  }

  async function handleDownloadReceipt(poId: string, poNumber: string) {
    try {
      await downloadAdminPaymentReceipt(poId, poNumber, false);
    } catch (err: any) {
      alert(err.message || 'Failed to download payment receipt');
    }
  }

  async function handleRegenerateInvoice(poId: string) {
    if (!poId) return;
    setRegeneratingInvoice(true);
    try {
      await adminRegenerateInvoice(poId);
      await openDetail(poId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate invoice');
    } finally {
      setRegeneratingInvoice(false);
    }
  }

  async function handleDownloadInvoice(poId: string, invoiceNumber?: string) {
    try {
      await downloadAdminInvoicePdf(poId, invoiceNumber || `INV-${poId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to download Tax Invoice');
    }
  }

  async function handleDeletePo(poId: string, poNumber: string) {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete Purchase Order "${poNumber}"? This will remove all associated line items, receipts, and invoices, and cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await adminDeletePurchaseOrder(poId);
      alert(`Purchase Order "${poNumber}" deleted successfully.`);
      if (selectedPoId === poId) {
        closeDetail();
      }
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to delete Purchase Order');
    }
  }

  async function openSettings() {
    setSettingsModalOpen(true);
    setSettingsLoading(true);
    try {
      const [adv, banks] = await Promise.all([getAdvanceSetting(), getBankSettings()]);
      setAdvanceSetting(adv);
      setBankSettings(banks);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!advanceSetting) return;
    setSettingsSaving(true);
    try {
      await updateAdvanceSetting(advanceSetting);
      if (bankSettings.length > 0) {
        await updateBankSetting(bankSettings[0]);
      }
      setSettingsModalOpen(false);
      alert('PO Configuration saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  }

  const activeReceipt = selectedPo?.receipts && selectedPo.receipts[0];

  // Tab counters dynamically computed from current pos
  const tabCounts = {
    ALL: pos.length,
    AWAITING_ADVANCE_PAYMENT: pos.filter((p) => p.status === 'AWAITING_ADVANCE_PAYMENT' || p.status === 'SUBMITTED' || p.status === 'DRAFT').length,
    PAYMENT_RECEIPT_SUBMITTED: pos.filter((p) => p.status === 'PAYMENT_RECEIPT_SUBMITTED').length,
    PAYMENT_ACKNOWLEDGED: pos.filter((p) => p.status === 'PAYMENT_ACKNOWLEDGED').length,
    PACKING_LIST_GENERATED: pos.filter((p) => ['PACKING_LIST_GENERATED', 'PAYMENT_VERIFIED'].includes(p.status)).length,
    PI_GENERATED: pos.filter((p) => p.status === 'PI_GENERATED').length,
    TAX_INVOICE_GENERATED: pos.filter((p) => p.status === 'TAX_INVOICE_GENERATED').length,
    EWAY_BILL_GENERATED: pos.filter((p) => p.status === 'EWAY_BILL_GENERATED').length,
    DISPATCHED: pos.filter((p) => p.status === 'DISPATCHED').length,
    ISSUE_LIST_GENERATED: pos.filter((p) => ['ISSUE_LIST_GENERATED', 'INVOICED'].includes(p.status)).length,
  };

  // Derive displayed items according to the active status filter and search query
  const displayedPos = pos.filter((po) => {
    if (statusFilter === 'AWAITING_ADVANCE_PAYMENT') {
      if (po.status !== 'AWAITING_ADVANCE_PAYMENT' && po.status !== 'SUBMITTED' && po.status !== 'DRAFT') {
        return false;
      }
    } else if (statusFilter === 'PAYMENT_RECEIPT_SUBMITTED') {
      if (po.status !== 'PAYMENT_RECEIPT_SUBMITTED') return false;
    } else if (statusFilter === 'PAYMENT_ACKNOWLEDGED') {
      if (po.status !== 'PAYMENT_ACKNOWLEDGED') return false;
    } else if (statusFilter === 'PACKING_LIST_GENERATED') {
      if (po.status !== 'PACKING_LIST_GENERATED' && po.status !== 'PAYMENT_VERIFIED') return false;
    } else if (statusFilter === 'PI_GENERATED') {
      if (po.status !== 'PI_GENERATED') return false;
    } else if (statusFilter === 'TAX_INVOICE_GENERATED') {
      if (po.status !== 'TAX_INVOICE_GENERATED') return false;
    } else if (statusFilter === 'EWAY_BILL_GENERATED') {
      if (po.status !== 'EWAY_BILL_GENERATED') return false;
    } else if (statusFilter === 'DISPATCHED') {
      if (po.status !== 'DISPATCHED') return false;
    } else if (statusFilter === 'ISSUE_LIST_GENERATED') {
      if (po.status !== 'ISSUE_LIST_GENERATED' && po.status !== 'INVOICED') return false;
    } else if (statusFilter !== 'ALL') {
      if (po.status !== statusFilter) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchPo = po.poNumber?.toLowerCase().includes(q);
      const matchQuote = po.quotationNumber?.toLowerCase().includes(q);
      const matchCust = (po.billingAddress?.attentionTo || po.customer?.email || '').toLowerCase().includes(q);
      const matchCompany = (po.billingAddress?.companyName || '').toLowerCase().includes(q);
      const matchRef = (po.customerPoReferenceNumber || '').toLowerCase().includes(q);
      if (!matchPo && !matchQuote && !matchCust && !matchCompany && !matchRef) {
        return false;
      }
    }

    return true;
  });

  if (loading && pos.length === 0) {
    return <PurchaseOrdersPageSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <FileCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-[#FAFAFA]">
                Purchase Orders (PO) Console
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                B2B Commercial Lifecycle
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Complete B2B Workflow: Awaiting Advance (% custom per client) → Receipt Uploaded → Acknowledged → Verified & Packing List → PI Generation → IRIS Tax Invoice → IRIS E-Way Bill → Dispatched → Product Issue List
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openSettings}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#8B5CF6]/40 text-xs font-semibold transition-colors shadow-sm"
          >
            <Sliders size={14} className="text-amber-400" />
            <span>PO & Bank Settings</span>
          </button>
          <button
            onClick={loadPos}
            className="p-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#18181B] text-[#A1A1AA] hover:text-amber-400 hover:border-amber-400/40 transition-colors"
            title="Refresh Registry"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Metric KPI Summary Cards (Interactive Filters) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Orders', key: 'ALL', value: totalItems || pos.length, icon: <FileCheck size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Awaiting Advance', key: 'AWAITING_ADVANCE_PAYMENT', value: tabCounts.AWAITING_ADVANCE_PAYMENT, icon: <Clock size={16} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Receipt Uploaded', key: 'PAYMENT_RECEIPT_SUBMITTED', value: tabCounts.PAYMENT_RECEIPT_SUBMITTED, icon: <CreditCard size={16} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Acknowledged', key: 'PAYMENT_ACKNOWLEDGED', value: tabCounts.PAYMENT_ACKNOWLEDGED, icon: <CheckCircle size={16} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Packing List Ready', key: 'PACKING_LIST_GENERATED', value: tabCounts.PACKING_LIST_GENERATED, icon: <Package size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Dispatched / Issue List', key: 'DISPATCHED', value: tabCounts.DISPATCHED + tabCounts.ISSUE_LIST_GENERATED, icon: <Truck size={16} />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => {
              setStatusFilter(card.key);
              setPage(1);
            }}
            className={`text-left p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all cursor-pointer ${
              statusFilter === card.key
                ? 'border-amber-400 shadow-md shadow-amber-500/10 bg-[#27272A]/40'
                : 'border-[#27272A] hover:border-amber-400/40 hover:bg-[#27272A]/20'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center ${card.color} mb-2`}>
              {card.icon}
            </div>
            <p className={`text-base font-bold ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-[#71717A] mt-0.5 font-medium">{card.label}</p>
          </button>
        ))}
      </div>

      {/* ─── Filter Tabs & Search Bar ─── */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold pb-1 sm:pb-0">
            {[
              { label: 'All Orders', key: 'ALL', count: tabCounts.ALL },
              { label: 'Awaiting Advance', key: 'AWAITING_ADVANCE_PAYMENT', count: tabCounts.AWAITING_ADVANCE_PAYMENT },
              { label: 'Receipt Uploaded', key: 'PAYMENT_RECEIPT_SUBMITTED', count: tabCounts.PAYMENT_RECEIPT_SUBMITTED },
              { label: 'Acknowledged', key: 'PAYMENT_ACKNOWLEDGED', count: tabCounts.PAYMENT_ACKNOWLEDGED },
              { label: 'Verified & Packing List', key: 'PACKING_LIST_GENERATED', count: tabCounts.PACKING_LIST_GENERATED },
              { label: 'PI Ready', key: 'PI_GENERATED', count: tabCounts.PI_GENERATED },
              { label: 'Tax Invoiced (IRIS)', key: 'TAX_INVOICE_GENERATED', count: tabCounts.TAX_INVOICE_GENERATED },
              { label: 'E-Way Bill (IRIS)', key: 'EWAY_BILL_GENERATED', count: tabCounts.EWAY_BILL_GENERATED },
              { label: 'Dispatched', key: 'DISPATCHED', count: tabCounts.DISPATCHED },
              { label: 'Issue List Ready', key: 'ISSUE_LIST_GENERATED', count: tabCounts.ISSUE_LIST_GENERATED },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-tr-lg rounded-bl-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    statusFilter === tab.key ? 'bg-slate-950/20 text-slate-950' : 'bg-[#27272A] text-[#FAFAFA]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              placeholder="Search PO #, Client, Quotation..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-4 py-1.5 bg-[#09090B] border border-[#27272A] rounded-tr-lg rounded-bl-lg text-xs text-[#FAFAFA] placeholder-[#71717A] focus:border-amber-400 outline-none transition-colors"
            />
          </div>
        </div>

        {/* ─── PO Table ─── */}
        {loading && pos.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#A1A1AA]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#09090B] border-b border-[#27272A] text-[#71717A] uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">PO Number</th>
                  <th className="py-3.5 px-4">Quotation Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Advance Due</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hover:bg-[#27272A]/40">
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-[#27272A] rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-[#27272A] rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-36 bg-[#27272A] rounded"></div></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-20 bg-[#27272A] rounded ml-auto"></div></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-20 bg-[#27272A] rounded ml-auto"></div></td>
                    <td className="py-3.5 px-4"><div className="h-5 w-24 bg-[#27272A] rounded-full"></div></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-7 w-20 bg-[#27272A] rounded-lg mx-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : displayedPos.length === 0 ? (
          <div className="p-12 text-center text-[#71717A] space-y-2">
            <FileText className="w-10 h-10 mx-auto text-[#3F3F46]" />
            <p className="text-sm font-bold text-[#FAFAFA]">No Purchase Orders Found</p>
            <p className="text-xs">No orders match the selected "{statusFilter.replace(/_/g, ' ')}" status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#09090B] border-b border-[#27272A] text-[#71717A] uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">PO Number</th>
                  <th className="py-3.5 px-4">Quotation Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Advance Due</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
                {displayedPos.map((po) => (
                  <tr key={po.id} className="hover:bg-[#27272A]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {po.poNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#A855F7]">
                      {po.quotationNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#FAFAFA]">{po.billingAddress?.attentionTo || po.customer?.email}</div>
                      <div className="text-[11px] text-[#A1A1AA]">{po.billingAddress?.companyName || 'B2B Client'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#FAFAFA]">
                      ₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                      ₹{Number(po.advanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                      <span className="text-[10px] text-[#71717A]">({po.advancePercentage}%)</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          po.status === 'ISSUE_LIST_GENERATED' || po.status === 'INVOICED'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : po.status === 'DISPATCHED'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : po.status === 'EWAY_BILL_GENERATED' || po.status === 'TAX_INVOICE_GENERATED'
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            : po.status === 'PI_GENERATED'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : po.status === 'PACKING_LIST_GENERATED' || po.status === 'PAYMENT_VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : po.status === 'PAYMENT_ACKNOWLEDGED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : po.status === 'PAYMENT_RECEIPT_SUBMITTED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : po.status === 'INVOICE_GENERATION_FAILED'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : po.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                        }`}
                      >
                        {po.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#A1A1AA] text-[11px] whitespace-nowrap">
                      {new Date(po.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <AsyncActionButton
                          mode="view"
                          onAction={() => openDetail(po.id)}
                          idleIcon={<Eye className="w-3.5 h-3.5 text-amber-400" />}
                          idleLabel="Inspect"
                          loadingLabel="Opening…"
                          className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-semibold px-2.5 py-1.5 rounded-lg transition-colors text-xs"
                          variant="custom"
                          title="Inspect Purchase Order"
                        />
                        <button
                          onClick={() => handleDeletePo(po.id, po.poNumber)}
                          className="p-1.5 text-[#71717A] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Purchase Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Pagination Footer ─── */}
        <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex items-center justify-between text-xs text-[#71717A]">
          <span>Showing {displayedPos.length} of {totalItems || pos.length} Purchase Orders</span>
          <div className="flex space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-white rounded-lg disabled:opacity-40 font-bold transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 font-bold text-amber-400">
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-white rounded-lg disabled:opacity-40 font-bold transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── DETAIL & AUDIT DRAWER MODAL ─── */}
      {selectedPoId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-4xl bg-[#18181B] text-[#FAFAFA] border-l border-[#27272A] h-full shadow-2xl overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-[#09090B] text-[#FAFAFA] flex items-center justify-between sticky top-0 z-10 border-b border-[#27272A]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-amber-400 font-bold tracking-wider uppercase">Purchase Order Fulfillment Workflow</span>
                  <span className="bg-[#27272A] text-amber-300 border border-[#3F3F46] text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    {selectedPo?.status || 'LOADING'}
                  </span>
                </div>
                <h2 className="text-xl font-bold font-mono text-[#FAFAFA] mt-1">
                  {selectedPo?.poNumber || (
                    <span className="inline-block h-6 w-48 bg-[#27272A] rounded animate-pulse align-middle"></span>
                  )}
                </h2>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 rounded-lg bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !selectedPo ? (
              <PurchaseOrderDetailSkeleton />
            ) : (
              <div className="p-6 space-y-6 flex-1 text-xs text-[#FAFAFA]">
                
                {/* ─── 10-Stage Milestone Stepper ─── */}
                <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">Fulfillment Lifecycle Progress</span>
                    <span className="text-[10px] font-bold text-amber-400 font-mono">B2B Commercial Pipeline</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px]">
                    {[
                      { label: '1. Awaiting Advance', done: Boolean(selectedPo.submittedAt), current: selectedPo.status === 'AWAITING_ADVANCE_PAYMENT' },
                      { label: '2. Receipt Uploaded', done: Boolean(selectedPo.receipts?.length), current: selectedPo.status === 'PAYMENT_RECEIPT_SUBMITTED' },
                      { label: '3. Acknowledged', done: ['PAYMENT_ACKNOWLEDGED', 'PAYMENT_VERIFIED', 'PACKING_LIST_GENERATED', 'PI_GENERATED', 'TAX_INVOICE_GENERATED', 'EWAY_BILL_GENERATED', 'DISPATCHED', 'ISSUE_LIST_GENERATED', 'INVOICED'].includes(selectedPo.status), current: selectedPo.status === 'PAYMENT_ACKNOWLEDGED' },
                      { label: '4. Verified & Packing', done: ['PACKING_LIST_GENERATED', 'PI_GENERATED', 'TAX_INVOICE_GENERATED', 'EWAY_BILL_GENERATED', 'DISPATCHED', 'ISSUE_LIST_GENERATED', 'INVOICED'].includes(selectedPo.status) || Boolean(selectedPo.packingList), current: selectedPo.status === 'PACKING_LIST_GENERATED' },
                      { label: '5. PI Generation', done: ['PI_GENERATED', 'TAX_INVOICE_GENERATED', 'EWAY_BILL_GENERATED', 'DISPATCHED', 'ISSUE_LIST_GENERATED', 'INVOICED'].includes(selectedPo.status) || Boolean(selectedPo.proformaInvoice), current: selectedPo.status === 'PI_GENERATED' },
                      { label: '6. Tax Invoice (IRIS)', done: ['TAX_INVOICE_GENERATED', 'EWAY_BILL_GENERATED', 'DISPATCHED', 'ISSUE_LIST_GENERATED', 'INVOICED'].includes(selectedPo.status) || Boolean(selectedPo.invoice), current: selectedPo.status === 'TAX_INVOICE_GENERATED' },
                      { label: '7. E-Way Bill (IRIS)', done: ['EWAY_BILL_GENERATED', 'DISPATCHED', 'ISSUE_LIST_GENERATED', 'INVOICED'].includes(selectedPo.status) || Boolean(selectedPo.ewayBill), current: selectedPo.status === 'EWAY_BILL_GENERATED' },
                      { label: '8. Dispatched', done: ['DISPATCHED', 'ISSUE_LIST_GENERATED', 'INVOICED'].includes(selectedPo.status) || Boolean(selectedPo.dispatch), current: selectedPo.status === 'DISPATCHED' },
                      { label: '9. Issue List Ready', done: ['ISSUE_LIST_GENERATED', 'INVOICED'].includes(selectedPo.status) || Boolean(selectedPo.issueList), current: selectedPo.status === 'ISSUE_LIST_GENERATED' || selectedPo.status === 'INVOICED' },
                    ].map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                          step.done
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : step.current
                            ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 animate-pulse'
                            : 'bg-[#18181B] border-[#27272A] text-[#71717A]'
                        }`}
                      >
                        <span className="font-bold">{step.label}</span>
                        {step.done ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : step.current ? (
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-[#3F3F46]" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ─── Action Stage Toolbar ─── */}
                <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">Operational Stage Triggers</span>
                    <button
                      onClick={() => openEditModal(selectedPo)}
                      className="bg-[#27272A] hover:bg-[#3F3F46] text-amber-400 border border-[#3F3F46] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center space-x-1 shadow-sm text-[11px]"
                    >
                      <Pencil className="w-3 h-3 text-amber-400" />
                      <span>Edit PO / Custom Advance %</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1. Proforma Invoice Trigger */}
                    <button
                      onClick={() => handleGeneratePiAction(selectedPo.id)}
                      disabled={generatingPi}
                      className="bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-indigo-600 shadow-sm flex items-center space-x-1.5 text-xs transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-200" />
                      <span>{generatingPi ? 'Generating PI…' : 'Generate Proforma Invoice (PI)'}</span>
                    </button>

                    {/* 2. IRIS GST Tax Invoice Trigger */}
                    <button
                      onClick={() => handleGenerateTaxInvoiceIrisAction(selectedPo.id)}
                      disabled={generatingTaxInvoice}
                      className="bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-blue-600 shadow-sm flex items-center space-x-1.5 text-xs transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5 text-blue-200" />
                      <span>{generatingTaxInvoice ? 'Generating via IRIS…' : 'Generate GST Tax Invoice (IRIS API)'}</span>
                    </button>

                    {/* 3. IRIS E-Way Bill Trigger */}
                    <button
                      onClick={() => setEwayModalOpen(true)}
                      className="bg-teal-700 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-teal-600 shadow-sm flex items-center space-x-1.5 text-xs transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-teal-200" />
                      <span>Generate E-Way Bill (IRIS API)</span>
                    </button>

                    {/* 4. Dispatch Trigger */}
                    <button
                      onClick={() => setDispatchModalOpen(true)}
                      className="bg-cyan-700 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-cyan-600 shadow-sm flex items-center space-x-1.5 text-xs transition-colors"
                    >
                      <Truck className="w-3.5 h-3.5 text-cyan-200" />
                      <span>Record Dispatch</span>
                    </button>

                    {/* 5. Product Issue List Trigger */}
                    <button
                      onClick={() => setIssueListModalOpen(true)}
                      className="bg-purple-700 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-purple-600 shadow-sm flex items-center space-x-1.5 text-xs transition-colors"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-purple-200" />
                      <span>Generate Product Issue List</span>
                    </button>
                  </div>
                </div>

                {/* ─── Official Commercial Documents Hub ─── */}
                <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                    <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">Commercial Document Downloads</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Tamper-evident Audit PDFs</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <AsyncActionButton
                      mode="download"
                      onAction={() => downloadAdminPoPdf(selectedPo.id, selectedPo.poNumber)}
                      idleIcon={<Download className="w-3.5 h-3.5 text-amber-400" />}
                      idleLabel="Official PO PDF"
                      loadingLabel="Preparing PO…"
                      className="bg-[#18181B] hover:bg-[#27272A] text-[#FAFAFA] border border-[#27272A] font-bold px-3 py-2 rounded-xl text-xs"
                      variant="custom"
                    />

                    {selectedPo.proformaInvoice && (
                      <AsyncActionButton
                        mode="download"
                        onAction={() => handleDownloadPi(selectedPo.id, selectedPo.proformaInvoice?.piNumber)}
                        idleIcon={<Download className="w-3.5 h-3.5 text-indigo-400" />}
                        idleLabel="Proforma Invoice (PI)"
                        loadingLabel="Preparing PI…"
                        className="bg-[#18181B] hover:bg-[#27272A] text-indigo-300 border border-indigo-500/40 font-bold px-3 py-2 rounded-xl text-xs"
                        variant="custom"
                      />
                    )}

                    {selectedPo.packingList && (
                      <AsyncActionButton
                        mode="download"
                        onAction={() => downloadAdminPackingListPdf(selectedPo.id, selectedPo.poNumber)}
                        idleIcon={<Download className="w-3.5 h-3.5 text-emerald-400" />}
                        idleLabel="Packing List PDF"
                        loadingLabel="Preparing List…"
                        className="bg-[#18181B] hover:bg-[#27272A] text-emerald-300 border border-emerald-500/40 font-bold px-3 py-2 rounded-xl text-xs"
                        variant="custom"
                      />
                    )}

                    {selectedPo.invoice && (
                      <AsyncActionButton
                        mode="download"
                        onAction={() => handleDownloadInvoice(selectedPo.id, selectedPo.invoice?.invoiceNumber)}
                        idleIcon={<Download className="w-3.5 h-3.5 text-blue-400" />}
                        idleLabel="GST Tax Invoice"
                        loadingLabel="Preparing Invoice…"
                        className="bg-[#18181B] hover:bg-[#27272A] text-blue-300 border border-blue-500/40 font-bold px-3 py-2 rounded-xl text-xs"
                        variant="custom"
                      />
                    )}

                    {selectedPo.ewayBill && (
                      <AsyncActionButton
                        mode="download"
                        onAction={() => handleDownloadEwayBill(selectedPo.id, selectedPo.ewayBill?.ewayBillNumber)}
                        idleIcon={<Download className="w-3.5 h-3.5 text-teal-400" />}
                        idleLabel="GST E-Way Bill"
                        loadingLabel="Preparing EWB…"
                        className="bg-[#18181B] hover:bg-[#27272A] text-teal-300 border border-teal-500/40 font-bold px-3 py-2 rounded-xl text-xs"
                        variant="custom"
                      />
                    )}

                    {selectedPo.issueList && (
                      <AsyncActionButton
                        mode="download"
                        onAction={() => handleDownloadIssueList(selectedPo.id, selectedPo.issueList?.issueNumber)}
                        idleIcon={<Download className="w-3.5 h-3.5 text-purple-400" />}
                        idleLabel="Product Issue Slip"
                        loadingLabel="Preparing Slip…"
                        className="bg-[#18181B] hover:bg-[#27272A] text-purple-300 border border-purple-500/40 font-bold px-3 py-2 rounded-xl text-xs"
                        variant="custom"
                      />
                    )}
                  </div>
                </div>

                {/* Primary Reference Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#09090B] p-4 rounded-xl border border-[#27272A] font-mono">
                  <div>
                    <span className="text-[10px] text-[#A1A1AA] uppercase block font-sans">Quotation No.</span>
                    <span className="font-bold text-[#FAFAFA]">{selectedPo.quotationNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A1A1AA] uppercase block font-sans">Customer PO Ref</span>
                    <span className="font-bold text-[#FAFAFA]">{selectedPo.customerPoReferenceNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A1A1AA] uppercase block font-sans">Total Amount</span>
                    <span className="font-bold text-[#FAFAFA]">₹{Number(selectedPo.totalAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A1A1AA] uppercase block font-sans">Advance Required ({selectedPo.advancePercentage}%)</span>
                    <span className="font-bold text-amber-400">₹{Number(selectedPo.advanceAmount).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Active Receipt Verification Panel */}
                <div className="bg-[#09090B] text-[#FAFAFA] p-5 rounded-2xl space-y-4 border border-[#27272A]">
                  <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      <h3 className="font-bold text-sm text-[#FAFAFA]">Customer Payment Receipt</h3>
                    </div>
                    {activeReceipt && (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-[#27272A] text-amber-300 border border-[#3F3F46] font-mono">
                        {activeReceipt.status} (v{activeReceipt.version})
                      </span>
                    )}
                  </div>

                  {activeReceipt ? (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2 text-[#A1A1AA]">
                        <div>
                          <span className="text-[10px] text-[#A1A1AA] block">Uploaded File:</span>
                          <span className="font-mono text-[#FAFAFA] truncate block">{activeReceipt.originalFileName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#A1A1AA] block">Reported Amount:</span>
                          <span className="font-bold text-[#FAFAFA]">₹{Number(activeReceipt.amountReceived || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#A1A1AA] block">UTR / Ref:</span>
                          <span className="font-mono text-[#FAFAFA]">{activeReceipt.paymentReference || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#A1A1AA] block">Payment Date:</span>
                          <span className="text-[#FAFAFA]">{activeReceipt.paymentDate ? new Date(activeReceipt.paymentDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-2 border-t border-[#27272A]">
                        <button
                          onClick={() => handleViewReceipt(selectedPo.id, selectedPo.poNumber)}
                          className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors font-bold"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Receipt</span>
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(selectedPo.id, selectedPo.poNumber)}
                          className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors font-bold"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-400" />
                          <span>Download File</span>
                        </button>
                        {selectedPo.status === 'PAYMENT_RECEIPT_SUBMITTED' && (
                          <button
                            onClick={() => setAckModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold ml-auto"
                          >
                            Acknowledge Payment
                          </button>
                        )}
                        {['PAYMENT_ACKNOWLEDGED', 'PAYMENT_RECEIPT_SUBMITTED'].includes(selectedPo.status) && (
                          <button
                            onClick={() => setVerifyModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold ml-auto flex items-center space-x-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify & Auto-Packing List</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#18181B] rounded-xl text-center text-[#71717A]">
                      No payment receipt uploaded by customer yet.
                    </div>
                  )}
                </div>

                {/* ─── Line Items (Strictly Verified against PO) ─── */}
                <div className="bg-[#09090B] rounded-2xl border border-[#27272A] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                    <h3 className="font-bold text-sm text-[#FAFAFA]">PO Line Items (Quantity & Rate Verification)</h3>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">{selectedPo.items?.length || 0} Products</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#18181B] text-[#71717A] text-[10px] uppercase font-bold">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Item Description</th>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Rate</th>
                          <th className="py-2 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
                        {selectedPo.items?.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="py-2 px-3 font-mono text-[#71717A]">{item.slNo || idx + 1}</td>
                            <td className="py-2 px-3 font-bold">{item.productName}</td>
                            <td className="py-2 px-3 font-mono text-[#A1A1AA]">{item.sku || '—'}</td>
                            <td className="py-2 px-3 text-center font-bold text-amber-400">{item.quantity} {item.unit}</td>
                            <td className="py-2 px-3 text-right font-mono">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">₹{Number(item.total || item.amount).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── E-WAY BILL IRIS MODAL ─── */}
      {ewayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-teal-400" />
              <span>Generate Official GST E-Way Bill (IRIS API)</span>
            </h3>
            <form onSubmit={handleGenerateEwayBillSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A1A1AA] mb-1">Carrier / Transporter Name *</label>
                <input
                  type="text"
                  required
                  value={ewayCarrierName}
                  onChange={(e) => setEwayCarrierName(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:border-teal-400 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#A1A1AA] mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    value={ewayVehicleNo}
                    onChange={(e) => setEwayVehicleNo(e.target.value)}
                    className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:border-teal-400 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] mb-1">Transporter LR / Doc No</label>
                  <input
                    type="text"
                    placeholder="LR-889922"
                    value={ewayTransDocNo}
                    onChange={(e) => setEwayTransDocNo(e.target.value)}
                    className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:border-teal-400 outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#A1A1AA] mb-1">Approx Commercial Road Distance (KM) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={ewayDistanceKm}
                  onChange={(e) => setEwayDistanceKm(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:border-teal-400 outline-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEwayModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg font-bold text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ewaySubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {ewaySubmitting ? 'Generating via IRIS…' : 'Generate E-Way Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PRODUCT ISSUE LIST MODAL ─── */}
      {issueListModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center space-x-2">
              <ClipboardList className="w-4 h-4 text-purple-400" />
              <span>Generate Product Issue List / Delivery Challan</span>
            </h3>
            <form onSubmit={handleGenerateIssueListSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A1A1AA] mb-1">Carrier Name</label>
                <input
                  type="text"
                  value={issueCarrierName}
                  onChange={(e) => setIssueCarrierName(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#A1A1AA] mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={issueVehicleNo}
                    onChange={(e) => setIssueVehicleNo(e.target.value)}
                    className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] mb-1">Transporter Received By</label>
                  <input
                    type="text"
                    value={issueReceivedBy}
                    onChange={(e) => setIssueReceivedBy(e.target.value)}
                    className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#A1A1AA] mb-1">Inspection & Issue Notes</label>
                <textarea
                  rows={2}
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none resize-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIssueListModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg font-bold text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {issueSubmitting ? 'Generating Slip…' : 'Generate Issue Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ACKNOWLEDGE MODAL ─── */}
      {ackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-[#FAFAFA]">Acknowledge Advance Payment</h3>
            <form onSubmit={handleAcknowledgeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A1A1AA] mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={ackAmount}
                  onChange={(e) => setAckAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[#A1A1AA] mb-1">UTR / Bank Transaction Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CMS9876543210"
                  value={ackUtr}
                  onChange={(e) => setAckUtr(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:border-amber-400 outline-none font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setAckModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg font-bold text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ackSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {ackSubmitting ? 'Logging...' : 'Confirm Acknowledgment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── VERIFY MODAL ─── */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-[#FAFAFA]">Digitally Verify Payment & Generate Packing List</h3>
            <form onSubmit={handleVerifySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A1A1AA] mb-1">Confirmed Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={verifyConfirmedAmount}
                  onChange={(e) => setVerifyConfirmedAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:border-amber-400 outline-none"
                />
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="creditCheck"
                  checked={verifyBankCredit}
                  onChange={(e) => setVerifyBankCredit(e.target.checked)}
                  className="accent-amber-500 rounded"
                />
                <label htmlFor="creditCheck" className="text-[#A1A1AA]">
                  I confirm funds have credited in company account
                </label>
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg font-bold text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifySubmitting || !verifyBankCredit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {verifySubmitting ? 'Verifying...' : 'Verify & Auto-Packing List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REJECT MODAL ─── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-red-400">Reject Payment Receipt</h3>
            <form onSubmit={handleRejectReceiptSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A1A1AA] mb-1">Reason for Rejection *</label>
                <textarea
                  required
                  placeholder="e.g. UTR mismatch, invalid screenshot..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:border-red-400 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg font-bold text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {rejectSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DISPATCH MODAL ─── */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-[#FAFAFA]">Record Dispatch</h3>
            <form onSubmit={handleDispatchSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A1A1AA] mb-1">Carrier Name *</label>
                <input
                  type="text"
                  required
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none"
                />
              </div>
              <div>
                <label className="block text-[#A1A1AA] mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[#A1A1AA] mb-1">Dispatch Date</label>
                <input
                  type="date"
                  value={dispatchedAt}
                  onChange={(e) => setDispatchedAt(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg font-bold text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatchSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {dispatchSubmitting ? 'Dispatching...' : 'Record Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT PO MODAL (WITH CUSTOM B2B ADVANCE %) ─── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-[#FAFAFA]">Edit Purchase Order Information</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1">Customer PO Ref</label>
                  <input
                    type="text"
                    value={editPoRef}
                    onChange={(e) => setEditPoRef(e.target.value)}
                    className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-bold text-amber-400">Custom Advance Required (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editAdvancePercentage}
                    onChange={(e) => setEditAdvancePercentage(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#09090B] border border-amber-500/40 rounded-lg text-[#FAFAFA] outline-none font-bold"
                  />
                  <span className="text-[10px] text-[#71717A] mt-0.5 block">Configurable per B2B customer.</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1">Shipping / Freight (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editShippingCost}
                    onChange={(e) => setEditShippingCost(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] mb-1">Requested Delivery Date</label>
                  <input
                    type="date"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                    className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg font-bold text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Order Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── SETTINGS MODAL ─── */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18181B] text-[#FAFAFA] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center space-x-2">
              <Sliders size={16} className="text-amber-400" />
              <span>Global PO & Bank Configuration</span>
            </h3>

            {settingsLoading || !advanceSetting ? (
              <div className="p-8 text-center text-xs text-[#A1A1AA] flex items-center justify-center space-x-2">
                <RefreshCw size={16} className="animate-spin text-amber-400" />
                <span>Loading configuration...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-bold">Global Default Advance Percentage (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={advanceSetting.defaultPercentage}
                    onChange={(e) => setAdvanceSetting({ ...advanceSetting, defaultPercentage: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] outline-none"
                  />
                  <span className="text-[10px] text-[#71717A] mt-1 block">
                    Default percentage applied if no customer-specific percentage is configured.
                  </span>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(false)}
                    className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-lg font-bold text-[#A1A1AA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={settingsSaving}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold disabled:opacity-50"
                  >
                    {settingsSaving ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
