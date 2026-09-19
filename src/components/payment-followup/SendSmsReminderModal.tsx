import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Send,
  AlertTriangle,
  Loader2,
  Phone,
  Sparkles,
} from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';

interface SendSmsReminderModalProps {
  isOpen: boolean;
  customerId: string;
  customerName: string;
  companyName?: string | null;
  phone?: string | null;
  totalOutstanding: number;
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATES = [
  {
    id: 'GENTLE_REMINDER',
    title: 'Gentle Reminder',
    text: 'Dear {{customer_name}}, gentle reminder from PRC Hardware that outstanding balance of INR {{outstanding_amount}} is pending for payment. Kindly arrange remittance to HDFC A/C 50200088991122. Thank you.',
  },
  {
    id: 'OVERDUE_ALERT',
    title: 'Overdue Dues Notice',
    text: 'URGENT: Dues of INR {{outstanding_amount}} with PRC Hardware are past due date. Kindly clear the payment immediately to avoid dispatch holds. Share UTR on 9811223344.',
  },
  {
    id: 'PTP_REMINDER',
    title: 'Promise-To-Pay (PTP) Reminder',
    text: 'Dear {{customer_name}}, this is a reminder regarding your payment commitment of INR {{outstanding_amount}} due today to PRC Hardware. Kindly confirm UTR upon transfer. Thank you.',
  },
  {
    id: 'CUSTOM',
    title: 'Custom Message',
    text: '',
  },
];

export const SendSmsReminderModal: React.FC<SendSmsReminderModalProps> = ({
  isOpen,
  customerId,
  customerName,
  companyName,
  phone: initialPhone,
  totalOutstanding,
  onClose,
  onSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('GENTLE_REMINDER');
  const [messageText, setMessageText] = useState(TEMPLATES[0].text);

  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayName = companyName || customerName;
  const formattedAmount = Math.round(totalOutstanding).toLocaleString('en-IN');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setPhoneNumber(initialPhone?.replace(/\D/g, '') || '');
      setSelectedTemplateId('GENTLE_REMINDER');
      setMessageText(TEMPLATES[0].text);
    }
  }, [isOpen, initialPhone]);

  // Handle template selection
  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = TEMPLATES.find((t) => t.id === tplId);
    if (tpl) {
      setMessageText(tpl.text);
    }
  };

  // Resolved text with variable interpolation
  const resolvedMessage = useMemo(() => {
    return messageText
      .replace(/\{\{customer_name\}\}/g, displayName)
      .replace(/\{\{company_name\}\}/g, companyName || customerName)
      .replace(/\{\{outstanding_amount\}\}/g, formattedAmount);
  }, [messageText, displayName, companyName, customerName, formattedAmount]);

  if (!isOpen) return null;

  const charCount = resolvedMessage.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    if (!resolvedMessage.trim()) {
      setErrorMessage('Message text cannot be empty.');
      return;
    }

    setIsSending(true);
    try {
      const res = await paymentFollowupApi.sendSmsReminder(customerId, {
        phoneNumber: cleanPhone,
        template: resolvedMessage.trim(),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.data?.message || 'Failed to dispatch SMS reminder.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while dispatching SMS reminder.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Send SMS Payment Reminder
              </h2>
              <p className="text-xs text-zinc-400">
                Dispatches a high-priority payment recovery SMS notice
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
              Recipient Phone Number <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                +91
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-11 pr-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Template pills */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Preset Templates</label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTemplate(t.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTemplateId === t.id
                      ? 'bg-purple-600 text-white font-bold shadow'
                      : 'bg-[#09090B] text-zinc-400 hover:text-white border border-[#27272A]'
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-zinc-300">
                SMS Content / Template Text
              </label>
              <div className="text-[11px] text-zinc-400 font-mono">
                {charCount} chars • {smsSegments} segment(s)
              </div>
            </div>
            <textarea
              rows={4}
              required
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-1.5">
            <div className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={13} />
              <span>Recipient Live Preview (Variables Replaced)</span>
            </div>
            <div className="p-3 rounded-lg bg-black/60 border border-purple-900/40 text-xs text-zinc-200 font-mono leading-relaxed">
              {resolvedMessage || <span className="text-zinc-500 italic">Message is empty...</span>}
            </div>
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
                  <span>Dispatching SMS...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Send SMS Reminder</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
