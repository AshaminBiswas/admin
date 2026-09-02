import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark, ArrowLeft, Search, Filter, Download, RefreshCw,
  Clock, AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck,
  Calendar, FileText, ExternalLink, Eye, ChevronRight, UserCheck,
  Building2, Phone, Mail, DollarSign, ArrowUpDown, X, Check,
  CreditCard, Sparkles, Receipt, Layers
} from 'lucide-react';
import { ProformaInvoice, ProformaStatus } from '../../types/proforma';
import { proformaService } from '../../api/proformaService';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ProformaInvoiceDetailView } from './ProformaInvoiceDetailView';

export function AdvancePaymentsTrackerPage() {
  const { setCurrentView } = useAdminAuth();
  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [agingFilter, setAgingFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'aging' | 'advance'>('aging');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Detail View State
  const [selectedInvoice, setSelectedInvoice] = useState<ProformaInvoice | null>(null);

  // Record Payment Modal State
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<ProformaInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('RTGS');
  const [paymentUtr, setPaymentUtr] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentTargetStatus, setPaymentTargetStatus] = useState<'ADVANCE_RECEIVED' | 'APPROVED'>('ADVANCE_RECEIVED');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Receipt Lightbox Modal State
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Load Invoices
  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaService.listProformaInvoices({ limit: 100 });
      setInvoices(res.data || []);
    } catch (err: any) {
      console.error('[AdvancePaymentsTracker] Load error:', err);
      setError(err?.message || 'Failed to load advance payment records from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // ─── Helper Calculations for Aging & Overdue ────────────────────────────────
  const getInvoiceAging = (inv: ProformaInvoice) => {
    const issueTime = new Date(inv.issueDate || (inv as any).createdAt || Date.now()).getTime();
    const now = Date.now();
    const daysElapsed = Math.max(0, Math.floor((now - issueTime) / (1000 * 60 * 60 * 24)));

    const validUntilTime = new Date(inv.validUntil || (issueTime + 30 * 86400000)).getTime();
    const daysRemaining = Math.ceil((validUntilTime - now) / (1000 * 60 * 60 * 24));

    const isCleared = inv.status === 'ADVANCE_RECEIVED' || inv.status === 'APPROVED' || inv.status === 'CONVERTED_TO_INVOICE';
    const isOverdue = !isCleared && daysRemaining < 0;
    const isExpiringSoon = !isCleared && daysRemaining >= 0 && daysRemaining <= 7;

    // Check if customer submitted feedback / UTR / receipt
    const customerFeedbackEvent = inv.history?.find((h) => h.action.toUpperCase().includes('CUSTOMER'));
    const customerUtr =
      customerFeedbackEvent?.metadata?.advancePaymentRef ||
      (inv.notes?.match(/Advance Ref:\s*([^\s\]\)]+)/i)?.[1]) ||
      null;

    const receiptUrl =
      customerFeedbackEvent?.metadata?.paymentReceiptUrl ||
      inv.history?.find((h) => h.metadata?.paymentReceiptUrl)?.metadata?.paymentReceiptUrl ||
      (inv.notes?.match(/\[Receipt:\s*(https?:\/\/[^\s\]]+|\/uploads\/[^\s\]]+)\]/i)?.[1]) ||
      null;

    return {
      daysElapsed,
      daysRemaining,
      isCleared,
      isOverdue,
      isExpiringSoon,
      customerUtr,
      receiptUrl,
      customerFeedbackEvent,
    };
  };

  // ─── Executive KPI Matrix ───────────────────────────────────────────────────
  const kpiData = useMemo(() => {
    let totalInvoiced = 0;
    let totalExpectedAdvance = 0;
    let totalClearedAdvance = 0;
    let totalPendingBalance = 0;
    let overdueCount = 0;
    let overdueValue = 0;
    let customerSubmittedCount = 0;
    let customerSubmittedValue = 0;

    invoices.forEach((inv) => {
      const gTotal = Number(inv.grandTotal || 0);
      const advPayable = Number(inv.advancePayable || (gTotal * (inv.advancePercentage || 30)) / 100);
      const balPayable = Number(inv.balancePayable || (gTotal - advPayable));
      const aging = getInvoiceAging(inv);

      totalInvoiced += gTotal;
      totalExpectedAdvance += advPayable;

      if (aging.isCleared) {
        totalClearedAdvance += advPayable;
      } else {
        totalPendingBalance += gTotal; // full invoice balance pending until advance received
      }

      if (aging.isOverdue) {
        overdueCount++;
        overdueValue += advPayable;
      }

      if (inv.status === 'ACCEPTED' || Boolean(aging.customerUtr)) {
        customerSubmittedCount++;
        customerSubmittedValue += advPayable;
      }
    });

    return {
      totalInvoiced,
      totalExpectedAdvance,
      totalClearedAdvance,
      totalPendingBalance,
      overdueCount,
      overdueValue,
      customerSubmittedCount,
      customerSubmittedValue,
      totalCount: invoices.length,
    };
  }, [invoices]);

  // ─── Filtered & Sorted Invoices ─────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        const aging = getInvoiceAging(inv);
        const query = searchQuery.toLowerCase().trim();

        // Search match
        if (query) {
          const matchNumber = inv.piNumber.toLowerCase().includes(query);
          const matchCustomer = (inv.customerName || '').toLowerCase().includes(query);
          const matchCompany = (inv.companyName || '').toLowerCase().includes(query);
          const matchPhone = (inv.customerPhone || '').toLowerCase().includes(query);
          const matchEmail = (inv.customerEmail || '').toLowerCase().includes(query);
          const matchUtr = aging.customerUtr ? aging.customerUtr.toLowerCase().includes(query) : false;

          if (!matchNumber && !matchCustomer && !matchCompany && !matchPhone && !matchEmail && !matchUtr) {
            return false;
          }
        }

        // Status filter
        if (statusFilter === 'AWAITING_ADVANCE') {
          if (aging.isCleared) return false;
        } else if (statusFilter === 'CUSTOMER_SUBMITTED') {
          if (!aging.customerUtr && inv.status !== 'ACCEPTED') return false;
        } else if (statusFilter === 'ADVANCE_CLEARED') {
          if (!aging.isCleared) return false;
        } else if (statusFilter === 'OVERDUE') {
          if (!aging.isOverdue) return false;
        } else if (statusFilter === 'EXPIRING_SOON') {
          if (!aging.isExpiringSoon) return false;
        }

        // Aging filter
        if (agingFilter === 'UNDER_7') {
          if (aging.daysElapsed > 7) return false;
        } else if (agingFilter === '7_TO_14') {
          if (aging.daysElapsed < 7 || aging.daysElapsed > 14) return false;
        } else if (agingFilter === '15_TO_30') {
          if (aging.daysElapsed < 15 || aging.daysElapsed > 30) return false;
        } else if (agingFilter === 'OVER_30') {
          if (aging.daysElapsed <= 30) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const agingA = getInvoiceAging(a);
        const agingB = getInvoiceAging(b);

        if (sortBy === 'aging') {
          // Most overdue / highest days elapsed first
          return sortOrder === 'desc'
            ? agingB.daysElapsed - agingA.daysElapsed
            : agingA.daysElapsed - agingB.daysElapsed;
        } else if (sortBy === 'amount') {
          return sortOrder === 'desc'
            ? b.grandTotal - a.grandTotal
            : a.grandTotal - b.grandTotal;
        } else if (sortBy === 'advance') {
          return sortOrder === 'desc'
            ? b.advancePayable - a.advancePayable
            : a.advancePayable - b.advancePayable;
        } else {
          // date
          const dateA = new Date(a.issueDate || a.createdAt || 0).getTime();
          const dateB = new Date(b.issueDate || b.createdAt || 0).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        }
      });
  }, [invoices, searchQuery, statusFilter, agingFilter, sortBy, sortOrder]);

  // ─── Open Record Payment Modal ──────────────────────────────────────────────
  const handleOpenPaymentModal = (inv: ProformaInvoice) => {
    const aging = getInvoiceAging(inv);
    setPaymentModalInvoice(inv);
    setPaymentAmount(inv.advancePayable);
    setPaymentMode('RTGS');
    setPaymentUtr(aging.customerUtr || '');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentTargetStatus('ADVANCE_RECEIVED');
    setPaymentNotes('');
    setPaymentSuccessMsg(null);
  };

  // ─── Submit Payment Clearance ───────────────────────────────────────────────
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;

    if (!paymentUtr.trim()) {
      alert('Please provide the Bank UTR / Transaction Reference Number.');
      return;
    }

    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setSavingPayment(true);
    try {
      await proformaService.recordPayment(paymentModalInvoice.id, {
        amountPaid: Number(paymentAmount),
        paymentMode,
        transactionRef: paymentUtr.trim(),
        paymentDate,
        status: paymentTargetStatus,
        notes: paymentNotes.trim() || undefined,
      });

      setPaymentSuccessMsg(`Payment of ₹${paymentAmount.toLocaleString('en-IN')} confirmed successfully!`);
      setTimeout(() => {
        setPaymentModalInvoice(null);
        fetchInvoices();
      }, 1200);
    } catch (err: any) {
      console.error('[AdvancePaymentsTracker] Payment save error:', err);
      alert(err?.message || 'Failed to record payment on server.');
    } finally {
      setSavingPayment(false);
    }
  };

  // ─── Export to CSV ──────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      alert('No invoice records to export in the current filtered view.');
      return;
    }

    const headers = [
      'PI Number',
      'Issue Date',
      'Valid Until',
      'Days Elapsed',
      'SLA Status',
      'Customer Name',
      'Company Name',
      'Customer Phone',
      'Customer Email',
      'Place of Supply',
      'Grand Total (INR)',
      'Advance %',
      'Advance Payable (INR)',
      'Balance Payable (INR)',
      'Payment Status',
      'Customer UTR Reference',
      'Payment Proof URL',
    ];

    const rows = filteredInvoices.map((inv) => {
      const aging = getInvoiceAging(inv);
      let slaText = 'Within SLA';
      if (aging.isCleared) slaText = 'Advance Cleared';
      else if (aging.isOverdue) slaText = `Overdue by ${Math.abs(aging.daysRemaining)} days`;
      else if (aging.isExpiringSoon) slaText = `Due in ${aging.daysRemaining} days`;

      return [
        `"${inv.piNumber}"`,
        `"${inv.issueDate}"`,
        `"${inv.validUntil}"`,
        aging.daysElapsed,
        `"${slaText}"`,
        `"${inv.customerName}"`,
        `"${inv.companyName || ''}"`,
        `"${inv.customerPhone || ''}"`,
        `"${inv.customerEmail || ''}"`,
        `"${inv.placeOfSupply || ''}"`,
        inv.grandTotal,
        inv.advancePercentage,
        inv.advancePayable,
        inv.balancePayable,
        `"${inv.status}"`,
        `"${aging.customerUtr || ''}"`,
        `"${aging.receiptUrl || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PRC-Advance-Payments-Ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If Detail View is active:
  if (selectedInvoice) {
    return (
      <ProformaInvoiceDetailView
        invoice={selectedInvoice}
        onBack={() => {
          setSelectedInvoice(null);
          fetchInvoices();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 animate-in fade-in duration-200">
      
      {/* ─── Top Header & Navigation Switcher ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272A] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#8B5CF6] bg-[#8B5CF6]/10 px-2.5 py-0.5 rounded-md border border-[#8B5CF6]/20">
              ACCOUNTS & RECEIVABLES DESK
            </span>
            <span className="text-xs text-zinc-400 font-mono">Real-Time Commercial Ledger</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2.5">
            <Landmark className="text-[#8B5CF6]" size={26} />
            Advance Payments & Receivables Tracker
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor client advance remittances, aging SLA overdues, bank UTR proofs, and payment clearances linked to Proforma Invoices.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Switch to PI Page */}
          <button
            type="button"
            onClick={() => setCurrentView('proforma-invoices')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-300 text-xs font-bold border border-[#27272A] transition-all"
          >
            <FileText size={15} />
            <span>Proforma Invoices</span>
          </button>

          {/* Export CSV Ledger */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-all"
          >
            <Download size={15} />
            <span>Export CSV Ledger</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchInvoices}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── Executive Financial Matrix (5 KPI Cards) ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Total Invoiced Receivables */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total PI Value</span>
            <Receipt size={16} className="text-zinc-500" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            ₹{kpiData.totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-zinc-400">
            Across <strong>{kpiData.totalCount}</strong> issued commercial PIs
          </div>
        </div>

        {/* Card 2: Expected Advance Deposits */}
        <div className="bg-[#18181B] border border-amber-500/30 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expected Advance</span>
            <DollarSign size={16} className="text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-300 font-mono">
            ₹{kpiData.totalExpectedAdvance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-amber-400/80">
            Avg 30-50% advance booking deposit
          </div>
        </div>

        {/* Card 3: Cleared & Collected Advance */}
        <div className="bg-[#18181B] border border-purple-500/40 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-purple-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Advance Collected</span>
            <Landmark size={16} className="text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-300 font-mono">
            ₹{kpiData.totalClearedAdvance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-purple-400/80">
            Confirmed bank transfers cleared
          </div>
        </div>

        {/* Card 4: Customer Submitted UTR / Awaiting Clearance */}
        <div className="bg-[#18181B] border border-cyan-500/40 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-cyan-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Customer UTR Proofs</span>
            <CheckCircle2 size={16} className="text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-300 font-mono">
            {kpiData.customerSubmittedCount} <span className="text-xs text-zinc-400 font-normal">Records</span>
          </div>
          <div className="text-[11px] text-cyan-400/80">
            ₹{kpiData.customerSubmittedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} awaiting desk clearance
          </div>
        </div>

        {/* Card 5: Overdue / Expired Receivables Alert */}
        <div className="bg-[#18181B] border border-rose-500/40 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue (&gt;30 Days)</span>
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-400 font-mono">
            {kpiData.overdueCount} <span className="text-xs text-zinc-400 font-normal">Overdue PIs</span>
          </div>
          <div className="text-[11px] text-rose-400/80">
            ₹{kpiData.overdueValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} advance SLA expired
          </div>
        </div>

      </div>

      {/* ─── Search, Quick Aging Filter Tabs & Sort Controls ───────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-3.5 shadow-xl">
        
        {/* Search Input & Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, company, PI number (PRC/PI/...), UTR reference, phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Lifecycle Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-bold shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="AWAITING_ADVANCE">⏳ Awaiting Advance</option>
              <option value="CUSTOMER_SUBMITTED">⚡ Customer Submitted UTR / Proof</option>
              <option value="ADVANCE_CLEARED">✅ Advance Cleared & Confirmed</option>
              <option value="OVERDUE">🚨 Overdue (&gt; 30 Days SLA)</option>
              <option value="EXPIRING_SOON">⚠️ Expiring Soon (&lt; 7 Days)</option>
            </select>
          </div>

          {/* Aging Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-bold shrink-0">Aging:</span>
            <select
              value={agingFilter}
              onChange={(e) => setAgingFilter(e.target.value)}
              className="px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All Aging Days</option>
              <option value="UNDER_7">&lt; 7 Days (Fresh)</option>
              <option value="7_TO_14">7 - 14 Days</option>
              <option value="15_TO_30">15 - 30 Days</option>
              <option value="OVER_30">&gt; 30 Days (Overdue)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-bold shrink-0">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-zinc-300 focus:outline-none"
            >
              <option value="aging">Aging Days (Most Overdue)</option>
              <option value="advance">Advance Payable Amount</option>
              <option value="amount">Grand Total Amount</option>
              <option value="date">Issue Date (Newest)</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-2 bg-[#09090B] border border-[#27272A] hover:border-zinc-500 rounded-xl text-zinc-300 text-xs"
              title={`Switch to ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown size={14} />
            </button>
          </div>
        </div>

        {/* Quick Filter Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#27272A]">
          {[
            { id: 'ALL', label: 'All Records', count: invoices.length },
            {
              id: 'AWAITING_ADVANCE',
              label: 'Awaiting Advance',
              count: invoices.filter((i) => !getInvoiceAging(i).isCleared).length,
            },
            {
              id: 'CUSTOMER_SUBMITTED',
              label: 'Customer UTR Submitted',
              count: kpiData.customerSubmittedCount,
            },
            {
              id: 'ADVANCE_CLEARED',
              label: 'Advance Cleared',
              count: invoices.filter((i) => getInvoiceAging(i).isCleared).length,
            },
            {
              id: 'OVERDUE',
              label: '🚨 Overdue (>30 Days)',
              count: kpiData.overdueCount,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-[#8B5CF6] text-white shadow-md'
                  : 'bg-[#27272A]/40 hover:bg-[#27272A] text-zinc-400 hover:text-zinc-200 border border-[#27272A]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* ─── Interactive Receivables Ledger Table ─────────────────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#27272A]/40 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Receivables Ledger & Payment Status
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              ({filteredInvoices.length} record{filteredInvoices.length !== 1 ? 's' : ''})
            </span>
          </div>
          {searchQuery && (
            <span className="text-xs text-zinc-400 font-sans">
              Filtering by: <strong className="text-white font-mono">"{searchQuery}"</strong>
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-[#8B5CF6] mx-auto" />
            <p className="text-xs text-zinc-400">Loading advance payment records...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <AlertCircle size={28} className="text-zinc-600 mx-auto" />
            <div className="text-sm font-bold text-zinc-400">No payment records found matching your filters</div>
            <p className="text-xs text-zinc-600">Try clearing your search query or changing status filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#27272A]/20 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">PI Number & Issue Date</th>
                  <th className="py-3 px-4">Customer / Buyer Entity</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Advance Payable</th>
                  <th className="py-3 px-4">Payment / UTR Proof</th>
                  <th className="py-3 px-4 text-center">Aging & SLA Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-zinc-300">
                {filteredInvoices.map((inv) => {
                  const aging = getInvoiceAging(inv);

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#27272A]/30 transition-colors group"
                    >
                      {/* PI Number & Issue Date */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div
                          onClick={() => setSelectedInvoice(inv)}
                          className="font-mono font-bold text-[#8B5CF6] hover:text-[#A78BFA] cursor-pointer flex items-center gap-1"
                        >
                          <span>{inv.piNumber}</span>
                          <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                          <Calendar size={11} className="text-zinc-500" />
                          <span>{new Date(inv.issueDate || inv.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {aging.daysElapsed} day{aging.daysElapsed !== 1 ? 's' : ''} elapsed
                        </div>
                      </td>

                      {/* Customer Entity */}
                      <td className="py-3.5 px-4 space-y-1 max-w-[220px]">
                        <div className="font-bold text-white truncate" title={inv.customerName}>
                          {inv.customerName}
                        </div>
                        {inv.companyName && inv.companyName !== inv.customerName && (
                          <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1" title={inv.companyName}>
                            <Building2 size={11} className="text-zinc-500 shrink-0" />
                            <span className="truncate">{inv.companyName}</span>
                          </div>
                        )}
                        {inv.customerPhone && (
                          <div className="text-[10.5px] text-zinc-400 flex items-center gap-1">
                            <Phone size={10} className="text-zinc-500" />
                            <span>{inv.customerPhone}</span>
                          </div>
                        )}
                        {inv.placeOfSupply && (
                          <span className="inline-block text-[9.5px] bg-[#27272A] text-zinc-400 px-1.5 py-0.2 rounded">
                            {inv.placeOfSupply}
                          </span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3.5 px-4 text-right space-y-0.5">
                        <div className="font-mono font-bold text-white text-sm">
                          ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10.5px] text-zinc-400 font-mono">
                          Bal: ₹{inv.balancePayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Advance Payable */}
                      <td className="py-3.5 px-4 text-right space-y-1">
                        <div className="font-mono font-black text-amber-400 text-sm">
                          ₹{inv.advancePayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10.5px] text-amber-500/80 font-bold">
                          {inv.advancePercentage}% Advance Deposit
                        </div>
                      </td>

                      {/* Payment / UTR Proof */}
                      <td className="py-3.5 px-4 space-y-1.5 max-w-[200px]">
                        {aging.customerUtr ? (
                          <div className="space-y-1">
                            <div className="font-mono font-bold text-purple-300 text-[11px] bg-purple-950/70 border border-purple-800/50 px-2 py-0.5 rounded truncate" title={aging.customerUtr}>
                              UTR: {aging.customerUtr}
                            </div>
                            {aging.receiptUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewReceiptUrl(aging.receiptUrl)}
                                className="text-[10.5px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <Eye size={11} />
                                <span>View Receipt Proof</span>
                              </button>
                            )}
                          </div>
                        ) : aging.isCleared ? (
                          <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Advance Cleared
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-500 italic">
                            Awaiting client remittance
                          </span>
                        )}
                      </td>

                      {/* Aging & SLA Status */}
                      <td className="py-3.5 px-4 text-center">
                        {aging.isCleared ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            <CheckCircle2 size={12} />
                            <span>Advance Cleared</span>
                          </span>
                        ) : aging.isOverdue ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              <AlertTriangle size={12} />
                              <span>Overdue by {Math.abs(aging.daysRemaining)}d</span>
                            </span>
                            <div className="text-[10px] text-rose-400/80 font-mono">
                              Validity Expired
                            </div>
                          </div>
                        ) : aging.isExpiringSoon ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Clock size={12} />
                              <span>Due in {aging.daysRemaining}d</span>
                            </span>
                            <div className="text-[10px] text-amber-400/80 font-mono">
                              Urgent Follow-up
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              <Clock size={12} />
                              <span>{aging.daysRemaining}d remaining</span>
                            </span>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              Within 30d SLA
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-center space-x-1.5">
                        {/* Record / Confirm Payment Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentModal(inv)}
                          className="px-2.5 py-1.5 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6] text-purple-300 hover:text-white border border-[#8B5CF6]/40 rounded-lg text-xs font-bold transition-all"
                          title="Record / Confirm Payment"
                        >
                          <Landmark size={13} className="inline mr-1" />
                          <span>Clear Payment</span>
                        </button>

                        {/* View PI Details */}
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
                          title="View Full Proforma Invoice"
                        >
                          <Eye size={13} />
                        </button>

                        {/* Download PDF */}
                        <button
                          type="button"
                          onClick={() => proformaService.downloadProformaPdf(inv.id, inv.piNumber)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
                          title="Download PDF"
                        >
                          <Download size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── RECORD PAYMENT CLEARANCE MODAL ───────────────────────────────── */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Landmark size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Record & Clear Advance Remittance</h3>
                  <p className="text-[11px] text-zinc-400">PI: {paymentModalInvoice.piNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {paymentSuccessMsg && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{paymentSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
              
              {/* Customer & Amount Summary */}
              <div className="bg-[#09090B] p-3 rounded-xl border border-[#27272A] space-y-1">
                <div className="text-zinc-400">Customer: <strong className="text-white">{paymentModalInvoice.customerName}</strong> {paymentModalInvoice.companyName ? `(${paymentModalInvoice.companyName})` : ''}</div>
                <div className="text-zinc-400">Grand Total: <strong className="text-white font-mono">₹{paymentModalInvoice.grandTotal.toLocaleString('en-IN')}</strong></div>
                <div className="text-zinc-400">Expected Advance: <strong className="text-amber-400 font-mono">₹{paymentModalInvoice.advancePayable.toLocaleString('en-IN')}</strong> ({paymentModalInvoice.advancePercentage}%)</div>
              </div>

              {/* Amount Cleared */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Amount Received / Cleared (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white font-mono text-sm focus:outline-none"
                  required
                />
              </div>

              {/* Payment Mode & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                  >
                    <option value="RTGS">RTGS Bank Transfer</option>
                    <option value="NEFT">NEFT Bank Transfer</option>
                    <option value="IMPS">IMPS Instant Transfer</option>
                    <option value="UPI">UPI / VPA Transfer</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="OTHER">Other Settlement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Transaction Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* UTR / Transaction Reference */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Bank UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={paymentUtr}
                  onChange={(e) => setPaymentUtr(e.target.value)}
                  placeholder="e.g. HDFC240902123456 or CMS/RTGS/987654"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white font-mono focus:outline-none"
                  required
                />
              </div>

              {/* Target Status */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Update Proforma Status To</label>
                <select
                  value={paymentTargetStatus}
                  onChange={(e) => setPaymentTargetStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                >
                  <option value="ADVANCE_RECEIVED">Advance Remittance Received (ADVANCE_RECEIVED)</option>
                  <option value="APPROVED">Approved & Production Cleared (APPROVED)</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Accounts Clearance Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Advance verified in HDFC current account. Cleared for factory dispatch."
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white resize-none focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {savingPayment ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Confirm Payment Clearance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RECEIPT LIGHTBOX MODAL ──────────────────────────────────────── */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-4xl max-h-[90vh] bg-[#18181B] border border-[#27272A] rounded-2xl p-4 shadow-2xl flex flex-col items-center space-y-3">
            <div className="w-full flex items-center justify-between border-b border-[#27272A] pb-2 text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Landmark size={15} className="text-purple-400" /> Customer Payment Confirmation Proof
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded-lg border border-zinc-700 flex items-center gap-1 font-bold transition-colors"
                >
                  <ExternalLink size={12} /> Open Full Size
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewReceiptUrl(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[75vh] flex items-center justify-center">
              {previewReceiptUrl.toLowerCase().endsWith('.pdf') || previewReceiptUrl.includes('.pdf') ? (
                <div className="p-8 text-center space-y-3">
                  <FileText size={48} className="text-purple-400 mx-auto" />
                  <div className="text-sm font-bold text-white">Payment Receipt Document (PDF)</div>
                  <a
                    href={previewReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold rounded-xl text-xs"
                  >
                    <Download size={14} /> Download PDF Receipt
                  </a>
                </div>
              ) : (
                <img
                  src={previewReceiptUrl}
                  alt="Payment Receipt Preview"
                  className="max-w-full max-h-[72vh] object-contain rounded-lg border border-zinc-800"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
