import React, { useState, useEffect } from 'react';
import {
  X,
  PhoneCall,
  MessageCircle,
  Mail,
  FileText,
  Clock,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Phone,
  UserCheck,
} from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import type { LogFollowupInput } from '../../types/paymentFollowup';

interface LogFollowupModalProps {
  isOpen: boolean;
  customerId: string;
  customerName: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  outstandingAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const LogFollowupModal: React.FC<LogFollowupModalProps> = ({
  isOpen,
  customerId,
  customerName,
  companyName,
  phone,
  email,
  outstandingAmount,
  onClose,
  onSuccess,
}) => {
  const [channel, setChannel] = useState<'PHONE' | 'WHATSAPP' | 'EMAIL' | 'SMS' | 'IN_PERSON' | 'NOTE'>('PHONE');
  const [outcome, setOutcome] = useState<
    | 'PAYMENT_PROMISED'
    | 'PAYMENT_MADE'
    | 'DISPUTE_RAISED'
    | 'CALL_NOT_ANSWERED'
    | 'BUSY_CALL_LATER'
    | 'WRONG_NUMBER'
    | 'PROMISE_BROKEN'
    | 'GENERAL_FOLLOWUP'
  >('GENERAL_FOLLOWUP');

  const [notes, setNotes] = useState('');
  const [ptpDate, setPtpDate] = useState('');
  const [ptpAmount, setPtpAmount] = useState<number | ''>(outstandingAmount || '');
  const [nextActionDate, setNextActionDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setChannel('PHONE');
      setOutcome('GENERAL_FOLLOWUP');
      setNotes('');
      setPtpDate('');
      setPtpAmount(outstandingAmount || '');
      setNextActionDate('');
      setErrorMessage(null);
    }
  }, [isOpen, outstandingAmount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!notes.trim()) {
      setErrorMessage('Please enter discussion notes or follow-up summary.');
      return;
    }

    if (outcome === 'PAYMENT_PROMISED') {
      if (!ptpDate) {
        setErrorMessage('Please specify the Promise-to-Pay (PTP) Date.');
        return;
      }
      if (ptpAmount === '' || Number(ptpAmount) <= 0) {
        setErrorMessage('Please specify a valid promised payment amount.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const channelMap: Record<string, import('../../types/paymentFollowup').FollowupChannel> = {
        PHONE: 'CALL',
        WHATSAPP: 'CALL',
        EMAIL: 'EMAIL',
        SMS: 'SMS',
        IN_PERSON: 'IN_PERSON',
        NOTE: 'NOTE',
      };

      const outcomeMap: Record<string, import('../../types/paymentFollowup').FollowupOutcome> = {
        PAYMENT_PROMISED: 'PAYMENT_PROMISED',
        PAYMENT_MADE: 'PAYMENT_RECEIVED',
        DISPUTE_RAISED: 'DISPUTED',
        CALL_NOT_ANSWERED: 'NO_ANSWER',
        BUSY_CALL_LATER: 'CALL_BACK_LATER',
        WRONG_NUMBER: 'WRONG_NUMBER',
        PROMISE_BROKEN: 'OTHER',
        GENERAL_FOLLOWUP: 'CALL_MADE',
      };

      const payload: LogFollowupInput = {
        channel: channelMap[channel] || 'CALL',
        outcome: outcomeMap[outcome] || 'CALL_MADE',
        notes: notes.trim(),
        ptpDate: outcome === 'PAYMENT_PROMISED' ? ptpDate : undefined,
        ptpAmount: outcome === 'PAYMENT_PROMISED' && ptpAmount !== '' ? Number(ptpAmount) : undefined,
        nextActionDate: nextActionDate || undefined,
      };

      const res = await paymentFollowupApi.logFollowupTouchpoint(customerId, payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.data?.message || 'Failed to log follow-up touchpoint.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while logging follow-up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanPhone = phone?.replace(/\D/g, '') || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <PhoneCall size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Log Follow-up Touchpoint
              </h2>
              <p className="text-xs text-zinc-400">
                {companyName || customerName} • Outstanding:{' '}
                <span className="font-mono font-bold text-rose-400">
                  ₹{outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
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

        {/* Quick Call Button Banner (Mobile / Desktop) */}
        {cleanPhone && (
          <div className="px-5 py-2.5 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Phone size={13} className="text-emerald-400" />
              <span>Ph: +91 {cleanPhone}</span>
            </span>
            <div className="flex items-center gap-2">
              <a
                href={`tel:+91${cleanPhone}`}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5"
              >
                <PhoneCall size={12} />
                <span>Call Now</span>
              </a>
              <a
                href={`https://wa.me/91${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 hover:bg-emerald-600/30 text-[11px] font-bold flex items-center gap-1.5"
              >
                <MessageCircle size={12} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-950/50 border-b border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Channel selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Channel Used</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-[#09090B] rounded-xl border border-[#27272A]">
              {(['PHONE', 'WHATSAPP', 'EMAIL', 'SMS', 'IN_PERSON', 'NOTE'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannel(ch)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                    channel === ch
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {ch === 'PHONE'
                    ? 'Call'
                    : ch === 'WHATSAPP'
                    ? 'WhatsApp'
                    : ch === 'EMAIL'
                    ? 'Email'
                    : ch === 'SMS'
                    ? 'SMS'
                    : ch === 'IN_PERSON'
                    ? 'In Person'
                    : 'Internal Note'}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Follow-up Outcome</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
            >
              <option value="GENERAL_FOLLOWUP">Standard Follow-up / Routine Reminder</option>
              <option value="PAYMENT_PROMISED">Promise To Pay (PTP) Received</option>
              <option value="PAYMENT_MADE">Payment Already Dispatched / UTR Awaited</option>
              <option value="CALL_NOT_ANSWERED">Call Not Answered / Switched Off</option>
              <option value="BUSY_CALL_LATER">Customer Busy — Asked to Call Back</option>
              <option value="DISPUTE_RAISED">Dispute Raised (Rate / Material / Invoicing)</option>
              <option value="PROMISE_BROKEN">Broken Promise — Previous PTP Not Honored</option>
              <option value="WRONG_NUMBER">Incorrect / Changed Contact Number</option>
            </select>
          </div>

          {/* If PTP Selected: PTP Fields */}
          {outcome === 'PAYMENT_PROMISED' && (
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/50 space-y-3">
              <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <UserCheck size={14} />
                <span>Promise-To-Pay (PTP) Commitment Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Promised Payment Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={ptpDate}
                    onChange={(e) => setPtpDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Promised Amount (₹) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={ptpAmount}
                      onChange={(e) =>
                        setPtpAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className="w-full pl-6 pr-3 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Next Action Date */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Next Action / Scheduled Follow-up Date (Optional)
            </label>
            <input
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Notes / Remarks */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Follow-up Remarks / Conversation Summary <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Spoke to accounts manager Mr. Sharma; promised RTGS transfer for ₹45,000 by Wednesday afternoon."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272A]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Log Follow-up Touchpoint</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
