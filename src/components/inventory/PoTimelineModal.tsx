import React from 'react';
import {
  History,
  X,
  Mail,
  Package,
  CheckCircle2,
  FileText,
  Clock,
  Send,
  AlertTriangle,
} from 'lucide-react';
import type { PurchaseOrder } from '../../types/purchaseOrder';

export interface PoTimelineModalProps {
  po: PurchaseOrder;
  onClose: () => void;
}

export const PoTimelineModal: React.FC<PoTimelineModalProps> = ({ po, onClose }) => {
  const events = po.events || [];
  const dispatches = po.dispatches || [];
  const fullPoNo = po.revision > 0 ? `${po.poNumber}-R${po.revision}` : po.poNumber;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#18181B] border border-zinc-700 w-full max-w-xl rounded-2xl shadow-2xl text-white overflow-hidden my-auto flex flex-col animate-fadeIn">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 bg-[#09090B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700">
              <History size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Audit Trail & Timeline ({fullPoNo})
              </h2>
              <p className="text-[11px] text-zinc-400">
                Complete historical audit log of status transitions and dispatches
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

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
          {/* Email Dispatches Section */}
          {dispatches.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Email Dispatch Records ({dispatches.length})
              </div>
              <div className="space-y-1.5">
                {dispatches.map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-xl bg-[#09090B] border border-zinc-800 flex items-start justify-between gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                        <Send size={13} />
                      </div>
                      <div>
                        <div className="font-semibold text-white">To: {d.recipientEmail}</div>
                        {d.cc && <div className="text-[10px] text-zinc-400">CC: {d.cc}</div>}
                        <div className="text-[10px] text-zinc-400 italic mt-0.5">"{d.subject}"</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          d.status === 'SENT'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {d.status}
                      </span>
                      <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                        {new Date(d.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Events Section */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Lifecycle Event Log
            </div>
            {events.length === 0 ? (
              <div className="text-center py-6 text-zinc-500">No events recorded.</div>
            ) : (
              <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                {events.map((ev) => (
                  <div key={ev.id} className="relative flex items-start gap-3">
                    <div className="absolute -left-4 mt-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-[#18181B]" />
                    <div className="bg-[#09090B] p-2.5 rounded-xl border border-zinc-800 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{ev.status}</span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {new Date(ev.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {ev.note && <div className="text-[11px] text-zinc-400 mt-1">{ev.note}</div>}
                      <div className="text-[9px] text-zinc-500 mt-1.5">
                        Actor: <strong>{ev.performedByName || 'System'}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-800 bg-[#09090B] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
