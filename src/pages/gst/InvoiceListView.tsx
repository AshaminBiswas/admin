import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Eye, Download, Pencil, Receipt, IndianRupee,
  FileCheck, X, ChevronLeft, ChevronRight, RefreshCw, Shield,
  TrendingUp, Clock, AlertCircle, CheckCircle, CheckCircle2,
} from 'lucide-react';
import {
  listGSTInvoices,
  downloadGSTInvoicePdf,
  approveGSTInvoice,
  formatCurrency,
  formatDate,
} from '../../api/gstInvoiceService';
import { GSTInvoice, GSTInvoiceStatus } from '../../types/admin';
import { AsyncActionButton } from '../../components/common/AsyncActionButton';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'IRN_PENDING', label: 'IRN Pending' },
  { value: 'IRN_GENERATED', label: 'IRN Generated' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_BADGE: Record<GSTInvoiceStatus, string> = {
  DRAFT: 'bg-slate-500/20 text-slate-400',
  VALIDATED: 'bg-blue-500/20 text-blue-400',
  IRN_PENDING: 'bg-amber-500/20 text-amber-400',
  IRN_GENERATED: 'bg-green-500/20 text-green-400',
  ISSUED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

interface Props {
  onCreateNew: () => void;
  onViewInvoice: (id: string) => void;
  onEditInvoice: (id: string) => void;
}

export function InvoiceListView({ onCreateNew, onViewInvoice, onEditInvoice }: Props) {
  const [invoices, setInvoices] = useState<GSTInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [validating, setValidating] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<GSTInvoice | null>(null);
  const [stats, setStats] = useState<{
    total_invoices: number;
    this_month_invoices: number;
    irn_generated: number;
    irn_pending: number;
    irn_cancelled: number;
    total_taxable_sales: number;
    total_gst_collected: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listGSTInvoices({
        status: statusFilter,
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        limit: 20,
      });
      setInvoices(res.items);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
      if (res.stats) setStats(res.stats);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, dateFrom, dateTo, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownloadPdf = async (inv: GSTInvoice) => {
    setDownloading(inv.id);
    try {
      await downloadGSTInvoicePdf(inv.id, inv.invoice_number);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleApproveInvoice = async () => {
    if (!confirmApprove) return;
    setValidating(confirmApprove.id);
    setConfirmApprove(null);
    try {
      await approveGSTInvoice(confirmApprove.id);
      await load(); // refresh the list
    } catch (e: any) {
      alert(`Validation failed: ${e.message}`);
    } finally {
      setValidating(null);
    }
  };

  const statCards = [
    {
      label: 'Total Invoices',
      value: stats?.total_invoices ?? '—',
      icon: <Receipt size={18} />,
      color: 'text-[#8B5CF6]',
      bg: 'bg-[#8B5CF6]/10',
    },
    {
      label: 'This Month',
      value: stats?.this_month_invoices ?? '—',
      icon: <TrendingUp size={18} />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'IRN Generated',
      value: stats?.irn_generated ?? '—',
      icon: <Shield size={18} />,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'IRN Pending',
      value: stats?.irn_pending ?? '—',
      icon: <Clock size={18} />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'IRN Cancelled',
      value: stats?.irn_cancelled ?? '—',
      icon: <AlertCircle size={18} />,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Total Taxable Sales',
      value: stats ? formatCurrency(stats.total_taxable_sales) : '—',
      icon: <IndianRupee size={18} />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'GST Collected',
      value: stats ? formatCurrency(stats.total_gst_collected) : '—',
      icon: <FileCheck size={18} />,
      color: 'text-[#8B5CF6]',
      bg: 'bg-[#8B5CF6]/10',
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Confirm Validate Modal ─────────────────────────────────────── */}
      {confirmApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#18181B] border border-[#27272A] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#FAFAFA]">Validate Invoice?</h3>
                <p className="text-[11px] text-[#71717A]">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-[#09090B] rounded-xl p-3 border border-[#27272A] space-y-1">
              <p className="text-xs text-[#A1A1AA]">
                Invoice: <span className="font-mono font-bold text-[#8B5CF6]">{confirmApprove.invoice_number}</span>
              </p>
              <p className="text-xs text-[#A1A1AA]">
                Customer: <span className="font-semibold text-[#FAFAFA]">{confirmApprove.customer_legal_name}</span>
              </p>
              <p className="text-xs text-[#A1A1AA]">
                Amount: <span className="font-bold text-emerald-400">{formatCurrency(confirmApprove.grand_total)}</span>
              </p>
            </div>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Approving this invoice will apply the <strong className="text-[#FAFAFA]">Administrative Seal</strong> and mark it as <strong className="text-emerald-400">VALIDATED</strong>. It will no longer be editable.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmApprove(null)}
                className="flex-1 py-2 rounded-xl border border-[#27272A] text-[#A1A1AA] text-xs font-semibold hover:border-[#3F3F46] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveInvoice}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/40"
              >
                <CheckCircle2 size={13} /> Validate & Seal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-[#FAFAFA]">Tax Invoices</h2>
          <p className="text-xs text-[#A1A1AA]">
            {total} invoice{total !== 1 ? 's' : ''} · India GST — IRIS IRP 6
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#8B5CF6] hover:border-[#8B5CF6]/40 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] transition-colors shadow-md shadow-[#8B5CF6]/25"
          >
            <Plus size={14} /> New Invoice
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="p-3 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] hover:border-[#8B5CF6]/30 transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.color} mb-2`}>
              {s.icon}
            </div>
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[#71717A] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Invoice no, customer, GSTIN…"
            className="w-full pl-8 pr-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
        {/* Date range */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#A1A1AA] text-xs focus:outline-none focus:border-[#8B5CF6]"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#A1A1AA] text-xs focus:outline-none focus:border-[#8B5CF6]"
        />
        {(search || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-[#A1A1AA] text-xs hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatusFilter(t.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-tr-lg rounded-bl-lg text-xs font-semibold transition-colors ${
              statusFilter === t.value
                ? 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/25'
                : 'border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#8B5CF6]/30'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table & Mobile Card Stream */}
      <div className="rounded-tr-2xl rounded-bl-2xl border border-[#27272A] overflow-hidden">
        {/* Mobile Touch Cards View (sm:hidden) */}
        <div className="sm:hidden p-3.5 space-y-3 bg-[#18181B]">
          {loading ? (
            <div className="py-12 text-center text-[#71717A] text-xs">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#8B5CF6]" />
              Loading invoices…
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-[#71717A] text-xs">
              <Receipt size={32} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-sm">No invoices found</p>
              <p className="text-[11px] mt-1">Create a new GST tax invoice to get started.</p>
            </div>
          ) : (
            invoices.map((inv) => {
              const gstTotal = inv.cgst_amount + inv.sgst_amount + inv.igst_amount;
              return (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2.5 hover:border-[#8B5CF6]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-[#8B5CF6] block">{inv.invoice_number}</span>
                      <span className="text-[10px] text-[#71717A]">{formatDate(inv.invoice_date)}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        STATUS_BADGE[inv.status as GSTInvoiceStatus] || 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {inv.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-bold text-[#FAFAFA]">{inv.customer_legal_name}</p>
                    {inv.customer_gstin && (
                      <p className="text-[10px] font-mono text-[#A855F7]">GSTIN: {inv.customer_gstin}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#27272A] text-xs">
                    <div>
                      <span className="text-[10px] text-[#71717A] block">Taxable: {formatCurrency(inv.taxable_amount)}</span>
                      <span className="text-[10px] text-[#71717A] block">GST: {formatCurrency(gstTotal)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#71717A] block uppercase">Grand Total</span>
                      <span className="font-extrabold text-sm text-[#FAFAFA]">
                        {formatCurrency(inv.grand_total)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#27272A]">
                    <AsyncActionButton
                      mode="download"
                      onAction={() => handleDownloadPdf(inv)}
                      idleIcon={<Download size={13} />}
                      idleLabel="PDF"
                      loadingLabel="PDF…"
                      successLabel="Done!"
                      className="bg-[#27272A] hover:bg-emerald-600 text-[#FAFAFA] text-xs px-2.5 py-1.5 rounded-lg font-bold"
                      variant="custom"
                      title="Download PDF"
                    />
                    <AsyncActionButton
                      mode="view"
                      onAction={() => onViewInvoice(inv.id)}
                      idleIcon={<Eye size={13} />}
                      idleLabel="View"
                      loadingLabel="…"
                      className="bg-[#8B5CF6] text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-md shadow-[#8B5CF6]/30"
                      variant="custom"
                      title="View invoice"
                    />
                    {inv.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => onEditInvoice(inv.id)}
                          className="py-1.5 px-2 rounded-lg text-xs font-bold text-blue-400 bg-blue-500/10"
                          title="Edit draft"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmApprove(inv)}
                          disabled={validating === inv.id}
                          className="py-1.5 px-2 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 disabled:opacity-50"
                          title="Validate & seal invoice"
                        >
                          {validating === inv.id
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <CheckCircle2 size={13} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#18181B] border-b border-[#27272A]">
                {['Invoice No', 'Date', 'Customer', 'GSTIN', 'Taxable', 'GST', 'Grand Total', 'Status', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#71717A] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#71717A]">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Loading invoices…
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#71717A]">
                    <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-semibold">No invoices found</p>
                    <p className="text-[11px] mt-1">Create a new GST tax invoice to get started.</p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const gstTotal = inv.cgst_amount + inv.sgst_amount + inv.igst_amount;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-[#27272A]/50 hover:bg-[#18181B]/60 transition-colors"
                    >
                      <td className="px-3 py-3">
                        <span className="font-mono font-bold text-[#8B5CF6] text-[11px]">
                          {inv.invoice_number}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[#A1A1AA] whitespace-nowrap">{formatDate(inv.invoice_date)}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[#FAFAFA] max-w-[140px] truncate">
                          {inv.customer_legal_name}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-mono text-[#A1A1AA] text-[10px]">
                        {inv.customer_gstin || '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-[#FAFAFA] whitespace-nowrap">
                        {formatCurrency(inv.taxable_amount)}
                      </td>
                      <td className="px-3 py-3 text-right text-[#A1A1AA] whitespace-nowrap">
                        {formatCurrency(gstTotal)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-[#FAFAFA] whitespace-nowrap">
                        {formatCurrency(inv.grand_total)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                            STATUS_BADGE[inv.status as GSTInvoiceStatus] || 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <AsyncActionButton
                            mode="view"
                            onAction={() => onViewInvoice(inv.id)}
                            idleIcon={<Eye size={13} />}
                            size="icon"
                            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-colors"
                            variant="custom"
                            title="View invoice"
                          />
                          {inv.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => onEditInvoice(inv.id)}
                                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                title="Edit draft"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setConfirmApprove(inv)}
                                disabled={validating === inv.id}
                                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                                title="Validate & apply administrative seal"
                              >
                                {validating === inv.id
                                  ? <RefreshCw size={13} className="animate-spin text-emerald-400" />
                                  : <CheckCircle2 size={13} />}
                              </button>
                            </>
                          )}
                          <AsyncActionButton
                            mode="download"
                            onAction={() => downloadGSTInvoicePdf(inv.id, inv.invoice_number)}
                            idleIcon={<Download size={13} />}
                            size="icon"
                            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-green-400 hover:bg-green-500/10 transition-colors"
                            variant="custom"
                            title="Download PDF"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#71717A]">
            Page {page} of {totalPages} · {total} total invoices
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] disabled:opacity-40 hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              if (pg > totalPages) return null;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    pg === page
                      ? 'bg-[#8B5CF6] text-white'
                      : 'border border-[#27272A] text-[#A1A1AA] hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6]'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] disabled:opacity-40 hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
