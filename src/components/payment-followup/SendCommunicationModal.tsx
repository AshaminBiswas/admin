import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  MessageSquare,
  FileText,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Phone,
} from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import type { CustomerDuesDetail, SelectableDocumentItem } from '../../types/paymentFollowup';

interface SendCommunicationModalProps {
  isOpen: boolean;
  customerId: string | null;
  duesDetail: CustomerDuesDetail | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SendCommunicationModal: React.FC<SendCommunicationModalProps> = ({
  isOpen,
  customerId,
  duesDetail,
  onClose,
  onSuccess,
}) => {
  const [selectedChannels, setSelectedChannels] = useState<Array<'EMAIL' | 'WHATSAPP' | 'SMS'>>(['EMAIL']);
  const [attachLedgerPdf, setAttachLedgerPdf] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    whatsappUrl?: string;
    message?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const customer = duesDetail?.customer;
  const summary = duesDetail?.summary;
  const selectableDocs = duesDetail?.selectableDocuments;

  // Flatten available selectable documents
  const allDocs: SelectableDocumentItem[] = [
    ...(selectableDocs?.proformas || []),
    ...(selectableDocs?.purchaseOrders || []),
    ...(selectableDocs?.quotations || []),
    ...(selectableDocs?.invoices || []),
  ];

  useEffect(() => {
    if (isOpen && duesDetail) {
      const custName = customer?.name || customer?.companyName || 'Valued Client';
      const outAmt = Math.round(summary?.totalOutstanding || 0).toLocaleString('en-IN');

      setEmailSubject(`Outstanding Commercial Statement — ${custName} [₹${outAmt}]`);
      setEmailBody(
        `Dear ${custName},\n\nWe hope this email finds you well.\n\nPlease find attached your updated Statement of Account regarding the pending balance of ₹${outAmt} with Pacific Products & Solutions (PRC Hardware).\n\nKindly arrange for the remittance at your earliest convenience and provide the bank UTR / payment reference for immediate ledger reconciliation.\n\nBank Account Details:\nBank: HDFC Bank Ltd.\nAccount Name: Pacific Products and Solutions\nA/C No: 50200088991122\nIFSC Code: HDFC0001234\nUPI: prchardware@hdfcbank\n\nIf you have any questions or require bill clarifications, feel free to reply to this email.\n\nWarm regards,\nCommercial Accounts Desk\nPacific Products & Solutions`
      );

      setWhatsappMessage(
        `Hello ${custName},\n\nThis is a friendly reminder from *PRC Hardware (Pacific Products & Solutions)* regarding your account.\n\n*Total Outstanding Balance:* ₹${outAmt}\n\n*Bank Details for NEFT / RTGS / UPI:*\n• Bank: HDFC Bank Ltd.\n• A/C No: 50200088991122\n• IFSC: HDFC0001234\n• UPI: prchardware@hdfcbank\n\nPlease find your Statement of Account attached. Kindly share the transfer receipt / UTR once processed. Thank you!`
      );

      setSmsMessage(
        `Dear ${custName}, your outstanding payment of ₹${outAmt} is pending with PRC Hardware. Please arrange payment at the earliest. — Pacific Products & Solutions`
      );

      setSelectedChannels(customer?.email ? ['EMAIL'] : customer?.phone ? ['WHATSAPP'] : []);
      setAttachLedgerPdf(true);
      setSelectedDocIds([]);
      setError(null);
      setSuccessInfo(null);
    }
  }, [isOpen, duesDetail]);

  if (!isOpen || !customerId || !duesDetail) return null;

  const toggleChannel = (channel: 'EMAIL' | 'WHATSAPP' | 'SMS') => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedChannels.length === 0) {
      setError('Please select at least one communication channel (Email, WhatsApp, or SMS).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Build typed selectedDocumentIds objects
      const selectedDocumentItems = allDocs
        .filter((d) => selectedDocIds.includes(d.id))
        .map((d) => ({
          type: d.type,
          id: d.id,
          documentNumber: d.documentNumber,
        }));

      const res = await paymentFollowupApi.sendCustomerCommunication(customerId, {
        channels: selectedChannels,
        emailSubject: selectedChannels.includes('EMAIL') ? emailSubject : undefined,
        emailBody: selectedChannels.includes('EMAIL') ? emailBody : undefined,
        smsMessage: selectedChannels.includes('SMS') ? smsMessage : undefined,
        whatsappMessage: selectedChannels.includes('WHATSAPP') ? whatsappMessage : undefined,
        attachLedgerPdf,
        selectedDocumentIds: selectedDocumentItems,
      });

      if (res.success) {
        setSuccessInfo({
          whatsappUrl: res.data.whatsappUrl,
          message: res.data.message || 'Communication dispatched successfully.',
        });
        if (onSuccess) onSuccess();
        if (!res.data.whatsappUrl) {
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
        setError('Failed to send communication.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred while dispatching communication.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyWhatsAppText = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Send size={18} className="text-purple-400" />
              <span>Multi-Channel Communication & Attachments</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Client: <span className="text-zinc-200 font-semibold">{customer?.companyName || customer?.name}</span> • Outstanding:{' '}
              <span className="text-rose-400 font-bold font-mono">
                ₹{Math.round(summary?.totalOutstanding || 0).toLocaleString('en-IN')}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Modal View with WhatsApp Web Link */}
        {successInfo ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Send size={24} />
            </div>
            <h4 className="text-base font-bold text-white">Communication Prepared Successfully</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">{successInfo.message}</p>

            {successInfo.whatsappUrl && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <MessageSquare size={14} /> WhatsApp Link Ready
                  </span>
                  <button
                    type="button"
                    onClick={copyWhatsAppText}
                    className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy Message'}</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-300 font-mono bg-[#09090B] p-2.5 rounded-lg whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {whatsappMessage}
                </p>
                <a
                  href={successInfo.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-2"
                >
                  <span>Open WhatsApp Web / Chat</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}

            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Channel Selectors */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wide">
                1. Select Dispatch Channels
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Email Option */}
                <button
                  type="button"
                  onClick={() => toggleChannel('EMAIL')}
                  disabled={!customer?.email}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    selectedChannels.includes('EMAIL')
                      ? 'bg-purple-500/15 border-purple-500/50 text-white ring-1 ring-purple-500/30'
                      : !customer?.email
                      ? 'bg-[#18181B]/50 border-[#27272A] opacity-50 cursor-not-allowed text-zinc-500'
                      : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Mail size={16} className={selectedChannels.includes('EMAIL') ? 'text-purple-400' : 'text-zinc-500'} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Official Email</span>
                      {selectedChannels.includes('EMAIL') && <span className="text-[10px] text-purple-400 font-bold">✓</span>}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {customer?.email || 'No email registered'}
                    </div>
                  </div>
                </button>

                {/* WhatsApp Option */}
                <button
                  type="button"
                  onClick={() => toggleChannel('WHATSAPP')}
                  disabled={!customer?.phone}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    selectedChannels.includes('WHATSAPP')
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-white ring-1 ring-emerald-500/30'
                      : !customer?.phone
                      ? 'bg-[#18181B]/50 border-[#27272A] opacity-50 cursor-not-allowed text-zinc-500'
                      : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <MessageSquare size={16} className={selectedChannels.includes('WHATSAPP') ? 'text-emerald-400' : 'text-zinc-500'} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>WhatsApp</span>
                      {selectedChannels.includes('WHATSAPP') && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5 font-mono">
                      {customer?.phone ? `+91 ${customer.phone}` : 'No phone registered'}
                    </div>
                  </div>
                </button>

                {/* SMS Option */}
                <button
                  type="button"
                  onClick={() => toggleChannel('SMS')}
                  disabled={!customer?.phone}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    selectedChannels.includes('SMS')
                      ? 'bg-blue-500/15 border-blue-500/50 text-white ring-1 ring-blue-500/30'
                      : !customer?.phone
                      ? 'bg-[#18181B]/50 border-[#27272A] opacity-50 cursor-not-allowed text-zinc-500'
                      : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Phone size={16} className={selectedChannels.includes('SMS') ? 'text-blue-400' : 'text-zinc-500'} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>SMS Alert</span>
                      {selectedChannels.includes('SMS') && <span className="text-[10px] text-blue-400 font-bold">✓</span>}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5 font-mono">
                      {customer?.phone ? `+91 ${customer.phone}` : 'No phone registered'}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Dynamic Document Attachments & Links */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wide">
                2. Dynamic Documents to Attach / Link
              </label>

              <div className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
                {/* Statement of Account / Ledger PDF */}
                <label className="flex items-center gap-3 p-2 rounded-lg bg-[#09090B] border border-[#27272A] cursor-pointer hover:border-purple-500/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={attachLedgerPdf}
                    onChange={(e) => setAttachLedgerPdf(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <FileText size={13} className="text-purple-400" />
                      <span>Official Statement of Account (Vector Monochrome PDF)</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">
                        Auto-Compiled
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Includes complete transaction ledger, running balances, GST & bank particulars
                    </div>
                  </div>
                </label>

                {/* Additional commercial docs (PI, PO, Quotation, Invoices) */}
                {allDocs.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-zinc-400">
                      Attach Related Commercial Documents ({allDocs.length} available):
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {allDocs.map((doc) => {
                        const isSelected = selectedDocIds.includes(doc.id);
                        return (
                          <div
                            key={doc.id}
                            onClick={() => toggleDoc(doc.id)}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-purple-950/30 border-purple-500/50 text-white'
                                : 'bg-[#09090B] border-[#27272A] text-zinc-300 hover:border-zinc-600'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {isSelected ? (
                                <CheckSquare size={14} className="text-purple-400 shrink-0" />
                              ) : (
                                <Square size={14} className="text-zinc-600 shrink-0" />
                              )}
                              <div>
                                <span className="font-bold text-zinc-200">{doc.documentNumber}</span>
                                <span className="text-[10px] text-zinc-500 ml-2">
                                  ({doc.type.replace('_', ' ')}) • {new Date(doc.date).toLocaleDateString('en-IN')}
                                </span>
                              </div>
                            </div>
                            <div className="font-mono text-zinc-300">
                              ₹{Math.round(doc.amount || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic">No additional commercial documents found for this customer.</p>
                )}
              </div>
            </div>

            {/* 3. Message Content Previews */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wide">
                3. Customize Message Content
              </label>

              {/* Email Content Preview */}
              {selectedChannels.includes('EMAIL') && (
                <div className="space-y-2 p-3.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Mail size={13} /> Email Particulars
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Body Text</label>
                    <textarea
                      rows={4}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#09090B] border border-[#27272A] text-white text-xs font-mono focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* WhatsApp Content Preview */}
              {selectedChannels.includes('WHATSAPP') && (
                <div className="space-y-2 p-3.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <MessageSquare size={13} /> WhatsApp Text
                  </div>
                  <textarea
                    rows={4}
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#09090B] border border-[#27272A] text-white text-xs font-mono focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              )}

              {/* SMS Content Preview */}
              {selectedChannels.includes('SMS') && (
                <div className="space-y-2 p-3.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                  <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <Phone size={13} /> SMS Message
                  </div>
                  <textarea
                    rows={2}
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#09090B] border border-[#27272A] text-white text-xs font-mono focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-[#18181B] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || selectedChannels.length === 0}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>Send Communication & Attachments</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
