import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, FileText, Shield, Download, RefreshCw,
  Filter, Calendar, ChevronLeft, ChevronRight, IndianRupee,
} from 'lucide-react';
import {
  getInvoiceRegisterReport,
  getGSTSummaryReport,
  getEInvoiceReport,
  formatCurrency,
  formatDate,
} from '../../api/gstInvoiceService';
import { exportToCSV } from '../../utils/invoicePdfDownloader';
import { GSTReportFilter } from '../../types/admin';
import { AsyncActionButton } from '../../components/common/AsyncActionButton';

type ReportTab = 'register' | 'summary' | 'einvoice';

export function GSTReportsView() {
  const [activeTab, setActiveTab] = useState<ReportTab>('register');
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Data states
  const [registerData, setRegisterData] = useState<{ items: any[]; totals: any; pagination: any }>({
    items: [],
    totals: {},
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  });

  const [summaryData, setSummaryData] = useState<{ slabs: any[]; totals: any }>({
    slabs: [],
    totals: {},
  });

  const [einvoiceData, setEinvoiceData] = useState<{ items: any[]; pagination: any }>({
    items: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const filter: GSTReportFilter = {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      page,
      limit: 20,
    };

    try {
      if (activeTab === 'register') {
        const res = await getInvoiceRegisterReport(filter);
        setRegisterData(res);
      } else if (activeTab === 'summary') {
        const res = await getGSTSummaryReport(filter);
        setSummaryData(res);
      } else if (activeTab === 'einvoice') {
        const res = await getEInvoiceReport(filter);
        setEinvoiceData(res);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFrom, dateTo, statusFilter, page]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (activeTab === 'register' && registerData.items.length > 0) {
      exportToCSV(registerData.items, `GST_Invoice_Register_${timestamp}`);
    } else if (activeTab === 'summary' && summaryData.slabs.length > 0) {
      exportToCSV(summaryData.slabs, `GST_Tax_Summary_${timestamp}`);
    } else if (activeTab === 'einvoice' && einvoiceData.items.length > 0) {
      exportToCSV(einvoiceData.items, `GST_EInvoice_Report_${timestamp}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Report Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-[#FAFAFA]">
            GST Compliance & Audit Reports
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            GSTR-1 Preparation, Taxable Register & IRN Reconciliation Reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
            className="p-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#8B5CF6] hover:border-[#8B5CF6]/40 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <AsyncActionButton
            mode="download"
            onAction={handleExport}
            idleIcon={<Download size={14} />}
            idleLabel="Export CSV"
            loadingLabel="Exporting CSV…"
            successLabel="Exported!"
            className="flex items-center gap-1.5 px-4 py-2 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] transition-colors shadow-md shadow-[#8B5CF6]/20"
            variant="custom"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#27272A] pb-2">
        {[
          { id: 'register', label: 'Sales & Invoice Register', icon: <FileText size={14} /> },
          { id: 'summary', label: 'GST Rate-Wise Summary', icon: <BarChart3 size={14} /> },
          { id: 'einvoice', label: 'E-Invoice / IRN Register', icon: <Shield size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as ReportTab);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-tr-lg rounded-bl-lg text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-[#8B5CF6] text-white'
                : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-[#71717A]">
          <Calendar size={14} />
          <span>Date Range:</span>
        </div>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
        />
        <span className="text-[#71717A]">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
        />

        {activeTab !== 'summary' && (
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="VALIDATED">Validated</option>
            <option value="IRN_GENERATED">IRN Generated</option>
            <option value="ISSUED">Issued</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        )}

        {(dateFrom || dateTo || statusFilter !== 'ALL') && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('ALL'); setPage(1); }}
            className="text-xs text-[#8B5CF6] hover:underline ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Report Content */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          <div className="rounded-tr-2xl rounded-bl-2xl border border-[#27272A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#18181B] border-b border-[#27272A]">
                    {['Invoice No', 'Date', 'Customer', 'GSTIN', 'Taxable Val', 'CGST', 'SGST', 'IGST', 'Total GST', 'Grand Total', 'Status'].map(
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
                      <td colSpan={11} className="py-12 text-center text-[#71717A]">
                        <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
                        Loading invoice register…
                      </td>
                    </tr>
                  ) : registerData.items.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-[#71717A]">
                        No records match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    registerData.items.map((row: any, i: number) => {
                      const totalGst = (Number(row.cgst_amount) || 0) + (Number(row.sgst_amount) || 0) + (Number(row.igst_amount) || 0);
                      return (
                        <tr key={i} className="border-b border-[#27272A]/50 hover:bg-[#18181B]/60 transition-colors">
                          <td className="px-3 py-3 font-mono font-semibold text-[#8B5CF6]">{row.invoice_number}</td>
                          <td className="px-3 py-3 text-[#A1A1AA] whitespace-nowrap">{formatDate(row.invoice_date)}</td>
                          <td className="px-3 py-3 text-[#FAFAFA] font-medium">{row.customer_legal_name}</td>
                          <td className="px-3 py-3 font-mono text-[10px] text-[#A1A1AA]">{row.customer_gstin || '—'}</td>
                          <td className="px-3 py-3 text-right text-[#FAFAFA]">{formatCurrency(row.taxable_amount || 0)}</td>
                          <td className="px-3 py-3 text-right text-blue-400">{formatCurrency(row.cgst_amount || 0)}</td>
                          <td className="px-3 py-3 text-right text-blue-400">{formatCurrency(row.sgst_amount || 0)}</td>
                          <td className="px-3 py-3 text-right text-purple-400">{formatCurrency(row.igst_amount || 0)}</td>
                          <td className="px-3 py-3 text-right text-[#FAFAFA] font-medium">{formatCurrency(totalGst)}</td>
                          <td className="px-3 py-3 text-right font-bold text-[#8B5CF6]">{formatCurrency(row.grand_total || 0)}</td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#27272A] text-[#A1A1AA]">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="rounded-tr-2xl rounded-bl-2xl border border-[#27272A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#18181B] border-b border-[#27272A]">
                    {['GST Slab Rate', 'Total Taxable Value', 'Central Tax (CGST)', 'State Tax (SGST)', 'Integrated Tax (IGST)', 'Total Tax Amount'].map(
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
                      <td colSpan={6} className="py-12 text-center text-[#71717A]">
                        <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
                        Generating rate-wise summary…
                      </td>
                    </tr>
                  ) : summaryData.slabs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#71717A]">
                        No summary data available for current date range.
                      </td>
                    </tr>
                  ) : (
                    summaryData.slabs.map((slab: any, i: number) => {
                      const totalTax = (Number(slab.cgst_amount) || 0) + (Number(slab.sgst_amount) || 0) + (Number(slab.igst_amount) || 0);
                      return (
                        <tr key={i} className="border-b border-[#27272A]/50 hover:bg-[#18181B]/60 transition-colors">
                          <td className="px-3 py-3 font-bold text-[#8B5CF6]">{slab.gst_rate}% Slab</td>
                          <td className="px-3 py-3 text-right text-[#FAFAFA] font-medium">{formatCurrency(slab.taxable_value || 0)}</td>
                          <td className="px-3 py-3 text-right text-blue-400">{formatCurrency(slab.cgst_amount || 0)}</td>
                          <td className="px-3 py-3 text-right text-blue-400">{formatCurrency(slab.sgst_amount || 0)}</td>
                          <td className="px-3 py-3 text-right text-purple-400">{formatCurrency(slab.igst_amount || 0)}</td>
                          <td className="px-3 py-3 text-right font-bold text-green-400">{formatCurrency(totalTax)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'einvoice' && (
        <div className="space-y-4">
          <div className="rounded-tr-2xl rounded-bl-2xl border border-[#27272A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#18181B] border-b border-[#27272A]">
                    {['Invoice No', 'Date', 'Customer', 'IRN (64-char Hash)', 'Ack Number', 'Ack Date', 'IRP Status'].map(
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
                        Loading e-invoice records…
                      </td>
                    </tr>
                  ) : einvoiceData.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#71717A]">
                        No E-Invoices registered in the selected period.
                      </td>
                    </tr>
                  ) : (
                    einvoiceData.items.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-[#27272A]/50 hover:bg-[#18181B]/60 transition-colors">
                        <td className="px-3 py-3 font-mono font-semibold text-[#8B5CF6]">{row.invoice_number}</td>
                        <td className="px-3 py-3 text-[#A1A1AA] whitespace-nowrap">{formatDate(row.invoice_date)}</td>
                        <td className="px-3 py-3 text-[#FAFAFA]">{row.customer_legal_name}</td>
                        <td className="px-3 py-3 font-mono text-[10px] text-[#A1A1AA] max-w-[180px] truncate" title={row.irn}>
                          {row.irn || '—'}
                        </td>
                        <td className="px-3 py-3 font-mono text-[#FAFAFA]">{row.ack_number || '—'}</td>
                        <td className="px-3 py-3 text-[#A1A1AA] whitespace-nowrap">
                          {row.ack_date ? new Date(row.ack_date).toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            row.status === 'IRN_GENERATED' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
