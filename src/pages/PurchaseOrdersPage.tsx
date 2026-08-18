import React, { useState, useEffect } from 'react';
import {
  getAdminPurchaseOrders,
  getAdminPurchaseOrderById,
  adminAcknowledgePayment,
  adminVerifyPayment,
  adminRejectReceipt,
  adminRejectPurchaseOrder,
  adminUpdatePurchaseOrder,
  downloadAdminPaymentReceipt,
  downloadAdminPoPdf,
  getAdvanceSetting,
  updateAdvanceSetting,
  getBankSettings,
  updateBankSetting,
  downloadAdminPackingListPdf,
  adminDispatchPo,
  adminRegenerateInvoice,
  downloadAdminInvoicePdf,
  adminDeletePurchaseOrder,
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
} from 'lucide-react';

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
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Settings Modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [advanceSetting, setAdvanceSetting] = useState<AdvanceSetting | null>(null);
  const [bankSettings, setBankSettings] = useState<BankSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    loadPos();
  }, [statusFilter, search, page]);

  async function loadPos() {
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
  }

  async function openDetail(id: string) {
    setSelectedPoId(id);
    setDetailLoading(true);
    try {
      const data = await getAdminPurchaseOrderById(id);
      setSelectedPo(data);
      setAckAmount(Number(data.advanceAmount));
      setVerifyConfirmedAmount(Number(data.advanceAmount));
    } catch (err: any) {
      alert(err.message || 'Failed to load PO details');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAcknowledgeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPoId || !ackUtr) return;
    setAckSubmitting(true);
    try {
      await adminAcknowledgePayment(selectedPoId, {
        amountReceived: Number(ackAmount),
        paymentReference: ackUtr.trim(),
        paymentDate: ackDate,
        paymentMethod: ackMethod,
        remarks: ackRemarks.trim() || undefined,
      });
      setAckModalOpen(false);
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
        confirmedAmount: Number(verifyConfirmedAmount),
        verificationNotes: verifyNotes.trim() || undefined,
        confirmBankCredit: verifyBankCredit,
      });
      setVerifyModalOpen(false);
      await openDetail(selectedPoId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to verify payment and generate packing list');
    } finally {
      setVerifySubmitting(false);
    }
  }

  async function handleRejectReceiptSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPoId || !rejectReason) return;
    setRejectSubmitting(true);
    try {
      await adminRejectReceipt(selectedPoId, {
        rejectionReason: rejectReason.trim(),
        allowReupload: true,
      });
      setRejectModalOpen(false);
      await openDetail(selectedPoId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to reject receipt');
    } finally {
      setRejectSubmitting(false);
    }
  }

  async function handleDispatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPoId || !carrierName) return;
    setDispatchSubmitting(true);
    try {
      await adminDispatchPo(selectedPoId, {
        carrierName: carrierName.trim(),
        trackingNumber: trackingNumber.trim() || undefined,
        dispatchedAt: dispatchedAt || undefined,
        dispatchNotes: dispatchNotes.trim() || undefined,
      });
      setDispatchModalOpen(false);
      await openDetail(selectedPoId);
      await loadPos();
    } catch (err: any) {
      alert(err.message || 'Failed to record dispatch');
    } finally {
      setDispatchSubmitting(false);
    }
  }

  function openEditModal(po: AdminPurchaseOrder) {
    setEditPoRef(po.customerPoReferenceNumber || '');
    setEditAdvancePercentage(Number(po.advancePercentage) || 30);
    setEditShippingCost(Number(po.shippingCost) || 0);
    setEditDeliveryDate(
      po.requestedDeliveryDate ? new Date(po.requestedDeliveryDate).toISOString().slice(0, 10) : ''
    );
    setEditDeliveryInstructions(po.deliveryInstructions || '');
    setEditAttentionTo(po.deliveryAddress?.attentionTo || '');
    setEditCompanyName(po.deliveryAddress?.companyName || '');
    setEditAddress1(po.deliveryAddress?.addressLine1 || '');
    setEditCity(po.deliveryAddress?.city || '');
    setEditState(po.deliveryAddress?.state || '');
    setEditPostalCode(po.deliveryAddress?.postalCode || '');
    setEditPhone(po.deliveryAddress?.phone || '');
    setEditModalOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPoId) return;
    setEditSubmitting(true);
    try {
      await adminUpdatePurchaseOrder(selectedPoId, {
        customerPoReferenceNumber: editPoRef.trim() || undefined,
        advancePercentage: Number(editAdvancePercentage),
        shippingCost: Number(editShippingCost),
        requestedDeliveryDate: editDeliveryDate || null,
        deliveryInstructions: editDeliveryInstructions.trim() || null,
        deliveryAddress: {
          attentionTo: editAttentionTo.trim(),
          companyName: editCompanyName.trim(),
          addressLine1: editAddress1.trim(),
          city: editCity.trim(),
          state: editState.trim(),
          postalCode: editPostalCode.trim(),
          phone: editPhone.trim(),
        },
      });
      setEditModalOpen(false);
      await openDetail(selectedPoId);
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
        setSelectedPoId(null);
        setSelectedPo(null);
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

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Purchase Orders (PO) Management</h1>
          <p className="text-xs text-slate-500">
            Audit B2B purchase orders, acknowledge advance bank transfers, digitally verify receipts, and generate packing lists.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={openSettings}
            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
          >
            <Sliders className="w-4 h-4" />
            <span>PO & Bank Settings</span>
          </button>
          <button
            onClick={loadPos}
            className="flex items-center space-x-2 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-800 shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 overflow-x-auto text-xs font-bold">
            {[
              { label: 'All Orders', key: 'ALL' },
              { label: 'Awaiting Advance', key: 'AWAITING_ADVANCE_PAYMENT' },
              { label: 'Receipt Uploaded', key: 'PAYMENT_RECEIPT_SUBMITTED' },
              { label: 'Acknowledged', key: 'PAYMENT_ACKNOWLEDGED' },
              { label: 'Verified & Packing List', key: 'PACKING_LIST_GENERATED' },
              { label: 'Dispatched', key: 'DISPATCHED' },
              { label: 'Invoiced', key: 'INVOICED' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO / Quote No / Customer..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500 font-bold">Loading Purchase Orders...</p>
          </div>
        ) : pos.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-800">No Purchase Orders Found</p>
            <p className="text-xs">No orders match the current status and search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Quotation Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Advance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {pos.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {po.poNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {po.quotationNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{po.billingAddress?.attentionTo || po.customer?.email}</div>
                      <div className="text-[11px] text-slate-400">{po.billingAddress?.companyName || 'B2B Client'}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      ₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                      ₹{Number(po.advanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({po.advancePercentage}%)
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          po.status === 'INVOICED'
                            ? 'bg-purple-100 text-purple-800'
                            : po.status === 'DISPATCHED'
                            ? 'bg-teal-100 text-teal-800'
                            : po.status === 'PACKING_LIST_GENERATED' || po.status === 'PAYMENT_VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : po.status === 'PAYMENT_ACKNOWLEDGED'
                            ? 'bg-blue-100 text-blue-800'
                            : po.status === 'PAYMENT_RECEIPT_SUBMITTED'
                            ? 'bg-amber-100 text-amber-800'
                            : po.status === 'INVOICE_GENERATION_FAILED'
                            ? 'bg-orange-100 text-orange-800'
                            : po.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {po.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(po.submittedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => openDetail(po.id)}
                          className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2.5 py-1.5 rounded-lg transition-colors text-xs"
                          title="Inspect Purchase Order"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={() => handleDeletePo(po.id, po.poNumber)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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

        {/* Pagination footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {pos.length} of {totalItems} Purchase Orders</span>
          <div className="flex space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 font-bold"
            >
              Previous
            </button>
            <span className="px-2 py-1 font-bold text-slate-700">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* PO Detail Drawer / Modal */}
      {selectedPoId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-3xl bg-[#18181B] text-[#FAFAFA] border-l border-[#27272A] h-full shadow-2xl overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-[#09090B] text-[#FAFAFA] flex items-center justify-between sticky top-0 z-10 border-b border-[#27272A]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-amber-400 font-bold tracking-wider uppercase">Purchase Order Audit</span>
                  <span className="bg-[#27272A] text-amber-300 border border-[#3F3F46] text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    {selectedPo?.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold font-mono text-[#FAFAFA] mt-1">
                  {selectedPo?.poNumber || 'Loading...'}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPoId(null)}
                className="p-2 rounded-lg bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !selectedPo ? (
              <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-xs text-[#A1A1AA] font-bold">Loading Order Information...</p>
              </div>
            ) : (
              <div className="p-6 space-y-6 flex-1 text-xs text-[#FAFAFA]">
                
                {/* Action Bar */}
                <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(selectedPo)}
                      className="bg-[#27272A] hover:bg-[#3F3F46] text-amber-400 border border-[#3F3F46] font-bold px-3 py-2 rounded-xl transition-all flex items-center space-x-1.5 shadow-sm text-xs"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit PO Details</span>
                    </button>

                    <button
                      onClick={() => downloadAdminPoPdf(selectedPo.id, selectedPo.poNumber)}
                      className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] border border-[#3F3F46] font-bold px-3 py-2 rounded-xl transition-all flex items-center space-x-1.5 shadow-sm text-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Download PO PDF</span>
                    </button>

                    <button
                      onClick={() => handleDeletePo(selectedPo.id, selectedPo.poNumber)}
                      className="bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 font-bold px-3 py-2 rounded-xl transition-all flex items-center space-x-1.5 shadow-sm text-xs"
                      title="Permanently Delete this Purchase Order"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Delete PO</span>
                    </button>

                    {selectedPo.packingList && (
                      <button
                        onClick={() => downloadAdminPackingListPdf(selectedPo.id, selectedPo.poNumber)}
                        className="bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl hover:bg-emerald-600 transition-all flex items-center space-x-1.5 shadow-sm text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Packing List PDF</span>
                      </button>
                    )}
                    {selectedPo.invoice && (
                      <button
                        onClick={() => handleDownloadInvoice(selectedPo.id, selectedPo.invoice?.invoiceNumber)}
                        className="bg-purple-700 text-white font-bold px-3 py-2 rounded-xl hover:bg-purple-600 transition-all flex items-center space-x-1.5 shadow-sm text-xs"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Download Tax Invoice</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {selectedPo.status === 'PAYMENT_RECEIPT_SUBMITTED' && (
                      <>
                        <button
                          onClick={() => setRejectModalOpen(true)}
                          className="bg-red-950/60 text-red-300 border border-red-800 font-bold px-3 py-2 rounded-xl hover:bg-red-900/60 text-xs transition-colors"
                        >
                          Reject Receipt
                        </button>
                        <button
                          onClick={() => setAckModalOpen(true)}
                          className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-500 shadow-sm text-xs transition-colors"
                        >
                          Acknowledge Payment
                        </button>
                      </>
                    )}

                    {(selectedPo.status === 'PAYMENT_ACKNOWLEDGED' || selectedPo.status === 'PAYMENT_RECEIPT_SUBMITTED') && (
                      <button
                        onClick={() => setVerifyModalOpen(true)}
                        className="bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl hover:bg-emerald-600 shadow-sm flex items-center space-x-1.5 text-xs transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Digitally Verify & Generate Packing List</span>
                      </button>
                    )}

                    {['PACKING_LIST_GENERATED', 'PAYMENT_VERIFIED'].includes(selectedPo.status) && (
                      <button
                        onClick={() => setDispatchModalOpen(true)}
                        className="bg-blue-700 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-600 shadow-sm flex items-center space-x-1.5 text-xs transition-colors"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Record Dispatch & Generate Invoice</span>
                      </button>
                    )}

                    {selectedPo.status === 'INVOICE_GENERATION_FAILED' && (
                      <button
                        onClick={() => handleRegenerateInvoice(selectedPo.id)}
                        disabled={regeneratingInvoice}
                        className="bg-orange-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-orange-500 shadow-sm flex items-center space-x-1.5 text-xs"
                      >
                        <RefreshCw className={`w-4 h-4 ${regeneratingInvoice ? 'animate-spin' : ''}`} />
                        <span>{regeneratingInvoice ? 'Regenerating...' : 'Retry Invoice Generation'}</span>
                      </button>
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
                  {Number(selectedPo.shippingCost) > 0 && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-[#A1A1AA] uppercase block font-sans">Shipping / Freight Included</span>
                      <span className="font-bold text-blue-400">₹{Number(selectedPo.shippingCost).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {Number(selectedPo.balanceAmount) > 0 && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-[#A1A1AA] uppercase block font-sans">Balance Payable on Dispatch</span>
                      <span className="font-bold text-emerald-400">₹{Number(selectedPo.balanceAmount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
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
                          <span className="font-bold text-[#FAFAFA]">{activeReceipt.originalFileName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#A1A1AA] block">File Size & MIME:</span>
                          <span className="text-[#FAFAFA]">{(activeReceipt.fileSizeBytes / 1024).toFixed(1)} KB ({activeReceipt.mimeType})</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] text-[#A1A1AA] block">Tamper-Proof SHA-256 Digest:</span>
                          <span className="font-mono text-[10px] text-emerald-400 break-all">{activeReceipt.fileHash}</span>
                        </div>
                        {activeReceipt.paymentReference && (
                          <div>
                            <span className="text-[10px] text-[#A1A1AA] block">Bank UTR / Reference:</span>
                            <span className="font-mono font-bold text-amber-400">{activeReceipt.paymentReference}</span>
                          </div>
                        )}
                        {activeReceipt.amountReceived && (
                          <div>
                            <span className="text-[10px] text-[#A1A1AA] block">Amount Acknowledged:</span>
                            <span className="font-mono font-bold text-emerald-400">₹{Number(activeReceipt.amountReceived).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>

                      {/* Payment View / Download Actions */}
                      <div className="flex items-center space-x-2 pt-2 border-t border-[#27272A]">
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(selectedPo.id, selectedPo.poNumber)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs transition-colors shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Payment Receipt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadReceipt(selectedPo.id, selectedPo.poNumber)}
                          className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] border border-[#3F3F46] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download File</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#A1A1AA] text-xs">No payment receipt submitted yet by the customer.</p>
                  )}
                </div>

                {/* Dispatch & Logistics Details Card */}
                {selectedPo.dispatch && (
                  <div className="bg-[#09090B] p-4 rounded-xl border border-[#27272A] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                      <div className="flex items-center space-x-2 text-[#FAFAFA] font-bold">
                        <Truck className="w-4 h-4 text-blue-400" />
                        <span>Shipment & Dispatch Details</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded">
                        DISPATCHED
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[#A1A1AA]">
                      <div>
                        <span className="text-[10px] text-[#A1A1AA] block">Logistics Carrier</span>
                        <span className="font-bold text-[#FAFAFA]">{selectedPo.dispatch.carrierName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A1A1AA] block">AWB / Tracking No</span>
                        <span className="font-mono font-bold text-amber-400">{selectedPo.dispatch.trackingNumber || 'Pending'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A1A1AA] block">Dispatched Date</span>
                        <span className="font-bold text-[#FAFAFA]">{new Date(selectedPo.dispatch.dispatchedAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      {selectedPo.dispatch.dispatchNotes && (
                        <div className="col-span-3 text-[11px] text-[#A1A1AA] pt-1">
                          <strong className="text-[#FAFAFA]">Notes:</strong> {selectedPo.dispatch.dispatchNotes}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Commercial Tax Invoice Card */}
                {selectedPo.invoice && (
                  <div className="bg-[#09090B] p-4 rounded-xl border border-[#27272A] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                      <div className="flex items-center space-x-2 text-[#FAFAFA] font-bold">
                        <Receipt className="w-4 h-4 text-purple-400" />
                        <span>Commercial Tax Invoice</span>
                      </div>
                      <button
                        onClick={() => handleDownloadInvoice(selectedPo.id, selectedPo.invoice?.invoiceNumber)}
                        className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] border border-[#3F3F46] font-bold px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 shadow-sm text-[11px]"
                      >
                        <Download className="w-3 h-3 text-purple-400" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 font-mono text-xs text-[#A1A1AA]">
                      <div>
                        <span className="text-[10px] text-[#A1A1AA] font-sans block">Invoice No.</span>
                        <span className="font-bold text-[#FAFAFA]">{selectedPo.invoice.invoiceNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#A1A1AA] font-sans block">Total Invoiced</span>
                        <span className="font-bold text-[#FAFAFA]">₹{Number(selectedPo.invoice.amountInvoiced).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400 font-sans block">Advance Paid</span>
                        <span className="font-bold text-emerald-400">(-) ₹{Number(selectedPo.invoice.amountPaidAdvance).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-400 font-sans block">Balance Due</span>
                        <span className="font-bold text-amber-400">₹{Number(selectedPo.invoice.balanceDue).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Line Items Table */}
                <div className="border border-[#27272A] rounded-xl overflow-hidden bg-[#09090B]">
                  <div className="bg-[#18181B] p-3 font-bold text-amber-400 border-b border-[#27272A]">
                    Line Items Snapshot ({selectedPo.items.length})
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-[#18181B] text-[10px] text-[#A1A1AA] uppercase border-b border-[#27272A]">
                      <tr>
                        <th className="p-2.5">SL</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Rate</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A]">
                      {selectedPo.items.map((item) => (
                        <tr key={item.id} className="hover:bg-[#27272A]/40 transition-colors">
                          <td className="p-2.5 font-mono text-[#A1A1AA]">{item.slNo}</td>
                          <td className="p-2.5 font-bold text-[#FAFAFA]">{item.productName}</td>
                          <td className="p-2.5 text-center font-bold text-[#FAFAFA]">{item.quantity} {item.unit}</td>
                          <td className="p-2.5 text-right font-mono text-[#A1A1AA]">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#FAFAFA]">₹{Number(item.total || item.amount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                    <span className="font-bold text-amber-400 block mb-1">Billing Address</span>
                    <p className="font-bold text-[#FAFAFA]">{selectedPo.billingAddress?.attentionTo}</p>
                    <p className="text-[#A1A1AA]">{selectedPo.billingAddress?.companyName}</p>
                    <p className="text-[#FAFAFA]">{selectedPo.billingAddress?.addressLine1}</p>
                    <p className="text-[#A1A1AA]">{selectedPo.billingAddress?.city}, {selectedPo.billingAddress?.state} - {selectedPo.billingAddress?.postalCode}</p>
                    <p className="text-[#A1A1AA]">Phone: {selectedPo.billingAddress?.phone}</p>
                  </div>
                  <div className="p-4 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                    <span className="font-bold text-amber-400 block mb-1">Delivery Destination</span>
                    <p className="font-bold text-[#FAFAFA]">{selectedPo.deliveryAddress?.attentionTo}</p>
                    <p className="text-[#A1A1AA]">{selectedPo.deliveryAddress?.companyName}</p>
                    <p className="text-[#FAFAFA]">{selectedPo.deliveryAddress?.addressLine1}</p>
                    <p className="text-[#A1A1AA]">{selectedPo.deliveryAddress?.city}, {selectedPo.deliveryAddress?.state} - {selectedPo.deliveryAddress?.postalCode}</p>
                    {selectedPo.deliveryInstructions && (
                      <p className="text-amber-300 bg-amber-950/50 border border-amber-800/60 p-2 rounded mt-1 font-medium">
                        <strong>Note:</strong> {selectedPo.deliveryInstructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Audit Logs */}
                {selectedPo.auditLogs && selectedPo.auditLogs.length > 0 && (
                  <div className="border border-[#27272A] rounded-xl p-4 space-y-3 bg-[#09090B]">
                    <h4 className="font-bold text-amber-400">Audit History & Event Trail</h4>
                    <div className="divide-y divide-[#27272A] space-y-2">
                      {selectedPo.auditLogs.map((log) => {
                        const logDate = log.performedAt || log.createdAt || (log as any).timestamp;
                        return (
                          <div key={log.id} className="pt-2 flex justify-between items-start text-[11px]">
                            <div>
                              <span className="font-bold text-[#FAFAFA]">{log.action.replace(/_/g, ' ')}</span>
                              <span className="text-[#A1A1AA] ml-2">by {log.performedByName || log.performedBy || 'System'}</span>
                            </div>
                            <span className="text-[#A1A1AA] font-mono">
                              {logDate ? new Date(logDate).toLocaleString('en-IN') : 'N/A'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      )}

      {/* Acknowledge Payment Modal */}
      {ackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] text-[#FAFAFA] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#27272A]">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-base font-bold text-[#FAFAFA]">Acknowledge Advance Payment</h3>
              <button onClick={() => setAckModalOpen(false)} className="text-[#A1A1AA] hover:text-[#FAFAFA]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAcknowledgeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#FAFAFA] mb-1">Bank UTR / Transaction Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR123456789012"
                  value={ackUtr}
                  onChange={(e) => setAckUtr(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#3F3F46] focus:border-blue-500 rounded-lg font-mono font-bold text-[#FAFAFA] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#FAFAFA] mb-1">Amount Received (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={ackAmount}
                    onChange={(e) => setAckAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#09090B] border border-[#3F3F46] focus:border-blue-500 rounded-lg font-mono font-bold text-[#FAFAFA] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#FAFAFA] mb-1">Payment Method</label>
                  <select
                    value={ackMethod}
                    onChange={(e: any) => setAckMethod(e.target.value)}
                    className="w-full p-2.5 bg-[#09090B] border border-[#3F3F46] focus:border-blue-500 rounded-lg font-bold text-[#FAFAFA] outline-none"
                  >
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-[#FAFAFA] mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Received in HDFC current a/c"
                  value={ackRemarks}
                  onChange={(e) => setAckRemarks(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#3F3F46] focus:border-blue-500 rounded-lg text-[#FAFAFA] outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setAckModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ackSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors shadow-md"
                >
                  {ackSubmitting ? 'Saving...' : 'Confirm Acknowledgment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Verify Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] text-[#FAFAFA] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#27272A]">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center space-x-2 text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="text-base font-bold text-[#FAFAFA]">Verify Advance & Packing List</h3>
              </div>
              <button onClick={() => setVerifyModalOpen(false)} className="text-[#A1A1AA] hover:text-[#FAFAFA]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              This action formally certifies that advance funds have credited the PRC Hardware bank account. 
              The system will automatically generate a branded Commercial Packing List PDF embedding the Quotation Number and PO Number.
            </p>
            <form onSubmit={handleVerifySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#FAFAFA] mb-1">Confirmed Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={verifyConfirmedAmount}
                  onChange={(e) => setVerifyConfirmedAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#09090B] border border-[#3F3F46] focus:border-emerald-500 rounded-lg font-mono font-bold text-[#FAFAFA] outline-none"
                />
              </div>
              <div className="flex items-center space-x-2 bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/30">
                <input
                  type="checkbox"
                  id="confirmCredit"
                  checked={verifyBankCredit}
                  onChange={(e) => setVerifyBankCredit(e.target.checked)}
                  className="rounded text-emerald-500 bg-[#09090B] border-[#3F3F46]"
                />
                <label htmlFor="confirmCredit" className="font-bold text-emerald-300 cursor-pointer text-xs">
                  I confirm funds have credited our bank account statement.
                </label>
              </div>
              <div className="pt-2 flex justify-end space-x-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifySubmitting || !verifyBankCredit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors shadow-md"
                >
                  {verifySubmitting ? 'Verifying & Generating PDF...' : 'Authorize & Generate Packing List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Receipt Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] text-[#FAFAFA] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#27272A]">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-base font-bold text-rose-400">Reject Payment Receipt</h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-[#A1A1AA] hover:text-[#FAFAFA]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRejectReceiptSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#FAFAFA] mb-1">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. UTR number not legible / Amount does not match required advance"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#3F3F46] focus:border-rose-500 rounded-lg text-[#FAFAFA] outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors shadow-md"
                >
                  {rejectSubmitting ? 'Rejecting...' : 'Reject Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] text-[#FAFAFA] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-[#27272A] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-[#A855F7]" />
                <h3 className="text-base font-bold text-[#FAFAFA]">PO & Bank Account Configuration</h3>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {settingsLoading || !advanceSetting ? (
              <div className="py-8 text-center text-[#A1A1AA] flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-[#A855F7] border-t-transparent rounded-full animate-spin"></div>
                <span className="font-bold">Loading configuration...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                {/* Advance Payment Rule */}
                <div className="bg-[#09090B] p-4 rounded-xl border border-[#27272A] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-amber-400 uppercase text-[11px] tracking-wider">
                      Advance Payment Terms Rule
                    </h4>
                    <span className="text-[10px] text-[#A1A1AA] bg-[#27272A] px-2 py-0.5 rounded font-mono">
                      Commercial Default
                    </span>
                  </div>
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1.5">
                      Default Advance Percentage (%)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={advanceSetting.defaultPercentage}
                        onChange={(e) =>
                          setAdvanceSetting({
                            ...advanceSetting,
                            defaultPercentage: Number(e.target.value),
                          })
                        }
                        className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] rounded-lg font-bold text-[#FAFAFA] text-sm outline-none transition-all pr-8"
                      />
                      <span className="absolute right-3 font-bold text-[#A1A1AA]">%</span>
                    </div>
                    <span className="text-[11px] text-[#A1A1AA] mt-1.5 block">
                      Default requirement is <strong className="text-[#FAFAFA]">30%</strong> across all commercial quotations.
                    </span>
                  </div>
                </div>

                {/* Official Bank Transfer Details */}
                {bankSettings.length > 0 && (
                  <div className="bg-[#09090B] p-4 rounded-xl border border-[#27272A] space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-amber-400 uppercase text-[11px] tracking-wider">
                        Official Bank Transfer Details (NEFT / RTGS)
                      </h4>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                        PRC Hardware Primary Account
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block font-bold text-[#FAFAFA] mb-1">Account Holder Name *</label>
                        <input
                          type="text"
                          required
                          value={bankSettings[0].accountHolderName}
                          onChange={(e) => {
                            const copy = [...bankSettings];
                            copy[0].accountHolderName = e.target.value;
                            setBankSettings(copy);
                          }}
                          className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-[#A855F7] rounded-lg text-[#FAFAFA] font-medium outline-none"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block font-bold text-[#FAFAFA] mb-1">Bank Name *</label>
                        <input
                          type="text"
                          required
                          value={bankSettings[0].bankName}
                          onChange={(e) => {
                            const copy = [...bankSettings];
                            copy[0].bankName = e.target.value;
                            setBankSettings(copy);
                          }}
                          className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-[#A855F7] rounded-lg text-[#FAFAFA] font-medium outline-none"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block font-bold text-[#FAFAFA] mb-1">Account Number *</label>
                        <input
                          type="text"
                          required
                          value={bankSettings[0].accountNumber}
                          onChange={(e) => {
                            const copy = [...bankSettings];
                            copy[0].accountNumber = e.target.value;
                            setBankSettings(copy);
                          }}
                          className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-[#A855F7] rounded-lg font-mono font-bold text-[#FAFAFA] outline-none"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block font-bold text-[#FAFAFA] mb-1">IFSC Code *</label>
                        <input
                          type="text"
                          required
                          value={bankSettings[0].ifscOrRoutingNumber}
                          onChange={(e) => {
                            const copy = [...bankSettings];
                            copy[0].ifscOrRoutingNumber = e.target.value;
                            setBankSettings(copy);
                          }}
                          className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-[#A855F7] rounded-lg font-mono font-bold text-[#FAFAFA] outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block font-bold text-[#FAFAFA] mb-1">Branch & Address</label>
                        <input
                          type="text"
                          value={bankSettings[0].branch || ''}
                          onChange={(e) => {
                            const copy = [...bankSettings];
                            copy[0].branch = e.target.value;
                            setBankSettings(copy);
                          }}
                          className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-[#A855F7] rounded-lg text-[#FAFAFA] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end space-x-2 border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(false)}
                    className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={settingsSaving}
                    className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold rounded-lg disabled:opacity-50 transition-colors shadow-md flex items-center space-x-1.5"
                  >
                    <span>{settingsSaving ? 'Saving...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Dispatch Order Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] text-[#FAFAFA] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#27272A]">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center space-x-2 text-blue-400">
                <Truck className="w-6 h-6" />
                <h3 className="text-base font-bold text-[#FAFAFA]">Record Dispatch & Issue Invoice</h3>
              </div>
              <button onClick={() => setDispatchModalOpen(false)} className="text-[#A1A1AA] hover:text-[#FAFAFA]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Recording dispatch transitions the PO to <strong className="text-[#FAFAFA]">DISPATCHED</strong> and automatically triggers background generation of the official <strong className="text-[#FAFAFA]">Commercial Tax Invoice</strong> with GST calculation and advance credit deduction.
            </p>
            <form onSubmit={handleDispatchSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#FAFAFA] mb-1">Logistics / Freight Carrier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BlueDart Express, DTDC, VRL, Self Fleet"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#3F3F46] focus:border-blue-500 rounded-lg font-bold text-[#FAFAFA] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#FAFAFA] mb-1">Airway Bill / Tracking Number</label>
                <input
                  type="text"
                  placeholder="e.g. BD987654321IN"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#3F3F46] focus:border-blue-500 rounded-lg font-mono font-bold text-[#FAFAFA] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#FAFAFA] mb-1">Dispatched Date *</label>
                <input
                  type="date"
                  required
                  value={dispatchedAt}
                  onChange={(e) => setDispatchedAt(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#3F3F46] focus:border-blue-500 rounded-lg font-mono font-bold text-[#FAFAFA] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#FAFAFA] mb-1">Dispatch & Packaging Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dispatched in 2 corrugated cartons with security seals"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#09090B] border border-[#3F3F46] focus:border-blue-500 rounded-lg text-[#FAFAFA] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatchSubmitting || !carrierName}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center space-x-1.5 shadow-md"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{dispatchSubmitting ? 'Dispatching & Invoicing...' : 'Confirm Dispatch & Generate Invoice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Purchase Order Details Modal */}
      {editModalOpen && selectedPo && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] text-[#FAFAFA] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-[#27272A] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center space-x-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-[#FAFAFA]">Edit Purchase Order ({selectedPo.poNumber})</h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Order Level Settings */}
              <div className="bg-[#09090B] p-4 rounded-xl border border-[#27272A] space-y-3">
                <h4 className="font-bold text-amber-400 uppercase text-[11px] tracking-wider">
                  Order & Commercial Terms
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1">Customer PO Reference No.</label>
                    <input
                      type="text"
                      placeholder="e.g. PO/2026/889"
                      value={editPoRef}
                      onChange={(e) => setEditPoRef(e.target.value)}
                      className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg text-[#FAFAFA] font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1">Advance Required (%)</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editAdvancePercentage}
                        onChange={(e) => setEditAdvancePercentage(Number(e.target.value))}
                        className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg font-bold text-[#FAFAFA] outline-none pr-8"
                      />
                      <span className="absolute right-3 font-bold text-[#A1A1AA]">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1">Freight / Shipping Charge (₹)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 font-bold text-[#A1A1AA]">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={editShippingCost}
                        onChange={(e) => setEditShippingCost(Number(e.target.value))}
                        className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg font-bold text-[#FAFAFA] outline-none pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1">Requested Delivery Date</label>
                    <input
                      type="date"
                      value={editDeliveryDate}
                      onChange={(e) => setEditDeliveryDate(e.target.value)}
                      className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg font-mono font-bold text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#FAFAFA] mb-1">Delivery Instructions / Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Gate 2 unloading only"
                      value={editDeliveryInstructions}
                      onChange={(e) => setEditDeliveryInstructions(e.target.value)}
                      className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg text-[#FAFAFA] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Destination Address */}
              <div className="bg-[#09090B] p-4 rounded-xl border border-[#27272A] space-y-3">
                <h4 className="font-bold text-amber-400 uppercase text-[11px] tracking-wider">
                  Delivery Destination Address
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1">Attention To / Contact Person</label>
                    <input
                      type="text"
                      value={editAttentionTo}
                      onChange={(e) => setEditAttentionTo(e.target.value)}
                      className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1">Company / Facility Name</label>
                    <input
                      type="text"
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-[#FAFAFA] mb-1">Street Address / Landmark</label>
                    <input
                      type="text"
                      value={editAddress1}
                      onChange={(e) => setEditAddress1(e.target.value)}
                      className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1">City</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1">State</label>
                    <input
                      type="text"
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1">Postal Code (PIN)</label>
                    <input
                      type="text"
                      value={editPostalCode}
                      onChange={(e) => setEditPostalCode(e.target.value)}
                      className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg font-mono text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#FAFAFA] mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full p-2.5 bg-[#18181B] border border-[#3F3F46] focus:border-amber-400 rounded-lg text-[#FAFAFA] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors shadow-md flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editSubmitting ? 'Saving Changes...' : 'Save Order Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
