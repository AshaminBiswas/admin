import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Printer, Download, Mail, CheckCircle2,
  Building2, MapPin, Phone, CreditCard, ShieldCheck,
  Calendar, FileText, Send, Copy, RefreshCw, AlertCircle, X, Trash2,
  Landmark, MessageSquare, History, UserCheck, Check, Sparkles, Clock,
  ExternalLink, Eye, Edit3
} from 'lucide-react';
import { ProformaInvoice, ProformaInvoiceHistory } from '../../types/proforma';
import { proformaService } from '../../api/proformaService';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { printProformaInvoice } from '../../utils/proformaPdfGenerator';

interface Props {
  invoice: ProformaInvoice;
  onBack: () => void;
  onEdit?: (invoice: ProformaInvoice) => void;
}

export function ProformaInvoiceDetailView({ invoice: initialInvoice, onBack, onEdit }: Props) {
  const [invoice, setInvoice] = useState<ProformaInvoice>(initialInvoice);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const { adminUser } = useAdminAuth();
  const isSuperAdmin = Boolean(
    adminUser && (
      String(adminUser.role || '').toUpperCase() === 'SUPER_ADMIN' ||
      String(adminUser.role || '').toUpperCase() === 'SUPER-ADMIN' ||
      String(adminUser.role || '').toLowerCase() === 'super_admin' ||
      String(adminUser.role || '').toLowerCase() === 'superadmin' ||
      (adminUser as any).isSuperAdmin
    )
  );

  const [deleting, setDeleting] = useState(false);

  // Fetch full live invoice data with history on mount
  const fetchFreshDetails = async () => {
    try {
      setLoadingDetails(true);
      const latest = await proformaService.getProformaInvoiceById(initialInvoice.id);
      if (latest) {
        setInvoice(latest);
      }
    } catch (err) {
      console.warn('[ProformaInvoiceDetailView] Failed to refresh PI details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchFreshDetails();
  }, [initialInvoice.id]);

  const handleDeleteInvoice = async () => {
    if (!isSuperAdmin) {
      alert('Only Super Administrators have permission to delete Proforma Invoices.');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete / void Proforma Invoice ${invoice.piNumber}?`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await proformaService.deleteProformaInvoice(invoice.id);
      alert(`Proforma Invoice ${invoice.piNumber} deleted successfully.`);
      onBack();
    } catch (err: any) {
      console.error('Failed to delete PI:', err);
      alert(err.message || 'Failed to delete Proforma Invoice.');
    } finally {
      setDeleting(false);
    }
  };
  const [emailError, setEmailError] = useState('');
  
  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [targetEmail, setTargetEmail] = useState(invoice.customerEmail || '');
  const [emailNotes, setEmailNotes] = useState('');

  const isInterState = invoice.igstTotal > 0;
  const facility = invoice.facility;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(invoice.piNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetEmail.trim()) {
      setEmailError('Please provide a valid recipient email address.');
      return;
    }

    setEmailing(true);
    setEmailError('');

    try {
      await proformaService.sendProformaInvoiceEmail(invoice, targetEmail.trim(), emailNotes.trim());
      setEmailSent(true);
      setShowEmailModal(false);
      await fetchFreshDetails();
      setTimeout(() => setEmailSent(false), 5000);
    } catch (err: any) {
      console.error('[ProformaInvoiceDetailView] Email error:', err);
      setEmailError(err?.message || 'Failed to dispatch email. Please verify SMTP/Resend credentials.');
    } finally {
      setEmailing(false);
    }
  };

  // Find customer feedback in history
  const customerHistory = (invoice.history || []).filter((h) =>
    h.action.toUpperCase().includes('CUSTOMER')
  );
  const latestCustomerFeedback = customerHistory[0];
  const isCustomerAccepted = invoice.status === 'ACCEPTED' || invoice.status === 'ADVANCE_RECEIVED' || Boolean(latestCustomerFeedback);

  // Extract payment proof / receipt URL from feedback metadata or notes
  const receiptUrl =
    latestCustomerFeedback?.metadata?.paymentReceiptUrl ||
    (invoice.history?.find((h) => h.metadata?.paymentReceiptUrl)?.metadata?.paymentReceiptUrl) ||
    (invoice.notes?.match(/\[Receipt:\s*(https?:\/\/[^\s\]]+|\/uploads\/[^\s\]]+)\]/i)?.[1]);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
            title="Back to List"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#8B5CF6]/20 text-[#C4B5FD] border border-[#8B5CF6]/30">
                PROFORMA INVOICE
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight font-mono">{invoice.piNumber}</h1>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                title="Copy PI Number"
              >
                <Copy size={13} />
              </button>
              {copied && <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Issued for <strong>{invoice.companyName || invoice.customerName}</strong> • Origin: {facility.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(invoice)}
              className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white text-xs font-bold rounded-xl border border-amber-500/40 flex items-center gap-2 transition-all shadow-xs"
              title="Edit Proforma Invoice Details & Items"
            >
              <Edit3 size={14} /> Edit Proforma Invoice
            </button>
          )}

          <button
            type="button"
            onClick={() => printProformaInvoice(invoice)}
            className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-zinc-300 hover:text-white text-xs font-bold rounded-xl border border-[#27272A] flex items-center gap-2 transition-all shadow-xs"
          >
            <Printer size={14} /> Print Document
          </button>

          <button
            type="button"
            onClick={() => proformaService.downloadProformaPdf(invoice.id, invoice.piNumber)}
            className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-xl border border-zinc-700 flex items-center gap-2 transition-all shadow-xs"
          >
            <Download size={14} /> Download PDF
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleDeleteInvoice}
              disabled={deleting}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
              title="Delete / Void Proforma Invoice (Super Admin Only)"
            >
              <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete PI'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setTargetEmail(invoice.customerEmail || '');
              setEmailError('');
              setShowEmailModal(true);
            }}
            disabled={emailing}
            className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-purple-900/20"
          >
            {emailing ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Dispatching...
              </>
            ) : emailSent ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-300" /> Dispatched Successfully
              </>
            ) : (
              <>
                <Send size={14} /> Email PI to Client
              </>
            )}
          </button>
        </div>
      </div>

      {emailSent && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Official Proforma Invoice PDF & Commercial Terms successfully dispatched to <strong>{targetEmail}</strong></span>
        </div>
      )}

      {emailError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle size={16} className="shrink-0" />
          <span>{emailError}</span>
        </div>
      )}

      {/* ─── CUSTOMER ACCEPTANCE & REMITTANCE CONFIRMATION DOSSIER ────────── */}
      {isCustomerAccepted && (
        <div className="bg-gradient-to-r from-[#131f2f] to-[#18181B] border-2 border-cyan-500/40 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                {invoice.status === 'ADVANCE_RECEIVED' ? <Landmark size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                    CUSTOMER SUBMISSION RECORD
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {latestCustomerFeedback?.createdAt
                      ? new Date(latestCustomerFeedback.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                      : 'Recently submitted'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {invoice.status === 'ADVANCE_RECEIVED'
                    ? 'Customer Submitted Advance Payment Remittance'
                    : 'Customer Confirmed Acceptance of Commercial Terms'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                invoice.status === 'ADVANCE_RECEIVED'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}>
                {invoice.status === 'ADVANCE_RECEIVED' ? 'Advance Payment Remitted' : 'Terms Confirmed & Accepted'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Customer Details */}
            <div className="bg-[#09090B]/80 p-3.5 rounded-xl border border-[#27272A] space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Submitted By</span>
              <div className="font-bold text-white text-sm">{latestCustomerFeedback?.performedBy || invoice.customerName}</div>
              {invoice.companyName && invoice.companyName !== invoice.customerName && (
                <div className="text-zinc-400">{invoice.companyName}</div>
              )}
              {invoice.customerPhone && (
                <div className="text-zinc-400 flex items-center gap-1.5">
                  <Phone size={12} className="text-zinc-500" />
                  <span>{invoice.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Advance Payment Reference / UTR */}
            <div className="bg-[#09090B]/80 p-3.5 rounded-xl border border-[#27272A] space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Advance Payment UTR / Ref</span>
              {latestCustomerFeedback?.metadata?.advancePaymentRef ? (
                <div className="font-mono font-bold text-purple-300 text-sm bg-purple-950/60 px-2 py-1 rounded border border-purple-800/40 inline-block">
                  {latestCustomerFeedback.metadata.advancePaymentRef}
                </div>
              ) : (
                <div className="text-zinc-400 italic">No bank UTR entered (Customer accepted quotation terms)</div>
              )}
              <div className="text-[11px] text-zinc-400">
                Advance Payable: <strong className="text-amber-400 font-mono">₹{invoice.advancePayable.toLocaleString('en-IN')}</strong> ({invoice.advancePercentage}%)
              </div>
            </div>

            {/* Verification Status */}
            <div className="bg-[#09090B]/80 p-3.5 rounded-xl border border-[#27272A] space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Verification Protocol</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck size={14} />
                <span>Verified via Customer Access Token</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono truncate" title={invoice.verificationToken || invoice.id}>
                Token: {(invoice.verificationToken || invoice.id || '').slice(0, 16)}...
              </div>
            </div>
          </div>

          {/* Customer Uploaded Payment Proof / Receipt Screenshot */}
          {receiptUrl && (
            <div className="bg-[#09090B]/90 p-4 rounded-xl border border-purple-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                  <Landmark size={14} className="text-purple-400" />
                  <span>Customer Uploaded Payment Proof / Receipt Document:</span>
                </div>
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold rounded-lg border border-purple-500/40 inline-flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink size={13} />
                  <span>Open Full Document</span>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                {receiptUrl.toLowerCase().endsWith('.pdf') || receiptUrl.includes('.pdf') ? (
                  <div className="flex items-center gap-3 p-3 bg-[#18181B] rounded-xl border border-purple-900/40 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Payment Receipt Document (PDF)</div>
                      <div className="text-[10px] text-zinc-400">Official bank transaction receipt uploaded by client</div>
                    </div>
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto sm:ml-4 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Download size={13} /> Download PDF
                    </a>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div
                      onClick={() => setSelectedReceiptUrl(receiptUrl)}
                      className="relative cursor-pointer group max-w-xs rounded-xl overflow-hidden border border-purple-500/40 bg-black/60 shadow-lg"
                    >
                      <img
                        src={receiptUrl}
                        alt="Payment Proof Screenshot"
                        className="max-h-48 w-auto object-contain transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                        <Eye size={16} /> Click to Enlarge
                      </div>
                    </div>
                    <span className="text-[10.5px] text-zinc-400 block">Click image to expand in full-screen modal</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer Comments & Remarks */}
          {(latestCustomerFeedback?.metadata?.feedbackComments || (invoice.notes && invoice.notes.includes('[Customer Feedback'))) && (
            <div className="bg-[#09090B]/90 p-4 rounded-xl border border-cyan-500/30 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <MessageSquare size={13} />
                <span>Customer Remarks & Site Delivery Notes:</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap pl-4 border-l-2 border-cyan-500/50">
                {latestCustomerFeedback?.metadata?.feedbackComments || invoice.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── EMAIL DISPATCH MODAL ────────────────────────────────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#A78BFA]">
                  <Mail size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Email Proforma Invoice</h3>
                  <p className="text-[11px] text-zinc-400">Dispatch PI #{invoice.piNumber} directly to client</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-bold">Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="e.g. procurement@company.com"
                  className="w-full px-3 py-2 bg-[#27272A]/60 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Subject Preview</label>
                <input
                  type="text"
                  disabled
                  value={`Commercial Proforma Invoice #${invoice.piNumber} - PRC Hardware`}
                  className="w-full px-3 py-2 bg-[#27272A]/30 border border-[#27272A] rounded-xl text-zinc-400 font-mono text-[11px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-bold">Special Notes / Payment Remarks (Optional)</label>
                <textarea
                  rows={3}
                  value={emailNotes}
                  onChange={(e) => setEmailNotes(e.target.value)}
                  placeholder="e.g. Please process 30% advance deposit to initiate production scheduling..."
                  className="w-full px-3 py-2 bg-[#27272A]/60 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-purple-950/30 border border-purple-900/40 rounded-xl text-[11px] text-purple-300 space-y-1">
                <div>• Customer: <strong>{invoice.companyName || invoice.customerName}</strong></div>
                <div>• Total Amount: <strong>₹{invoice.grandTotal.toLocaleString('en-IN')}</strong> ({invoice.advancePercentage}% Advance: ₹{invoice.advancePayable.toLocaleString('en-IN')})</div>
                <div>• Includes official PRC Hardware bank RTGS/NEFT payment instructions</div>
              </div>

              {emailError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] text-rose-400">
                  {emailError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailing}
                  className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  {emailing ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  Send Email Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── OFFICIAL PRINTABLE PREVIEW CONTAINER ────────────────────────── */}
      <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl border border-zinc-300 space-y-6">
        
        {/* Document Top Header */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-[#0f172a] pb-6">
          <div className="space-y-1 max-w-md">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="PRC Logo" className="w-12 h-12 object-contain shrink-0" />
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#d97706] bg-[#fef3c7] border border-[#fde68a] px-2 py-0.5 rounded inline-block mb-0.5">
                  COMMERCIAL PROFORMA DOCUMENT
                </span>
                <h2 className="text-2xl font-black text-[#0f172a] tracking-tight leading-none">
                  PRC HARDWARE
                </h2>
                <p className="text-[10.5px] font-bold uppercase text-[#d97706] tracking-wider mt-0.5">
                  Commercial Architectural Hardware Solutions
                </p>
              </div>
            </div>
            <div className="pt-2">
              <span className="inline-block bg-[#0f172a] text-[#f59e0b] text-[10px] font-black px-2 py-0.5 rounded uppercase">
                {facility.name} • DISPATCH WORKS
              </span>
              <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                <div><strong>Dispatch Works:</strong> {facility.addressLine1 || facility.address}, {facility.city}, {facility.state} - {facility.postalCode || facility.pincode}</div>
                <div><strong>GSTIN:</strong> <span className="font-mono font-bold text-slate-800">{facility.gstin}</span> | <strong>State Code:</strong> {facility.stateCode}</div>
                <div><strong>Email:</strong> {facility.email} | <strong>Phone:</strong> {facility.phone}</div>
              </div>
            </div>
          </div>

          <div className="text-right space-y-2">
            <div>
              <span className="text-xs font-black uppercase text-[#d97706] tracking-widest block">OFFICIAL COMMERCIAL DOCUMENT</span>
              <h3 className="text-2xl font-black text-[#0f172a] tracking-tight uppercase">PROFORMA INVOICE</h3>
              <div className="text-sm font-mono font-black text-[#d97706]">{invoice.piNumber}</div>
            </div>

            <div className="bg-[#f8fafc] border border-[#cbd5e1] border-l-4 border-l-[#d97706] rounded-xl p-3 text-xs text-right space-y-1 inline-block min-w-[220px]">
              <div><strong className="text-[#0f172a]">Date of Issue:</strong> {new Date(invoice.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div><strong className="text-[#0f172a]">Valid Until:</strong> {new Date(invoice.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              {invoice.poReference && <div><strong className="text-[#0f172a]">PO Reference:</strong> {invoice.poReference}</div>}
              {invoice.quoteReference && <div><strong className="text-[#0f172a]">Quote Reference:</strong> {invoice.quoteReference}</div>}
              <div><strong className="text-[#0f172a]">Place of Supply:</strong> {invoice.placeOfSupply} ({invoice.placeOfSupplyCode})</div>
            </div>
          </div>
        </div>

        {/* Buyer & Consignee Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-[#d97706] tracking-wider block border-b border-slate-200 pb-1 mb-1.5">
              Billed To (Buyer Entity)
            </span>
            <div className="text-sm font-extrabold text-[#0f172a]">{invoice.companyName || invoice.customerName}</div>
            <div><strong>Contact Person:</strong> {invoice.customerName}</div>
            <div><strong>Billing Address:</strong> {invoice.billingAddress}</div>
            <div><strong>GSTIN / Tax ID:</strong> <span className="font-mono font-bold text-slate-800">{invoice.customerGstin || 'Unregistered / B2C'}</span></div>
            <div><strong>Email:</strong> {invoice.customerEmail} | <strong>Phone:</strong> {invoice.customerPhone}</div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-[#059669] tracking-wider block border-b border-slate-200 pb-1 mb-1.5">
              Shipped / Delivered To (Site Destination)
            </span>
            <div className="text-sm font-extrabold text-[#0f172a]">{invoice.companyName || invoice.customerName}</div>
            <div><strong>Site Destination:</strong> {invoice.shippingAddress || invoice.billingAddress}</div>
            <div><strong>Dispatch Timeline:</strong> {invoice.deliveryTimeline}</div>
            <div><strong>Payment Terms:</strong> {invoice.paymentTerms}</div>
            <div><strong>Mode of Transport:</strong> Surface Express / Dedicated Logistics</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0f172a] text-white text-[10.5px] uppercase font-bold">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">Item Description & Specification</th>
                <th className="p-3 w-28 text-center">HSN/SAC</th>
                <th className="p-3 w-20 text-center">Qty</th>
                <th className="p-3 w-24 text-right">Rate (₹)</th>
                <th className="p-3 w-20 text-center">GST %</th>
                <th className="p-3 w-32 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                  <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3">
                    <strong className="text-[#0f172a] block">{item.productName}</strong>
                    <span className="font-mono text-[10px] text-amber-700 font-bold">SKU: {item.sku}</span>
                    {item.description && <p className="text-[11px] text-slate-600 mt-0.5">{item.description}</p>}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-700">{item.hsnCode}</td>
                  <td className="p-3 text-center">
                    <strong className="text-[#0f172a]">{item.quantity}</strong> <span className="text-[10px] text-slate-500">{item.unit}</span>
                  </td>
                  <td className="p-3 text-right font-mono">₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-center font-mono">{item.gstRate}%</td>
                  <td className="p-3 text-right font-mono font-bold text-[#0f172a]">
                    ₹{Number(item.totalAmount ?? item.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Banking Details & Commercial Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* Bank Instructions */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-600 rounded-2xl space-y-1.5 text-xs text-emerald-950">
            <span className="text-[10.5px] font-black uppercase text-emerald-900 tracking-wider block border-b border-emerald-200 pb-1">
              Bank Account Details for RTGS / NEFT / IMPS
            </span>
            <div><strong>Bank Name:</strong> {facility.bankDetails?.bankName || facility.bankName}</div>
            <div><strong>Account Name:</strong> {facility.bankDetails?.accountName || facility.accountName}</div>
            <div><strong>Account Number:</strong> <span className="font-mono font-bold text-sm text-emerald-900">{facility.bankDetails?.accountNumber || facility.accountNumber}</span></div>
            <div><strong>IFSC Code:</strong> <span className="font-mono font-bold">{facility.bankDetails?.ifsc || facility.ifscCode}</span></div>
            <div><strong>Branch:</strong> {facility.bankDetails?.branch || facility.branch}</div>
            <div><strong>UPI ID:</strong> <span className="font-mono font-bold">{facility.bankDetails?.upiId || facility.upiId}</span></div>
            <p className="text-[10px] text-emerald-700 pt-1">
              * Please mention PI Number <strong>{invoice.piNumber}</strong> in NEFT payment remarks for automated reconciliation.
            </p>
          </div>

          {/* Totals Summary */}
          <div className="p-4 bg-[#f8fafc] border border-[#cbd5e1] rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-700">
              <span>Products Basic Subtotal:</span>
              <span className="font-mono font-bold">₹{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {invoice.shippingCharges && invoice.shippingCharges > 0 ? (
              <>
                <div className="flex justify-between text-slate-700">
                  <span>Transportation & Freight Charges:</span>
                  <span className="font-mono font-bold">₹{invoice.shippingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-900 border-t border-dashed border-slate-300 pt-1 font-bold">
                  <span>Total Taxable Value:</span>
                  <span className="font-mono">₹{(invoice.taxableAmount || (invoice.subtotal + invoice.shippingCharges)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            ) : null}

            {isInterState ? (
              <div className="flex justify-between text-slate-700">
                <span>Integrated GST (IGST 18%):</span>
                <span className="font-mono font-bold text-amber-800">₹{invoice.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-700">
                  <span>Central GST (CGST 9%):</span>
                  <span className="font-mono font-bold">₹{invoice.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>State GST (SGST 9%):</span>
                  <span className="font-mono font-bold">₹{invoice.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}

            <div className="border-t-2 border-[#0f172a] pt-2 flex justify-between text-sm font-black text-[#0f172a]">
              <span>Grand Total (All Taxes Incl.):</span>
              <span className="font-mono text-base">₹{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="p-2.5 bg-amber-100 border border-amber-300 border-l-4 border-l-amber-600 rounded-xl flex justify-between items-center text-xs font-bold text-amber-900 mt-2">
              <span>Advance Payable ({invoice.advancePercentage}%):</span>
              <span className="font-mono font-black text-sm">₹{invoice.advancePayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 px-1">
              <span>Balance due at dispatch:</span>
              <span className="font-mono">₹{invoice.balancePayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

        </div>

        {/* Footer Notes & Digital Stamp */}
        <div className="border-t border-slate-200 pt-4 flex flex-wrap items-end justify-between gap-4 text-[11px] text-slate-500">
          <div className="max-w-md space-y-1">
            <strong>Commercial Terms:</strong>
            <p className="text-[10px] leading-relaxed">
              1. This Proforma Invoice is valid for 30 calendar days.<br/>
              2. Production lead time starts upon receipt of advance deposit.<br/>
              3. All disputes subject to Delhi jurisdiction only.
            </p>
          </div>

          <div className="text-right space-y-1 min-w-[180px]">
            <div className="h-10 border-b border-slate-400 mb-1 flex items-center justify-end">
              <svg width="100" height="24" viewBox="0 0 110 32" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 24 C 14 6, 18 4, 26 21 C 30 28, 36 8, 44 16 C 52 24, 58 6, 68 20 C 76 12, 86 16, 98 22" />
                <line x1="2" y1="30" x2="108" y2="30" stroke="#94a3b8" strokeWidth="0.75" />
              </svg>
            </div>
            <strong className="text-slate-800 text-xs block">Authorized Signatory</strong>
            <span className="text-[10px]">PRC Hardware</span>
          </div>
        </div>

      </div>

      {/* ─── AUDIT TRAIL & COMMERCIAL LIFECYCLE HISTORY ─────────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#A78BFA]">
              <History size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Document Lifecycle & Customer Activity Trail</h3>
              <p className="text-[11px] text-zinc-400">Complete immutable record of all customer submissions, status changes, and staff operations</p>
            </div>
          </div>
          <span className="text-xs font-mono text-zinc-500 font-bold">
            {(invoice.history || []).length} Event{(invoice.history || []).length !== 1 ? 's' : ''}
          </span>
        </div>

        {(!invoice.history || invoice.history.length === 0) ? (
          <div className="py-6 text-center text-xs text-zinc-500 italic">
            No previous lifecycle events recorded for this Proforma Invoice.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#27272A]">
            {invoice.history.map((h, i) => {
              const isCustomer = h.action.toUpperCase().includes('CUSTOMER');
              const isPayment = h.action.toUpperCase().includes('PAYMENT');
              const isCreated = h.action.toUpperCase().includes('CREATE');

              return (
                <div key={h.id || i} className="relative group">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[29px] top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isPayment
                      ? 'bg-purple-950 border-purple-500 text-purple-400'
                      : isCustomer
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-400'
                      : isCreated
                      ? 'bg-zinc-900 border-zinc-500 text-zinc-400'
                      : 'bg-emerald-950 border-emerald-500 text-emerald-400'
                  }`}>
                    {isPayment ? (
                      <Landmark size={10} />
                    ) : isCustomer ? (
                      <UserCheck size={10} />
                    ) : (
                      <Clock size={10} />
                    )}
                  </div>

                  <div className="bg-[#27272A]/40 hover:bg-[#27272A]/60 border border-[#27272A] rounded-2xl p-4 space-y-1.5 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isPayment
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : isCustomer
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            : 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30'
                        }`}>
                          {h.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {h.performedBy || 'System'}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {new Date(h.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {h.details && (
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {h.details}
                      </p>
                    )}

                    {/* Metadata tags */}
                    {h.metadata && typeof h.metadata === 'object' && Object.keys(h.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {h.metadata.advancePaymentRef && (
                          <span className="text-[10.5px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-md">
                            UTR: {h.metadata.advancePaymentRef}
                          </span>
                        )}
                        {h.metadata.action && (
                          <span className="text-[10.5px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-md">
                            Action: {h.metadata.action}
                          </span>
                        )}
                        {h.metadata.paymentReceiptUrl && (
                          <a
                            href={h.metadata.paymentReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10.5px] font-mono bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                          >
                            <ExternalLink size={10} /> View Receipt Proof
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── PAYMENT RECEIPT LIGHTBOX MODAL ──────────────────────────────── */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-4xl max-h-[90vh] bg-[#18181B] border border-[#27272A] rounded-2xl p-4 shadow-2xl flex flex-col items-center space-y-3">
            <div className="w-full flex items-center justify-between border-b border-[#27272A] pb-2 text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Landmark size={15} className="text-purple-400" /> Customer Payment Confirmation Screenshot
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded-lg border border-zinc-700 flex items-center gap-1 font-bold transition-colors"
                >
                  <ExternalLink size={12} /> Open Full Size
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptUrl(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[75vh] flex items-center justify-center">
              <img
                src={selectedReceiptUrl}
                alt="Payment Receipt Preview"
                className="max-w-full max-h-[72vh] object-contain rounded-lg border border-zinc-800"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
