import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollText, Search, Filter, ChevronLeft, ChevronRight,
  RefreshCw, Shield, AlertTriangle, CheckCircle, Info,
} from 'lucide-react';
import { getGSTAuditLogs, formatDate } from '../../api/gstInvoiceService';
import { GSTAuditLog } from '../../types/admin';

export function GSTAuditLogsView() {
  const [logs, setLogs] = useState<GSTAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<GSTAuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGSTAuditLogs({
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        page,
        limit: 30,
      });
      setLogs(res.items);
      setTotal(res.pagination?.total || res.items.length);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadge = (action: string) => {
    if (action.includes('IRN_GENERATE') || action.includes('SUCCESS')) {
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    }
    if (action.includes('CANCEL') || action.includes('FAIL') || action.includes('ERROR')) {
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    }
    if (action.includes('VALIDATE')) {
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
    if (action.includes('PENDING') || action.includes('SUBMIT')) {
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    }
    return 'bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46]';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-[#FAFAFA]">
            GST & IRP Immutable Audit Trail
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            Compliance log of all statutory mutations, validations, and IRIS IRP 6 portal calls
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#8B5CF6] hover:border-[#8B5CF6]/40 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] flex flex-wrap items-center gap-3 text-xs">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="">All Actions</option>
          <option value="GENERATE_IRN">GENERATE_IRN</option>
          <option value="CANCEL_IRN">CANCEL_IRN</option>
          <option value="VALIDATE_INVOICE">VALIDATE_INVOICE</option>
          <option value="CREATE_INVOICE">CREATE_INVOICE</option>
          <option value="UPDATE_INVOICE">UPDATE_INVOICE</option>
        </select>

        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="">All Entity Types</option>
          <option value="gst_invoice">gst_invoice</option>
          <option value="gst_einvoice">gst_einvoice</option>
          <option value="company_settings">company_settings</option>
          <option value="gst_customer">gst_customer</option>
        </select>

        {(actionFilter || entityFilter) && (
          <button
            onClick={() => { setActionFilter(''); setEntityFilter(''); setPage(1); }}
            className="text-xs text-[#8B5CF6] hover:underline ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div className="rounded-tr-2xl rounded-bl-2xl border border-[#27272A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#18181B] border-b border-[#27272A]">
                {['Timestamp', 'User / Actor', 'Action', 'Entity', 'Entity ID', 'IP Address', 'Details'].map(
                  (h) => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#71717A] whitespace-nowrap">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#71717A]">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
                    Loading audit trail…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#71717A]">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#27272A]/50 hover:bg-[#18181B]/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-3 py-3 text-[#A1A1AA] whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-3 text-[#FAFAFA] font-medium">
                      {log.user_email || 'System / Batch'}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#A1A1AA] font-mono text-[11px]">
                      {log.entity_type}
                    </td>
                    <td className="px-3 py-3 text-[#71717A] font-mono text-[10px] max-w-[120px] truncate" title={log.entity_id}>
                      {log.entity_id || '—'}
                    </td>
                    <td className="px-3 py-3 text-[#71717A] font-mono text-[11px]">
                      {log.ip_address || '—'}
                    </td>
                    <td className="px-3 py-3 text-[#8B5CF6] hover:underline">
                      View Payload
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#71717A]">
          <span>Page {page} of {totalPages} ({total} entries)</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#27272A] disabled:opacity-40 hover:border-[#8B5CF6]/40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#27272A] disabled:opacity-40 hover:border-[#8B5CF6]/40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#18181B] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getActionBadge(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
                <h3 className="text-sm font-bold text-[#FAFAFA] mt-1">Audit Entry Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[#71717A] hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#71717A]">Timestamp:</span>
                <p className="font-mono text-[#FAFAFA] mt-0.5">{new Date(selectedLog.created_at).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-[#71717A]">Actor:</span>
                <p className="text-[#FAFAFA] mt-0.5">{selectedLog.user_email || 'System'}</p>
              </div>
              <div>
                <span className="text-[#71717A]">Entity Type:</span>
                <p className="font-mono text-[#FAFAFA] mt-0.5">{selectedLog.entity_type}</p>
              </div>
              <div>
                <span className="text-[#71717A]">Entity ID:</span>
                <p className="font-mono text-[#8B5CF6] mt-0.5">{selectedLog.entity_id || '—'}</p>
              </div>
            </div>

            {selectedLog.error_detail && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs space-y-1">
                <span className="font-bold text-red-400 flex items-center gap-1">
                  <AlertTriangle size={13} />
                  IRP / System Error Detail
                </span>
                <pre className="font-mono text-[11px] text-red-300 whitespace-pre-wrap">
                  {selectedLog.error_detail}
                </pre>
              </div>
            )}

            {selectedLog.old_data && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#71717A] uppercase">State Before Mutation (Old Data)</span>
                <pre className="p-3 bg-[#09090B] border border-[#27272A] rounded-lg font-mono text-[11px] text-[#A1A1AA] overflow-x-auto max-h-40">
                  {JSON.stringify(selectedLog.old_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_data && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#71717A] uppercase">State After Mutation (New Data)</span>
                <pre className="p-3 bg-[#09090B] border border-[#27272A] rounded-lg font-mono text-[11px] text-green-300/90 overflow-x-auto max-h-40">
                  {JSON.stringify(selectedLog.new_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
