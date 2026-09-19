import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  Receipt,
  CreditCard,
  PhoneCall,
  Printer,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  ShieldCheck,
  Ban,
  FileWarning,
  ExternalLink,
  ChevronRight,
  Layers,
  Calendar,
  History,
  RotateCcw,
  FileText,
  Download,
  PlusCircle,
  MapPin,
  Filter,
  Check,
} from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import { printStatementOfAccount } from '../../utils/customerLedgerPdfGenerator';
import type {
  CustomerDuesDetail,
  TraceableDueItem,
  StatementLedgerRow,
  SelectableDocumentItem,
  CustomerLedgerData,
  FollowupChannel,
  FollowupOutcome,
} from '../../types/paymentFollowup';
import { AddCustomerBalanceModal } from './AddCustomerBalanceModal';
import { SendCommunicationModal } from './SendCommunicationModal';

interface CustomerDuesDetailDrawerProps {
  isOpen: boolean;
  customerId: string | null;
  onClose: () => void;
  onRecordPayment: (customerId: string, totalOutstanding: number, initialDueId?: string) => void;
  onLogFollowup: (customerId: string, totalOutstanding: number) => void;
  onSendLedger: (customerId: string, totalOutstanding: number) => void;
  onSendSms: (customerId: string, totalOutstanding: number) => void;
  onDeclineDispute: (customerId: string, totalOutstanding: number) => void;
  onResumeFollowup: (customerId: string) => void;
  onRefreshParent?: () => void;
}

export const CustomerDuesDetailDrawer: React.FC<CustomerDuesDetailDrawerProps> = ({
  isOpen,
  customerId,
  onClose,
  onRecordPayment,
  onLogFollowup,
  onSendLedger,
  onSendSms,
  onDeclineDispute,
  onResumeFollowup,
  onRefreshParent,
}) => {
  const [detail, setDetail] = useState<CustomerDuesDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LEDGER' | 'DOCUMENTS' | 'DUES' | 'ALLOCATIONS' | 'TIMELINE'>('OVERVIEW');
  const [resuming, setResuming] = useState(false);

  // Modals state
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [showSendCommModal, setShowSendCommModal] = useState(false);

  // In-drawer Inline Follow-up Note Form state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteChannel, setNoteChannel] = useState<FollowupChannel>('CALL');
  const [noteOutcome, setNoteOutcome] = useState<FollowupOutcome>('CALL_MADE');
  const [noteText, setNoteText] = useState('');
  const [notePtpAmount, setNotePtpAmount] = useState('');
  const [notePtpDate, setNotePtpDate] = useState('');
  const [noteNextDate, setNoteNextDate] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccessMsg, setNoteSuccessMsg] = useState<string | null>(null);

  // Ledger Filter State
  const [ledgerFromDate, setLedgerFromDate] = useState('');
  const [ledgerToDate, setLedgerToDate] = useState('');
  const [ledgerData, setLedgerData] = useState<CustomerLedgerData | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchDetail = () => {
    if (!customerId) return;
    setLoading(true);
    paymentFollowupApi
      .getCustomerDuesDetail(customerId)
      .then((res) => {
        if (res.success && res.data) {
          setDetail(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load customer dues detail:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchLedger = (from?: string, to?: string) => {
    if (!customerId) return;
    setLoadingLedger(true);
    paymentFollowupApi
      .getCustomerLedger(customerId, { fromDate: from || undefined, toDate: to || undefined })
      .then((res) => {
        if (res.success && res.data) {
          setLedgerData(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load ledger statement:', err);
      })
      .finally(() => {
        setLoadingLedger(false);
      });
  };

  useEffect(() => {
    if (isOpen && customerId) {
      setActiveTab('OVERVIEW');
      fetchDetail();
      fetchLedger();
      setShowNoteForm(false);
      setNoteSuccessMsg(null);
    } else {
      setDetail(null);
      setLedgerData(null);
    }
  }, [isOpen, customerId]);

  if (!isOpen || !customerId) return null;

  const customer = detail?.customer;
  const summary = detail?.summary;
  const billingAddr = detail?.billingAddressDetails;
  const shippingAddr = detail?.shippingAddressDetails;

  const isDisputedOrDeclined =
    summary?.followupStatus === 'DISPUTED' || summary?.followupStatus === 'DECLINED';

  const handleResume = async () => {
    if (!customerId) return;
    setResuming(true);
    try {
      await paymentFollowupApi.resumeFollowup(customerId);
      onResumeFollowup(customerId);
      fetchDetail();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err?.message || 'Failed to resume follow-up.');
    } finally {
      setResuming(false);
    }
  };

  const handlePrint = () => {
    if (detail) {
      printStatementOfAccount(detail);
    }
  };

  const handleDownloadLedgerPdf = async () => {
    if (!customerId) return;
    setDownloadingPdf(true);
    try {
      const safeName = (customer?.companyName || customer?.name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
      await paymentFollowupApi.downloadLedgerPdf(customerId, {
        fromDate: ledgerFromDate || undefined,
        toDate: ledgerToDate || undefined,
        filename: `Statement-of-Account-${safeName}.pdf`,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to download Ledger PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSaveInlineNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSavingNote(true);
    setNoteSuccessMsg(null);
    try {
      await paymentFollowupApi.logFollowupTouchpoint(customerId, {
        channel: noteChannel,
        outcome: noteOutcome,
        notes: noteText.trim(),
        ptpAmount: notePtpAmount ? parseFloat(notePtpAmount) : undefined,
        ptpDate: notePtpDate || undefined,
        nextActionDate: noteNextDate || undefined,
      });

      setNoteSuccessMsg('Follow-up note logged successfully!');
      setNoteText('');
      setNotePtpAmount('');
      setNotePtpDate('');
      setNoteNextDate('');
      fetchDetail();
      if (onRefreshParent) onRefreshParent();

      setTimeout(() => {
        setNoteSuccessMsg(null);
        setShowNoteForm(false);
      }, 2000);
    } catch (err: any) {
      alert(err?.message || 'Failed to log follow-up note.');
    } finally {
      setSavingNote(false);
    }
  };

  const cleanPhone = customer?.phone?.replace(/\D/g, '') || '';

  // Rows for ledger table
  const ledgerRows: StatementLedgerRow[] = ledgerData?.transactions || detail?.ledgerEntries || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-4xl h-full bg-[#121214] border-l border-[#27272A] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272A] bg-[#18181B] flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-lg font-bold text-white truncate">
                {customer?.companyName || customer?.name || 'Customer 360 Dossier'}
              </h2>
              {customer?.source === 'OLD_CUSTOMER' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Legacy Customer
                </span>
              )}
              {summary?.followupStatus && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    summary.followupStatus === 'DISPUTED'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : summary.followupStatus === 'DECLINED'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : summary.followupStatus === 'PAYMENT_PROMISED'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {summary.followupStatus.replace('_', ' ')}
                </span>
              )}
            </div>

            {customer?.companyName && customer?.name && (
              <div className="text-xs text-zinc-400 mt-0.5">Contact Person: {customer.name}</div>
            )}

            <div className="flex items-center flex-wrap gap-4 mt-2 text-xs text-zinc-400">
              {cleanPhone && (
                <a
                  href={`tel:+91${cleanPhone}`}
                  className="flex items-center gap-1.5 hover:text-white transition-colors font-mono"
                >
                  <Phone size={12} className="text-emerald-400" />
                  <span>+91 {cleanPhone}</span>
                </a>
              )}
              {customer?.email && !customer.email.includes('@internal.prc') && (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Mail size={12} className="text-purple-400" />
                  <span>{customer.email}</span>
                </a>
              )}
              {customer?.gstin && (
                <span className="font-mono text-[11px] text-zinc-400">GSTIN: {customer.gstin}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dispute / Decline Alert Notice if active */}
        {isDisputedOrDeclined && (
          <div className="px-5 py-2.5 bg-rose-950/40 border-b border-rose-800/50 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <FileWarning size={14} className="shrink-0 text-rose-400" />
              <span>
                Account is marked as <strong>{summary?.followupStatus}</strong> ({summary?.declineReason || 'No reason specified'})
              </span>
            </div>
            <button
              type="button"
              onClick={handleResume}
              disabled={resuming}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors flex items-center gap-1"
            >
              {resuming ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              <span>Resume Follow-up</span>
            </button>
          </div>
        )}

        {/* Operational Action Toolbar */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#09090B] border-b border-[#27272A] flex items-center flex-wrap gap-2">
          {/* Add Balance / Payment Button (Custom Date) */}
          <button
            type="button"
            onClick={() => setShowAddBalanceModal(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
          >
            <PlusCircle size={13} />
            <span>Add Balance / Payment</span>
          </button>

          {/* Send Multi-Channel Communication with Attachments */}
          <button
            type="button"
            onClick={() => setShowSendCommModal(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
          >
            <Send size={13} />
            <span>Send Follow-up (Attach Docs)</span>
          </button>

          {/* Quick Record Payment */}
          <button
            type="button"
            onClick={() => onRecordPayment(customerId, summary?.totalOutstanding || 0)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
          >
            <CreditCard size={13} />
            <span>Record Payment</span>
          </button>

          {/* Toggle In-Drawer Note Logger */}
          <button
            type="button"
            onClick={() => setShowNoteForm(!showNoteForm)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 ${
              showNoteForm
                ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                : 'bg-[#18181B] hover:bg-[#27272A] border-[#27272A] text-zinc-300'
            }`}
          >
            <PhoneCall size={13} />
            <span>{showNoteForm ? 'Hide Note Form' : 'Write Follow-up Note'}</span>
          </button>

          {/* Print Statement */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-zinc-300 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>

          {!isDisputedOrDeclined && (
            <button
              type="button"
              onClick={() => onDeclineDispute(customerId, summary?.totalOutstanding || 0)}
              className="px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto"
            >
              <Ban size={13} />
              <span>Dispute / Decline</span>
            </button>
          )}
        </div>

        {/* 360 Financial Calculations Deck */}
        <div className="p-4 sm:p-5 bg-[#121214] border-b border-[#27272A] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A]">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">1. Total Billed Amount</div>
            <div className="text-sm sm:text-base font-bold font-mono text-zinc-200 mt-0.5">
              ₹{Math.round(summary?.totalBilledAmount || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Invoices, PIs & Opening dues</div>
          </div>

          <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A]">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">2. Total Advance Paid</div>
            <div className="text-sm sm:text-base font-bold font-mono text-blue-400 mt-0.5">
              ₹{Math.round(summary?.totalAdvancePaid || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Advance deposits on PIs</div>
          </div>

          <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A]">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">3. Payments Collected</div>
            <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-0.5">
              ₹{Math.round(summary?.totalPaymentsCollected || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Allocated payment receipts</div>
          </div>

          <div className="p-3 rounded-xl bg-[#09090B] border border-rose-500/40">
            <div className="text-[10px] text-rose-300 uppercase font-bold">4. Net Balance Due</div>
            <div className="text-base sm:text-lg font-bold font-mono text-rose-400 mt-0.5">
              ₹{Math.round(summary?.totalOutstanding || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Aging: <span className="text-amber-400 font-bold">{summary?.maxDaysOverdue || 0} days</span>
            </div>
          </div>
        </div>

        {/* Collapsible Inline "Follow-up & Write Notes" Form */}
        {showNoteForm && (
          <div className="p-4 sm:p-5 bg-[#18181B] border-b border-[#27272A] animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <PhoneCall size={14} className="text-purple-400" />
                <span>Write Follow-up Remarks & Set Reminders</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowNoteForm(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            {noteSuccessMsg && (
              <div className="p-2.5 mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>{noteSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveInlineNote} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Follow-up Channel</label>
                  <select
                    value={noteChannel}
                    onChange={(e) => setNoteChannel(e.target.value as FollowupChannel)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="CALL">Phone Call</option>
                    <option value="NOTE">Internal Note / Follow-up Memo</option>
                    <option value="SMS">SMS Conversation</option>
                    <option value="EMAIL">Email Follow-up</option>
                    <option value="IN_PERSON">In-Person Visit</option>
                    <option value="OTHER">WhatsApp / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Interaction Outcome</label>
                  <select
                    value={noteOutcome}
                    onChange={(e) => setNoteOutcome(e.target.value as FollowupOutcome)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="CALL_MADE">Call Made / Spoke with Customer</option>
                    <option value="PAYMENT_PROMISED">Payment Promised (PTP)</option>
                    <option value="CALL_BACK_LATER">Customer Requested Callback</option>
                    <option value="NO_ANSWER">No Answer / Ringing</option>
                    <option value="DISPUTED">Disputed Bill / Goods Quality</option>
                    <option value="REFUSED">Refused to Pay</option>
                    <option value="OTHER">General Follow-up</option>
                  </select>
                </div>
              </div>

              {/* Remarks Textarea */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Interaction Notes / Follow-up Remarks <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Record customer's exact statement, reasons for delay, person spoken to..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Conditional PTP & Next Action Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Promise to Pay (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50000"
                    value={notePtpAmount}
                    onChange={(e) => setNotePtpAmount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#09090B] border border-[#27272A] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Promised Payment Date
                  </label>
                  <input
                    type="date"
                    value={notePtpDate}
                    onChange={(e) => setNotePtpDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={noteNextDate}
                    onChange={(e) => setNoteNextDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingNote || !noteText.trim()}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingNote && <Loader2 size={12} className="animate-spin" />}
                  <span>Save Note to Customer Timeline</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-4 sm:px-5 border-b border-[#27272A] bg-[#18181B] flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'OVERVIEW'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 size={13} />
            <span>Address & Dossier</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('LEDGER');
              fetchLedger(ledgerFromDate, ledgerToDate);
            }}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'LEDGER'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Receipt size={13} />
            <span>Statement of Account (Ledger)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'DOCUMENTS'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText size={13} />
            <span>Commercial Docs (PI / PO / Quote)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DUES')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'DUES'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers size={13} />
            <span>Traceable Dues ({detail?.dues?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALLOCATIONS')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'ALLOCATIONS'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CreditCard size={13} />
            <span>Payment Records ({detail?.paymentAllocations?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TIMELINE')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'TIMELINE'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History size={13} />
            <span>Follow-up History ({detail?.followupHistory?.length || 0})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-xs text-zinc-500 gap-2">
              <Loader2 size={24} className="animate-spin text-purple-500" />
              <span>Compiling customer 360 calculations & dues dossier...</span>
            </div>
          ) : activeTab === 'OVERVIEW' ? (
            /* TAB 1: OVERVIEW & COMPLETE ADDRESSES */
            <div className="space-y-4">
              {/* Address Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Billing Address Card */}
                <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2">
                  <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <MapPin size={13} />
                    <span>Official Billing Address</span>
                  </div>
                  {billingAddr ? (
                    <div className="text-xs text-zinc-300 space-y-1">
                      <div className="font-semibold text-white">{customer?.companyName || customer?.name}</div>
                      <div>{billingAddr.addressLine1}</div>
                      {billingAddr.addressLine2 && <div>{billingAddr.addressLine2}</div>}
                      <div>
                        {billingAddr.city}, {billingAddr.state} — <span className="font-mono">{billingAddr.postalCode}</span>
                      </div>
                      <div className="text-zinc-500">{billingAddr.country || 'India'}</div>
                    </div>
                  ) : customer?.billingAddress ? (
                    <div className="text-xs text-zinc-300 whitespace-pre-wrap">{customer.billingAddress}</div>
                  ) : (
                    <div className="text-xs text-zinc-500 italic">No formal billing address registered.</div>
                  )}
                </div>

                {/* Shipping Address Card */}
                <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <MapPin size={13} />
                    <span>Delivery / Shipping Address</span>
                  </div>
                  {shippingAddr ? (
                    <div className="text-xs text-zinc-300 space-y-1">
                      <div className="font-semibold text-white">{customer?.companyName || customer?.name}</div>
                      <div>{shippingAddr.addressLine1}</div>
                      {shippingAddr.addressLine2 && <div>{shippingAddr.addressLine2}</div>}
                      <div>
                        {shippingAddr.city}, {shippingAddr.state} — <span className="font-mono">{shippingAddr.postalCode}</span>
                      </div>
                      <div className="text-zinc-500">{shippingAddr.country || 'India'}</div>
                    </div>
                  ) : customer?.shippingAddress ? (
                    <div className="text-xs text-zinc-300 whitespace-pre-wrap">{customer.shippingAddress}</div>
                  ) : (
                    <div className="text-xs text-zinc-500 italic">Same as official billing address.</div>
                  )}
                </div>
              </div>

              {/* Aging & Compliance Cards */}
              <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Aging Breakdown & Compliance</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg bg-[#18181B] border border-[#27272A]">
                    <div className="text-[10px] text-zinc-500">0 - 30 Days</div>
                    <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                      ₹{Math.round(detail?.agingBreakdown?.bucket0_30 || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#18181B] border border-[#27272A]">
                    <div className="text-[10px] text-zinc-500">31 - 60 Days</div>
                    <div className="text-xs font-bold font-mono text-amber-400 mt-0.5">
                      ₹{Math.round(detail?.agingBreakdown?.bucket31_60 || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#18181B] border border-[#27272A]">
                    <div className="text-[10px] text-zinc-500">61 - 90 Days</div>
                    <div className="text-xs font-bold font-mono text-orange-400 mt-0.5">
                      ₹{Math.round(detail?.agingBreakdown?.bucket61_90 || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#18181B] border border-[#27272A]">
                    <div className="text-[10px] text-zinc-500">90+ Days Overdue</div>
                    <div className="text-xs font-bold font-mono text-rose-400 mt-0.5">
                      ₹{Math.round(detail?.agingBreakdown?.bucket90_plus || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'LEDGER' ? (
            /* TAB 2: LEDGER GENERATION SYSTEM */
            <div className="space-y-4">
              {/* Ledger Controls Bar */}
              <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center flex-wrap gap-3 justify-between">
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  <Filter size={13} className="text-zinc-500" />
                  <span className="text-zinc-400 font-semibold">Date Range:</span>
                  <input
                    type="date"
                    value={ledgerFromDate}
                    onChange={(e) => setLedgerFromDate(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-[#18181B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-zinc-500">to</span>
                  <input
                    type="date"
                    value={ledgerToDate}
                    onChange={(e) => setLedgerToDate(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-[#18181B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => fetchLedger(ledgerFromDate, ledgerToDate)}
                    className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
                  >
                    Apply Filter
                  </button>
                  {(ledgerFromDate || ledgerToDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setLedgerFromDate('');
                        setLedgerToDate('');
                        fetchLedger('', '');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#18181B] text-zinc-400 hover:text-white text-xs transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadLedgerPdf}
                    disabled={downloadingPdf}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
                  >
                    {downloadingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    <span>Download Ledger (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-zinc-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Printer size={13} />
                    <span>Print Ledger</span>
                  </button>
                </div>
              </div>

              {/* Ledger Statement Table */}
              {loadingLedger ? (
                <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-purple-500" />
                  <span>Computing running balances...</span>
                </div>
              ) : ledgerRows.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  No ledger transactions found for the selected period.
                </div>
              ) : (
                <div className="border border-[#27272A] rounded-xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-[#09090B] text-zinc-400 text-[10px] uppercase border-b border-[#27272A]">
                        <tr>
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Document / Ref #</th>
                          <th className="py-3 px-3">Particulars / Description</th>
                          <th className="py-3 px-3 text-right">Debit (Billed)</th>
                          <th className="py-3 px-3 text-right">Credit (Paid)</th>
                          <th className="py-3 px-3 text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#27272A] bg-[#121214]">
                        {ledgerRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#18181B] transition-colors">
                            <td className="py-2.5 px-3 font-mono text-zinc-400 whitespace-nowrap">
                              {new Date(row.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-purple-300 whitespace-nowrap">
                              {row.refNo}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-300">
                              {row.description}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-200">
                              {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                              {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                              ₹{row.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Ledger Summary Footer */}
                      <tfoot className="bg-[#09090B] border-t-2 border-[#27272A] font-bold text-xs">
                        <tr>
                          <td colSpan={3} className="py-3 px-3 text-zinc-300 uppercase">
                            Total Closing Position
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-zinc-200">
                            ₹{ledgerRows.reduce((s, r) => s + r.debit, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-400">
                            ₹{ledgerRows.reduce((s, r) => s + r.credit, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-rose-400 text-sm">
                            ₹{(ledgerData?.closingBalance || summary?.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'DOCUMENTS' ? (
            /* TAB 3: COMMERCIAL DOCUMENTS (PI / PO / QUOTE / INVOICES) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Selectable commercial documents linked to customer account:
                </span>
                <button
                  type="button"
                  onClick={() => setShowSendCommModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>Send Follow-up with Selected Docs</span>
                </button>
              </div>

              {/* Proforma Invoices */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <FileText size={13} />
                  <span>Proforma Invoices ({detail?.selectableDocuments?.proformas?.length || 0})</span>
                </div>
                {(detail?.selectableDocuments?.proformas || []).length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-500">
                    No proforma invoices found.
                  </div>
                ) : (
                  <div className="border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A]">
                    {detail?.selectableDocuments?.proformas.map((pi) => (
                      <div key={pi.id} className="p-3 bg-[#09090B] flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold font-mono text-white">{pi.documentNumber}</span>
                          <span className="text-[10px] text-zinc-500 ml-2">
                            {new Date(pi.date).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-mono text-zinc-300">Total: ₹{pi.amount.toLocaleString('en-IN')}</div>
                            <div className="font-mono text-rose-400 font-bold text-[11px]">
                              Due: ₹{Number(pi.balanceDue || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                          {pi.viewUrl && (
                            <a
                              href={pi.viewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#18181B]"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quotations */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <FileText size={13} />
                  <span>Quotations & RFQs ({detail?.selectableDocuments?.quotations?.length || 0})</span>
                </div>
                {(detail?.selectableDocuments?.quotations || []).length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-500">
                    No quotations found.
                  </div>
                ) : (
                  <div className="border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A]">
                    {detail?.selectableDocuments?.quotations.map((q) => (
                      <div key={q.id} className="p-3 bg-[#09090B] flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold font-mono text-white">{q.documentNumber}</span>
                          <span className="text-[10px] text-zinc-500 ml-2">
                            {new Date(q.date).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-mono text-zinc-300">₹{q.amount.toLocaleString('en-IN')}</div>
                          {q.viewUrl && (
                            <a
                              href={q.viewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#18181B]"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Purchase Orders */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <FileText size={13} />
                  <span>Purchase Orders ({detail?.selectableDocuments?.purchaseOrders?.length || 0})</span>
                </div>
                {(detail?.selectableDocuments?.purchaseOrders || []).length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-500">
                    No purchase orders recorded.
                  </div>
                ) : (
                  <div className="border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A]">
                    {detail?.selectableDocuments?.purchaseOrders.map((po) => (
                      <div key={po.id} className="p-3 bg-[#09090B] flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold font-mono text-white">{po.documentNumber}</span>
                          <span className="text-[10px] text-zinc-500 ml-2">
                            {new Date(po.date).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18181B] text-zinc-300">
                            {po.status}
                          </span>
                          {po.viewUrl && (
                            <a
                              href={po.viewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#18181B]"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'DUES' ? (
            /* TAB 4: TRACEABLE DUES */
            <div className="space-y-3">
              {(detail?.dues || []).length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No outstanding receivables or dues recorded for this customer.
                </div>
              ) : (
                <div className="border border-[#27272A] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase border-b border-[#27272A]">
                      <tr>
                        <th className="py-2.5 px-3">Document / Origin</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3 text-right">Invoiced</th>
                        <th className="py-2.5 px-3 text-right">Balance Due</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A] bg-[#121214]">
                      {detail?.dues.map((d) => (
                        <tr key={d.id} className="hover:bg-[#18181B] transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-white flex items-center gap-1.5">
                              <span>{d.documentNumber}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                {d.sourceType}
                              </span>
                            </div>
                            {d.notes && <div className="text-[10px] text-zinc-500 truncate max-w-xs">{d.notes}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400">
                            {new Date(d.referenceDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={d.daysOverdue > 0 ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                              {new Date(d.dueDate).toLocaleDateString('en-IN')}
                            </span>
                            {d.daysOverdue > 0 && (
                              <div className="text-[10px] text-rose-400 font-bold">
                                {d.daysOverdue}d overdue
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-400">
                            ₹{Number(d.totalAmount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                            ₹{Number(d.balanceDue).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {d.balanceDue > 0 ? (
                              <button
                                type="button"
                                onClick={() => onRecordPayment(customerId, d.balanceDue, d.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors"
                              >
                                Allocate
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-bold">Settled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'ALLOCATIONS' ? (
            /* TAB 5: PAYMENT ALLOCATIONS */
            <div className="space-y-3">
              {(detail?.paymentAllocations || []).length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No payment allocations logged yet.
                </div>
              ) : (
                <div className="border border-[#27272A] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-[#09090B] text-zinc-500 text-[10px] uppercase border-b border-[#27272A]">
                      <tr>
                        <th className="py-2.5 px-3">Payment Date</th>
                        <th className="py-2.5 px-3">Mode / Ref</th>
                        <th className="py-2.5 px-3">Allocated To</th>
                        <th className="py-2.5 px-3 text-right">Amount Credited</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A] bg-[#121214]">
                      {detail?.paymentAllocations.map((a) => (
                        <tr key={a.id} className="hover:bg-[#18181B] transition-colors">
                          <td className="py-2.5 px-3 text-zinc-300">
                            {new Date(a.paymentDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-white">{a.paymentMode}</span>
                            {a.transactionRef && (
                              <div className="text-[10px] text-zinc-500 font-mono">
                                Ref: {a.transactionRef}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-purple-300 font-bold">
                              {a.targetDocumentNumber || a.targetType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            ₹{Number(a.allocatedAmount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* TAB 6: TIMELINE & TOUCHPOINTS */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Chronological interaction notes & follow-ups:</span>
                <button
                  type="button"
                  onClick={() => setShowNoteForm(true)}
                  className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  <PlusCircle size={13} />
                  <span>Write Note</span>
                </button>
              </div>

              {(detail?.followupHistory || []).length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No interaction touchpoints or notes recorded yet. Click "Write Follow-up Note" above to add one.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {detail?.followupHistory.map((e) => (
                    <div
                      key={e.id}
                      className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            {e.followupType}
                          </span>
                          <span className="font-bold text-white">
                            {e.outcome.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(e.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-zinc-300 leading-relaxed bg-[#121214] p-2.5 rounded-lg border border-[#1f1f23]">
                        {e.notes}
                      </div>

                      {e.ptpDate && (
                        <div className="pt-1 text-[11px] text-purple-300 flex items-center gap-2">
                          <Clock size={12} />
                          <span>
                            PTP Commitment: ₹{Number(e.ptpAmount || 0).toLocaleString('en-IN')} due on{' '}
                            {new Date(e.ptpDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      )}

                      {e.performedByName && (
                        <div className="text-[10px] text-zinc-500">Logged by: {e.performedByName}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-modals mounted from drawer */}
      {showAddBalanceModal && customerId && (
        <AddCustomerBalanceModal
          isOpen={showAddBalanceModal}
          customerId={customerId}
          customerName={customer?.companyName || customer?.name || 'Customer'}
          onClose={() => setShowAddBalanceModal(false)}
          onSuccess={() => {
            fetchDetail();
            fetchLedger();
            if (onRefreshParent) onRefreshParent();
          }}
        />
      )}

      {showSendCommModal && customerId && (
        <SendCommunicationModal
          isOpen={showSendCommModal}
          customerId={customerId}
          duesDetail={detail}
          onClose={() => setShowSendCommModal(false)}
          onSuccess={() => {
            fetchDetail();
            if (onRefreshParent) onRefreshParent();
          }}
        />
      )}
    </div>
  );
};
