/**
 * WhatsAppLedgerModal.tsx
 *
 * Commercial Ledger Statement & WhatsApp Dispatch Modal for Proforma Invoices.
 * Automatically formats the account statement with:
 * - Customer & Company Name
 * - PI Number & Total Value
 * - Advance Required / Paid
 * - Remaining Balance Due to Pay
 * - Official Bank Details for RTGS/NEFT/IMPS/UPI remittance
 * - Direct link to view/download signed PDF and verify authenticity
 * - Automatically increments the WhatsApp follow-up / reminder count on send
 */

import React, { useState, useEffect } from 'react';
import {
  MessageCircle, Copy, Check, ExternalLink, X, Landmark,
  Send, FileText, AlertCircle, RefreshCw, Smartphone, ShieldCheck
} from 'lucide-react';
import { ProformaInvoice } from '../../types/proforma';
import { proformaService } from '../../api/proformaService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: ProformaInvoice;
  onSuccess?: (updatedInvoice?: ProformaInvoice) => void;
}

export function WhatsAppLedgerModal({ isOpen, onClose, invoice, onSuccess }: Props) {
  const [recipientPhone, setRecipientPhone] = useState(
    (invoice.customerPhone || '').replace(/\D/g, '').slice(-10)
  );
  const [customNote, setCustomNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ledgerData, setLedgerData] = useState<any>(null);

  const grandTotal = Number(invoice.grandTotal || 0);
  const advanceAmount = Number(invoice.advanceAmount ?? invoice.advancePayable ?? 0);
  const balanceDue = Number(invoice.balanceDue ?? (grandTotal - advanceAmount));
  const advancePercentage = Number(invoice.advancePercentage || 30);

  // Fetch or generate fresh ledger data on modal open
  useEffect(() => {
    if (!isOpen) return;

    setRecipientPhone((invoice.customerPhone || '').replace(/\D/g, '').slice(-10));
    setCustomNote('');
    setCopied(false);

    const loadLedger = async () => {
      try {
        setLoading(true);
        const data = await proformaService.getInvoiceLedger(invoice.id);
        setLedgerData(data);
      } catch (err) {
        console.warn('Could not fetch server ledger, using local generator:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLedger();
  }, [isOpen, invoice.id]);

  if (!isOpen) return null;

  // Build local WhatsApp text preview
  const portalUrl = `https://pacifichardware.com/proforma/${invoice.verificationToken || invoice.id}`;
  const verifyUrl = `https://pacifichardware.com/verify/pi/${invoice.verificationToken || invoice.id}`;
  const bankDetails = (invoice.facility?.bankDetails || (invoice.facility as any)) || {
    bankName: 'HDFC Bank Ltd.',
    accountName: 'Pacific Products and Solutions',
    accountNumber: '50200088991122',
    ifsc: 'HDFC0001234',
    upiId: 'prchardware@hdfcbank',
  };

  const previewMessage = [
    `*COMMERCIAL STATEMENT / PAYMENT REMINDER*`,
    `*PRC Hardware (Pacific Products & Solutions)*`,
    `──────────────────────────────`,
    `Dear *${invoice.customerName}*${invoice.companyName ? ` (${invoice.companyName})` : ''},`,
    ``,
    `Please find below the updated payment ledger for Proforma Invoice *#${invoice.piNumber}*.`,
    ``,
    `📊 *ACCOUNT & ORDER LEDGER:*`,
    `• Total Order Value: *₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*`,
    `• Advance Required/Paid: *₹${advanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${advancePercentage}%)*`,
    `• ⚠️ *REMAINING BALANCE DUE: ₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*`,
    ``,
    `🏦 *BANK REMITTANCE DETAILS (RTGS/NEFT):*`,
    `• Bank: ${bankDetails.bankName || 'HDFC Bank Ltd.'}`,
    `• Account Name: ${bankDetails.accountName || 'Pacific Products and Solutions'}`,
    `• Account Number: ${bankDetails.accountNumber || '50200088991122'}`,
    `• IFSC Code: ${bankDetails.ifsc || bankDetails.ifscCode || 'HDFC0001234'}`,
    `• UPI ID: ${bankDetails.upiId || 'prchardware@hdfcbank'}`,
    ``,
    `📄 *VIEW & DOWNLOAD OFFICIAL SIGNED PDF:*`,
    portalUrl,
    ``,
    `🛡️ *VERIFY AUTHENTICITY (QR SEAL):*`,
    verifyUrl,
    customNote ? `\n💬 *Note:* ${customNote}` : '',
    ``,
    `Kindly share the transaction UTR / bank payment receipt once initiated so we can release the consignment for dispatch.`,
    `──────────────────────────────`,
    `*PRC Hardware Commercial Operations Desk*`,
    `📞 Support: +91 11 2233 4455 | ✉️ billing@pacifichardware.com`
  ].filter(Boolean).join('\n');

  const cleanPhone = recipientPhone.replace(/\D/g, '').slice(-10);
  const targetWhatsappUrl = cleanPhone
    ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(previewMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(previewMessage)}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(previewMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendAndOpen = async () => {
    try {
      setLoading(true);

      // Log WhatsApp Reminder in Backend & increment counter
      const result = await proformaService.sendReminder(invoice.id, {
        channel: 'WHATSAPP',
        recipient: cleanPhone || invoice.customerPhone || '',
        customMessage: customNote || undefined,
        includeBankDetails: true,
        includePortalLink: true,
      });

      // Open WhatsApp Web/App
      window.open(targetWhatsappUrl, '_blank');

      if (onSuccess) {
        onSuccess(result as any);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to log WhatsApp reminder:', err);
      // Still open WhatsApp even if backend audit fails
      window.open(targetWhatsappUrl, '_blank');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A] bg-[#121214]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950/40">
              <MessageCircle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Send WhatsApp Ledger Statement</span>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Follow-up #{Number(invoice.whatsappReminderCount || 0) + 1}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                PI: <span className="font-mono text-zinc-300 font-bold">{invoice.piNumber}</span> • Balance: <span className="font-mono text-amber-400 font-bold">₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#27272A] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">

          {/* Recipient Phone & Custom Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Smartphone size={13} className="text-emerald-400" />
                <span>Recipient WhatsApp Number</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono font-bold">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="w-full pl-12 pr-4 py-2.5 bg-[#27272A]/60 border border-[#3F3F46] focus:border-emerald-500 rounded-xl text-white font-mono font-bold placeholder-zinc-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1.5">
                Optional Message / Remarks from Billing Desk
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Kindly share UTR once remitted"
                className="w-full px-3.5 py-2.5 bg-[#27272A]/60 border border-[#3F3F46] focus:border-emerald-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Quick Balance Breakdown Banner */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#27272A]/40 border border-[#27272A]">
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Total Value</span>
              <span className="text-xs font-mono font-bold text-white">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Advance Required</span>
              <span className="text-xs font-mono font-bold text-emerald-400">₹{advanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({advancePercentage}%)</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-red-400 font-bold uppercase block">Balance Due</span>
              <span className="text-xs font-mono font-extrabold text-red-400">₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Live Pre-formatted WhatsApp Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-emerald-400" />
                <span>Pre-formatted WhatsApp Message Preview</span>
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 bg-[#27272A] px-2.5 py-1 rounded-lg transition-colors font-bold"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] text-zinc-300 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto select-all shadow-inner">
              {previewMessage}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
            <ShieldCheck size={16} className="shrink-0" />
            <span>
              Clicking <strong>Send via WhatsApp</strong> will automatically log Follow-up #{Number(invoice.whatsappReminderCount || 0) + 1} into the audit trail and open WhatsApp Web/App pre-filled with this ledger statement.
            </span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#27272A] bg-[#121214]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-zinc-200 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Copy size={14} /> Copy Message
            </button>

            <button
              type="button"
              onClick={handleSendAndOpen}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Logging Follow-up...
                </>
              ) : (
                <>
                  <MessageCircle size={15} /> Send via WhatsApp
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
