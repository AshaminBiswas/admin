import React, { useState } from 'react';
import {
  Mail,
  Send,
  X,
  FileText,
  AlertCircle,
  Paperclip,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import { purchaseOrderApi } from '../../api/purchaseOrderApi';
import { COMPANY_PROFILES } from '../../utils/purchaseOrderPdfGenerator';

export interface SendPoEmailModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export const SendPoEmailModal: React.FC<SendPoEmailModalProps> = ({
  po,
  onClose,
  onSuccess,
}) => {
  const entityKey = (po.companyEntity || 'PACIFIC_PRODUCTS').toUpperCase();
  const profile = COMPANY_PROFILES[entityKey] || COMPANY_PROFILES.PACIFIC_PRODUCTS;
  const fullPoNo = po.revision > 0 ? `${po.poNumber}-R${po.revision}` : po.poNumber;

  const [recipientEmail, setRecipientEmail] = useState<string>(
    po.supplier?.email || ''
  );
  const [ccEmail, setCcEmail] = useState<string>(
    po.sentCc || profile.email
  );
  const [subject, setSubject] = useState<string>(
    `Purchase Order ${fullPoNo} — ${profile.name}`
  );
  const [customMessage, setCustomMessage] = useState<string>(
    `Please find attached our official Purchase Order #${fullPoNo} for the supply of hardware to our ${po.branch?.name || 'Delhi HQ'} Depot. Kindly review the attached specifications and confirm the delivery schedule.`
  );

  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientEmail.trim()) {
      setError('Please provide a valid supplier recipient email address.');
      return;
    }

    if (!po.items || po.items.length === 0) {
      setError('Cannot dispatch a Purchase Order with zero line items.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await purchaseOrderApi.sendPurchaseOrderEmail(po.id, {
        recipientEmail: recipientEmail.trim(),
        cc: ccEmail.trim() || undefined,
        subject: subject.trim(),
        customMessage: customMessage.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || 'Failed to dispatch email.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred while dispatching email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#18181B] border border-zinc-700 w-full max-w-xl rounded-2xl shadow-2xl text-white overflow-hidden my-auto flex flex-col animate-fadeIn">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 bg-[#09090B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <Mail size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                {po.status === 'DRAFT' ? 'Send Purchase Order' : 'Resend Purchase Order'} ({fullPoNo})
              </h2>
              <p className="text-[11px] text-zinc-400">
                Email will be sent to the supplier with the black & white PDF attached
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSend} className="p-4 sm:p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier Info Summary */}
          <div className="p-2.5 rounded-xl bg-[#09090B] border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">{po.supplier?.name}</div>
              <div className="text-[10px] text-zinc-400">
                Destination Depot: {po.branch?.name} ({po.branch?.city || 'Delhi'})
              </div>
            </div>
            <div className="text-right font-mono text-emerald-400 font-bold">
              ₹{Number(po.grandTotal).toLocaleString('en-IN')}
            </div>
          </div>

          {/* To Email */}
          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-1">
              Supplier Recipient Email <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. sales@supplierfirm.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none focus:border-indigo-500"
            />
          </div>

          {/* CC Email */}
          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-1">
              CC (Internal Purchasing Team)
            </label>
            <input
              type="text"
              placeholder="e.g. purchase@prchardware.com, accounts@prchardware.com"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Subject Line */}
          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-1">
              Email Subject Line <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Body Message */}
          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-1">
              Custom Message to Supplier
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none focus:border-indigo-500"
            />
          </div>

          {/* PDF Attachment Pill */}
          <div className="p-3 bg-[#09090B] rounded-xl border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-300">
              <Paperclip size={14} className="text-indigo-400" />
              <span className="font-mono text-xs">{fullPoNo}.pdf</span>
              <span className="text-[10px] text-zinc-500">(Pure B&W Print Ready)</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Auto Attached
            </span>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 disabled:opacity-50"
            >
              <Send size={13} />
              <span>{sending ? 'Dispatching...' : 'Send Purchase Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
