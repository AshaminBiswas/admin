import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Receipt,
  Download,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Send,
  Calendar,
  MapPin,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  FileSpreadsheet,
  Trash2,
  Edit2,
  X,
  CreditCard,
  Building2,
  ArrowUpDown,
  FileText,
  User,
  ChevronRight,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { installerPaymentsService } from '../api/installerPaymentsService';
import type {
  InstallerBill,
  CubicleModel,
  InstallerPaymentKpis,
  CreateInstallerBillPayload,
  RecordPaymentPayload,
  CreateCubicleModelPayload,
  UpdateCubicleModelPayload,
} from '../types/installerPayment';

export function InstallerPaymentsPage() {
  const { adminUser } = useAdminAuth();
  const rawRole = adminUser?.role as any;
  const roleSlug =
    typeof rawRole === 'object' && rawRole !== null
      ? rawRole.slug ?? rawRole.name ?? 'admin'
      : rawRole ?? 'admin';
  const isSuperAdmin = (roleSlug || '').toLowerCase().includes('super');

  // Navigation tabs: 'bills' | 'models' | 'export'
  const [activeTab, setActiveTab] = useState<'bills' | 'models' | 'export'>('bills');

  // Data states
  const [bills, setBills] = useState<InstallerBill[]>([]);
  const [kpis, setKpis] = useState<InstallerPaymentKpis>({
    totalBills: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalDue: 0,
    clearedCount: 0,
    partialCount: 0,
  });
  const [models, setModels] = useState<CubicleModel[]>([]);
  const [activeModels, setActiveModels] = useState<CubicleModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PARTIAL' | 'CLEARED'>('ALL');
  const [ncrFilter, setNcrFilter] = useState<'all' | 'true' | 'false'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modals & Drawers state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<InstallerBill | null>(null);
  const [billForPayment, setBillForPayment] = useState<InstallerBill | null>(null);
  const [showModelModal, setShowModelModal] = useState<boolean>(false);
  const [editingModel, setEditingModel] = useState<CubicleModel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Export filters
  const [exportMonth, setExportMonth] = useState<number | ''>('');
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportStatus, setExportStatus] = useState<'ALL' | 'PARTIAL' | 'CLEARED'>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // ─── Formatters ─────────────────────────────────────────────────────────────
  const formatINR = (val: number | string | null | undefined): string => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Auto-dismiss notices after 5 seconds
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  // Load Models (active for bills, all for Super Admin tab)
  const loadModels = async () => {
    try {
      const all = await installerPaymentsService.listModels(false);
      setModels(all);
      setActiveModels(all.filter((m) => m.isActive));
    } catch (err: any) {
      console.error('Failed to load cubicle models:', err);
    }
  };

  // Load Bills
  const loadBills = async (page = currentPage) => {
    try {
      setIsLoading(true);
      const res = await installerPaymentsService.listBills({
        page,
        limit: 20,
        search: searchQuery,
        status: statusFilter,
        isNcr: ncrFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setBills(res.bills || []);
      setKpis(res.kpis || kpis);
      setTotalPages(res.totalPages || 1);
      setCurrentPage(res.page || 1);
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to load installer bills' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadModels();
    loadBills(1);
  }, []);

  // Reload bills when filters change
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadBills(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, statusFilter, ncrFilter, startDate, endDate]);

  // Handle Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadModels();
    loadBills(currentPage);
  };

  // ─── PDF Download Handler ──────────────────────────────────────────────────
  const handleDownloadPdf = async (bill: InstallerBill) => {
    try {
      setActionNotice({ type: 'success', message: `Generating PDF bill #${bill.billNo}...` });
      await installerPaymentsService.downloadBillPdf(bill.id, bill.billNo);
      setActionNotice({ type: 'success', message: `Bill #${bill.billNo} downloaded successfully.` });
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to download PDF bill' });
    }
  };

  // ─── Email Resend Handler ──────────────────────────────────────────────────
  const handleResendEmail = async (bill: InstallerBill) => {
    try {
      setActionNotice({ type: 'success', message: `Dispatching clearance email to ${bill.installerEmail}...` });
      await installerPaymentsService.resendClearanceEmail(bill.id);
      setActionNotice({ type: 'success', message: `Clearance email dispatched to ${bill.installerEmail}!` });
      loadBills(currentPage);
      if (selectedBillForDetails?.id === bill.id) {
        const updated = await installerPaymentsService.getBill(bill.id);
        setSelectedBillForDetails(updated);
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to dispatch email' });
    }
  };

  // ─── Export Handler ────────────────────────────────────────────────────────
  const handleTriggerExport = async () => {
    try {
      setIsExporting(true);
      await installerPaymentsService.exportExcel({
        month: exportMonth ? Number(exportMonth) : undefined,
        year: exportYear,
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
        status: exportStatus,
      });
      setActionNotice({ type: 'success', message: 'Payment history exported to Excel successfully.' });
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Excel export failed' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Context Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#18181B] p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Wrench size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Cubicle Installer Payment Tracking
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-slate-400 font-medium">
                  Disbursements
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Track installation jobs, travel expenses, partial/full settlements, and auto-issue PDF clearance bills
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#27272A] rounded-xl hover:bg-slate-200 dark:hover:bg-[#323238] transition-colors"
            title="Refresh records"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            <Plus size={18} />
            <span>New Installer Bill</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="p-1 hover:opacity-75">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hub Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#27272A] pb-1">
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'bills'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#27272A]'
          }`}
        >
          <Receipt size={17} />
          <span>Payment Records & Bills</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-black/20 text-white">
            {kpis.totalBills}
          </span>
        </button>

        {/* Tab 2: Cubicle Model Master (Super Admin Only) */}
        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'models'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#27272A]'
          }`}
        >
          <Building2 size={17} />
          <span>Cubicle Model Master</span>
          {isSuperAdmin ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <ShieldCheck size={12} /> Super Admin
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-semibold flex items-center gap-1">
              <ShieldAlert size={12} /> Locked
            </span>
          )}
        </button>

        {/* Tab 3: History Export (Super Admin Only) */}
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'export'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#27272A]'
          }`}
        >
          <FileSpreadsheet size={17} />
          <span>Full History Export (.xlsx)</span>
          {isSuperAdmin && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <ShieldCheck size={12} /> Super Admin
            </span>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: PAYMENT RECORDS & BILLS
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'bills' && (
        <div className="space-y-6">
          {/* Executive KPI Matrix */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
                <span>Total Bills Issued</span>
                <Receipt size={16} className="text-violet-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {kpis.totalBills}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <span className="font-semibold text-emerald-600">{kpis.clearedCount}</span> Cleared •{' '}
                <span className="font-semibold text-amber-600">{kpis.partialCount}</span> Partial
              </div>
            </div>

            <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
                <span>Total Installation Spend</span>
                <DollarSign size={16} className="text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatINR(kpis.totalAmount)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gross installer liabilities
              </div>
            </div>

            <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
                <span>Total Disbursed (Paid)</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(kpis.totalPaid)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Settled to installers
              </div>
            </div>

            <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
                <span>Outstanding Balance Due</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatINR(kpis.totalDue)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Awaiting clearance
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  placeholder="Search by installer name, email, bill no (PPSI-...), or site address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                {(['ALL', 'PARTIAL', 'CLEARED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === st
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#323238]'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'CLEARED' ? 'Full / Cleared' : 'Partial'}
                  </button>
                ))}
              </div>

              {/* NCR Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Region:</span>
                <select
                  value={ncrFilter}
                  onChange={(e) => setNcrFilter(e.target.value as any)}
                  className="text-xs py-1.5 px-3 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Regions</option>
                  <option value="true">Delhi NCR (Travel 0)</option>
                  <option value="false">Outstation (With Travel)</option>
                </select>
              </div>
            </div>

            {/* Date Range Sub-row */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-[#27272A] text-xs text-slate-500">
              <span className="font-medium">Install Date Range:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg text-slate-800 dark:text-slate-200"
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              {(startDate || endDate || searchQuery || statusFilter !== 'ALL' || ncrFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setNcrFilter('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-violet-600 dark:text-violet-400 hover:underline ml-auto"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Bills List / Table */}
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A]">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-violet-500" />
              <p className="text-sm">Loading installer payment records...</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="py-20 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] space-y-3">
              <Receipt size={36} className="mx-auto text-slate-400" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                No installer bills found
              </p>
              <p className="text-xs max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'ALL' || ncrFilter !== 'all'
                  ? 'Try adjusting your search queries or filter criteria.'
                  : 'Start by clicking "+ New Installer Bill" above to create your first payment record.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
              {/* Desktop Table View */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#202024] text-slate-600 dark:text-slate-300 font-semibold">
                      <th className="py-3 px-4">Bill No</th>
                      <th className="py-3 px-4">Install Date</th>
                      <th className="py-3 px-4">Installer</th>
                      <th className="py-3 px-4">Site & Region</th>
                      <th className="py-3 px-4">Models & Units</th>
                      <th className="py-3 px-4 text-right">Total Due</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Clearance Email</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-slate-200">
                    {bills.map((bill) => {
                      const isCleared = bill.paymentStatus === 'CLEARED';
                      const totalUnits = bill.items.reduce((acc, i) => acc + i.quantity, 0);

                      return (
                        <tr
                          key={bill.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-[#202024]/60 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-bold text-violet-600 dark:text-violet-400 whitespace-nowrap">
                            {bill.billNo}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {formatDate(bill.installDate)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {bill.installerName}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                              {bill.installerEmail}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-[200px]">
                            <div className="truncate text-slate-700 dark:text-slate-300">
                              {bill.siteAddress}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-400">PIN: {bill.sitePin}</span>
                              {bill.isNcr ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">
                                  Delhi NCR
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">
                                  Outstation
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium">
                              {bill.items.map((i) => `${i.modelName} (×${i.quantity})`).join(', ')}
                            </div>
                            <div className="text-[11px] text-slate-400">Total: {totalUnits} unit(s)</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatINR(bill.total)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatINR(bill.amountPaid)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                            <span className={bill.balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                              {formatINR(bill.balanceDue)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                isCleared
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {isCleared ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              {isCleared ? 'Full / Cleared' : 'Partial'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {bill.emailStatus === 'SENT' ? (
                              <span
                                className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-medium"
                                title={`Dispatched on ${formatDate(bill.emailSentAt)}`}
                              >
                                <CheckCircle2 size={13} /> Sent
                              </span>
                            ) : bill.emailStatus === 'FAILED' ? (
                              <button
                                onClick={() => handleResendEmail(bill)}
                                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-[11px] font-medium underline"
                                title={`Failed: ${bill.emailError || 'Unknown error'}. Click to retry.`}
                              >
                                <AlertCircle size={13} /> Retry
                              </button>
                            ) : isCleared ? (
                              <button
                                onClick={() => handleResendEmail(bill)}
                                className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 text-[11px] font-medium underline"
                              >
                                <Send size={12} /> Send Email
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">On Clearance</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Download PDF */}
                              <button
                                onClick={() => handleDownloadPdf(bill)}
                                className="p-1.5 text-slate-600 hover:text-violet-600 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272A]"
                                title="Download Bill PDF"
                              >
                                <Download size={15} />
                              </button>

                              {/* Record Payment if balance due */}
                              {bill.balanceDue > 0 && (
                                <button
                                  onClick={() => setBillForPayment(bill)}
                                  className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[11px] font-semibold"
                                  title="Record Payment Installment"
                                >
                                  + Pay
                                </button>
                              )}

                              {/* View Details Drawer */}
                              <button
                                onClick={() => setSelectedBillForDetails(bill)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272A]"
                                title="View Bill Dossier & Audit"
                              >
                                <ChevronRight size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Touch Cards View */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-[#27272A]">
                {bills.map((bill) => {
                  const isCleared = bill.paymentStatus === 'CLEARED';
                  return (
                    <div key={bill.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-violet-600 text-sm">{bill.billNo}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isCleared ? 'Full / Cleared' : 'Partial'}
                        </span>
                      </div>

                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">
                          {bill.installerName}
                        </div>
                        <div className="text-xs text-slate-500">{bill.installerEmail}</div>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {bill.items.map((i) => `${i.modelName} (×${i.quantity})`).join(', ')}
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-[#27272A] text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Total Due</span>
                          <span className="font-bold">{formatINR(bill.total)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Paid</span>
                          <span className="font-bold text-emerald-600">{formatINR(bill.amountPaid)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Balance</span>
                          <span className="font-bold text-amber-600">{formatINR(bill.balanceDue)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => handleDownloadPdf(bill)}
                          className="flex items-center gap-1 text-xs text-violet-600 font-medium"
                        >
                          <Download size={14} /> PDF Bill
                        </button>

                        <div className="flex items-center gap-2">
                          {bill.balanceDue > 0 && (
                            <button
                              onClick={() => setBillForPayment(bill)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                            >
                              + Pay Due
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedBillForDetails(bill)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium"
                          >
                            Dossier
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => loadBills(currentPage - 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#27272A] disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => loadBills(currentPage + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#27272A] disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: CUBICLE MODEL MASTER (SUPER ADMIN ONLY)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          {!isSuperAdmin ? (
            <div className="bg-white dark:bg-[#18181B] p-12 text-center rounded-2xl border border-slate-200 dark:border-[#27272A] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Super Admin Access Required
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Managing Cubicle Models and altering master installation rates is restricted exclusively to
                Super Administrators. Standard Admins have read-only access to models to populate bills.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Cubicle Model Catalog & Standard Rates
                  </h2>
                  <p className="text-xs text-slate-500">
                    Active models directly populate the model selector dropdown in installer bill creation
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingModel(null);
                    setShowModelModal(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus size={16} />
                  <span>Add New Model</span>
                </button>
              </div>

              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#202024] text-slate-600 dark:text-slate-300 font-semibold">
                      <th className="py-3 px-4">Model Name</th>
                      <th className="py-3 px-4 text-right">Standard Installation Price</th>
                      <th className="py-3 px-4 text-center">Active Status</th>
                      <th className="py-3 px-4 text-center">Linked Bills</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                    {models.map((model) => (
                      <tr key={model.id} className="hover:bg-slate-50/50 dark:hover:bg-[#202024]/50">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {model.modelName}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatINR(model.installationPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              model.isActive
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {model.isActive ? 'Active (Live)' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500">
                          {model._count?.billItems || 0} bill(s)
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{formatDate(model.createdAt)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingModel(model);
                                setShowModelModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-violet-600 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272A]"
                              title="Edit Price or Name"
                            >
                              <Edit2 size={14} />
                            </button>

                            {model.isActive ? (
                              <button
                                onClick={async () => {
                                  if (confirm(`Deactivate "${model.modelName}"? It will no longer appear in new bill dropdowns, but historical records will remain intact.`)) {
                                    await installerPaymentsService.deactivateModel(model.id);
                                    loadModels();
                                    setActionNotice({ type: 'success', message: `Model "${model.modelName}" deactivated.` });
                                  }
                                }}
                                className="p-1.5 text-amber-600 hover:text-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                title="Deactivate Model (Soft Delete)"
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  await installerPaymentsService.updateModel(model.id, { isActive: true });
                                  loadModels();
                                  setActionNotice({ type: 'success', message: `Model "${model.modelName}" reactivated.` });
                                }}
                                className="text-xs text-emerald-600 hover:underline font-semibold"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: FULL HISTORY EXPORT (.XLSX) (SUPER ADMIN ONLY)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {!isSuperAdmin ? (
            <div className="bg-white dark:bg-[#18181B] p-12 text-center rounded-2xl border border-slate-200 dark:border-[#27272A] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Super Admin Clearance Required
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Full payment disbursement ledger exports are restricted to Super Administrators to protect sensitive financial records.
              </p>
            </div>
          ) : (
            <div className="max-w-2xl bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-emerald-600" />
                  Excel Payment History Export (.xlsx)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Generate an audited, styled spreadsheet containing all installation jobs, installer details, models installed, travel reconciliations, and balance settlements.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Filter by Month (Optional)
                  </label>
                  <select
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="">All Months in Year</option>
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Year
                  </label>
                  <input
                    type="number"
                    value={exportYear}
                    onChange={(e) => setExportYear(Number(e.target.value))}
                    min={2020}
                    max={2099}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Payment Status Filter
                  </label>
                  <select
                    value={exportStatus}
                    onChange={(e) => setExportStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Records</option>
                    <option value="CLEARED">Full / Cleared Only</option>
                    <option value="PARTIAL">Partial Outstanding Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Custom Date Range (Overrides Year/Month)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-1/2 text-xs p-2 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-1/2 text-xs p-2 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#27272A] flex items-center justify-between">
                <span className="text-xs text-slate-500">Format: Standard Excel Binary (.xlsx)</span>
                <button
                  onClick={handleTriggerExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isExporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
                  <span>{isExporting ? 'Generating Spreadsheet...' : 'Download Excel Report'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 1: NEW INSTALLER BILL MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <CreateBillModal
          activeModels={activeModels}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadBills(1);
            setActionNotice({ type: 'success', message: 'Installer payment bill created successfully!' });
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 2: RECORD PAYMENT INSTALLMENT MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {billForPayment && (
        <RecordPaymentModal
          bill={billForPayment}
          onClose={() => setBillForPayment(null)}
          onSuccess={() => {
            setBillForPayment(null);
            loadBills(currentPage);
            setActionNotice({ type: 'success', message: 'Payment installment recorded successfully!' });
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          DRAWER: BILL DOSSIER & AUDIT DETAILS
      ────────────────────────────────────────────────────────────────────────── */}
      {selectedBillForDetails && (
        <BillDetailsDrawer
          bill={selectedBillForDetails}
          onClose={() => setSelectedBillForDetails(null)}
          onDownloadPdf={() => handleDownloadPdf(selectedBillForDetails)}
          onResendEmail={() => handleResendEmail(selectedBillForDetails)}
          onRecordPayment={() => {
            setBillForPayment(selectedBillForDetails);
            setSelectedBillForDetails(null);
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 3: CUBICLE MODEL MASTER ADD/EDIT MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {showModelModal && (
        <CubicleModelModal
          model={editingModel}
          onClose={() => setShowModelModal(false)}
          onSuccess={() => {
            setShowModelModal(false);
            loadModels();
            setActionNotice({
              type: 'success',
              message: editingModel ? 'Cubicle model updated successfully.' : 'New cubicle model created.',
            });
          }}
        />
      )}
    </div>
  );
}

// ─── SUB-COMPONENT: CREATE BILL MODAL ────────────────────────────────────────

interface CreateBillModalProps {
  activeModels: CubicleModel[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreateBillModal({ activeModels, onClose, onSuccess }: CreateBillModalProps) {
  const [installerName, setInstallerName] = useState('');
  const [installerEmail, setInstallerEmail] = useState('');
  const [installDate, setInstallDate] = useState(new Date().toISOString().slice(0, 10));
  const [isNcr, setIsNcr] = useState(false);
  const [travelExpenses, setTravelExpenses] = useState<number>(0);
  const [siteAddress, setSiteAddress] = useState('');
  const [sitePin, setSitePin] = useState('');

  // Line Items Builder: supports 1 model by default, expandable to multi-model visits
  const [lineItems, setLineItems] = useState<Array<{ modelId: string; quantity: number }>>([
    { modelId: activeModels[0]?.id || '', quantity: 1 },
  ]);

  const [initialAmountPaid, setInitialAmountPaid] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Model lookup helper
  const modelMap = useMemo(() => {
    const map = new Map<string, CubicleModel>();
    activeModels.forEach((m) => map.set(m.id, m));
    return map;
  }, [activeModels]);

  // Subtotal calculation live
  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => {
      const model = modelMap.get(item.modelId);
      const price = model ? Number(model.installationPrice) : 0;
      return acc + item.quantity * price;
    }, 0);
  }, [lineItems, modelMap]);

  // Actual travel expenses: forced to 0 if NCR = Yes
  const effectiveTravel = isNcr ? 0 : Number(travelExpenses || 0);
  const grandTotal = subtotal + effectiveTravel;
  const balanceDue = Math.max(0, grandTotal - Number(initialAmountPaid || 0));
  const isCleared = Number(initialAmountPaid || 0) >= grandTotal && grandTotal > 0;

  const handleAddLineItem = () => {
    if (activeModels.length === 0) return;
    setLineItems([...lineItems, { modelId: activeModels[0].id, quantity: 1 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, modelId: string, quantity: number) => {
    const updated = [...lineItems];
    updated[index] = { modelId, quantity: Math.max(1, quantity) };
    setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    if (!installerName.trim()) return setErrorMsg('Installer name is required.');
    if (!installerEmail.trim() || !/^\S+@\S+\.\S+$/.test(installerEmail)) {
      return setErrorMsg('A valid installer email is required.');
    }
    if (!siteAddress.trim()) return setErrorMsg('Installation site address is required.');
    if (!/^\d{6}$/.test(sitePin.trim())) {
      return setErrorMsg('Site PIN must be a valid 6-digit Indian postal code.');
    }
    if (lineItems.some((i) => !i.modelId || i.quantity < 1)) {
      return setErrorMsg('Each line item must have a selected cubicle model and minimum quantity of 1.');
    }
    if (!isNcr && (travelExpenses === undefined || travelExpenses < 0)) {
      return setErrorMsg('Travel expenses are required for outstation installation jobs (NCR = No).');
    }

    try {
      setIsSubmitting(true);
      const payload: CreateInstallerBillPayload = {
        installerName: installerName.trim(),
        installerEmail: installerEmail.trim().toLowerCase(),
        installDate,
        isNcr,
        travelExpenses: isNcr ? 0 : Number(travelExpenses || 0),
        siteAddress: siteAddress.trim(),
        sitePin: sitePin.trim(),
        items: lineItems,
        initialAmountPaid: Number(initialAmountPaid || 0),
        paymentDate: initialAmountPaid > 0 ? paymentDate : undefined,
        paymentMode: initialAmountPaid > 0 ? paymentMode : undefined,
        notes: notes.trim() || undefined,
      };

      await installerPaymentsService.createBill(payload);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create installer bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-[#18181B] w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt size={18} className="text-violet-600" />
              New Cubicle Installer Payment Record
            </h3>
            <p className="text-xs text-slate-500">
              Bill No will be auto-assigned server-side in sequence (e.g. PPSI-00001)
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Installer Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Installer Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Kumar"
                value={installerName}
                onChange={(e) => setInstallerName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Installer Email * (For Bill PDF)
              </label>
              <input
                type="email"
                required
                placeholder="rajesh.installer@gmail.com"
                value={installerEmail}
                onChange={(e) => setInstallerEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date of Installation *
              </label>
              <input
                type="date"
                required
                value={installDate}
                onChange={(e) => setInstallDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Section 2: Site Address & NCR Policy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Installation Site Address *
              </label>
              <input
                type="text"
                required
                placeholder="Building Name, Tower, Floor, Commercial Complex..."
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Site Postal PIN * (6-Digit)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="110001"
                value={sitePin}
                onChange={(e) => setSitePin(e.target.value.replace(/\D/g, ''))}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Section 3: NCR Region & Travel Expenses Locking */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#202024] rounded-xl border border-slate-200 dark:border-[#27272A] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">NCR Region Installation?</span>
                <p className="text-[11px] text-slate-500">
                  When Yes: Travel Expenses are locked to ₹0. When No: Travel Expenses are required.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNcr(true);
                    setTravelExpenses(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    isNcr
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-[#27272A] text-slate-600 dark:text-slate-300 border'
                  }`}
                >
                  Yes (NCR: Waive Travel)
                </button>
                <button
                  type="button"
                  onClick={() => setIsNcr(false)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    !isNcr
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-[#27272A] text-slate-600 dark:text-slate-300 border'
                  }`}
                >
                  No (Outstation Claim)
                </button>
              </div>
            </div>

            {!isNcr ? (
              <div className="pt-2 border-t border-slate-200 dark:border-[#27272A]">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Verified Travel Expenses (₹) *
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  required={!isNcr}
                  placeholder="Enter outstation travel claim in ₹..."
                  value={travelExpenses}
                  onChange={(e) => setTravelExpenses(Number(e.target.value))}
                  className="w-full sm:w-1/2 p-2 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>
            ) : (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Delhi NCR Installation: Travel expenses locked at ₹0.00 in saved record.
              </div>
            )}
          </div>

          {/* Section 4: Cubicle Model Line Items (Dropdown live from cubicle_models) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white">Cubicle Installation Models</span>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-violet-600 dark:text-violet-400 hover:underline text-xs flex items-center gap-1 font-semibold"
              >
                <Plus size={13} /> Add Another Model
              </button>
            </div>

            {lineItems.map((item, idx) => {
              const model = modelMap.get(item.modelId);
              const price = model ? Number(model.installationPrice) : 0;
              const lineTotal = item.quantity * price;

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-center gap-2 p-2.5 bg-slate-50 dark:bg-[#202024] rounded-xl border border-slate-200 dark:border-[#27272A]"
                >
                  {/* Model Dropdown */}
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Model</label>
                    <select
                      value={item.modelId}
                      onChange={(e) => handleUpdateLineItem(idx, e.target.value, item.quantity)}
                      className="w-full p-2 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg font-semibold"
                    >
                      {activeModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.modelName} (Rate: ₹{Number(m.installationPrice).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="w-full sm:w-24">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleUpdateLineItem(idx, item.modelId, parseInt(e.target.value, 10) || 1)}
                      className="w-full p-2 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg font-bold text-center"
                    />
                  </div>

                  {/* Read-Only Installation Price */}
                  <div className="w-full sm:w-28">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Unit Price (Read-only)</label>
                    <div className="p-2 bg-slate-100 dark:bg-[#27272A] rounded-lg text-right font-medium text-slate-600 dark:text-slate-300">
                      ₹{price.toFixed(2)}
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="w-full sm:w-32">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Line Total</label>
                    <div className="p-2 bg-slate-100 dark:bg-[#27272A] rounded-lg text-right font-bold text-slate-900 dark:text-white">
                      ₹{lineTotal.toFixed(2)}
                    </div>
                  </div>

                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(idx)}
                      className="text-rose-500 hover:text-rose-700 p-2 sm:mt-4"
                      title="Remove line item"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section 5: Live Auto-Calculated Financial Summary Banner */}
          <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-400">Installation Subtotal:</span>
              <span className="font-bold">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-400">Travel Expenses:</span>
              <span className="font-bold">{isNcr ? '₹0.00 (NCR Waived)' : `₹${effectiveTravel.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white border-t border-violet-200 dark:border-violet-800 pt-2">
              <span>Total Calculated:</span>
              <span className="text-base text-violet-700 dark:text-violet-300">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Section 6: Payment Tracking & Auto-Clearance Flip */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#202024] rounded-xl border border-slate-200 dark:border-[#27272A] space-y-3">
            <span className="font-bold text-slate-900 dark:text-white block">Payment Settlement</span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Amount Paid (₹)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={grandTotal}
                    step="any"
                    value={initialAmountPaid}
                    onChange={(e) => setInitialAmountPaid(Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg font-bold text-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setInitialAmountPaid(grandTotal)}
                    className="px-2 py-2 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-lg text-[10px] font-bold whitespace-nowrap"
                  >
                    Full
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remaining Balance Due
                </label>
                <div className="p-2 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg font-bold text-amber-600">
                  ₹{balanceDue.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Auto-Computed Status
                </label>
                <div className="p-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isCleared ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                    {isCleared ? 'FULL / CLEARED' : 'PARTIAL'}
                  </span>
                </div>
              </div>
            </div>

            {initialAmountPaid > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-[#27272A]">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>
            )}

            {isCleared && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Mail size={15} />
                <span>
                  Bill will be generated in <strong>CLEARED</strong> status. The PDF invoice will be automatically emailed to <strong>{installerEmail || 'installer'}</strong> upon submission.
                </span>
              </div>
            )}
          </div>

          {/* Section 7: Notes */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Special floor fittings verified by site engineer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw size={15} className="animate-spin" />}
              <span>Generate Bill & Record Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENT: RECORD PAYMENT MODAL ──────────────────────────────────────

interface RecordPaymentModalProps {
  bill: InstallerBill;
  onClose: () => void;
  onSuccess: () => void;
}

function RecordPaymentModal({ bill, onClose, onSuccess }: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<number>(Number(bill.balanceDue));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [referenceNote, setReferenceNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return setErrorMsg('Payment amount must be greater than 0.');

    try {
      setIsSubmitting(true);
      await installerPaymentsService.recordPayment(bill.id, {
        amount,
        paymentDate,
        paymentMode,
        referenceNote: referenceNote.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#18181B] w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xl overflow-hidden text-xs">
        <div className="p-4 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard size={16} className="text-emerald-600" />
              Record Payment Installment
            </h3>
            <span className="text-slate-400">Bill: {bill.billNo} • {bill.installerName}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-[#202024] rounded-xl flex justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Total Bill</span>
              <span className="font-bold text-sm">₹{Number(bill.total).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Current Paid</span>
              <span className="font-bold text-sm text-emerald-600">₹{Number(bill.amountPaid).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Balance Due</span>
              <span className="font-bold text-sm text-amber-600">₹{Number(bill.balanceDue).toFixed(2)}</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Installment Amount (₹) *
              </label>
              <button
                type="button"
                onClick={() => setAmount(Number(bill.balanceDue))}
                className="text-violet-600 hover:underline font-bold text-[11px]"
              >
                Clear Full Balance (₹{Number(bill.balanceDue).toFixed(2)})
              </button>
            </div>
            <input
              type="number"
              min={0.01}
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl font-bold text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
              >
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="UPI">UPI / QR</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reference / UTR Note
            </label>
            <input
              type="text"
              placeholder="e.g. Bank UTR #1234567890"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
              <span>Confirm & Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENT: BILL DETAILS DRAWER ──────────────────────────────────────

interface BillDetailsDrawerProps {
  bill: InstallerBill;
  onClose: () => void;
  onDownloadPdf: () => void;
  onResendEmail: () => void;
  onRecordPayment: () => void;
}

function BillDetailsDrawer({
  bill,
  onClose,
  onDownloadPdf,
  onResendEmail,
  onRecordPayment,
}: BillDetailsDrawerProps) {
  const isCleared = bill.paymentStatus === 'CLEARED';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-[#18181B] h-full shadow-2xl border-l border-slate-200 dark:border-[#27272A] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-violet-600">{bill.billNo}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isCleared ? 'Full / Cleared' : 'Partial'}
              </span>
            </div>
            <span className="text-slate-400 text-xs">Installed on {new Date(bill.installDate).toLocaleDateString('en-IN')}</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Installer Dossier */}
          <div className="p-4 bg-slate-50 dark:bg-[#202024] rounded-2xl space-y-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <User size={14} className="text-violet-500" /> Installer Dossier
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Name</span>
                <span className="font-semibold">{bill.installerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Email</span>
                <span className="font-semibold truncate block">{bill.installerEmail}</span>
              </div>
            </div>
          </div>

          {/* Site Logistics */}
          <div className="p-4 bg-slate-50 dark:bg-[#202024] rounded-2xl space-y-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <MapPin size={14} className="text-blue-500" /> Installation Site
            </span>
            <p className="text-slate-700 dark:text-slate-300">{bill.siteAddress}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-slate-400">PIN: {bill.sitePin}</span>
              <span>•</span>
              <span className={bill.isNcr ? 'text-emerald-600 font-medium' : 'text-blue-600 font-medium'}>
                {bill.isNcr ? 'Delhi NCR (Travel Waived)' : 'Outstation'}
              </span>
            </div>
          </div>

          {/* Itemized Cubicle Scope */}
          <div>
            <span className="font-bold text-slate-900 dark:text-white block mb-2">
              Cubicle Models Installed
            </span>
            <div className="divide-y divide-slate-100 dark:divide-[#27272A] border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden">
              {bill.items.map((item, i) => (
                <div key={i} className="p-3 flex justify-between items-center bg-white dark:bg-[#18181B]">
                  <div>
                    <span className="font-semibold block">{item.modelName}</span>
                    <span className="text-slate-400 text-[11px]">
                      {item.quantity} unit(s) @ ₹{Number(item.installationPrice).toFixed(2)}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{Number(item.lineTotal).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 bg-slate-50 dark:bg-[#202024] rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Installation Subtotal:</span>
              <span className="font-semibold">₹{Number(bill.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Travel Expenses:</span>
              <span className="font-semibold">
                {bill.isNcr ? '₹0.00 (NCR)' : `₹${Number(bill.travelExpenses).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-[#27272A] pt-2">
              <span>Total Bill:</span>
              <span>₹{Number(bill.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Amount Paid:</span>
              <span>₹{Number(bill.amountPaid).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-amber-600 font-bold">
              <span>Balance Due:</span>
              <span>₹{Number(bill.balanceDue).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Installments Timeline */}
          {bill.payments && bill.payments.length > 0 && (
            <div>
              <span className="font-bold text-slate-900 dark:text-white block mb-2">
                Disbursement History
              </span>
              <div className="space-y-2">
                {bill.payments.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-[#202024] rounded-xl border border-slate-200 dark:border-[#27272A] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-emerald-600">₹{Number(p.amount).toFixed(2)}</span>
                      <div className="text-[11px] text-slate-400">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN')} • {p.paymentMode || 'N/A'}
                      </div>
                      {p.referenceNote && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{p.referenceNote}</div>
                      )}
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Status & Audit */}
          <div className="p-4 bg-slate-50 dark:bg-[#202024] rounded-2xl space-y-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Mail size={14} className="text-violet-500" /> Clearance Email Status
            </span>
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <span
                className={`font-semibold ${
                  bill.emailStatus === 'SENT'
                    ? 'text-emerald-600'
                    : bill.emailStatus === 'FAILED'
                    ? 'text-rose-600'
                    : 'text-slate-400'
                }`}
              >
                {bill.emailStatus || 'Pending Clearance'}
              </span>
            </div>
            {bill.emailSentAt && (
              <div className="text-[11px] text-slate-400">
                Dispatched at: {new Date(bill.emailSentAt).toLocaleString('en-IN')}
              </div>
            )}
            {bill.emailError && (
              <div className="text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg">
                Error: {bill.emailError}
              </div>
            )}
            {isCleared && (
              <button
                onClick={onResendEmail}
                className="w-full mt-2 py-1.5 bg-slate-200 dark:bg-[#323238] hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Send size={13} /> Resend Clearance Email
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-[#27272A] flex items-center gap-2">
          <button
            onClick={onDownloadPdf}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            <Download size={15} /> Download PDF Bill
          </button>
          {bill.balanceDue > 0 && (
            <button
              onClick={onRecordPayment}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5"
            >
              + Pay Due
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENT: CUBICLE MODEL MASTER MODAL ───────────────────────────────

interface CubicleModelModalProps {
  model: CubicleModel | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CubicleModelModal({ model, onClose, onSuccess }: CubicleModelModalProps) {
  const [modelName, setModelName] = useState(model?.modelName || '');
  const [installationPrice, setInstallationPrice] = useState<number>(
    model ? Number(model.installationPrice) : 900
  );
  const [isActive, setIsActive] = useState<boolean>(model ? model.isActive : true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) return setErrorMsg('Model name is required.');
    if (!installationPrice || installationPrice <= 0) {
      return setErrorMsg('Installation price must be greater than 0.');
    }

    try {
      setIsSubmitting(true);
      if (model) {
        await installerPaymentsService.updateModel(model.id, {
          modelName: modelName.trim(),
          installationPrice,
          isActive,
        });
      } else {
        await installerPaymentsService.createModel({
          modelName: modelName.trim(),
          installationPrice,
          isActive,
        });
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save model');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#18181B] w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xl overflow-hidden text-xs">
        <div className="p-4 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 size={16} className="text-violet-600" />
            {model ? 'Edit Cubicle Model' : 'Register New Cubicle Model'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Model Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Delight, Sky Light, Horizon..."
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl font-medium text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Installation Price (₹ per unit) *
            </label>
            <input
              type="number"
              min={1}
              step="any"
              required
              placeholder="900"
              value={installationPrice}
              onChange={(e) => setInstallationPrice(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl font-bold text-slate-900 dark:text-white text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="modelActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="modelActiveToggle" className="text-slate-700 dark:text-slate-300 font-medium">
              Active (Visible in payment bill creation dropdowns)
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#27272A] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
              <span>{model ? 'Save Changes' : 'Create Model'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
