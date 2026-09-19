import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  FileText,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Paperclip,
  Send,
  Building2,
} from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import { printStatementOfAccount } from '../../utils/customerLedgerPdfGenerator';
import type { CustomerDuesDetail } from '../../types/paymentFollowup';

interface SendLedgerModalProps {
  isOpen: boolean;
  customerId: string;
  customerName: string;
  companyName?: string | null;
  email?: string | null;
  totalOutstanding: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const SendLedgerModal: React.FC<SendLedgerModalProps> = ({
  isOpen,
  customerId,
  customerName,
  companyName,
  email: initialEmail,
  totalOutstanding,
  onClose,
  onSuccess,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [customerDetail, setCustomerDetail] = useState<CustomerDuesDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedOutstanding = `₹${totalOutstanding.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  })}`;
  const displayName = companyName || customerName;

  useEffect(() => {
    if (!isOpen || !customerId) return;

    setErrorMessage(null);
    const defaultEmail = initialEmail?.includes('@internal.prc') ? '' : initialEmail || '';
    setRecipientEmail(defaultEmail);

    setSubject(
      `Statement of Account — ${displayName} [Outstanding Balance: ${formattedOutstanding}] | PRC Hardware`
    );

    setBody(
`Dear ${displayName},

Greetings from PRC Hardware Commercial Accounts Desk.

Please find attached your updated Statement of Account reflecting an outstanding balance of ${formattedOutstanding}.

We kindly request you to review the itemized ledger and arrange for the remittance via RTGS/NEFT/UPI to our official bank account:

• Bank Name: HDFC Bank Ltd.
• Account Name: Pacific Products and Solutions
• Current Account No: 50200088991122
• IFSC Code: HDFC0001234 (Mandoli Branch, Delhi)
• UPI ID: prchardware@hdfcbank

Kindly share the transaction UTR number or remittance receipt upon transfer for immediate credit.

Thank you for your business.

Warm regards,
Commercial Accounts Desk
PRC Hardware | Pacific Products & Solutions
www.prchardware.com`
    );

    // Fetch detail for PDF print preview
    setLoadingDetail(true);
    paymentFollowupApi
      .getCustomerDuesDetail(customerId)
      .then((res) => {
        if (res.success && res.data) {
          setCustomerDetail(res.data);
          if (!defaultEmail && res.data.customer?.email && !res.data.customer.email.includes('@internal.prc')) {
            setRecipientEmail(res.data.customer.email);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load customer dues detail:', err);
      })
      .finally(() => {
        setLoadingDetail(false);
      });
  }, [isOpen, customerId, displayName, formattedOutstanding, initialEmail]);

  if (!isOpen) return null;

  const handlePreviewPdf = () => {
    if (!customerDetail) {
      alert('Customer ledger data is still loading. Please try in a moment.');
      return;
    }
    printStatementOfAccount(customerDetail);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetEmail = recipientEmail.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMessage('Please provide a valid recipient email address.');
      return;
    }

    setIsSending(true);
    try {
      const res = await paymentFollowupApi.sendLedgerEmail(customerId, {
        recipientEmail: targetEmail,
        subject: subject.trim(),
        body: body.trim(),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.data?.message || 'Failed to dispatch ledger statement.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while dispatching statement.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Send Statement of Account (Email)
              </h2>
              <p className="text-xs text-zinc-400">
                Dispatches a vector B&W Statement of Account PDF via Resend
              </p>
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

        {/* Error Banner */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-950/50 border-b border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Recipient Email Address <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. accounts@clientfirm.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Email Subject Line <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Message Body / Cover Note
            </label>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
            />
          </div>

          {/* Attachment Preview Card */}
          <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#18181B] text-zinc-400 border border-[#27272A]">
                <Paperclip size={16} />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Statement_of_Account_{displayName.replace(/\s+/g, '_')}.pdf</div>
                <div className="text-[10px] text-zinc-500">Vector Pure Black & White • PI/PO layout standard</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePreviewPdf}
              disabled={loadingDetail || !customerDetail}
              className="px-3 py-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-purple-300 border border-purple-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              {loadingDetail ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Printer size={12} />
              )}
              <span>Preview / Print</span>
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272A]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Dispatching Email...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Send Statement via Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
