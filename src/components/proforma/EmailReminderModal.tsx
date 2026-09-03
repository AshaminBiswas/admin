/**
 * EmailReminderModal.tsx
 *
 * Commercial Email Reminder Modal for Proforma Invoices.
 * Dispatches an executive payment follow-up email with:
 * - Outstanding balance due banner
 * - Commercial Ledger breakdown table
 * - Official Bank Remittance details (RTGS/NEFT/IMPS/UPI)
 * - Auto-attached official Black & White PDF copy of the Proforma Invoice
 * - Increments the Email Reminder / Follow-up counter in the database
 */

import React, { useState, useEffect } from 'react';
import {
  Mail, Send, X, RefreshCw, Paperclip, CheckCircle2,
  AlertCircle, Building2, Landmark, FileText, ShieldCheck
} from 'lucide-react';
import { ProformaInvoice } from '../../types/proforma';
import { proformaService } from '../../api/proformaService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: ProformaInvoice;
  onSuccess?: (updatedInvoice?: ProformaInvoice) => void;
}

export function EmailReminderModal({ isOpen, onClose, invoice, onSuccess }: Props) {
  const [recipientEmail, setRecipientEmail] = useState(invoice.customerEmail || '');
  const [ccEmails, setCcEmails] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const grandTotal = Number(invoice.grandTotal || 0);
  const advanceAmount = Number(invoice.advanceAmount ?? invoice.advancePayable ?? 0);
  const balanceDue = Number(invoice.balanceDue ?? (grandTotal - advanceAmount));
  const advancePercentage = Number(invoice.advancePercentage || 30);

  useEffect(() => {
    if (!isOpen) return;
    setRecipientEmail(invoice.customerEmail || '');
    setCcEmails('');
    setCustomMessage('');
    setError('');
    setSuccessMsg('');
  }, [isOpen, invoice]);

  if (!isOpen) return null;

  const subjectPreview = `Payment Reminder & Account Ledger: Proforma Invoice #${invoice.piNumber} (Balance Due: ₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`;

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      setError('Please provide a valid recipient email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const ccList = ccEmails
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.includes('@'));

      const result = await proformaService.sendReminder(invoice.id, {
        channel: 'EMAIL',
        recipient: recipientEmail.trim(),
        cc: ccList.length > 0 ? ccList : undefined,
        customMessage: customMessage.trim() || undefined,
        subject: subjectPreview,
        includeBankDetails: true,
        includePortalLink: true,
      });

      setSuccessMsg(`Payment reminder email with PDF ledger dispatched successfully to ${recipientEmail}!`);
      
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result as any);
        }
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Email reminder error:', err);
      setError(err?.message || 'Failed to dispatch email reminder. Please check mail settings.');
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
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-950/40">
              <Mail size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Send Email Payment Reminder & Ledger</span>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Follow-up #{Number(invoice.emailReminderCount || 0) + 1}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                PI: <span className="font-mono text-zinc-300 font-bold">{invoice.piNumber}</span> • Customer: <span className="text-white font-bold">{invoice.customerName}</span>
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

        {/* Modal Form */}
        <form onSubmit={handleSendEmail} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">

            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2 font-bold">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 font-bold animate-in fade-in">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Recipient Email & CC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1.5">
                  Recipient Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="billing@customer.com"
                  className="w-full px-3.5 py-2.5 bg-[#27272A]/60 border border-[#3F3F46] focus:border-purple-500 rounded-xl text-white font-mono placeholder-zinc-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1.5">
                  CC Emails (Comma-separated)
                </label>
                <input
                  type="text"
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  placeholder="accounts@customer.com, director@prc.com"
                  className="w-full px-3.5 py-2.5 bg-[#27272A]/60 border border-[#3F3F46] focus:border-purple-500 rounded-xl text-white font-mono placeholder-zinc-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Subject Line Preview */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Email Subject Line
              </label>
              <div className="px-3.5 py-2 bg-[#121214] border border-[#27272A] rounded-xl text-zinc-300 font-mono text-[11px] select-all">
                {subjectPreview}
              </div>
            </div>

            {/* Custom Notes / Message */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1.5">
                Optional Message from Commercial Billing Desk
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="e.g. As per discussion, kindly clear the remaining balance today to ensure dispatch on Monday."
                className="w-full px-3.5 py-2.5 bg-[#27272A]/60 border border-[#3F3F46] focus:border-purple-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none transition-all resize-none"
              />
            </div>

            {/* Commercial Balance Card & Attachment Pill */}
            <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-2.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Attached Statement Summary
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  <Paperclip size={11} /> Auto-Attached: Proforma-Invoice-{invoice.piNumber.replace(/[\/\\]/g, '-')}.pdf
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-[#18181B] border border-[#27272A]">
                  <span className="text-[9.5px] text-zinc-400 font-bold block">Gross Value</span>
                  <span className="text-xs font-mono font-bold text-white">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#18181B] border border-[#27272A]">
                  <span className="text-[9.5px] text-zinc-400 font-bold block">Advance ({advancePercentage}%)</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">₹{advanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                  <span className="text-[9.5px] text-red-400 font-bold block">Balance Due</span>
                  <span className="text-xs font-mono font-extrabold text-red-400">₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px]">
              <ShieldCheck size={16} className="shrink-0 text-purple-400" />
              <span>
                Dispatches a branded HTML email containing the remaining balance ledger statement, bank payment remittance instructions, and the official signed PDF Proforma Invoice.
              </span>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#27272A] bg-[#121214]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-950/40 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Generating PDF & Sending...
                </>
              ) : (
                <>
                  <Send size={14} /> Dispatch Official Reminder Email
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
