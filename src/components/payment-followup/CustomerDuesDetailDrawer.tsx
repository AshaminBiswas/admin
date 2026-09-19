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
} from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import { printStatementOfAccount } from '../../utils/customerLedgerPdfGenerator';
import type { CustomerDuesDetail, TraceableDueItem } from '../../types/paymentFollowup';

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
  const [activeTab, setActiveTab] = useState<'DUES' | 'ALLOCATIONS' | 'TIMELINE' | 'LOGS'>('DUES');
  const [resuming, setResuming] = useState(false);

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

  useEffect(() => {
    if (isOpen && customerId) {
      setActiveTab('DUES');
      fetchDetail();
    } else {
      setDetail(null);
    }
  }, [isOpen, customerId]);

  if (!isOpen || !customerId) return null;

  const customer = detail?.customer;
  const summary = detail?.summary;

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

  const cleanPhone = customer?.phone?.replace(/\D/g, '') || '';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-3xl h-full bg-[#121214] border-l border-[#27272A] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272A] bg-[#18181B] flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-lg font-bold text-white truncate">
                {customer?.companyName || customer?.name || 'Customer Profile'}
              </h2>
              {customer?.source === 'OLD_CUSTOMER' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Legacy Account
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
              <div className="text-xs text-zinc-400 mt-0.5">Contact: {customer.name}</div>
            )}

            <div className="flex items-center flex-wrap gap-4 mt-2 text-xs text-zinc-400">
              {cleanPhone && (
                <a
                  href={`tel:+91${cleanPhone}`}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Phone size={12} className="text-emerald-400" />
                  <span className="font-mono">+91 {cleanPhone}</span>
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
                <span className="font-mono text-[11px] text-zinc-500">GST: {customer.gstin}</span>
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
              <span>Resume Active Follow-up</span>
            </button>
          </div>
        )}

        {/* Quick Operational Action Toolbar */}
        <div className="px-5 py-2.5 bg-[#09090B] border-b border-[#27272A] flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onRecordPayment(customerId, summary?.totalOutstanding || 0)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
          >
            <CreditCard size={13} />
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            onClick={() => onLogFollowup(customerId, summary?.totalOutstanding || 0)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
          >
            <PhoneCall size={13} />
            <span>Log Touchpoint</span>
          </button>

          <button
            type="button"
            onClick={() => onSendLedger(customerId, summary?.totalOutstanding || 0)}
            className="px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-zinc-300 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Mail size={13} />
            <span>Send Statement (Email)</span>
          </button>

          <button
            type="button"
            onClick={() => onSendSms(customerId, summary?.totalOutstanding || 0)}
            className="px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-zinc-300 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <MessageSquare size={13} />
            <span>Send SMS</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-purple-500/30 text-purple-300 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Printer size={13} />
            <span>Print Ledger</span>
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

        {/* Financial KPI Deck */}
        {(() => {
          const totalInvoiced = (detail?.dues || []).reduce((sum, d) => sum + Number(d.totalAmount || 0), 0);
          const totalPaid = (detail?.dues || []).reduce((sum, d) => sum + Number(d.paidAmount || 0), 0);
          return (
            <div className="p-4 sm:p-5 bg-[#121214] border-b border-[#27272A] grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A]">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Invoiced</div>
                <div className="text-sm sm:text-base font-bold font-mono text-zinc-200 mt-0.5">
                  ₹{Math.round(totalInvoiced).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A]">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Collected</div>
                <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-0.5">
                  ₹{Math.round(totalPaid).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#09090B] border border-rose-500/30">
                <div className="text-[10px] text-zinc-400 uppercase font-bold">Total Outstanding</div>
                <div className="text-sm sm:text-base font-bold font-mono text-rose-400 mt-0.5">
                  ₹{Math.round(summary?.totalOutstanding || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A]">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Oldest Due Aging</div>
                <div className="text-sm sm:text-base font-bold font-mono text-amber-400 mt-0.5">
                  {summary?.maxDaysOverdue || 0} days
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tab Navigation */}
        <div className="px-5 border-b border-[#27272A] bg-[#18181B] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('DUES')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'DUES'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Receipt size={13} />
            <span>Traceable Dues ({detail?.dues?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALLOCATIONS')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ALLOCATIONS'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CreditCard size={13} />
            <span>Payment History ({detail?.paymentAllocations?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TIMELINE')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'TIMELINE'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History size={13} />
            <span>Follow-up Timeline ({detail?.followupHistory?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOGS')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'LOGS'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Send size={13} />
            <span>Communication Logs</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-xs text-zinc-500 gap-2">
              <Loader2 size={20} className="animate-spin text-purple-500" />
              <span>Loading customer 360 dues ledger...</span>
            </div>
          ) : activeTab === 'DUES' ? (
            /* TAB 1: TRACEABLE DUES */
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
            /* TAB 2: PAYMENT ALLOCATIONS */
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
          ) : activeTab === 'TIMELINE' ? (
            /* TAB 3: TIMELINE / TOUCHPOINTS */
            <div className="space-y-3">
              {(detail?.followupHistory || []).length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No interaction touchpoints or notes recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {detail?.followupHistory.map((e) => (
                    <div
                      key={e.id}
                      className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xs space-y-1.5"
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

                      <div className="text-zinc-300 leading-relaxed">{e.notes}</div>

                      {e.ptpDate && (
                        <div className="pt-1 text-[11px] text-purple-300 flex items-center gap-2">
                          <Clock size={12} />
                          <span>
                            PTP Commitment: ₹{Number(e.ptpAmount || 0).toLocaleString('en-IN')} due on{' '}
                            {new Date(e.ptpDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TAB 4: COMMUNICATION LOGS */
            <div className="space-y-4">
              {/* Emails */}
              <div>
                <div className="text-xs font-bold text-zinc-400 mb-2">Statement Emails Dispatched</div>
                {(detail?.emailLogs || []).length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-500 text-center">
                    No email statements sent yet.
                  </div>
                ) : (
                  <div className="border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A]">
                    {detail?.emailLogs.map((log) => (
                      <div key={log.id} className="p-2.5 bg-[#09090B] flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{log.subject}</div>
                          <div className="text-[10px] text-zinc-500">To: {log.recipientEmail}</div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {log.status}
                          </span>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {new Date(log.createdAt).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SMS */}
              <div>
                <div className="text-xs font-bold text-zinc-400 mb-2">SMS Reminders Dispatched</div>
                {(detail?.smsLogs || []).length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-500 text-center">
                    No SMS reminders sent yet.
                  </div>
                ) : (
                  <div className="border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A]">
                    {detail?.smsLogs.map((log) => (
                      <div key={log.id} className="p-2.5 bg-[#09090B] flex items-center justify-between text-xs">
                        <div>
                          <div className="text-zinc-300">{log.message}</div>
                          <div className="text-[10px] text-zinc-500">To: {log.phoneNumber}</div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {log.status}
                          </span>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {new Date(log.createdAt).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
