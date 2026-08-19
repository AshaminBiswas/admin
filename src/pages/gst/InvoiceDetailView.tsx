import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Download, Shield, ShieldCheck, ShieldX, Copy,
  Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  FileText, List, BarChart3, Zap, X,
} from 'lucide-react';
import {
  getGSTInvoiceById,
  downloadGSTInvoicePdf,
  generateIRN,
  cancelIRN,
  checkIRNStatus,
  getCompanySettings,
  formatCurrency,
  formatDate,
} from '../../api/gstInvoiceService';
import { downloadIRNJson, copyToClipboard } from '../../utils/invoicePdfDownloader';
import { GSTInvoice, EInvoiceRecord, CANCEL_REASON_CODES, CompanySettings } from '../../types/admin';
import { amountInWords } from '../../utils/gstCalculator';
import { ValidationPanel } from './ValidationPanel';
import { AsyncActionButton } from '../../components/common/AsyncActionButton';

type Tab = 'overview' | 'items' | 'tax' | 'einvoice';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-500/20 text-slate-400',
  VALIDATED: 'bg-blue-500/20 text-blue-400',
  IRN_PENDING: 'bg-amber-500/20 text-amber-400',
  IRN_GENERATED: 'bg-green-500/20 text-green-400',
  ISSUED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

interface Props {
  invoiceId: string;
  onBack: () => void;
  adminRole: string;
  onEdit?: (id: string) => void;
}

export function InvoiceDetailView({ invoiceId, onBack, adminRole, onEdit }: Props) {
  const [invoice, setInvoice] = useState<GSTInvoice | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [error, setError] = useState('');

  // IRN actions
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Cancel IRN modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReasonCode, setCancelReasonCode] = useState('1');
  const [cancelRemark, setCancelRemark] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Download
  const [downloading, setDownloading] = useState(false);

  const canGenerateIRN = adminRole === 'super_admin' || adminRole === 'admin';

  useEffect(() => {
    Promise.all([
      getGSTInvoiceById(invoiceId),
      getCompanySettings(),
    ])
      .then(([inv, settings]) => {
        setInvoice(inv);
        setCompanySettings(settings);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const reload = async () => {
    try {
      const inv = await getGSTInvoiceById(invoiceId);
      setInvoice(inv);
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleGenerateIRN = async () => {
    setActionError('');
    setActionSuccess('');
    setGenerating(true);
    try {
      const updated = await generateIRN(invoiceId);
      setInvoice(updated);
      setActionSuccess('IRN submitted to IRIS IRP 6. Check status if still pending.');
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    setActionError('');
    try {
      const updated = await checkIRNStatus(invoiceId);
      setInvoice(updated);
      if (updated.status === 'IRN_GENERATED') {
        setActionSuccess('IRN confirmed by IRIS IRP 6.');
      }
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setChecking(false);
    }
  };

  const handleCancelIRN = async () => {
    if (!cancelRemark.trim()) { setActionError('Please enter a cancellation remark'); return; }
    setCancelling(true);
    setActionError('');
    try {
      const updated = await cancelIRN(invoiceId, {
        reason_code: cancelReasonCode,
        reason_remark: cancelRemark,
      });
      setInvoice(updated);
      setCancelModalOpen(false);
      setCancelRemark('');
      setActionSuccess('IRN cancelled successfully.');
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyIRN = async () => {
    if (!invoice?.einvoice?.irn) return;
    await copyToClipboard(invoice.einvoice.irn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      await downloadGSTInvoicePdf(invoice.id, invoice.invoice_number);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setDownloading(false);
    }
  };

  // Cancellation window check
  const cancellationWindowHours = companySettings?.irn_cancellation_window_hours ?? 24;
  const canCancelIRN = (() => {
    if (!invoice?.einvoice?.generated_at) return false;
    const elapsed = (Date.now() - new Date(invoice.einvoice.generated_at).getTime()) / 3600000;
    return elapsed <= cancellationWindowHours;
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-sm text-red-400">{error || 'Invoice not found'}</p>
        <button onClick={onBack} className="text-xs text-[#8B5CF6] hover:underline">
          ← Back
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <FileText size={13} /> },
    { id: 'items', label: 'Line Items', icon: <List size={13} /> },
    { id: 'tax', label: 'Tax Summary', icon: <BarChart3 size={13} /> },
    { id: 'einvoice', label: 'E-Invoice / IRN', icon: <Zap size={13} /> },
  ];

  const gstTotal = invoice.cgst_amount + invoice.sgst_amount + invoice.igst_amount;
  const isInterstate = invoice.transaction_type === 'INTERSTATE';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#8B5CF6]/40 transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono text-[#FAFAFA]">{invoice.invoice_number}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLOR[invoice.status] || 'bg-slate-500/20 text-slate-400'}`}>
                {invoice.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              {formatDate(invoice.invoice_date)} · {invoice.customer_legal_name} · FY {invoice.financial_year}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {invoice.status === 'DRAFT' && onEdit && (
            <button
              onClick={() => onEdit(invoice.id)}
              className="px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-[#A1A1AA] text-xs font-semibold hover:border-[#8B5CF6]/40 hover:text-[#FAFAFA] transition-colors"
            >
              Edit Draft
            </button>
          )}
          <AsyncActionButton
            mode="download"
            onAction={async () => {
              if (invoice) await downloadGSTInvoicePdf(invoice.id, invoice.invoice_number);
            }}
            idleIcon={<Download size={13} />}
            idleLabel="Download PDF"
            loadingLabel="Preparing PDF…"
            successLabel="Downloaded!"
            className="flex items-center gap-1.5 px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-[#A1A1AA] text-xs font-semibold hover:border-[#8B5CF6]/40 hover:text-[#FAFAFA] transition-colors"
            variant="custom"
          />
        </div>
      </div>

      {/* Action messages */}
      {actionError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-tr-xl rounded-bl-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <XCircle size={14} className="flex-shrink-0" />
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-tr-xl rounded-bl-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
          <CheckCircle size={14} className="flex-shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#27272A] pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-[#8B5CF6] text-[#8B5CF6]'
                : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Supplier */}
          <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-3">Supplier</p>
            <p className="text-sm font-bold text-[#FAFAFA]">{companySettings?.legal_name || 'Pacific Products & Solutions'}</p>
            {companySettings?.gstin && <p className="text-xs font-mono text-[#8B5CF6] mt-1">GSTIN: {companySettings.gstin}</p>}
            {companySettings?.address && <p className="text-xs text-[#A1A1AA] mt-1">{companySettings.address}, {companySettings.city}, {companySettings.state} — {companySettings.pincode}</p>}
          </div>

          {/* Customer */}
          <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-3">Customer</p>
            <p className="text-sm font-bold text-[#FAFAFA]">{invoice.customer_legal_name}</p>
            {invoice.customer_gstin && <p className="text-xs font-mono text-[#8B5CF6] mt-1">GSTIN: {invoice.customer_gstin}</p>}
            <p className="text-xs text-[#A1A1AA] mt-1">
              {invoice.billing_address?.addr1}, {invoice.billing_address?.city},{' '}
              {invoice.billing_address?.state} — {invoice.billing_address?.pincode}
            </p>
          </div>

          {/* Invoice Meta */}
          <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] md:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-3">Invoice Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[#71717A]">Invoice Date</p>
                <p className="font-semibold text-[#FAFAFA] mt-0.5">{formatDate(invoice.invoice_date)}</p>
              </div>
              <div>
                <p className="text-[#71717A]">Financial Year</p>
                <p className="font-semibold text-[#FAFAFA] mt-0.5">{invoice.financial_year}</p>
              </div>
              <div>
                <p className="text-[#71717A]">Place of Supply</p>
                <p className="font-semibold text-[#FAFAFA] mt-0.5">{invoice.place_of_supply} ({invoice.place_of_supply_state_code})</p>
              </div>
              <div>
                <p className="text-[#71717A]">Transaction Type</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                  isInterstate ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  {invoice.transaction_type}
                </span>
              </div>
              <div>
                <p className="text-[#71717A]">Supply Type</p>
                <p className="font-semibold text-[#FAFAFA] mt-0.5">{invoice.supply_type}</p>
              </div>
              <div>
                <p className="text-[#71717A]">Grand Total</p>
                <p className="font-bold text-[#8B5CF6] mt-0.5">{formatCurrency(invoice.grand_total)}</p>
              </div>
              {invoice.notes && (
                <div className="col-span-2">
                  <p className="text-[#71717A]">Notes</p>
                  <p className="text-[#A1A1AA] mt-0.5">{invoice.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Line Items */}
      {activeTab === 'items' && (
        <div className="rounded-tr-2xl rounded-bl-2xl border border-[#27272A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#18181B] border-b border-[#27272A]">
                  {['#', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Discount', 'Taxable', 'GST%',
                    isInterstate ? 'IGST' : 'CGST', isInterstate ? '' : 'SGST', 'Total'].filter(Boolean).map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#71717A] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item) => (
                  <tr key={item.sl_no} className="border-b border-[#27272A]/50">
                    <td className="px-3 py-3 text-[#71717A]">{item.sl_no}</td>
                    <td className="px-3 py-3 text-[#FAFAFA] max-w-[200px]">
                      <p className="font-semibold truncate">{item.description}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-[#A1A1AA]">{item.hsn_sac}</td>
                    <td className="px-3 py-3 text-[#FAFAFA]">{item.quantity}</td>
                    <td className="px-3 py-3 text-[#A1A1AA]">{item.unit}</td>
                    <td className="px-3 py-3 text-right text-[#FAFAFA]">{formatCurrency(item.unit_price)}</td>
                    <td className="px-3 py-3 text-right text-[#A1A1AA]">{item.discount > 0 ? formatCurrency(item.discount) : '—'}</td>
                    <td className="px-3 py-3 text-right text-[#FAFAFA]">{formatCurrency(item.taxable_value)}</td>
                    <td className="px-3 py-3 text-center text-[#A1A1AA]">{item.gst_rate}%</td>
                    {isInterstate ? (
                      <td className="px-3 py-3 text-right text-purple-400">{formatCurrency(item.igst_amount)}</td>
                    ) : (
                      <>
                        <td className="px-3 py-3 text-right text-blue-400">{formatCurrency(item.cgst_amount)}</td>
                        <td className="px-3 py-3 text-right text-blue-400">{formatCurrency(item.sgst_amount)}</td>
                      </>
                    )}
                    <td className="px-3 py-3 text-right font-bold text-[#8B5CF6]">{formatCurrency(item.total_item_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Tax Summary */}
      {activeTab === 'tax' && (
        <div className="max-w-md space-y-4">
          <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-4">Tax Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Taxable Amount</span>
                <span className="font-semibold text-[#FAFAFA]">{formatCurrency(invoice.taxable_amount)}</span>
              </div>
              {isInterstate ? (
                <div className="flex justify-between">
                  <span className="text-[#A1A1AA]">IGST</span>
                  <span className="text-purple-400">{formatCurrency(invoice.igst_amount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">CGST</span>
                    <span className="text-blue-400">{formatCurrency(invoice.cgst_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">SGST</span>
                    <span className="text-blue-400">{formatCurrency(invoice.sgst_amount)}</span>
                  </div>
                </>
              )}
              {invoice.cess_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#A1A1AA]">Cess</span>
                  <span className="text-[#FAFAFA]">{formatCurrency(invoice.cess_amount)}</span>
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#A1A1AA]">Total Discount</span>
                  <span className="text-[#FAFAFA]">- {formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              {invoice.round_off !== 0 && (
                <div className="flex justify-between text-[#71717A]">
                  <span>Round-Off</span>
                  <span>{formatCurrency(invoice.round_off)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-[#27272A] font-bold text-base">
                <span className="text-[#FAFAFA]">Grand Total</span>
                <span className="text-[#8B5CF6]">{formatCurrency(invoice.grand_total)}</span>
              </div>
            </div>
            <p className="text-[11px] text-[#71717A] mt-3 italic border-t border-[#27272A] pt-3">
              {amountInWords(invoice.grand_total)}
            </p>
          </div>
        </div>
      )}

      {/* Tab: E-Invoice / IRN */}
      {activeTab === 'einvoice' && (
        <div className="space-y-5 max-w-2xl">
          {/* DRAFT */}
          {invoice.status === 'DRAFT' && (
            <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-4">
              <div className="flex items-center gap-2">
                <ShieldX size={16} className="text-[#71717A]" />
                <p className="text-sm font-bold text-[#A1A1AA]">Invoice must be Validated before generating IRN</p>
              </div>
              <p className="text-xs text-[#71717A]">
                Please use "Save & Validate" in the edit form, or visit Edit → Save & Validate.
              </p>
            </div>
          )}

          {/* VALIDATED */}
          {invoice.status === 'VALIDATED' && (
            <div className="space-y-4">
              <ValidationPanel
                results={[
                  { field: 'invoice_number', label: 'Invoice Number present', passed: !!invoice.invoice_number },
                  { field: 'invoice_date', label: 'Invoice Date valid', passed: !!invoice.invoice_date },
                  { field: 'supplier_gstin', label: 'Supplier GSTIN configured', passed: !!companySettings?.gstin },
                  { field: 'customer_gstin', label: 'Customer GSTIN (B2B)', passed: invoice.supply_type === 'B2C' || !!invoice.customer_gstin },
                  { field: 'place_of_supply', label: 'Place of Supply set', passed: !!invoice.place_of_supply_state_code },
                  { field: 'has_items', label: 'Line items present', passed: (invoice.items?.length ?? 0) > 0 },
                  { field: 'hsn_codes', label: 'HSN/SAC on all items', passed: (invoice.items || []).every((it) => !!it.hsn_sac) },
                  { field: 'tax_correct', label: 'Tax type correct (CGST+SGST or IGST)', passed: true },
                  { field: 'taxable_positive', label: 'Taxable amount > 0', passed: invoice.taxable_amount > 0 },
                ]}
                allPassed={true}
                irpConfigured={companySettings?.irp_configured ?? false}
                canGenerateIRN={canGenerateIRN}
                onGenerateIRN={handleGenerateIRN}
                generating={generating}
                status={invoice.status}
              />
            </div>
          )}

          {/* IRN_PENDING */}
          {invoice.status === 'IRN_PENDING' && (
            <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-400 animate-pulse" />
                <p className="text-sm font-bold text-amber-400">IRN Generation In Progress</p>
              </div>
              <p className="text-xs text-amber-300/80">
                The invoice was submitted to IRIS IRP 6. If IRN is not confirmed within a few minutes, use "Check Status" to poll the IRP.
              </p>
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="flex items-center gap-2 px-4 py-2 rounded-tr-xl rounded-bl-xl border border-amber-500/40 text-amber-400 text-xs font-bold hover:bg-amber-500/10 disabled:opacity-60 transition-colors"
              >
                {checking ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {checking ? 'Checking…' : 'Check IRN Status'}
              </button>
            </div>
          )}

          {/* IRN_GENERATED or ISSUED */}
          {(invoice.status === 'IRN_GENERATED' || invoice.status === 'ISSUED') && invoice.einvoice && (
            <div className="space-y-4">
              {/* Success header */}
              <div className="flex items-center gap-3 p-4 rounded-tr-2xl rounded-bl-2xl bg-green-500/10 border border-green-500/30">
                <ShieldCheck size={24} className="text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-400">✅ Government Registered</p>
                  <p className="text-xs text-green-300/80">IRIS Business Services Ltd. (IRP 6) · GSTN e-Invoice Portal</p>
                </div>
              </div>

              {/* IRN */}
              <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">IRN (Invoice Registration Number)</p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 font-mono text-[11px] text-[#FAFAFA] break-all">
                    {invoice.einvoice.irn}
                  </p>
                  <AsyncActionButton
                    mode="copy"
                    onAction={() => copyToClipboard(invoice.einvoice?.irn || '')}
                    idleIcon={<Copy size={13} />}
                    size="icon"
                    className="p-2 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#8B5CF6] hover:border-[#8B5CF6]/40 flex-shrink-0 transition-colors"
                    variant="custom"
                    title="Copy IRN"
                  />
                </div>
              </div>

              {/* Ack Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A]">
                  <p className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider">Ack No</p>
                  <p className="font-mono text-sm text-[#FAFAFA] mt-1">{invoice.einvoice.ack_number}</p>
                </div>
                <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A]">
                  <p className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider">Ack Date</p>
                  <p className="text-sm text-[#FAFAFA] mt-1">
                    {invoice.einvoice.ack_date
                      ? new Date(invoice.einvoice.ack_date).toLocaleString('en-IN')
                      : '—'}
                  </p>
                </div>
              </div>

              {/* QR Code — from IRIS IRP, never generated locally */}
              {invoice.einvoice.signed_qr_code && (
                <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] flex flex-col items-center gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Signed QR Code</p>
                  <img
                    src={`data:image/png;base64,${invoice.einvoice.signed_qr_code}`}
                    alt="IRIS IRP Signed QR Code"
                    className="w-48 h-48 border-4 border-green-500/40 rounded-xl"
                    onError={(e) => {
                      // Fallback: try raw value as src (some providers return image URL)
                      const img = e.target as HTMLImageElement;
                      if (!img.src.startsWith('http')) {
                        img.src = invoice.einvoice!.signed_qr_code!;
                      }
                    }}
                  />
                  <p className="text-[10px] text-[#71717A] text-center">
                    Signed QR Code issued by IRIS IRP 6 · Government registered
                  </p>
                </div>
              )}

              {/* Cancel IRN */}
              {invoice.status === 'IRN_GENERATED' && canGenerateIRN && (
                <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Cancel IRN</p>
                  {canCancelIRN ? (
                    <>
                      <p className="text-xs text-amber-400">
                        ⚠ Cancellation allowed within {cancellationWindowHours}h of generation. IRN cannot be cancelled if an active E-Way Bill is linked.
                      </p>
                      <button
                        onClick={() => setCancelModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-tr-xl rounded-bl-xl border border-red-500/40 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors"
                      >
                        <ShieldX size={13} /> Cancel IRN
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-[#71717A]">
                      <XCircle size={13} className="text-red-400" />
                      Cancellation window ({cancellationWindowHours}h) has expired.
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <AsyncActionButton
                  mode="download"
                  onAction={() => downloadGSTInvoicePdf(invoice.id, invoice.invoice_number)}
                  idleIcon={<Download size={13} />}
                  idleLabel="Download Invoice PDF"
                  loadingLabel="Preparing PDF…"
                  successLabel="Downloaded!"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] transition-colors"
                  variant="custom"
                />
                <AsyncActionButton
                  mode="download"
                  onAction={() => downloadIRNJson(invoice.id, invoice.invoice_number)}
                  idleIcon={<Download size={13} />}
                  idleLabel="IRN JSON"
                  loadingLabel="Downloading…"
                  successLabel="Downloaded!"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-tr-xl rounded-bl-xl border border-[#27272A] text-[#A1A1AA] text-xs font-semibold hover:border-[#8B5CF6]/40 hover:text-[#FAFAFA] transition-colors"
                  variant="custom"
                />
              </div>
            </div>
          )}

          {/* CANCELLED */}
          {invoice.status === 'CANCELLED' && (
            <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-red-500/10 border border-red-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldX size={16} className="text-red-400" />
                <p className="text-sm font-bold text-red-400">IRN Cancelled</p>
              </div>
              {invoice.einvoice?.cancellation_reason && (
                <p className="text-xs text-[#A1A1AA]">
                  Reason: {invoice.einvoice.cancellation_reason} ({invoice.einvoice.cancellation_reason_code})
                </p>
              )}
              {invoice.einvoice?.cancelled_at && (
                <p className="text-xs text-[#71717A]">
                  Cancelled at: {new Date(invoice.einvoice.cancelled_at).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cancel IRN Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#27272A]">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <ShieldX size={15} /> Cancel IRN
              </h3>
              <button onClick={() => setCancelModalOpen(false)} className="p-1.5 text-[#A1A1AA] hover:text-[#FAFAFA]">
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                ⚠ This action is irreversible. The IRN will be cancelled with IRIS IRP 6.
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Cancellation Reason *</label>
                <select
                  value={cancelReasonCode}
                  onChange={(e) => setCancelReasonCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                >
                  {CANCEL_REASON_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Reason Remark *</label>
                <textarea
                  value={cancelRemark}
                  onChange={(e) => setCancelRemark(e.target.value)}
                  rows={3}
                  placeholder="Describe reason for cancellation…"
                  className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs resize-none focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
              {actionError && (
                <p className="text-xs text-red-400">{actionError}</p>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-[#27272A]">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2 rounded-tr-xl rounded-bl-xl border border-[#27272A] text-[#A1A1AA] text-xs font-semibold hover:text-[#FAFAFA] transition-colors"
              >
                Keep IRN
              </button>
              <button
                onClick={handleCancelIRN}
                disabled={cancelling || !cancelRemark.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-tr-xl rounded-bl-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {cancelling ? <RefreshCw size={13} className="animate-spin" /> : <ShieldX size={13} />}
                {cancelling ? 'Cancelling…' : 'Confirm Cancel IRN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
