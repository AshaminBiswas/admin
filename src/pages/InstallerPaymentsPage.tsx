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
  Users,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { installerPaymentsService } from '../api/installerPaymentsService';
import { isNcrPinCode } from '../utils/ncrPincodes';
import type {
  InstallerBill,
  CubicleModel,
  CubicleInstaller,
  InstallerPaymentKpis,
  CreateInstallerBillPayload,
  RecordPaymentPayload,
  CreateCubicleModelPayload,
  UpdateCubicleModelPayload,
  InstallerLedgerResponse,
  UpdateInstallerBillPayload,
  BillAuditLogEntry,
} from '../types/installerPayment';

export interface InstallerPaymentsPageProps {
  onNewBill?: () => void;
}

export function InstallerPaymentsPage({ onNewBill }: InstallerPaymentsPageProps = {}) {
  const { adminUser } = useAdminAuth();
  const rawRole = adminUser?.role as any;
  const roleSlug =
    typeof rawRole === 'object' && rawRole !== null
      ? rawRole.slug ?? rawRole.name ?? 'admin'
      : rawRole ?? 'admin';
  const isSuperAdmin = (roleSlug || '').toLowerCase().includes('super');

  // Navigation tabs: 'bills' | 'installers' | 'models' | 'export' | 'ledger'
  const [activeTab, setActiveTab] = useState<'bills' | 'installers' | 'models' | 'export' | 'ledger'>('bills');

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

  // Filters state (Tab 1)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [installerFilter, setInstallerFilter] = useState<string>('all');
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
  const [billForEdit, setBillForEdit] = useState<InstallerBill | null>(null);
  const [showModelModal, setShowModelModal] = useState<boolean>(false);
  const [editingModel, setEditingModel] = useState<CubicleModel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modelCategoryFilter, setModelCategoryFilter] = useState<'ALL' | 'CUBICLE' | 'UMP' | 'LOCKER'>('ALL');

  // Installers Master State (Super Admin)
  const [installers, setInstallers] = useState<CubicleInstaller[]>([]);
  const [showInstallerModal, setShowInstallerModal] = useState<boolean>(false);
  const [editingInstaller, setEditingInstaller] = useState<CubicleInstaller | null>(null);
  const [installerFormData, setInstallerFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    isActive: boolean;
  }>({ name: '', email: '', phone: '', isActive: true });

  // Installer-Wise Ledger & Payment Statement State (Tab 5)
  const [selectedLedgerInstallerId, setSelectedLedgerInstallerId] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<InstallerLedgerResponse | null>(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState<boolean>(false);
  const [isExportingLedger, setIsExportingLedger] = useState<boolean>(false);

  // Export filters
  const [exportMonth, setExportMonth] = useState<number | ''>('');
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportStatus, setExportStatus] = useState<'ALL' | 'PARTIAL' | 'CLEARED'>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Super Admin Delete Bill State
  const [billToDelete, setBillToDelete] = useState<InstallerBill | null>(null);
  const [isDeletingBill, setIsDeletingBill] = useState<boolean>(false);

  // Dedicated Installer Email Modal State
  const [billForEmail, setBillForEmail] = useState<InstallerBill | null>(null);
  const [emailRecipientInput, setEmailRecipientInput] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // ─── Formatters ─────────────────────────────────────────────────────────────
  const formatINR = (val: number | string | null | undefined): string => {
    const num = Number(val ?? 0);
    return isNaN(num)
      ? '₹0.00'
      : `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
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
      const safe = Array.isArray(all) ? all : [];
      setModels(safe);
      setActiveModels(safe.filter((m) => m && m.isActive));
    } catch (err: any) {
      console.error('Failed to load cubicle models:', err);
      setModels([]);
      setActiveModels([]);
    }
  };

  // Load Installers (Super Admin & bill form)
  const loadInstallers = async () => {
    try {
      const res = await installerPaymentsService.listInstallers(true);
      const safe = Array.isArray(res) ? res : [];
      setInstallers(safe);
    } catch (err: any) {
      console.error('Failed to load installers:', err);
      setInstallers([]);
    }
  };

  const handleSaveInstaller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installerFormData.name.trim() || !installerFormData.email.trim()) {
      setActionNotice({ type: 'error', message: 'Name and Email are required for installer.' });
      return;
    }
    try {
      setIsSubmitting(true);
      if (editingInstaller) {
        await installerPaymentsService.updateInstaller(editingInstaller.id, {
          name: installerFormData.name.trim(),
          email: installerFormData.email.trim().toLowerCase(),
          phone: installerFormData.phone.trim() || undefined,
          isActive: installerFormData.isActive,
        });
        setActionNotice({ type: 'success', message: 'Installer updated successfully!' });
      } else {
        await installerPaymentsService.createInstaller({
          name: installerFormData.name.trim(),
          email: installerFormData.email.trim().toLowerCase(),
          phone: installerFormData.phone.trim() || undefined,
          isActive: installerFormData.isActive,
        });
        setActionNotice({ type: 'success', message: 'Installer registered successfully!' });
      }
      setShowInstallerModal(false);
      await loadInstallers();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Failed to save installer' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateInstaller = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this installer?')) return;
    try {
      await installerPaymentsService.deactivateInstaller(id);
      setActionNotice({ type: 'success', message: 'Installer deactivated.' });
      await loadInstallers();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Failed to deactivate installer' });
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
        installerId: installerFilter !== 'all' ? installerFilter : undefined,
        status: statusFilter,
        isNcr: ncrFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setBills(Array.isArray(res?.bills) ? res.bills : []);
      setKpis(res?.kpis || kpis);
      setTotalPages(res?.totalPages || 1);
      setCurrentPage(res?.page || 1);
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to load installer bills' });
      setBills([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadModels();
    loadBills(1);
    loadInstallers();
  }, []);

  // Reload bills when filters change
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadBills(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, installerFilter, statusFilter, ncrFilter, startDate, endDate]);

  // Load Installer Ledger Statement (Tab 5)
  const loadInstallerLedger = async (installerId: string) => {
    if (!installerId) {
      setLedgerData(null);
      return;
    }
    try {
      setIsLoadingLedger(true);
      const res = await installerPaymentsService.getInstallerLedger(installerId);
      setLedgerData(res);
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to load installer ledger' });
      setLedgerData(null);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  // Auto load ledger when tab becomes 'ledger' or when selected installer changes
  useEffect(() => {
    if (activeTab === 'ledger') {
      if (!selectedLedgerInstallerId && installers.length > 0) {
        setSelectedLedgerInstallerId(installers[0].id);
      } else if (selectedLedgerInstallerId) {
        loadInstallerLedger(selectedLedgerInstallerId);
      }
    }
  }, [activeTab, selectedLedgerInstallerId, installers]);

  // Export Installer Ledger Statement to Excel
  const handleExportLedgerExcel = async (installerId: string, installerName: string) => {
    try {
      setIsExportingLedger(true);
      const cleanName = (installerName || 'Installer').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanName}_Payment_Statement.xlsx`;
      await installerPaymentsService.exportExcel({ installerId }, filename);
      setActionNotice({ type: 'success', message: `Statement for ${installerName} downloaded successfully.` });
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to export installer statement' });
    } finally {
      setIsExportingLedger(false);
    }
  };

  // Handle Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadModels();
    loadBills(currentPage);
    if (activeTab === 'ledger' && selectedLedgerInstallerId) {
      loadInstallerLedger(selectedLedgerInstallerId);
    }
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

  // ─── Email Modal & Send Handler ───────────────────────────────────────────
  const handleOpenSendEmailModal = (bill: InstallerBill) => {
    setBillForEmail(bill);
    setEmailRecipientInput(bill.installerEmail || '');
  };

  const handleSendBillEmail = async () => {
    if (!billForEmail) return;
    const targetEmail = (emailRecipientInput || billForEmail.installerEmail || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setActionNotice({ type: 'error', message: 'Please enter a valid installer email address.' });
      return;
    }

    try {
      setIsSendingEmail(true);
      setActionNotice({ type: 'success', message: `Dispatching payment voucher to ${targetEmail}...` });
      await installerPaymentsService.resendClearanceEmail(billForEmail.id, targetEmail);
      setActionNotice({ type: 'success', message: `Payment voucher successfully dispatched to ${targetEmail}!` });
      setBillForEmail(null);
      loadBills(currentPage);
      if (selectedBillForDetails?.id === billForEmail.id) {
        const updated = await installerPaymentsService.getBill(billForEmail.id);
        setSelectedBillForDetails(updated);
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to dispatch email' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // ─── Super Admin Delete Bill Handler ───────────────────────────────────────
  const handleDeleteBill = async () => {
    if (!billToDelete) return;
    if (!isSuperAdmin) {
      setActionNotice({ type: 'error', message: 'Access denied: Only Super Admin can delete installer bills.' });
      return;
    }

    try {
      setIsDeletingBill(true);
      await installerPaymentsService.deleteBill(billToDelete.id);
      setActionNotice({
        type: 'success',
        message: `Bill #${billToDelete.billNo} has been deleted successfully.`,
      });
      if (selectedBillForDetails?.id === billToDelete.id) {
        setSelectedBillForDetails(null);
      }
      setBillToDelete(null);
      await loadBills(currentPage);
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to delete installer bill' });
    } finally {
      setIsDeletingBill(false);
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
            onClick={() => {
              if (onNewBill) {
                onNewBill();
              } else {
                setShowCreateModal(true);
              }
            }}
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
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#27272A] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
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

        {/* Tab 2: Installers Directory (Super Admin Only) */}
        <button
          onClick={() => setActiveTab('installers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === 'installers'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#27272A]'
          }`}
        >
          <Users size={17} />
          <span>Installers Directory</span>
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

        {/* Tab 3: Cubicle Model Master (Super Admin Only) */}
        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
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

        {/* Tab 4: History Export (Super Admin Only) */}
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
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

        {/* Tab 5: Installer Ledgers & Payment History */}
        <button
          onClick={() => {
            setActiveTab('ledger');
            if (!selectedLedgerInstallerId && installers.length > 0) {
              setSelectedLedgerInstallerId(installers[0].id);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === 'ledger'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#27272A]'
          }`}
        >
          <Clock size={17} />
          <span>Installer Ledgers & History</span>
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

              {/* Installer Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Installer:</span>
                <select
                  value={installerFilter}
                  onChange={(e) => setInstallerFilter(e.target.value)}
                  className="text-xs py-1.5 px-3 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg text-slate-800 dark:text-slate-200 max-w-[180px] truncate"
                >
                  <option value="all">All Installers</option>
                  {installers.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
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

              {(startDate || endDate || searchQuery || installerFilter !== 'all' || statusFilter !== 'ALL' || ncrFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setInstallerFilter('all');
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
          ) : !Array.isArray(bills) || bills.length === 0 ? (
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
                      <th className="py-3 px-4">Cubicles</th>
                      <th className="py-3 px-4">UMP</th>
                      <th className="py-3 px-4">Lockers</th>
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
                      const cubicleItems = (bill.items || []).filter(
                        (i) => (i.category || 'CUBICLE') === 'CUBICLE'
                      );
                      const umpItems = (bill.items || []).filter((i) => i.category === 'UMP');
                      const lockerItems = (bill.items || []).filter((i) => i.category === 'LOCKER');

                      const cubicleUnits =
                        bill.cubicleQuantity !== undefined && bill.cubicleQuantity !== null
                          ? Number(bill.cubicleQuantity)
                          : cubicleItems.reduce((acc, i) => acc + i.quantity, 0);
                      const umpUnits =
                        bill.umpQuantity !== undefined && bill.umpQuantity !== null
                          ? Number(bill.umpQuantity)
                          : umpItems.reduce((acc, i) => acc + i.quantity, 0);
                      const lockerUnits =
                        bill.lockerQuantity !== undefined && bill.lockerQuantity !== null
                          ? Number(bill.lockerQuantity)
                          : lockerItems.reduce((acc, i) => acc + i.quantity, 0);

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
                          {/* Cubicles Column */}
                          <td className="py-3.5 px-4 min-w-[130px]">
                            {cubicleItems.length > 0 ? (
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {cubicleItems.map((i) => `${i.modelName} (×${i.quantity})`).join(', ')}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Total: {cubicleUnits} unit(s)
                                </div>
                              </div>
                            ) : cubicleUnits > 0 ? (
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {cubicleUnits} unit(s)
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">-</span>
                            )}
                          </td>
                          {/* UMP Column */}
                          <td className="py-3.5 px-4 min-w-[120px]">
                            {umpItems.length > 0 ? (
                              <div>
                                <div className="font-medium text-emerald-700 dark:text-emerald-300">
                                  {umpItems.map((i) => `${i.modelName} (×${i.quantity})`).join(', ')}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Total: {umpUnits} UMP
                                </div>
                              </div>
                            ) : umpUnits > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                {umpUnits} UMP
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">-</span>
                            )}
                          </td>
                          {/* Lockers Column */}
                          <td className="py-3.5 px-4 min-w-[120px]">
                            {lockerItems.length > 0 ? (
                              <div>
                                <div className="font-medium text-blue-700 dark:text-blue-300">
                                  {lockerItems.map((i) => `${i.modelName} (×${i.quantity})`).join(', ')}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Total: {lockerUnits} unit(s)
                                </div>
                              </div>
                            ) : lockerUnits > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                {lockerUnits} Locker(s)
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">{formatINR(bill.total)}</div>
                            {Number(bill.deductionAmount || 0) > 0 && (
                              <div
                                className="text-[10px] text-rose-500 font-semibold flex items-center justify-end gap-0.5 mt-0.5"
                                title={`Deduction: -₹${Number(bill.deductionAmount).toLocaleString('en-IN')}${bill.deductionReason ? ` (${bill.deductionReason})` : ''}`}
                              >
                                <span>-₹{Number(bill.deductionAmount).toLocaleString('en-IN')} ded.</span>
                              </div>
                            )}
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
                              <div className="inline-flex items-center justify-center gap-1.5">
                                <span
                                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium"
                                  title={`Dispatched to ${bill.installerEmail} on ${formatDate(bill.emailSentAt)}`}
                                >
                                  <CheckCircle2 size={13} /> Sent
                                </span>
                                <button
                                  onClick={() => handleOpenSendEmailModal(bill)}
                                  className="text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-[10px] font-medium underline transition-colors"
                                  title={`Resend payment advice & PDF voucher to ${bill.installerEmail}`}
                                >
                                  Resend
                                </button>
                              </div>
                            ) : bill.emailStatus === 'FAILED' ? (
                              <button
                                onClick={() => handleOpenSendEmailModal(bill)}
                                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-[11px] font-medium underline"
                                title={`Failed: ${bill.emailError || 'Unknown error'}. Click to verify email & retry.`}
                              >
                                <AlertCircle size={13} /> Retry
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenSendEmailModal(bill)}
                                className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-[11px] font-medium underline"
                                title={`Send payment advice & PDF voucher to ${bill.installerEmail}`}
                              >
                                <Send size={12} /> Send Email
                              </button>
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

                              {/* Super Admin Edit Action */}
                              {isSuperAdmin && (
                                <button
                                  onClick={() => setBillForEdit(bill)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                  title="Edit Bill Details (Super Admin only)"
                                >
                                  <Edit2 size={15} />
                                </button>
                              )}

                              {/* Super Admin Delete Action */}
                              {isSuperAdmin && (
                                <button
                                  onClick={() => setBillToDelete(bill)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                  title="Delete Bill (Super Admin only)"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
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

                      {(() => {
                        const cItems = (bill.items || []).filter((i) => (i.category || 'CUBICLE') === 'CUBICLE');
                        const uItems = (bill.items || []).filter((i) => i.category === 'UMP');
                        const lItems = (bill.items || []).filter((i) => i.category === 'LOCKER');
                        const cQty = bill.cubicleQuantity ?? cItems.reduce((acc, i) => acc + i.quantity, 0);
                        const uQty = bill.umpQuantity ?? uItems.reduce((acc, i) => acc + i.quantity, 0);
                        const lQty = bill.lockerQuantity ?? lItems.reduce((acc, i) => acc + i.quantity, 0);

                        return (
                          <div className="text-xs space-y-1 bg-slate-50 dark:bg-[#202024] p-2.5 rounded-xl border border-slate-100 dark:border-[#27272A]">
                            {cItems.length > 0 ? (
                              <div className="text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-violet-600 dark:text-violet-400">Cubicle: </span>
                                {cItems.map((i) => `${i.modelName} (×${i.quantity})`).join(', ')}
                              </div>
                            ) : cQty > 0 ? (
                              <div className="text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-violet-600 dark:text-violet-400">Cubicle: </span>
                                {cQty} unit(s)
                              </div>
                            ) : null}

                            {uItems.length > 0 ? (
                              <div className="text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">UMP: </span>
                                {uItems.map((i) => `${i.modelName} (×${i.quantity})`).join(', ')}
                              </div>
                            ) : uQty > 0 ? (
                              <div className="text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">UMP: </span>
                                {uQty} unit(s)
                              </div>
                            ) : null}

                            {lItems.length > 0 ? (
                              <div className="text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-blue-600 dark:text-blue-400">Lockers: </span>
                                {lItems.map((i) => `${i.modelName} (×${i.quantity})`).join(', ')}
                              </div>
                            ) : lQty > 0 ? (
                              <div className="text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-blue-600 dark:text-blue-400">Lockers: </span>
                                {lQty} unit(s)
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}

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
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => handleDownloadPdf(bill)}
                            className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium"
                          >
                            <Download size={13} /> PDF
                          </button>
                          <button
                            onClick={() => handleOpenSendEmailModal(bill)}
                            className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-violet-600 font-medium"
                            title={`Dispatch to ${bill.installerEmail}`}
                          >
                            <Mail size={13} /> {bill.emailStatus === 'SENT' ? 'Resend' : 'Send'}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
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
                          {isSuperAdmin && (
                            <button
                              onClick={() => setBillForEdit(bill)}
                              className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg"
                              title="Edit Bill Details (Super Admin only)"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              onClick={() => setBillToDelete(bill)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg"
                              title="Delete Bill (Super Admin only)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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
          TAB 2: INSTALLERS DIRECTORY (SUPER ADMIN ONLY)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'installers' && (
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
                Managing registered installer credentials (names, emails, contact details) is restricted exclusively to
                Super Administrators. Standard Admins can select registered installers when generating new bills to auto-populate their details.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="text-violet-600 dark:text-violet-400" size={19} />
                    Registered Cubicle Installers Directory
                  </h2>
                  <p className="text-xs text-slate-500">
                    Registered installers automatically appear in the installer selector dropdown on the New Installer Bill page for instant details auto-fetch.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingInstaller(null);
                    setInstallerFormData({ name: '', email: '', phone: '', isActive: true });
                    setShowInstallerModal(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus size={16} />
                  <span>Add New Installer</span>
                </button>
              </div>

              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#202024] text-slate-600 dark:text-slate-300 font-semibold">
                      <th className="py-3 px-4">Installer Name</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Linked Bills</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                    {!Array.isArray(installers) || installers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No installers registered yet. Click &quot;Add New Installer&quot; to register your first technician.
                        </td>
                      </tr>
                    ) : (
                      installers.map((inst) => (
                        <tr key={inst.id} className="hover:bg-slate-50/50 dark:hover:bg-[#202024]/50">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs">
                                {inst.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{inst.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {inst.email}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            {inst.phone || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                inst.isActive
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {inst.isActive ? 'Active (Live)' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-500 font-semibold">
                            {inst._count?.bills || 0} bill(s)
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{formatDate(inst.createdAt)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedLedgerInstallerId(inst.id);
                                  setActiveTab('ledger');
                                }}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                title="View Payment Ledger & History"
                              >
                                <Receipt size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingInstaller(inst);
                                  setInstallerFormData({
                                    name: inst.name,
                                    email: inst.email,
                                    phone: inst.phone || '',
                                    isActive: inst.isActive,
                                  });
                                  setShowInstallerModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-violet-600 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272A]"
                                title="Edit Installer"
                              >
                                <Edit2 size={15} />
                              </button>
                              {inst.isActive && (
                                <button
                                  onClick={() => handleDeactivateInstaller(inst.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title="Deactivate Installer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: CUBICLE MODEL MASTER (SUPER ADMIN ONLY)
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Installation Model Master & Rates (Cubicles, UMP, Lockers)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dynamic model catalog for Cubicles, UMP, and Lockers. Active models populate bill creation selectors.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingModel(null);
                    setShowModelModal(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
                >
                  <Plus size={16} />
                  <span>Add New Model</span>
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {(
                  [
                    { id: 'ALL', label: 'All Models' },
                    { id: 'CUBICLE', label: 'Restroom Cubicles' },
                    { id: 'UMP', label: 'Urinal Modesty Panels (UMP)' },
                    { id: 'LOCKER', label: 'Lockers' },
                  ] as const
                ).map((cat) => {
                  const count =
                    cat.id === 'ALL'
                      ? models.length
                      : models.filter((m) => (m.category || 'CUBICLE') === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setModelCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        modelCategoryFilter === cat.id
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#18181B] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#202024]'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          modelCategoryFilter === cat.id
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-[#27272A] text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#202024] text-slate-600 dark:text-slate-300 font-semibold">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Model Name</th>
                      <th className="py-3 px-4 text-right">Standard Installation Price</th>
                      <th className="py-3 px-4 text-center">Active Status</th>
                      <th className="py-3 px-4 text-center">Linked Bills</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                    {models
                      .filter((m) => {
                        if (modelCategoryFilter === 'ALL') return true;
                        return (m.category || 'CUBICLE') === modelCategoryFilter;
                      })
                      .length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No models found in this category. Click &quot;Add New Model&quot; to configure a model and rate.
                        </td>
                      </tr>
                    ) : (
                      models
                        .filter((m) => {
                          if (modelCategoryFilter === 'ALL') return true;
                          return (m.category || 'CUBICLE') === modelCategoryFilter;
                        })
                        .map((model) => {
                          const category = model.category || 'CUBICLE';
                          return (
                            <tr key={model.id} className="hover:bg-slate-50/50 dark:hover:bg-[#202024]/50">
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {category === 'CUBICLE' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40">
                                    Cubicle
                                  </span>
                                ) : category === 'UMP' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                    UMP Panel
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                    Locker
                                  </span>
                                )}
                              </td>
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
                                    title="Edit Price, Category, or Name"
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
                          );
                        })
                    )}
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
          TAB 5: INSTALLER LEDGERS & PAYMENT HISTORY
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Top Control Bar: Installer Picker + Excel Statement Export */}
          <div className="bg-white dark:bg-[#18181B] p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="text-violet-600" size={20} />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Select Installer:
                </span>
              </div>
              <select
                value={selectedLedgerInstallerId}
                onChange={(e) => setSelectedLedgerInstallerId(e.target.value)}
                className="px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-violet-500 min-w-[260px]"
              >
                {installers.length === 0 && <option value="">No registered installers</option>}
                {installers.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.email})
                  </option>
                ))}
              </select>
            </div>

            {ledgerData && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => handleExportLedgerExcel(ledgerData.installer.id, ledgerData.installer.name)}
                  disabled={isExportingLedger}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                  title="Export complete chronological statement for this technician as Excel (.xlsx)"
                >
                  {isExportingLedger ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Download Statement (.xlsx)</span>
                </button>
              </div>
            )}
          </div>

          {isLoadingLedger ? (
            <div className="py-20 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A]">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-violet-500" />
              <p className="text-sm">Loading technician ledger statement & lifetime metrics...</p>
            </div>
          ) : !ledgerData ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] space-y-2">
              <Receipt size={36} className="mx-auto text-slate-400" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                Please select an installer to view their payment history & ledger.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Installer Overview Profile Card */}
              <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-5 rounded-2xl border border-violet-200 dark:border-violet-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {ledgerData.installer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {ledgerData.installer.name}
                      </h2>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          ledgerData.installer.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {ledgerData.installer.isActive ? 'Active Technician' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {ledgerData.installer.email}
                      </span>
                      {ledgerData.installer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {ledgerData.installer.phone}
                        </span>
                      )}
                      <span>
                        Registered: {formatDate(ledgerData.installer.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-[#18181B] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#27272A] text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Settlement Status</span>
                    <span className="font-bold text-emerald-600">
                      {ledgerData.kpis.clearedCount} Cleared
                    </span>{' '}
                    •{' '}
                    <span className="font-bold text-amber-600">
                      {ledgerData.kpis.partialCount} Pending
                    </span>
                  </div>
                </div>
              </div>

              {/* Lifetime KPI Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* Total Jobs */}
                <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Completed Jobs
                  </span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {ledgerData.kpis.totalBills}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Total Bills Issued</span>
                </div>

                {/* Units Installed */}
                <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Units Installed
                  </span>
                  <div className="text-xl font-bold text-violet-600 dark:text-violet-400">
                    {ledgerData.kpis.totalUnits}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                    {ledgerData.kpis.totalCubicleUnits} Cub • {ledgerData.kpis.totalUmpUnits} UMP • {ledgerData.kpis.totalLockerUnits} Lkr
                  </span>
                </div>

                {/* Gross Subtotal & Travel */}
                <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Gross Earnings
                  </span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatINR(ledgerData.kpis.grossSubtotal)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    + {formatINR(ledgerData.kpis.totalTravel)} Travel
                  </span>
                </div>

                {/* Total Deductions */}
                <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xs">
                  <span className="text-[11px] font-semibold text-rose-500 block mb-1">
                    Total Deductions
                  </span>
                  <div className="text-xl font-bold text-rose-600">
                    -{formatINR(ledgerData.kpis.totalDeductions)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Penalties / Deductions</span>
                </div>

                {/* Total Disbursed */}
                <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xs">
                  <span className="text-[11px] font-semibold text-emerald-600 block mb-1">
                    Total Disbursed
                  </span>
                  <div className="text-xl font-bold text-emerald-600">
                    {formatINR(ledgerData.kpis.totalPaid)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    of {formatINR(ledgerData.kpis.netPayable)} Net
                  </span>
                </div>

                {/* Balance Due */}
                <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xs">
                  <span className="text-[11px] font-semibold text-amber-600 block mb-1">
                    Balance Due
                  </span>
                  <div className={`text-xl font-bold ${ledgerData.kpis.balanceDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatINR(ledgerData.kpis.balanceDue)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {ledgerData.kpis.balanceDue > 0 ? 'Outstanding payable' : 'Fully Settled'}
                  </span>
                </div>
              </div>

              {/* Chronological Statement Table */}
              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt size={16} className="text-violet-600" />
                    Chronological Jobs & Payment Ledger
                  </h3>
                  <span className="text-xs text-slate-400">
                    {ledgerData.bills.length} historical job(s)
                  </span>
                </div>

                {ledgerData.bills.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    No bills or payments found for this installer.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#202024] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-[#27272A]">
                        <tr>
                          <th className="py-3 px-4">Bill No</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Site Location</th>
                          <th className="py-3 px-4 text-center">Units Installed</th>
                          <th className="py-3 px-4 text-right">Subtotal</th>
                          <th className="py-3 px-4 text-right">Travel</th>
                          <th className="py-3 px-4 text-right">Deductions</th>
                          <th className="py-3 px-4 text-right">Net Total</th>
                          <th className="py-3 px-4 text-right">Disbursed</th>
                          <th className="py-3 px-4 text-right">Balance</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-slate-200">
                        {ledgerData.bills.map((b) => {
                          const cUnits = b.cubicleQuantity || (b.items || []).filter((i) => (i.category || 'CUBICLE') === 'CUBICLE').reduce((acc, i) => acc + i.quantity, 0);
                          const uUnits = b.umpQuantity || (b.items || []).filter((i) => i.category === 'UMP').reduce((acc, i) => acc + i.quantity, 0);
                          const lUnits = b.lockerQuantity || (b.items || []).filter((i) => i.category === 'LOCKER').reduce((acc, i) => acc + i.quantity, 0);
                          const isCleared = b.paymentStatus === 'CLEARED';

                          return (
                            <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-[#202024]/60 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-violet-600 dark:text-violet-400 whitespace-nowrap">
                                {b.billNo}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                {formatDate(b.installDate)}
                              </td>
                              <td className="py-3.5 px-4 max-w-[200px]">
                                <div className="truncate text-slate-700 dark:text-slate-300 font-medium">
                                  {b.siteAddress}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>PIN: {b.sitePin}</span>
                                  {b.isNcr ? (
                                    <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1 rounded">NCR</span>
                                  ) : (
                                    <span className="text-[10px] text-blue-600 bg-blue-500/10 px-1 rounded">Outstation</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {cUnits + uUnits + lUnits} units
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  {cUnits} Cub • {uUnits} UMP • {lUnits} Lkr
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-medium whitespace-nowrap">
                                {formatINR(b.subtotal)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-medium whitespace-nowrap">
                                {b.isNcr ? <span className="text-slate-400">₹0</span> : formatINR(b.travelExpenses)}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                {Number(b.deductionAmount || 0) > 0 ? (
                                  <div>
                                    <span className="font-semibold text-rose-600">
                                      -{formatINR(b.deductionAmount)}
                                    </span>
                                    {b.deductionReason && (
                                      <div className="text-[10px] text-slate-400 max-w-[120px] truncate ml-auto" title={b.deductionReason}>
                                        {b.deductionReason}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {formatINR(b.total)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                {formatINR(b.amountPaid)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                                <span className={b.balanceDue > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                                  {formatINR(b.balanceDue)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isCleared
                                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                  }`}
                                >
                                  {isCleared ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                  {isCleared ? 'Cleared' : 'Partial'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleDownloadPdf(b)}
                                    className="p-1.5 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg"
                                    title="Download Payment Voucher PDF"
                                  >
                                    <Download size={14} />
                                  </button>
                                  <button
                                    onClick={() => setSelectedBillForDetails(b)}
                                    className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-lg"
                                    title="View Audit Dossier"
                                  >
                                    <FileText size={14} />
                                  </button>
                                  {isSuperAdmin && (
                                    <button
                                      onClick={() => setBillForEdit(b)}
                                      className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                      title="Edit Bill Details (Super Admin only)"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}
                                  {b.balanceDue > 0 && (
                                    <button
                                      onClick={() => setBillForPayment(b)}
                                      className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                                      title="Record Payment Installment"
                                    >
                                      Pay Due
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
          isSuperAdmin={isSuperAdmin}
          onClose={() => setSelectedBillForDetails(null)}
          onDownloadPdf={() => handleDownloadPdf(selectedBillForDetails)}
          onResendEmail={() => handleOpenSendEmailModal(selectedBillForDetails)}
          onRecordPayment={() => {
            setBillForPayment(selectedBillForDetails);
            setSelectedBillForDetails(null);
          }}
          onEditBill={() => {
            setBillForEdit(selectedBillForDetails);
          }}
          onDeleteBill={() => setBillToDelete(selectedBillForDetails)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: SUPER ADMIN EDIT INSTALLER BILL MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {billForEdit && (
        <EditInstallerBillModal
          bill={billForEdit}
          onClose={() => setBillForEdit(null)}
          onSuccess={(updatedBill) => {
            setBills((prev) => prev.map((b) => (b.id === updatedBill.id ? updatedBill : b)));
            if (selectedBillForDetails?.id === updatedBill.id) {
              setSelectedBillForDetails(updatedBill);
            }
            setBillForEdit(null);
            setActionNotice({
              type: 'success',
              message: `Bill ${updatedBill.billNo} updated successfully by Super Admin. Audit log recorded.`,
            });
            loadBills(currentPage);
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 3: CUBICLE MODEL MASTER ADD/EDIT MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {showModelModal && (
        <CubicleModelModal
          model={editingModel}
          initialCategory={modelCategoryFilter !== 'ALL' ? modelCategoryFilter : 'CUBICLE'}
          onClose={() => setShowModelModal(false)}
          onSuccess={() => {
            setShowModelModal(false);
            loadModels();
            setActionNotice({
              type: 'success',
              message: editingModel ? 'Installation model updated successfully.' : 'New installation model created.',
            });
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 4: CUBICLE INSTALLER MASTER ADD/EDIT MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {showInstallerModal && (
        <CubicleInstallerModal
          installer={editingInstaller}
          onClose={() => setShowInstallerModal(false)}
          onSuccess={() => {
            setShowInstallerModal(false);
            loadInstallers();
            setActionNotice({
              type: 'success',
              message: editingInstaller ? 'Installer updated successfully.' : 'New installer registered.',
            });
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 5: SUPER ADMIN DELETE BILL MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {billToDelete && (
        <DeleteBillConfirmationModal
          bill={billToDelete}
          isDeleting={isDeletingBill}
          onConfirm={handleDeleteBill}
          onClose={() => setBillToDelete(null)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 6: DEDICATED INSTALLER EMAIL DISPATCH MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {billForEmail && (
        <SendBillEmailModal
          bill={billForEmail}
          recipientEmail={emailRecipientInput}
          onRecipientEmailChange={setEmailRecipientInput}
          isSending={isSendingEmail}
          onSend={handleSendBillEmail}
          onClose={() => setBillForEmail(null)}
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
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState<string>('');

  // Line Items Builder: starts at 0 with no model pre-selected; admin must actively select
  const [lineItems, setLineItems] = useState<Array<{ modelId: string; quantity: number }>>([
    { modelId: '', quantity: 0 },
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

  // Subtotal calculation live across all dynamic models
  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => {
      const model = modelMap.get(item.modelId);
      const price = model ? Number(model.installationPrice) : 0;
      return acc + (item.quantity || 0) * price;
    }, 0);
  }, [lineItems, modelMap]);

  // Actual travel expenses: forced to 0 if NCR = Yes
  const effectiveTravel = isNcr ? 0 : Number(travelExpenses || 0);
  const effectiveDeduction = Math.max(0, Number(deductionAmount || 0));
  const grandTotal = Math.max(0, subtotal + effectiveTravel - effectiveDeduction);
  const balanceDue = Math.max(0, grandTotal - Number(initialAmountPaid || 0));
  const isCleared = Number(initialAmountPaid || 0) >= grandTotal && grandTotal > 0;

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { modelId: '', quantity: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      setLineItems([{ modelId: '', quantity: 0 }]);
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, modelId: string, quantity: number) => {
    const updated = [...lineItems];
    updated[index] = { modelId, quantity: Math.max(0, quantity) };
    setLineItems(updated);
  };

  const handlePinChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, 6);
    setSitePin(cleaned);
    if (cleaned.length === 6) {
      const match = isNcrPinCode(cleaned);
      if (match) {
        setIsNcr(true);
        setTravelExpenses(0);
      } else {
        setIsNcr(false);
      }
    }
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
    if (effectiveDeduction > 0 && !deductionReason.trim()) {
      return setErrorMsg('A deduction reason is required when a deduction amount is specified.');
    }
    const validItems = lineItems.filter((i) => i.modelId && i.quantity > 0);
    if (validItems.length === 0) {
      return setErrorMsg('Please select at least one installation model with a quantity greater than 0.');
    }
    if (!isNcr && (travelExpenses === undefined || travelExpenses < 0)) {
      return setErrorMsg('Travel expenses are required for outstation installation jobs (NCR = No).');
    }
    if (!notes.trim()) {
      return setErrorMsg('Internal Notes are mandatory.');
    }

    try {
      setIsSubmitting(true);
      const umpItems = validItems.filter((i) => {
        const m = modelMap.get(i.modelId);
        return m?.category === 'UMP';
      });
      const totalUmpQty = umpItems.reduce((acc, i) => acc + i.quantity, 0);
      const totalUmpAmt = umpItems.reduce((acc, i) => {
        const m = modelMap.get(i.modelId);
        return acc + (i.quantity * (m ? Number(m.installationPrice) : 0));
      }, 0);

      const payload: CreateInstallerBillPayload = {
        installerName: installerName.trim(),
        installerEmail: installerEmail.trim().toLowerCase(),
        installDate,
        isNcr,
        travelExpenses: isNcr ? 0 : Number(travelExpenses || 0),
        deductionAmount: effectiveDeduction,
        deductionReason: effectiveDeduction > 0 ? deductionReason.trim() : undefined,
        siteAddress: siteAddress.trim(),
        sitePin: sitePin.trim(),
        items: validItems.map((item) => {
          const m = modelMap.get(item.modelId);
          return {
            modelId: item.modelId,
            category: m?.category || 'CUBICLE',
            quantity: item.quantity,
          };
        }),
        umpQuantity: totalUmpQty,
        umpRate: totalUmpQty > 0 ? totalUmpAmt / totalUmpQty : 0,
        initialAmountPaid: Number(initialAmountPaid || 0),
        paymentDate: initialAmountPaid > 0 ? paymentDate : undefined,
        paymentMode: initialAmountPaid > 0 ? paymentMode : undefined,
        notes: notes.trim(),
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
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Site Postal PIN * (6-Digit)
                </label>
                {sitePin.length === 6 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isNcrPinCode(sitePin)
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                    }`}
                  >
                    {isNcrPinCode(sitePin) ? 'Inside NCR' : 'Outstation'}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="110001"
                value={sitePin}
                onChange={(e) => handlePinChange(e.target.value)}
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
                      <option value="">-- Select Model --</option>
                      {activeModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.category || 'CUBICLE'}] {m.modelName} (Rate: ₹{Number(m.installationPrice).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="w-full sm:w-24">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => handleUpdateLineItem(idx, item.modelId, parseInt(e.target.value, 10) || 0)}
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

          {/* Section: Deductions & Penalties (Optional) */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#202024] rounded-xl border border-slate-200 dark:border-[#27272A] space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block text-xs">
              Deductions & Adjustments (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deduction (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs font-bold text-rose-500">-₹</span>
                  <input
                    type="number"
                    min={0}
                    value={deductionAmount || ''}
                    onChange={(e) => setDeductionAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg text-xs font-bold text-rose-600"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason {deductionAmount > 0 && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  placeholder="e.g. Broken hardware penalty, incomplete sealing deduction"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
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
            {effectiveDeduction > 0 && (
              <div className="flex justify-between items-center text-xs text-rose-600 dark:text-rose-400 font-medium">
                <span>Deductions ({deductionReason || 'Penalty'}):</span>
                <span>-₹{effectiveDeduction.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white border-t border-violet-200 dark:border-violet-800 pt-2">
              <span>Net Disbursement Due:</span>
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
  isSuperAdmin?: boolean;
  onClose: () => void;
  onDownloadPdf: () => void;
  onResendEmail: () => void;
  onRecordPayment: () => void;
  onEditBill?: () => void;
  onDeleteBill?: () => void;
}

function BillDetailsDrawer({
  bill,
  isSuperAdmin = false,
  onClose,
  onDownloadPdf,
  onResendEmail,
  onRecordPayment,
  onEditBill,
  onDeleteBill,
}: BillDetailsDrawerProps) {
  const isCleared = bill.paymentStatus === 'CLEARED';
  const [auditLogs, setAuditLogs] = useState<BillAuditLogEntry[]>([]);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (bill?.id) {
      setIsLoadingAuditLogs(true);
      installerPaymentsService
        .getBillAuditLogs(bill.id)
        .then((logs) => {
          if (isMounted) {
            setAuditLogs(Array.isArray(logs) ? logs : []);
          }
        })
        .catch(() => {
          if (isMounted) setAuditLogs([]);
        })
        .finally(() => {
          if (isMounted) setIsLoadingAuditLogs(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [bill?.id, bill?.updatedAt]);


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

          {/* Categorized Itemized Scopes */}
          {(() => {
            const cubicleItems = (bill.items || []).filter(
              (i) => (i.category || 'CUBICLE') === 'CUBICLE'
            );
            const umpItems = (bill.items || []).filter((i) => i.category === 'UMP');
            const lockerItems = (bill.items || []).filter((i) => i.category === 'LOCKER');

            return (
              <div className="space-y-4">
                {/* Cubicles Section */}
                {cubicleItems.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                      Cubicle Models Installed
                    </span>
                    <div className="divide-y divide-slate-100 dark:divide-[#27272A] border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden">
                      {cubicleItems.map((item, i) => (
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
                )}

                {/* UMP Section */}
                {umpItems.length > 0 ? (
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      Urinal Modesty Panels (UMP)
                    </span>
                    <div className="divide-y divide-slate-100 dark:divide-[#27272A] border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden">
                      {umpItems.map((item, i) => (
                        <div key={i} className="p-3 flex justify-between items-center bg-white dark:bg-[#18181B]">
                          <div>
                            <span className="font-semibold block text-emerald-700 dark:text-emerald-300">
                              {item.modelName}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {item.quantity} unit(s) @ ₹{Number(item.installationPrice).toFixed(2)}
                            </span>
                          </div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(item.lineTotal).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : bill.umpQuantity && Number(bill.umpQuantity) > 0 ? (
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      UMP Installation
                    </span>
                    <div className="border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden p-3 bg-white dark:bg-[#18181B] flex justify-between items-center">
                      <div>
                        <span className="font-semibold block text-slate-900 dark:text-white">
                          Urinal Modesty Panel (UMP)
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {bill.umpQuantity} unit(s) @ ₹{Number(bill.umpRate || 0).toFixed(2)}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(bill.umpTotal || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Lockers Section */}
                {lockerItems.length > 0 ? (
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      Locker Units Installed
                    </span>
                    <div className="divide-y divide-slate-100 dark:divide-[#27272A] border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden">
                      {lockerItems.map((item, i) => (
                        <div key={i} className="p-3 flex justify-between items-center bg-white dark:bg-[#18181B]">
                          <div>
                            <span className="font-semibold block text-blue-700 dark:text-blue-300">
                              {item.modelName}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {item.quantity} unit(s) @ ₹{Number(item.installationPrice).toFixed(2)}
                            </span>
                          </div>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            ₹{Number(item.lineTotal).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : bill.lockerQuantity && Number(bill.lockerQuantity) > 0 ? (
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      Locker Units
                    </span>
                    <div className="border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden p-3 bg-white dark:bg-[#18181B] flex justify-between items-center">
                      <div>
                        <span className="font-semibold block text-slate-900 dark:text-white">
                          Locker Installation
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {bill.lockerQuantity} unit(s)
                        </span>
                      </div>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        ₹{Number(bill.lockerTotal || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })()}

          {/* Financial Breakdown */}
          <div className="p-4 bg-slate-50 dark:bg-[#202024] rounded-2xl space-y-2 text-xs">
            {bill.cubicleTotal !== undefined && bill.cubicleTotal !== null && Number(bill.cubicleTotal) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Cubicle Installation:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{Number(bill.cubicleTotal).toFixed(2)}
                </span>
              </div>
            )}
            {((bill.umpTotal && Number(bill.umpTotal) > 0) || (bill.umpQuantity && Number(bill.umpQuantity) > 0)) && (
              <div className="flex justify-between">
                <span className="text-slate-500">
                  UMP Installation {bill.umpQuantity ? `(${bill.umpQuantity} units)` : ''}:
                </span>
                <span className="font-semibold text-emerald-600">
                  ₹{Number(bill.umpTotal || 0).toFixed(2)}
                </span>
              </div>
            )}
            {bill.lockerTotal !== undefined && bill.lockerTotal !== null && Number(bill.lockerTotal) > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Locker Installation {bill.lockerQuantity ? `(${bill.lockerQuantity} units)` : ''}:
                </span>
                <span className="font-semibold text-blue-600">
                  ₹{Number(bill.lockerTotal).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 dark:border-[#27272A] pt-1">
              <span className="text-slate-500">Installation Subtotal:</span>
              <span className="font-semibold">₹{Number(bill.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Travel Expenses:</span>
              <span className="font-semibold">
                {bill.isNcr ? '₹0.00 (NCR)' : `₹${Number(bill.travelExpenses).toFixed(2)}`}
              </span>
            </div>
            {Number(bill.deductionAmount || 0) > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                <span>
                  Deductions / Penalty {bill.deductionReason ? `(${bill.deductionReason})` : ''}:
                </span>
                <span>-₹{Number(bill.deductionAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-[#27272A] pt-2">
              <span>Net Disbursement Due:</span>
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
            <button
              onClick={onResendEmail}
              className="w-full mt-2 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-950/50 text-violet-700 dark:text-violet-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Send size={13} /> {bill.emailStatus === 'SENT' ? 'Resend Payment Voucher' : 'Send Payment Voucher to Installer'}
            </button>
          </div>

          {/* Issue & Modification Audit Trail */}
          <div className="p-4 bg-slate-50 dark:bg-[#202024] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock size={14} className="text-violet-500" /> Issue & Edit History
              </span>
              {auditLogs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                  {auditLogs.length} edit{auditLogs.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Issued By Info */}
            <div className="p-3 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Issued By</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {bill.createdBy ? `${bill.createdBy.firstName || ''} ${bill.createdBy.lastName || ''}`.trim() || bill.createdBy.email : 'System / Auto'}
                </div>
                {bill.createdBy?.email && (
                  <span className="text-[11px] text-slate-400 block">{bill.createdBy.email}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Issue Date</span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  {new Date(bill.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Edit Logs Timeline */}
            {isLoadingAuditLogs ? (
              <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
                <RefreshCw size={13} className="animate-spin" />
                <span>Loading edit history...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-3 bg-slate-100/60 dark:bg-[#1C1C20] rounded-xl text-slate-500 dark:text-slate-400 text-[11px] text-center italic">
                No edits recorded — this bill has not been modified since creation.
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => {
                  const editorName = log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email : 'Super Admin';
                  const fields = log.changes?.fields || {};
                  const fieldKeys = Object.keys(fields);
                  return (
                    <div key={log.id} className="p-3 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span className="font-semibold text-slate-900 dark:text-white">{editorName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {log.user?.email && (
                        <span className="text-[10px] text-slate-400 block">{log.user.email}</span>
                      )}
                      {fieldKeys.length > 0 && (
                        <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-[#27272A] space-y-1">
                          {fieldKeys.map((fKey) => {
                            const change = fields[fKey];
                            const formatVal = (v: any) => {
                              if (v === null || v === undefined || v === '') return '—';
                              if (typeof v === 'boolean') return v ? 'YES' : 'NO';
                              return String(v);
                            };
                            return (
                              <div key={fKey} className="text-[11px] flex items-center justify-between text-slate-600 dark:text-slate-300">
                                <span className="font-medium capitalize text-slate-500">{fKey.replace(/([A-Z])/g, ' $1')}:</span>
                                <span className="font-mono text-[10px]">
                                  <span className="line-through text-rose-500 mr-1">{formatVal(change?.before)}</span>
                                  →
                                  <span className="text-emerald-600 font-bold ml-1">{formatVal(change?.after)}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
          {isSuperAdmin && onEditBill && (
            <button
              onClick={onEditBill}
              className="py-2.5 px-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
              title="Edit Bill Details (Super Admin only)"
            >
              <Edit2 size={15} />
              <span>Edit</span>
            </button>
          )}
          {isSuperAdmin && onDeleteBill && (
            <button
              onClick={onDeleteBill}
              className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
              title="Delete Bill (Super Admin only)"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENT: SUPER ADMIN EDIT INSTALLER BILL MODAL ──────────────────

interface EditInstallerBillModalProps {
  bill: InstallerBill;
  onClose: () => void;
  onSuccess: (updatedBill: InstallerBill) => void;
}

function EditInstallerBillModal({ bill, onClose, onSuccess }: EditInstallerBillModalProps) {
  const [installerName, setInstallerName] = useState(bill.installerName || '');
  const [installerEmail, setInstallerEmail] = useState(bill.installerEmail || '');
  const [installDate, setInstallDate] = useState(
    bill.installDate ? new Date(bill.installDate).toISOString().slice(0, 10) : ''
  );
  const [siteAddress, setSiteAddress] = useState(bill.siteAddress || '');
  const [sitePin, setSitePin] = useState(bill.sitePin || '');
  const [isNcr, setIsNcr] = useState<boolean>(bill.isNcr ?? false);
  const [travelExpenses, setTravelExpenses] = useState<number | ''>(
    bill.isNcr ? 0 : Number(bill.travelExpenses || 0)
  );
  const [umpQuantity, setUmpQuantity] = useState<number | ''>(
    bill.umpQuantity !== undefined && bill.umpQuantity !== null ? bill.umpQuantity : ''
  );
  const [umpRate, setUmpRate] = useState<number | ''>(
    bill.umpRate !== undefined && bill.umpRate !== null ? Number(bill.umpRate) : ''
  );
  const [deductionAmount, setDeductionAmount] = useState<number | ''>(
    bill.deductionAmount !== undefined && bill.deductionAmount !== null ? Number(bill.deductionAmount) : ''
  );
  const [deductionReason, setDeductionReason] = useState(bill.deductionReason || '');
  const [notes, setNotes] = useState(bill.notes || '');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle PIN change and auto-detect NCR
  const handlePinChange = (pin: string) => {
    const cleaned = pin.replace(/\D/g, '').slice(0, 6);
    setSitePin(cleaned);
    if (cleaned.length === 6) {
      const isNcrPin = isNcrPinCode(cleaned);
      setIsNcr(isNcrPin);
      if (isNcrPin) {
        setTravelExpenses(0);
      }
    }
  };

  // Live estimated totals
  const numTravel = isNcr ? 0 : Number(travelExpenses || 0);
  const numDeduction = Number(deductionAmount || 0);
  const existingUmpTotal = Number(bill.umpTotal || 0);
  const modelsSubtotal = Number(bill.subtotal || 0) - existingUmpTotal;
  const currentUmpQty = umpQuantity !== '' ? Number(umpQuantity) : Number(bill.umpQuantity || 0);
  const currentUmpRate = umpRate !== '' ? Number(umpRate) : Number(bill.umpRate || 0);
  const newUmpTotal = currentUmpQty * currentUmpRate;
  const estimatedSubtotal = modelsSubtotal + newUmpTotal;
  const estimatedTotal = Math.max(0, estimatedSubtotal + numTravel - numDeduction);
  const estimatedBalance = Math.max(0, estimatedTotal - Number(bill.amountPaid || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!installerName.trim()) return setErrorMsg('Installer name is required.');
    if (!installerEmail.trim() || !installerEmail.includes('@')) {
      return setErrorMsg('A valid installer email is required.');
    }
    if (!installDate) return setErrorMsg('Installation date is required.');
    if (!siteAddress.trim()) return setErrorMsg('Site address is required.');
    if (!/^\d{6}$/.test(sitePin.trim())) {
      return setErrorMsg('Site PIN must be exactly 6 digits.');
    }
    if (numDeduction > 0 && !deductionReason.trim()) {
      return setErrorMsg('Please specify a reason for the deduction amount.');
    }

    try {
      setIsSubmitting(true);
      const payload: UpdateInstallerBillPayload = {
        installerName: installerName.trim(),
        installerEmail: installerEmail.trim().toLowerCase(),
        installDate: new Date(installDate).toISOString(),
        siteAddress: siteAddress.trim(),
        sitePin: sitePin.trim(),
        isNcr,
        travelExpenses: isNcr ? 0 : numTravel,
        deductionAmount: numDeduction,
        deductionReason: deductionReason.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (umpQuantity !== '') {
        payload.umpQuantity = Number(umpQuantity);
      }
      if (umpRate !== '') {
        payload.umpRate = Number(umpRate);
      }

      const updated = await installerPaymentsService.updateBill(bill.id, payload);
      onSuccess(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update installer bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272A] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Edit2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Bill: {bill.billNo}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  Super Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Issued by {bill.createdBy ? `${bill.createdBy.firstName || ''} ${bill.createdBy.lastName || ''}`.trim() || bill.createdBy.email : 'System'} • Edits are logged to audit trail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Technician & Date */}
          <div className="p-4 bg-slate-50 dark:bg-[#202024] rounded-xl space-y-3">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <User size={13} className="text-violet-500" /> Technician Information & Date
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1 font-medium">Installer Name *</label>
                <input
                  type="text"
                  value={installerName}
                  onChange={(e) => setInstallerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-1 font-medium">Installer Email *</label>
                <input
                  type="email"
                  value={installerEmail}
                  onChange={(e) => setInstallerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-1 font-medium">Install Date *</label>
                <input
                  type="date"
                  value={installDate}
                  onChange={(e) => setInstallDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Site & Region Logistics */}
          <div className="p-4 bg-slate-50 dark:bg-[#202024] rounded-xl space-y-3">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <MapPin size={13} className="text-blue-500" /> Site Address & Logistics
            </span>
            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1 font-medium">Site Address *</label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1 font-medium">Site PIN Code (6 digits) *</label>
                  <input
                    type="text"
                    value={sitePin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    maxLength={6}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                    placeholder="e.g. 110001"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isNcr}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsNcr(checked);
                        if (checked) setTravelExpenses(0);
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Delhi NCR (Travel Waived)
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1 font-medium">
                    Travel Expenses (₹) {isNcr && '(Waived)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={isNcr}
                    value={isNcr ? 0 : travelExpenses}
                    onChange={(e) => setTravelExpenses(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-[#1C1C20]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Deductions & Penalties */}
          <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl space-y-3">
            <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 text-xs">
              <DollarSign size={13} className="text-rose-500" /> Deductions / Penalties
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1 font-medium">Deduction Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-rose-600 dark:text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-500 text-[11px] mb-1 font-medium">
                  Deduction Reason {numDeduction > 0 && '*'}
                </label>
                <input
                  type="text"
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  placeholder="e.g. Quality defect, missing hardware, site delay"
                  className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: UMP Installation Adjustment (if applicable) */}
          <div className="p-4 bg-slate-50 dark:bg-[#202024] rounded-xl space-y-3">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <Receipt size={13} className="text-emerald-500" /> Urinal Modesty Panel (UMP) Adjustment
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1 font-medium">UMP Quantity (units)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={umpQuantity}
                  onChange={(e) => setUmpQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-1 font-medium">UMP Rate per Unit (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={umpRate}
                  onChange={(e) => setUmpRate(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Notes */}
          <div>
            <label className="block text-slate-500 text-[11px] mb-1 font-medium">Internal Admin Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes or reasons for edits..."
              className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Section 6: Live Recalculation Preview */}
          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl space-y-1.5 text-[11px]">
            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
              Financial Impact Preview (Auto-Recalculated on Save)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px]">Subtotal:</span>
                <span className="font-semibold">₹{estimatedSubtotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Travel:</span>
                <span className="font-semibold">{isNcr ? '₹0.00' : `₹${numTravel.toFixed(2)}`}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Deductions:</span>
                <span className="font-semibold text-rose-500">-₹{numDeduction.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Net Due:</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="pt-1 border-t border-amber-200/40 dark:border-amber-900/40 flex justify-between text-slate-500 text-[10px]">
              <span>Already Paid: ₹{Number(bill.amountPaid).toFixed(2)}</span>
              <span className="font-bold text-amber-700 dark:text-amber-300">
                New Balance Due: ₹{estimatedBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <RefreshCw size={13} className="animate-spin" />}
              <span>{isSubmitting ? 'Saving Edits...' : 'Save & Log Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── SUB-COMPONENT: CUBICLE MODEL MASTER MODAL ───────────────────────────────

interface CubicleModelModalProps {
  model: CubicleModel | null;
  initialCategory?: 'CUBICLE' | 'UMP' | 'LOCKER';
  onClose: () => void;
  onSuccess: () => void;
}

function CubicleModelModal({ model, initialCategory, onClose, onSuccess }: CubicleModelModalProps) {
  const [modelName, setModelName] = useState(model?.modelName || '');
  const [category, setCategory] = useState<'CUBICLE' | 'UMP' | 'LOCKER'>(
    model?.category || initialCategory || 'CUBICLE'
  );
  const [installationPrice, setInstallationPrice] = useState<number | ''>(
    model ? Number(model.installationPrice) : ''
  );
  const [isActive, setIsActive] = useState<boolean>(model ? model.isActive : true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (model) {
      setModelName(model.modelName);
      setCategory(model.category || initialCategory || 'CUBICLE');
      setInstallationPrice(Number(model.installationPrice));
      setIsActive(model.isActive);
    } else {
      setModelName('');
      setCategory(initialCategory || 'CUBICLE');
      setInstallationPrice('');
      setIsActive(true);
    }
    setErrorMsg(null);
  }, [model, initialCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) return setErrorMsg('Model name is required.');
    const numericPrice = Number(installationPrice);
    if (!numericPrice || numericPrice <= 0) {
      return setErrorMsg('Installation price must be greater than 0.');
    }

    try {
      setIsSubmitting(true);
      if (model) {
        await installerPaymentsService.updateModel(model.id, {
          modelName: modelName.trim(),
          installationPrice: numericPrice,
          category,
          isActive,
        });
      } else {
        await installerPaymentsService.createModel({
          modelName: modelName.trim(),
          installationPrice: numericPrice,
          category,
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
            {model ? 'Edit Installation Model' : 'Register New Installation Model'}
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
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as 'CUBICLE' | 'UMP' | 'LOCKER')}
              className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl font-semibold text-slate-900 dark:text-white"
            >
              <option value="CUBICLE">Restroom Cubicle</option>
              <option value="UMP">Urinal Modesty Panel (UMP)</option>
              <option value="LOCKER">Locker System</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Model Name *
            </label>
            <input
              type="text"
              required
              placeholder="Enter model name..."
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
              placeholder="e.g. 500.00"
              value={installationPrice}
              onChange={(e) => setInstallationPrice(e.target.value === '' ? '' : Number(e.target.value))}
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

// ─── SUB-COMPONENT: CUBICLE INSTALLER MASTER MODAL ───────────────────────────

interface CubicleInstallerModalProps {
  installer: CubicleInstaller | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CubicleInstallerModal({ installer, onClose, onSuccess }: CubicleInstallerModalProps) {
  const [name, setName] = useState(installer?.name || '');
  const [email, setEmail] = useState(installer?.email || '');
  const [phone, setPhone] = useState(installer?.phone || '');
  const [isActive, setIsActive] = useState<boolean>(installer ? installer.isActive : true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErrorMsg('Installer name is required.');
    if (!email.trim() || !email.includes('@')) return setErrorMsg('A valid installer email is required.');

    try {
      setIsSubmitting(true);
      if (installer) {
        await installerPaymentsService.updateInstaller(installer.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          isActive,
        });
      } else {
        await installerPaymentsService.createInstaller({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          isActive,
        });
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save installer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#18181B] w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-xl overflow-hidden text-xs">
        <div className="p-4 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={16} className="text-violet-600" />
            {installer ? 'Edit Installer Credentials' : 'Register New Installer'}
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
              Installer Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rajesh Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl font-medium text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Installer Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. rajesh.sharma@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl font-medium text-slate-900 dark:text-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Bills and auto-clearance PDFs will be dispatched to this email address.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Contact Phone Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#323238] rounded-xl font-medium text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="installerActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="installerActiveToggle" className="text-slate-700 dark:text-slate-300 font-medium">
              Active (Available in Bill Creator auto-fetch selector)
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
              <span>{installer ? 'Save Changes' : 'Register Installer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENT: SUPER ADMIN DELETE BILL CONFIRMATION MODAL ───────────────

interface DeleteBillModalProps {
  bill: InstallerBill;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function DeleteBillConfirmationModal({
  bill,
  isDeleting,
  onConfirm,
  onClose,
}: DeleteBillModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#18181B] w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-rose-100 dark:border-rose-950/50 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Installer Bill</h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Super Admin Authorization Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/40 rounded-xl text-rose-800 dark:text-rose-200 leading-relaxed">
            Are you sure you want to delete Bill <strong>#{bill.billNo}</strong>? This record will be soft-deleted, removed from all financial calculations, and hidden from the bills list.
          </div>

          <div className="bg-gray-50 dark:bg-[#27272A]/40 p-3.5 rounded-xl border border-gray-200 dark:border-[#3F3F46] space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Bill Number:</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">{bill.billNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Installer:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{bill.installerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Installer Email:</span>
              <span className="text-gray-700 dark:text-gray-300">{bill.installerEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Site Address:</span>
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{bill.siteAddress}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-[#3F3F46]">
              <span className="text-gray-500 dark:text-gray-400">Total Amount:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                ₹{Number(bill.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-[#18181B]/80 border-t border-gray-100 dark:border-[#27272A] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#27272A] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            {isDeleting ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={13} />
                Delete Bill
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENT: DEDICATED INSTALLER EMAIL DISPATCH MODAL ─────────────────

interface SendBillEmailModalProps {
  bill: InstallerBill;
  recipientEmail: string;
  onRecipientEmailChange: (email: string) => void;
  isSending: boolean;
  onSend: () => void;
  onClose: () => void;
}

function SendBillEmailModal({
  bill,
  recipientEmail,
  onRecipientEmailChange,
  isSending,
  onSend,
  onClose,
}: SendBillEmailModalProps) {
  const isCleared = bill.paymentStatus === 'CLEARED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#18181B] w-full max-w-md rounded-2xl border border-violet-200 dark:border-violet-900/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-violet-100 dark:border-violet-950/50 flex items-center justify-between bg-violet-50/50 dark:bg-violet-950/20">
          <div className="flex items-center gap-2.5 text-violet-600 dark:text-violet-400">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/60">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Send Payment Voucher</h3>
              <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">Bill #{bill.billNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Destination Installer Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => onRecipientEmailChange(e.target.value)}
                placeholder="installer@example.com"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#27272A]/60 border border-gray-300 dark:border-[#3F3F46] rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Confirm or edit the destination email. The official payment advice and PDF voucher will be delivered directly to this address.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-[#27272A]/40 p-3.5 rounded-xl border border-gray-200 dark:border-[#3F3F46] space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Installer Name:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{bill.installerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Payment Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                  isCleared
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                }`}
              >
                {isCleared ? 'Full / Cleared' : 'Partial'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Amount Paid:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ₹{Number(bill.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {Number(bill.balanceDue) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Balance Due:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  ₹{Number(bill.balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-[#3F3F46] text-slate-600 dark:text-slate-300">
              <FileText size={14} className="text-violet-500 shrink-0" />
              <span className="truncate font-medium">{bill.billNo}-Payment-Advice.pdf</span>
              <span className="text-[10px] text-gray-400 ml-auto shrink-0">Attached</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-[#18181B]/80 border-t border-gray-100 dark:border-[#27272A] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#27272A] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={isSending || !recipientEmail.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            {isSending ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                Dispatching...
              </>
            ) : (
              <>
                <Send size={13} />
                Send to Installer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


