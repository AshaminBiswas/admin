import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Wallet,
  Receipt,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Calendar,
  Building2,
  Filter,
  Download,
  FileSpreadsheet,
  Lock,
  Clock,
  Search,
  Trash2,
  Edit3,
  Camera,
  UploadCloud,
  Check,
  X,
  User,
  Tag,
  ShieldCheck,
  WifiOff,
  Wifi,
  PieChart as PieIcon,
  BarChart3,
  Coins,
  FileText,
  AlertCircle,
  Info,
  BookOpen,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  expensesApi,
  getOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
  OfflineQueuedExpense,
} from '../api/expensesApi';
import type {
  ExpenseEntry,
  ExpenseCategory,
  ExpenseDailyLedger,
  ExpenseFloatTopUp,
  BranchCashBalanceInfo,
  MultiBranchSummaryInfo,
  ExpenseRollupAnalytics,
} from '../types/admin';

// ─── Formatters & Constants ──────────────────────────────────────────────────

function formatRupee(paise: number = 0): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];
const QUICK_NOTES = [
  'Tea & Refreshments',
  'Local Auto / Taxi Fare',
  'Office Stationery / Printing',
  'Courier / Parcel Dispatch',
  'Hardware Consumables',
  'Site Minor Repairs',
  'Cleaning & Sanitation',
];

const PIE_COLORS = ['#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#6366F1', '#14B8A6', '#F97316'];

export function ExpensesPage() {
  const { adminUser } = useAdminAuth();
  const isSuperAdmin = adminUser?.role === 'super_admin';
  const canApprove = adminUser?.role === 'super_admin' || adminUser?.role === 'admin' || adminUser?.role === 'manager';

  // ─── Core State ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'entry' | 'ledger' | 'approvals' | 'reconciliation' | 'categories' | 'reports'>('entry');
  const [lastLoggedExpense, setLastLoggedExpense] = useState<ExpenseEntry | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [isAllBranches, setIsAllBranches] = useState<boolean>(false);

  // Live balance & summary
  const [liveBalance, setLiveBalance] = useState<BranchCashBalanceInfo | null>(null);
  const [multiSummary, setMultiSummary] = useState<MultiBranchSummaryInfo | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Categories master
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Today entries stream (for Tab 1)
  const [todayEntries, setTodayEntries] = useState<ExpenseEntry[]>([]);
  const [isLoadingToday, setIsLoadingToday] = useState(false);

  // Approval queue (for Tab 2)
  const [pendingEntries, setPendingEntries] = useState<ExpenseEntry[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [selectedRejectEntry, setSelectedRejectEntry] = useState<ExpenseEntry | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Daily Reconciliation (for Tab 3)
  const [reconcileDate, setReconcileDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reconcileLedger, setReconcileLedger] = useState<ExpenseDailyLedger | null>(null);
  const [physicalCashInput, setPhysicalCashInput] = useState<string>('');
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [todayTopUps, setTodayTopUps] = useState<ExpenseFloatTopUp[]>([]);

  // Float Top-Up Modal
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpSource, setTopUpSource] = useState('Cash from Bank');
  const [topUpRef, setTopUpRef] = useState('');
  const [topUpNotes, setTopUpNotes] = useState('');
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

  // Reports & Analytics (for Tab 5)
  const [analytics, setAnalytics] = useState<ExpenseRollupAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportStartDate, setReportStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  // Ledger Filter Tab in Reports
  const [ledgerEntries, setLedgerEntries] = useState<ExpenseEntry[]>([]);
  const [ledgerCursor, setLedgerCursor] = useState<string | null>(null);
  const [ledgerHasMore, setLedgerHasMore] = useState(false);
  const [ledgerFilterBranch, setLedgerFilterBranch] = useState<string>('ALL');
  const [ledgerFilterCategory, setLedgerFilterCategory] = useState('');
  const [ledgerFilterStatus, setLedgerFilterStatus] = useState('ALL');
  const [ledgerFilterSearch, setLedgerFilterSearch] = useState('');
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Receipt Preview Modal (Image & PDF)
  const [previewReceipt, setPreviewReceipt] = useState<{
    isOpen: boolean;
    url: string;
    entry?: ExpenseEntry | null;
  }>({ isOpen: false, url: '', entry: null });

  // Offline queue
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueuedExpense[]>([]);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  // Category Modal (Tab 4)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catBudget, setCatBudget] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Fast Entry Form State (Tab 1)
  const [entryBranchId, setEntryBranchId] = useState<string>('');
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryCategory, setEntryCategory] = useState<string>(() => {
    return localStorage.getItem('prc_last_expense_category') || '';
  });
  const [entryPaymentMode, setEntryPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [entryDescription, setEntryDescription] = useState<string>('');
  const [entryPaidTo, setEntryPaidTo] = useState<string>('');
  const [entryReceiptUrl, setEntryReceiptUrl] = useState<string>('');
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [uploadedSlipName, setUploadedSlipName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [entrySuccessMsg, setEntrySuccessMsg] = useState<string | null>(null);
  const [entryWarningMsg, setEntryWarningMsg] = useState<string | null>(null);

  // Edit Expense Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [editDescription, setEditDescription] = useState('');
  const [editPaidTo, setEditPaidTo] = useState('');
  const [editReceiptUrl, setEditReceiptUrl] = useState('');
  const [editSlipName, setEditSlipName] = useState<string | null>(null);
  const [isUploadingEditSlip, setIsUploadingEditSlip] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editChangeReason, setEditChangeReason] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Expense Modal State (Super Admin Only)
  const [deleteModalEntry, setDeleteModalEntry] = useState<ExpenseEntry | null>(null);
  const [deleteReasonText, setDeleteReasonText] = useState('');
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);

  // Void confirmation modal
  const [voidModalEntry, setVoidModalEntry] = useState<ExpenseEntry | null>(null);
  const [voidReasonText, setVoidReasonText] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // ─── Network & Offline Event Listeners ───────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshOfflineQueue();
      const currentQueue = getOfflineQueue();
      if (currentQueue.length > 0) {
        expensesApi.syncOfflineQueue().then((res) => {
          if (res.syncedCount > 0) {
            refreshOfflineQueue();
            fetchBalance();
            fetchTodayEntries();
            if (activeTab === 'ledger') fetchLedgerEntries(true);
          }
        }).catch((e) => console.warn('[Auto-sync] Reconnect sync deferred:', e));
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshOfflineQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshOfflineQueue = () => {
    setOfflineQueue(getOfflineQueue());
  };

  // ─── Initial Load: Branches & Categories ────────────────────────────────────
  useEffect(() => {
    async function loadInit() {
      try {
        const rawBranches = await expensesApi.getBranches();
        const bList = Array.isArray(rawBranches) ? rawBranches : [];
        setBranches(bList);
        if (bList.length > 0) {
          if (!selectedBranchId) {
            // Default to Delhi HQ or first branch
            const del = bList.find((b) => b.code.toUpperCase().includes('DEL')) || bList[0];
            setSelectedBranchId(del.id);
            setEntryBranchId(del.id);
          } else {
            setEntryBranchId(selectedBranchId);
          }
        }

        const rawCats = await expensesApi.getCategories();
        const cList = Array.isArray(rawCats) ? rawCats : [];
        setCategories(cList);
        if (cList.length > 0 && !entryCategory) {
          setEntryCategory(cList[0].id);
        }

        // Proactively auto-sync offline queue if entries exist in localStorage
        const currentQueue = getOfflineQueue();
        if (currentQueue.length > 0 && typeof navigator !== 'undefined' && navigator.onLine) {
          expensesApi.syncOfflineQueue().then((res) => {
            if (res.syncedCount > 0) {
              console.info(`[Auto-Sync] Synchronized ${res.syncedCount} queued expenses to server.`);
              refreshOfflineQueue();
              fetchBalance();
              fetchTodayEntries();
              if (activeTab === 'ledger') fetchLedgerEntries(true);
            }
          }).catch((e) => console.warn('[Auto-sync] Boot sync deferred:', e));
        }
      } catch (err) {
        console.error('Failed to initialize expenses:', err);
      }
    }
    loadInit();
  }, []);

  // ─── Load Balance & Summaries when Branch changes ───────────────────────────
  const fetchBalance = useCallback(async () => {
    if (!selectedBranchId && !isAllBranches) return;
    setIsLoadingBalance(true);
    try {
      if (isAllBranches) {
        const sum = await expensesApi.getMultiBranchSummary();
        setMultiSummary(sum);
        setLiveBalance({
          branchId: 'ALL',
          currentBalance: sum.consolidated.totalCashInHand,
          currentBalanceRupees: sum.consolidated.totalCashInHandRupees,
          todayOpening: 0,
          todayReceived: sum.consolidated.todayTotalReceived,
          todayExpenses: sum.consolidated.todayTotalExpenses,
          todayClosing: sum.consolidated.totalCashInHand,
          physicalCashCounted: null,
          variance: null,
          isReconciled: false,
          reconciledAt: null,
          pendingApprovalsCount: sum.consolidated.totalPendingApprovals,
          lastEntryAt: null,
        });
      } else {
        const bal = await expensesApi.getLiveBalance(selectedBranchId);
        setLiveBalance(bal);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [selectedBranchId, isAllBranches]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // ─── Load Today's Entries (Tab 1) ──────────────────────────────────────────
  const fetchTodayEntries = useCallback(async () => {
    if (!selectedBranchId && !isAllBranches) return;
    setIsLoadingToday(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await expensesApi.getExpenses({
        branchId: isAllBranches ? undefined : selectedBranchId,
        date: todayStr,
        limit: 50,
      });
      const entries = Array.isArray(res?.entries)
        ? res.entries
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];
      setTodayEntries(entries);
    } catch (err) {
      console.error('Failed to load today entries:', err);
    } finally {
      setIsLoadingToday(false);
    }
  }, [selectedBranchId, isAllBranches]);

  useEffect(() => {
    if (activeTab === 'entry') {
      fetchTodayEntries();
    }
  }, [activeTab, fetchTodayEntries]);

  // ─── Load Approval Queue (Tab 2) ───────────────────────────────────────────
  const fetchApprovals = useCallback(async () => {
    setIsLoadingPending(true);
    try {
      const res = await expensesApi.getExpenses({
        branchId: isAllBranches ? undefined : selectedBranchId,
        status: 'PENDING',
        limit: 100,
      });
      const entries = Array.isArray(res?.entries)
        ? res.entries
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];
      setPendingEntries(entries);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setIsLoadingPending(false);
    }
  }, [selectedBranchId, isAllBranches]);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchApprovals();
    }
  }, [activeTab, fetchApprovals]);

  // ─── Load Categories with Monthly Spend (Tab 4) ────────────────────────────
  const fetchCategoriesWithSpend = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const now = new Date();
      const list = await expensesApi.getCategories({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        branchId: isAllBranches ? undefined : selectedBranchId,
      });
      setCategories(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [selectedBranchId, isAllBranches]);

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategoriesWithSpend();
    }
  }, [activeTab, fetchCategoriesWithSpend]);

  // ─── Load Ledger Entries (Tab 2: All Entries) ──────────────────────────────
  const fetchLedgerEntries = useCallback(async (reset = false) => {
    setIsLoadingLedger(true);
    try {
      const branchParam =
        ledgerFilterBranch === 'ALL'
          ? undefined
          : ledgerFilterBranch
          ? ledgerFilterBranch
          : isAllBranches
          ? undefined
          : selectedBranchId;

      const res = await expensesApi.getExpenses({
        branchId: branchParam,
        categoryId: ledgerFilterCategory || undefined,
        status: ledgerFilterStatus === 'ALL' ? undefined : ledgerFilterStatus,
        search: ledgerFilterSearch.trim() || undefined,
        cursor: reset ? undefined : ledgerCursor || undefined,
        limit: 50,
      });

      const entries = Array.isArray(res?.entries)
        ? res.entries
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];

      if (reset) {
        setLedgerEntries(entries);
      } else {
        setLedgerEntries((prev) => [...prev, ...entries]);
      }
      setLedgerCursor(res?.nextCursor || null);
      setLedgerHasMore(Boolean(res?.hasMore));
    } catch (err) {
      console.error('Failed to load ledger entries:', err);
    } finally {
      setIsLoadingLedger(false);
    }
  }, [ledgerFilterBranch, selectedBranchId, isAllBranches, ledgerFilterCategory, ledgerFilterStatus, ledgerFilterSearch, ledgerCursor]);

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchLedgerEntries(true);
    }
  }, [activeTab, ledgerFilterBranch, selectedBranchId, isAllBranches, ledgerFilterCategory, ledgerFilterStatus]);

  // ─── Load Analytics (Tab 5) ────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const data = await expensesApi.getAnalytics({
        branchId: isAllBranches ? undefined : selectedBranchId,
        year: reportYear,
        month: reportMonth,
        period: 'month',
      });
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [selectedBranchId, isAllBranches, reportYear, reportMonth]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  // ─── Fast Entry Submission Handler (<10s) ──────────────────────────────────
  const handleFastEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(entryAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Please enter a valid expense amount greater than ₹0');
      return;
    }
    if (!entryCategory) {
      alert('Please select a category');
      return;
    }
    if (!entryDescription.trim()) {
      alert('Please enter a short note or description');
      return;
    }
    if (!entryPaidTo.trim()) {
      alert('Please specify who was paid');
      return;
    }
    const branchToUse = entryBranchId || (isAllBranches ? branches[0]?.id : selectedBranchId);
    if (!branchToUse) {
      alert('Please select a branch location');
      return;
    }

    setIsSubmittingEntry(true);
    setEntrySuccessMsg(null);
    setEntryWarningMsg(null);

    // Save selected category to localStorage for smart intelligent defaults
    localStorage.setItem('prc_last_expense_category', entryCategory);

    // ── Optimistic Balance Update ─────────────────────────────────────────────
    const amountPaise = Math.round(amountVal * 100);
    const prevBalance = liveBalance?.currentBalance ?? 0;
    setLiveBalance((prev) =>
      prev
        ? {
            ...prev,
            currentBalance: prev.currentBalance - amountPaise,
            currentBalanceRupees: (prev.currentBalance - amountPaise) / 100,
            todayExpenses: prev.todayExpenses + amountPaise,
          }
        : null
    );

    try {
      const res = await expensesApi.createExpense({
        amount: amountVal,
        categoryId: entryCategory,
        paymentMode: entryPaymentMode,
        description: entryDescription.trim(),
        paidTo: entryPaidTo.trim(),
        receiptAttachment: entryReceiptUrl || null,
        branchId: branchToUse,
      });

      if (res.isOffline) {
        setEntrySuccessMsg(`Saved to Offline Queue (will auto-sync when online)`);
        refreshOfflineQueue();
      } else {
        setEntrySuccessMsg(`Expense ${res.expense.entryNumber} logged successfully!`);
        setLastLoggedExpense(res.expense);
        if (res.budgetWarning) {
          setEntryWarningMsg(res.budgetWarning);
        }
      }

      // Prepend to today's list & ledger
      setTodayEntries((prev) => [res.expense, ...(prev || [])]);
      setLedgerEntries((prev) => [res.expense, ...(prev || [])]);

      // Reset form fields
      setEntryAmount('');
      setEntryDescription('');
      setEntryPaidTo('');
      setEntryReceiptUrl('');
      setUploadedSlipName(null);

      // Refresh live balance from server
      fetchBalance();
    } catch (err: any) {
      // Rollback optimistic balance on error
      setLiveBalance((prev) =>
        prev
          ? {
              ...prev,
              currentBalance: prevBalance,
              currentBalanceRupees: prevBalance / 100,
            }
          : null
      );
      alert(err.message || 'Failed to submit expense entry');
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  // ─── Trigger Offline Sync ──────────────────────────────────────────────────
  const handleSyncOffline = async () => {
    if (offlineQueue.length === 0) return;
    setIsSyncingOffline(true);
    try {
      const res = await expensesApi.syncOfflineQueue();
      refreshOfflineQueue();
      fetchBalance();
      fetchTodayEntries();
      if (activeTab === 'ledger') fetchLedgerEntries(true);
      alert(`Synchronized ${res.syncedCount} offline entries successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to sync offline queue');
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // ─── Approve Entry (Super Admin / Admin / Manager) ─────────────────────────
  const handleApproveEntry = async (entry: ExpenseEntry) => {
    try {
      await expensesApi.approveExpense(entry.id);
      setPendingEntries((prev) => (prev || []).filter((e) => e.id !== entry.id));
      setTodayEntries((prev) =>
        (prev || []).map((e) => (e.id === entry.id ? { ...e, status: 'APPROVED' } : e))
      );
      setLedgerEntries((prev) =>
        (prev || []).map((e) => (e.id === entry.id ? { ...e, status: 'APPROVED' } : e))
      );
      if (lastLoggedExpense && lastLoggedExpense.id === entry.id) {
        setLastLoggedExpense((prev) => (prev ? { ...prev, status: 'APPROVED' } : null));
      }
      fetchBalance();
    } catch (err: any) {
      alert(err.message || 'Failed to approve expense');
    }
  };

  // ─── Reject Entry (Super Admin / Admin / Manager) ──────────────────────────
  const handleConfirmReject = async () => {
    if (!selectedRejectEntry || !rejectionReason.trim()) return;
    try {
      await expensesApi.rejectExpense(selectedRejectEntry.id, rejectionReason.trim());
      setPendingEntries((prev) => (prev || []).filter((e) => e.id !== selectedRejectEntry.id));
      setTodayEntries((prev) =>
        (prev || []).map((e) => (e.id === selectedRejectEntry.id ? { ...e, status: 'REJECTED' } : e))
      );
      setLedgerEntries((prev) =>
        (prev || []).map((e) => (e.id === selectedRejectEntry.id ? { ...e, status: 'REJECTED' } : e))
      );
      if (lastLoggedExpense && lastLoggedExpense.id === selectedRejectEntry.id) {
        setLastLoggedExpense((prev) => (prev ? { ...prev, status: 'REJECTED' } : null));
      }
      setSelectedRejectEntry(null);
      setRejectionReason('');
      fetchBalance();
    } catch (err: any) {
      alert(err.message || 'Failed to reject expense');
    }
  };

  // ─── Void Entry (Super Admin Only) ─────────────────────────────────────────
  const handleConfirmVoid = async () => {
    if (!voidModalEntry || !voidReasonText.trim()) return;
    setIsVoiding(true);
    try {
      await expensesApi.voidExpense(voidModalEntry.id, voidReasonText.trim());
      setTodayEntries((prev) => (prev || []).filter((e) => e.id !== voidModalEntry.id));
      setLedgerEntries((prev) =>
        (prev || []).map((e) => (e.id === voidModalEntry.id ? { ...e, status: 'VOIDED', isVoid: true } : e))
      );
      setVoidModalEntry(null);
      setVoidReasonText('');
      fetchBalance();
      alert('Expense voided and financial reversal applied.');
    } catch (err: any) {
      alert(err.message || 'Failed to void expense');
    } finally {
      setIsVoiding(false);
    }
  };

  // ─── Slip File Upload (Fast Entry & Edit Modal) ───────────────────────────
  const handleSlipFileUpload = async (file: File, isEdit: boolean = false) => {
    if (!file) return;
    if (isEdit) {
      setIsUploadingEditSlip(true);
    } else {
      setIsUploadingSlip(true);
    }
    try {
      const res = await expensesApi.uploadReceipt(file);
      if (isEdit) {
        setEditReceiptUrl(res.url);
        setEditSlipName(res.fileName || file.name);
      } else {
        setEntryReceiptUrl(res.url);
        setUploadedSlipName(res.fileName || file.name);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload receipt slip');
    } finally {
      if (isEdit) {
        setIsUploadingEditSlip(false);
      } else {
        setIsUploadingSlip(false);
      }
    }
  };

  // ─── Open Edit Modal ────────────────────────────────────────────────────────
  const handleOpenEditModal = (expense: ExpenseEntry) => {
    setEditingExpense(expense);
    setEditAmount(String(expense.amount / 100));
    setEditCategory(expense.categoryId);
    setEditPaymentMode(expense.paymentMode);
    setEditDescription(expense.description);
    setEditPaidTo(expense.paidTo);
    setEditReceiptUrl(expense.receiptAttachment || '');
    setEditSlipName(expense.receiptAttachment ? 'Existing receipt attached' : null);
    setEditChangeReason('');
    setIsEditModalOpen(true);
  };

  // ─── Save Edited Expense ───────────────────────────────────────────────────
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const amountVal = parseFloat(editAmount);
    if (!amountVal || amountVal <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updated = await expensesApi.updateExpense(editingExpense.id, {
        amount: amountVal,
        amountInPaise: false,
        categoryId: editCategory,
        paymentMode: editPaymentMode,
        description: editDescription.trim(),
        paidTo: editPaidTo.trim(),
        receiptAttachment: editReceiptUrl || null,
        changeReason: editChangeReason.trim() || 'Updated expense details',
      });

      // Update local state arrays
      setTodayEntries((prev) => (prev || []).map((item) => (item.id === updated.id ? updated : item)));
      setLedgerEntries((prev) => (prev || []).map((item) => (item.id === updated.id ? updated : item)));
      setPendingEntries((prev) => (prev || []).map((item) => (item.id === updated.id ? updated : item)));
      if (lastLoggedExpense && lastLoggedExpense.id === updated.id) {
        setLastLoggedExpense(updated);
      }

      fetchBalance();
      setIsEditModalOpen(false);
      setEditingExpense(null);
      alert('Expense updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update expense entry');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ─── Confirm Delete Expense (Super Admin Only) ─────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteModalEntry) return;
    setIsDeletingEntry(true);
    try {
      await expensesApi.deleteExpense(deleteModalEntry.id, deleteReasonText.trim());

      // Remove from all local arrays
      setTodayEntries((prev) => (prev || []).filter((e) => e.id !== deleteModalEntry.id));
      setLedgerEntries((prev) => (prev || []).filter((e) => e.id !== deleteModalEntry.id));
      setPendingEntries((prev) => (prev || []).filter((e) => e.id !== deleteModalEntry.id));
      if (lastLoggedExpense && lastLoggedExpense.id === deleteModalEntry.id) {
        setLastLoggedExpense(null);
      }

      fetchBalance();
      setDeleteModalEntry(null);
      setDeleteReasonText('');
      alert('Expense entry permanently deleted.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense entry');
    } finally {
      setIsDeletingEntry(false);
    }
  };

  // ─── Reconciliation Submit ─────────────────────────────────────────────────
  const handleReconcileSubmit = async () => {
    const physicalVal = parseFloat(physicalCashInput);
    if (isNaN(physicalVal) || physicalVal < 0) {
      alert('Please enter a valid counted physical cash amount');
      return;
    }
    if (!selectedBranchId && !isAllBranches) {
      alert('Please select a branch location');
      return;
    }
    const branchToUse = isAllBranches ? branches[0]?.id : selectedBranchId;
    if (!branchToUse) return;

    setIsReconciling(true);
    try {
      const res = await expensesApi.reconcileDaily({
        branchId: branchToUse,
        date: reconcileDate,
        physicalCashCounted: physicalVal,
        reconciliationNotes: reconcileNotes.trim() || null,
      });
      setReconcileLedger(res);
      fetchBalance();
      alert('Daily closing reconciliation successfully locked!');
    } catch (err: any) {
      alert(err.message || 'Reconciliation failed');
    } finally {
      setIsReconciling(false);
    }
  };

  // ─── Float Top-Up Submit ───────────────────────────────────────────────────
  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a positive float top-up amount');
      return;
    }
    const branchToUse = isAllBranches ? branches[0]?.id : selectedBranchId;
    if (!branchToUse) return;

    setIsSubmittingTopUp(true);
    try {
      await expensesApi.addFloatTopUp({
        branchId: branchToUse,
        amount: amt,
        source: topUpSource,
        referenceNo: topUpRef || null,
        notes: topUpNotes || null,
      });
      setIsTopUpModalOpen(false);
      setTopUpAmount('');
      setTopUpRef('');
      setTopUpNotes('');
      fetchBalance();
      alert('Cash float top-up added to live cash balance!');
    } catch (err: any) {
      alert(err.message || 'Failed to record float top-up');
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  // ─── Category Master Submit ────────────────────────────────────────────────
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert('Category name is required');
      return;
    }
    setIsSubmittingCat(true);
    try {
      const budgetVal = catBudget ? parseFloat(catBudget) : null;
      if (editingCategory) {
        await expensesApi.updateCategory(editingCategory.id, {
          name: catName.trim(),
          description: catDesc || null,
          monthlyBudgetLimit: budgetVal,
        });
      } else {
        await expensesApi.createCategory({
          name: catName.trim(),
          description: catDesc || null,
          monthlyBudgetLimit: budgetVal,
        });
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCatName('');
      setCatDesc('');
      setCatBudget('');
      fetchCategoriesWithSpend();
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  // ─── Excel Download Handler ────────────────────────────────────────────────
  const handleDownloadExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      await expensesApi.downloadExcelReport({
        period: reportPeriod,
        branchId: isAllBranches ? undefined : selectedBranchId,
        date: reportDate,
        startDate: reportStartDate,
        month: reportMonth,
        year: reportYear,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to download report');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // ─── Reconciliation Variance Calculation ───────────────────────────────────
  const calculatedClosing = useMemo(() => {
    if (!liveBalance) return 0;
    return liveBalance.todayClosing;
  }, [liveBalance]);

  const liveVariance = useMemo(() => {
    if (!physicalCashInput) return null;
    const physical = parseFloat(physicalCashInput);
    if (isNaN(physical)) return null;
    const physicalPaise = Math.round(physical * 100);
    return calculatedClosing - physicalPaise;
  }, [calculatedClosing, physicalCashInput]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-24 sm:pb-8">
      {/* ─── Top Header & Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#27272A] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Daily Cash Expense Tracker
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
                Multi-branch cash-in-hand reconciliation, fast voucher logging & audit ledger
              </p>
            </div>
          </div>
        </div>

        {/* Branch Selector & Fast Float Action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Offline indicator */}
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold animate-pulse">
              <WifiOff size={14} />
              <span>Offline Mode ({offlineQueue.length} queued)</span>
            </div>
          )}

          {offlineQueue.length > 0 && isOnline && (
            <button
              onClick={handleSyncOffline}
              disabled={isSyncingOffline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition shadow-sm"
            >
              <RefreshCw size={14} className={isSyncingOffline ? 'animate-spin' : ''} />
              <span>Sync {offlineQueue.length} Queued</span>
            </button>
          )}

          {/* Facility Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#18181B] p-1 rounded-xl border border-slate-200 dark:border-[#27272A]">
            <Building2 size={16} className="text-slate-400 ml-2" />
            <select
              value={isAllBranches ? 'ALL' : selectedBranchId}
              onChange={(e) => {
                if (e.target.value === 'ALL') {
                  setIsAllBranches(true);
                } else {
                  setIsAllBranches(false);
                  setSelectedBranchId(e.target.value);
                }
              }}
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 py-1 px-2 focus:outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="dark:bg-[#18181B]">
                  {b.name} ({b.code})
                </option>
              ))}
              {isSuperAdmin && (
                <option value="ALL" className="dark:bg-[#18181B]">
                  All Branches (Consolidated)
                </option>
              )}
            </select>
          </div>

          <button
            onClick={() => setIsTopUpModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <Plus size={16} />
            <span>Add Cash Float</span>
          </button>
        </div>
      </div>

      {/* ─── Hero Running Balance & Today KPI Cards ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Running Cash-in-Hand */}
        <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-violet-900/40 via-violet-950/20 to-zinc-950 border border-violet-500/30 dark:border-violet-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-300">Live Cash In Hand</span>
            <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-300">
              <Wallet size={16} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {liveBalance ? formatRupee(liveBalance.currentBalance) : '₹0.00'}
            </div>
            <div className="flex items-center gap-2">
              {liveBalance && liveBalance.currentBalance < 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle size={11} /> Overdrawn / Top-Up Needed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                  <CheckCircle size={11} /> Ready for disbursements
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Today Opening & Received */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Today's Float In</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {liveBalance ? formatRupee(liveBalance.todayOpening + liveBalance.todayReceived) : '₹0.00'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">
            Opening: {liveBalance ? formatRupee(liveBalance.todayOpening) : '₹0.00'} + Top-Ups:{' '}
            {liveBalance ? formatRupee(liveBalance.todayReceived) : '₹0.00'}
          </p>
        </div>

        {/* Card 3: Today's Approved Expenses */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Today's Cash Spent</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {liveBalance ? formatRupee(liveBalance.todayExpenses) : '₹0.00'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">
            From {(todayEntries || []).filter((e) => e?.status === 'APPROVED').length} approved vouchers
          </p>
        </div>

        {/* Card 4: Approvals & Reconciliation Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Status & Pending</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold text-amber-500">
              {liveBalance ? liveBalance.pendingApprovalsCount : 0}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Pending Review</span>
          </div>
          <div className="mt-1">
            {liveBalance?.isReconciled ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <ShieldCheck size={12} /> Today Reconciled
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 dark:text-zinc-500">Closing pending at day-end</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Tab Navigation Bar ─────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-slate-200 dark:border-[#27272A] pb-2">
        <button
          onClick={() => setActiveTab('entry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'entry'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181B]'
          }`}
        >
          <Receipt size={16} />
          <span>Cashier Fast Entry</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181B]'
          }`}
        >
          <BookOpen size={16} />
          <span>Expense Ledger (All)</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap relative ${
            activeTab === 'approvals'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181B]'
          }`}
        >
          <Clock size={16} />
          <span>Approval Queue</span>
          {liveBalance && liveBalance.pendingApprovalsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
              {liveBalance.pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'reconciliation'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181B]'
          }`}
        >
          <Lock size={16} />
          <span>Daily Closing & Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'categories'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181B]'
          }`}
        >
          <Tag size={16} />
          <span>Category Master & Budgets</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#18181B]'
          }`}
        >
          <BarChart3 size={16} />
          <span>Reports & Excel Exports</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CASHIER FAST ENTRY & LIVE BALANCE                               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'entry' && (
        <div className="space-y-4">
          {offlineQueue.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-300 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold">
                    {offlineQueue.length} Expense Voucher(s) Waiting in Browser Local Storage
                  </p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                    These entries were saved locally while the server was waking up or offline. Click sync to save them permanently to the central database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncOffline}
                disabled={isSyncingOffline}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
              >
                <RefreshCw size={14} className={isSyncingOffline ? 'animate-spin' : ''} />
                <span>{isSyncingOffline ? 'Syncing...' : `Sync ${offlineQueue.length} Entries to Server Now`}</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Fast Mobile Entry Form (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A]">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Fast Expense Logging
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Log cash outflow in under 10 seconds</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Auto-approves &le; ₹2,000
                  </span>
                </div>

                {entrySuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle size={16} className="shrink-0" />
                    <span>{entrySuccessMsg}</span>
                  </div>
                )}

                {entryWarningMsg && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{entryWarningMsg}</span>
                  </div>
                )}

                {lastLoggedExpense && (
                  <div className="p-4 rounded-xl bg-violet-50 dark:bg-[#1E182B] border border-violet-200 dark:border-violet-500/30 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-violet-700 dark:text-violet-300">
                          {lastLoggedExpense.entryNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            lastLoggedExpense.status === 'APPROVED'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : lastLoggedExpense.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {lastLoggedExpense.status === 'APPROVED'
                            ? '✓ Auto-Approved & Deducted'
                            : lastLoggedExpense.status === 'PENDING'
                            ? '⏳ Awaiting Admin Review'
                            : lastLoggedExpense.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLastLoggedExpense(null);
                          setEntrySuccessMsg(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                        title="Dismiss voucher banner"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                          {lastLoggedExpense.description}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                          Paid to <strong className="text-slate-700 dark:text-zinc-300">{lastLoggedExpense.paidTo}</strong> ({lastLoggedExpense.category?.name || 'Expense'})
                        </p>
                      </div>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {formatRupee(lastLoggedExpense.amount)}
                      </span>
                    </div>

                    {/* Super Admin Quick Approval on Last Logged Voucher */}
                    {canApprove && lastLoggedExpense.status === 'PENDING' && (
                      <div className="pt-2 border-t border-violet-200 dark:border-violet-500/20 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          Admin Action Required:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedRejectEntry(lastLoggedExpense)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveEntry(lastLoggedExpense)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                          >
                            <Check size={12} />
                            Approve Now
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span>Logged to Today's Feed</span>
                        {lastLoggedExpense.receiptAttachment && (
                          <button
                            type="button"
                            onClick={() => setPreviewReceipt({ isOpen: true, url: lastLoggedExpense.receiptAttachment!, entry: lastLoggedExpense })}
                            className="px-2 py-0.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-semibold text-[11px] flex items-center gap-1 transition border border-violet-500/20"
                          >
                            <Camera size={12} />
                            <span>View Uploaded Slip</span>
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('ledger')}
                        className="text-violet-600 dark:text-violet-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>View in Full Ledger</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleFastEntrySubmit} className="space-y-4">
                  {/* Branch Location Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Building2 size={14} className="text-violet-500" />
                      <span>Branch Location <span className="text-rose-500">*</span></span>
                    </label>
                    <select
                      value={entryBranchId}
                      onChange={(e) => setEntryBranchId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-sm font-semibold text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id} className="dark:bg-[#18181B]">
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  {/* Quick amount chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setEntryAmount(String(amt))}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-[#3F3F46] text-xs font-semibold text-slate-700 dark:text-zinc-300 transition"
                      >
                        +₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Selector Chips */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                    {categories.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setEntryCategory(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          entryCategory === c.id
                            ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-[#09090B] border-slate-200 dark:border-[#27272A] text-slate-700 dark:text-zinc-300 hover:border-violet-500'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CASH', 'UPI', 'BANK_TRANSFER'] as const).map((mode) => (
                      <button
                        type="button"
                        key={mode}
                        onClick={() => setEntryPaymentMode(mode)}
                        className={`py-2 rounded-xl text-xs font-bold transition border text-center ${
                          entryPaymentMode === mode
                            ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-[#09090B] border-slate-200 dark:border-[#27272A] text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        {mode === 'BANK_TRANSFER' ? 'Bank' : mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description & Quick Suggestions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Description / Note <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tea for visitors, hardware courier"
                    value={entryDescription}
                    onChange={(e) => setEntryDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUICK_NOTES.slice(0, 4).map((note) => (
                      <button
                        type="button"
                        key={note}
                        onClick={() => setEntryDescription(note)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-zinc-400 hover:text-violet-400 transition"
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paid To */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Paid To (Vendor / Person) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Tea Stall, Blue Dart, Cashier"
                    value={entryPaidTo}
                    onChange={(e) => setEntryPaidTo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                {/* Receipt Slip File Upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Camera size={14} className="text-violet-500" />
                      <span>Receipt Slip / Voucher Photo</span>
                    </label>
                    {entryReceiptUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setEntryReceiptUrl('');
                          setUploadedSlipName(null);
                        }}
                        className="text-[11px] text-rose-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSlipFileUpload(file, false);
                    }}
                  />

                  {entryReceiptUrl ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                        <span className="text-xs text-emerald-700 dark:text-emerald-300 truncate font-medium">
                          {uploadedSlipName || 'Receipt Slip Attached'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={entryReceiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink size={11} /> View
                        </a>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingSlip}
                        className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-[#3F3F46] hover:border-violet-500 hover:bg-violet-500/5 transition flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer"
                      >
                        {isUploadingSlip ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-violet-500" />
                            <span>Uploading Slip to Cloud...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud size={16} className="text-violet-500" />
                            <span>Upload Slip / Take Photo (Image or PDF)</span>
                          </>
                        )}
                      </button>
                      <input
                        type="text"
                        placeholder="Or paste receipt link directly"
                        value={entryReceiptUrl}
                        onChange={(e) => setEntryReceiptUrl(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-[11px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingEntry}
                  className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Check size={18} />
                  <span>{isSubmittingEntry ? 'Recording...' : 'Log Cash Expense Entry'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Today's Entries Feed (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A]">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Today's Cash Entries
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Real-time transaction stream for {new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={fetchTodayEntries}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#27272A] transition"
                  title="Refresh Today's Feed"
                >
                  <RefreshCw size={16} className={isLoadingToday ? 'animate-spin' : ''} />
                </button>
              </div>

              {(todayEntries || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-zinc-500 text-sm">
                  <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                  No cash expenses logged today yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Mobile stacked cards */}
                  <div className="block sm:hidden space-y-2.5">
                    {(todayEntries || []).map((e) => (
                      <div
                        key={e.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                              {e.entryNumber}
                            </span>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                              {e.description}
                            </h4>
                          </div>
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">
                            {formatRupee(e.amount)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-[#27272A] font-medium">
                            {e.category?.name || 'Category'}
                          </span>
                          <span>•</span>
                          <span>{e.paidTo}</span>
                          <span>•</span>
                          <span>{e.time}</span>
                          <span>•</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              e.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : e.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            {e.status}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {e.status === 'PENDING' && canApprove && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveEntry(e)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                >
                                  <Check size={12} /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRejectEntry(e)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {!e.isVoid && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(e)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-[#3F3F46] text-slate-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <Edit3 size={12} /> Edit
                              </button>
                            )}
                            {e.receiptAttachment && (
                              <button
                                type="button"
                                onClick={() => setPreviewReceipt({ isOpen: true, url: e.receiptAttachment!, entry: e })}
                                className="px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-semibold flex items-center gap-1 transition border border-violet-500/20"
                                title="View receipt slip"
                              >
                                <Camera size={12} /> Slip
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isSuperAdmin && e.status !== 'VOIDED' && (
                              <button
                                type="button"
                                onClick={() => setVoidModalEntry(e)}
                                className="text-xs text-amber-600 hover:text-amber-700 font-semibold px-1"
                              >
                                Void
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteModalEntry(e)}
                                className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-700 transition"
                                title="Delete expense voucher (Super Admin only)"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-zinc-400 uppercase font-semibold border-b border-slate-200 dark:border-[#27272A]">
                        <tr>
                          <th className="py-2.5 px-3">Voucher No</th>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Paid To</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Receipt</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                        {(todayEntries || []).map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-[#27272A]/30 transition">
                            <td className="py-2.5 px-3 font-mono font-semibold text-violet-600 dark:text-violet-400">
                              {e.entryNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-zinc-400">{e.time}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-zinc-200">
                              {e.category?.name || '-'}
                            </td>
                            <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-700 dark:text-zinc-300">
                              {e.description}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">{e.paidTo}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                              {formatRupee(e.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  e.status === 'APPROVED'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : e.status === 'PENDING'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-rose-500/10 text-rose-500'
                                }`}
                              >
                                {e.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {e.receiptAttachment ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewReceipt({ isOpen: true, url: e.receiptAttachment!, entry: e })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold text-[11px] transition border border-violet-500/20 shadow-xs cursor-pointer"
                                  title="View uploaded receipt slip"
                                >
                                  <Camera size={12} />
                                  <span>View</span>
                                </button>
                              ) : (
                                <span className="text-slate-300 dark:text-zinc-600 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {e.status === 'PENDING' && canApprove && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveEntry(e)}
                                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-0.5 shadow-sm"
                                      title="Approve expense entry"
                                    >
                                      <Check size={11} /> Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedRejectEntry(e)}
                                      className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition"
                                      title="Reject expense entry"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {!e.isVoid && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(e)}
                                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#27272A] text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition"
                                    title="Edit expense entry"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                )}
                                {isSuperAdmin && e.status !== 'VOIDED' && (
                                  <button
                                    type="button"
                                    onClick={() => setVoidModalEntry(e)}
                                    className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold px-1 py-0.5"
                                    title="Void expense entry"
                                  >
                                    Void
                                  </button>
                                )}
                                {isSuperAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteModalEntry(e)}
                                    className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-700 transition"
                                    title="Delete expense voucher (Super Admin only)"
                                  >
                                    <Trash2 size={13} />
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
          </div>
        </div>
      </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: EXPENSE LEDGER (ALL HISTORICAL ENTRIES)                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#27272A]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <BookOpen size={22} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Organization Expense Ledger (All Entries)
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Search, filter, and audit all expense vouchers across dates and locations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchLedgerEntries(true)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#27272A] transition"
                title="Refresh Ledger"
              >
                <RefreshCw size={16} className={isLoadingLedger ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search voucher #, description, payee..."
                value={ledgerFilterSearch}
                onChange={(e) => setLedgerFilterSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchLedgerEntries(true);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
              />
            </div>

            {/* Branch Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#09090B] px-3 py-2 rounded-xl border border-slate-300 dark:border-[#27272A]">
              <Building2 size={15} className="text-violet-500 shrink-0" />
              <select
                value={ledgerFilterBranch}
                onChange={(e) => setLedgerFilterBranch(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="dark:bg-[#18181B]">All Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="dark:bg-[#18181B]">
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <select
              value={ledgerFilterCategory}
              onChange={(e) => setLedgerFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs font-medium text-slate-800 dark:text-zinc-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={ledgerFilterStatus}
              onChange={(e) => setLedgerFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs font-medium text-slate-800 dark:text-zinc-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved Only</option>
              <option value="PENDING">Pending Approval</option>
              <option value="REJECTED">Rejected</option>
              <option value="VOIDED">Voided</option>
            </select>

            {/* Filter Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fetchLedgerEntries(true)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Search
              </button>

              {(ledgerFilterSearch || ledgerFilterCategory || ledgerFilterBranch !== 'ALL' || ledgerFilterStatus !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setLedgerFilterSearch('');
                    setLedgerFilterCategory('');
                    setLedgerFilterBranch('ALL');
                    setLedgerFilterStatus('ALL');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-[#3F3F46] text-slate-600 dark:text-zinc-400 text-xs font-semibold transition cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Offline Queue Banner in Tab 2 */}
          {offlineQueue.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-300 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold">
                    {offlineQueue.length} Expense Voucher(s) Waiting in Browser Local Storage
                  </p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                    These entries were saved locally while the server was asleep or offline. Click sync to save them permanently to the central database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncOffline}
                disabled={isSyncingOffline}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
              >
                <RefreshCw size={14} className={isSyncingOffline ? 'animate-spin' : ''} />
                <span>{isSyncingOffline ? 'Syncing...' : `Sync ${offlineQueue.length} Entries to Server Now`}</span>
              </button>
            </div>
          )}

          {/* Ledger Table */}
          {(ledgerEntries || []).length === 0 && !isLoadingLedger ? (
            <div className="py-16 text-center text-slate-400 dark:text-zinc-500 text-sm space-y-3">
              <BookOpen size={36} className="mx-auto opacity-40" />
              <p className="font-semibold text-slate-700 dark:text-zinc-300">
                No expense entries found matching current filters.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                {ledgerFilterBranch !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setLedgerFilterBranch('ALL')}
                    className="px-3.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-xs font-semibold hover:bg-violet-100 transition border border-violet-200 dark:border-violet-800/40 cursor-pointer"
                  >
                    View All Branches (Consolidated)
                  </button>
                )}
                {(ledgerFilterSearch || ledgerFilterCategory || ledgerFilterStatus !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerFilterSearch('');
                      setLedgerFilterCategory('');
                      setLedgerFilterStatus('ALL');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                  >
                    Clear Search & Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#27272A]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-zinc-400 uppercase font-semibold border-b border-slate-200 dark:border-[#27272A]">
                    <tr>
                      <th className="py-3 px-3.5">Voucher No</th>
                      <th className="py-3 px-3.5">Date & Time</th>
                      {(ledgerFilterBranch === 'ALL' || branches.length > 1) && (
                        <th className="py-3 px-3.5">Branch</th>
                      )}
                      <th className="py-3 px-3.5">Category</th>
                      <th className="py-3 px-3.5">Description</th>
                      <th className="py-3 px-3.5">Paid To</th>
                      <th className="py-3 px-3.5">Mode</th>
                      <th className="py-3 px-3.5 text-right">Amount</th>
                      <th className="py-3 px-3.5 text-center">Status</th>
                      <th className="py-3 px-3.5">Logged By</th>
                      <th className="py-3 px-3.5 text-center">Receipt</th>
                      <th className="py-3 px-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                    {(ledgerEntries || []).map((e) => (
                      <tr
                        key={e.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-[#27272A]/30 transition ${
                          e.isVoid || e.status === 'VOIDED' ? 'opacity-60 bg-slate-50/30' : ''
                        }`}
                      >
                        {/* Voucher No */}
                        <td className="py-3 px-3.5 font-mono font-bold text-violet-600 dark:text-violet-400 whitespace-nowrap">
                          {e.entryNumber}
                        </td>

                        {/* Date & Time */}
                        <td className="py-3 px-3.5 text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                          <div>{formatDate(e.date)}</div>
                          <div className="text-[10px] text-slate-400 dark:text-zinc-500">{e.time}</div>
                        </td>

                        {/* Branch */}
                        {(ledgerFilterBranch === 'ALL' || branches.length > 1) && (
                          <td className="py-3 px-3.5 text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                            <span className="font-semibold">{e.branch?.name || '-'}</span>
                            {e.branch?.code && <span className="ml-1 text-[10px] text-slate-400">({e.branch.code})</span>}
                          </td>
                        )}

                        {/* Category */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-zinc-300 font-medium">
                            {e.category?.name || '-'}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-3 px-3.5 max-w-[220px] truncate text-slate-800 dark:text-zinc-200" title={e.description}>
                          {e.description}
                          {e.isVoid && e.voidReason && (
                            <span className="block text-[10px] text-rose-500 italic">Voided: {e.voidReason}</span>
                          )}
                          {e.status === 'REJECTED' && e.rejectionReason && (
                            <span className="block text-[10px] text-rose-500 italic">Rejected: {e.rejectionReason}</span>
                          )}
                        </td>

                        {/* Paid To */}
                        <td className="py-3 px-3.5 text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                          {e.paidTo}
                        </td>

                        {/* Payment Mode */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-zinc-400">
                            {e.paymentMode}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3.5 text-right font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                          <span className={e.isVoid || e.status === 'VOIDED' ? 'line-through text-slate-400' : ''}>
                            {formatRupee(e.amount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              e.isVoid || e.status === 'VOIDED'
                                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-500'
                                : e.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : e.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            {e.isVoid || e.status === 'VOIDED' ? 'VOIDED' : e.status}
                          </span>
                        </td>

                        {/* Logged By */}
                        <td className="py-3 px-3.5 text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                          {e.addedBy?.firstName ? `${e.addedBy.firstName} ${e.addedBy.lastName || ''}`.trim() : e.addedBy?.email || '-'}
                        </td>

                        {/* Receipt */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {e.receiptAttachment ? (
                            <button
                              type="button"
                              onClick={() => setPreviewReceipt({ isOpen: true, url: e.receiptAttachment!, entry: e })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold text-xs transition border border-violet-500/20 shadow-xs cursor-pointer"
                              title="View Receipt Slip / Voucher"
                            >
                              <Camera size={13} />
                              <span>View Slip</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-zinc-600 text-xs">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {e.status === 'PENDING' && canApprove && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveEntry(e)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                                  title="Approve expense entry"
                                >
                                  <Check size={11} /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRejectEntry(e)}
                                  className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition"
                                  title="Reject expense entry"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {!e.isVoid && e.status !== 'VOIDED' && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(e)}
                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#27272A] text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition"
                                title="Edit expense entry"
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
                            {isSuperAdmin && !e.isVoid && e.status !== 'VOIDED' && (
                              <button
                                type="button"
                                onClick={() => setVoidModalEntry(e)}
                                className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold px-1 py-0.5"
                                title="Void expense entry"
                              >
                                Void
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteModalEntry(e)}
                                className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-700 transition"
                                title="Delete expense voucher (Super Admin only)"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Load More Pagination Button */}
              {ledgerHasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => fetchLedgerEntries(false)}
                    disabled={isLoadingLedger}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-[#3F3F46] text-xs font-bold text-slate-700 dark:text-zinc-300 transition flex items-center gap-2"
                  >
                    {isLoadingLedger ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Loading Next Entries...</span>
                      </>
                    ) : (
                      <span>Load Next 50 Entries</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: APPROVAL QUEUE                                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'approvals' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#27272A]">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Pending Expense Approvals
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Entries exceeding the auto-approval threshold requiring management sign-off
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchApprovals}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#27272A] transition"
              >
                <RefreshCw size={16} className={isLoadingPending ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {(pendingEntries || []).length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-zinc-500 text-sm">
              <CheckCircle size={36} className="mx-auto mb-2 text-emerald-500/50" />
              All caught up! Zero pending approvals in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {(pendingEntries || []).map((e) => (
                <div
                  key={e.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-violet-600 dark:text-violet-400 text-sm">
                        {e.entryNumber}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                        PENDING APPROVAL
                      </span>
                      <span className="text-xs text-slate-400">({formatDate(e.date)} {e.time})</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{e.description}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                      <span>Category: <strong className="text-slate-700 dark:text-zinc-200">{e.category?.name}</strong></span>
                      <span>•</span>
                      <span>Paid To: <strong className="text-slate-700 dark:text-zinc-200">{e.paidTo}</strong></span>
                      <span>•</span>
                      <span>Mode: <strong className="text-slate-700 dark:text-zinc-200">{e.paymentMode}</strong></span>
                      <span>•</span>
                      <span>Logged By: <strong className="text-slate-700 dark:text-zinc-200">{e.addedBy?.firstName || e.addedBy?.email}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Voucher Amount</span>
                      <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {formatRupee(e.amount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {e.receiptAttachment && (
                        <button
                          type="button"
                          onClick={() => setPreviewReceipt({ isOpen: true, url: e.receiptAttachment!, entry: e })}
                          className="px-3 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-bold transition flex items-center gap-1.5 border border-violet-500/20 cursor-pointer shadow-xs"
                          title="Inspect receipt slip before approving"
                        >
                          <Camera size={14} />
                          <span>View Slip</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedRejectEntry(e)}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveEntry(e)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: DAILY CLOSING & RECONCILIATION                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#27272A]">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Daily Closing & Physical Cash Reconciliation
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Verify actual physical cash in drawer against calculated system closing balance
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={reconcileDate}
                  onChange={(e) => setReconcileDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-zinc-200"
                />
              </div>
            </div>

            {/* Reconciliation Balance Flow (4-Step Breakdown) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A]">
                <span className="text-xs text-slate-400">1. Opening Balance</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {liveBalance ? formatRupee(liveBalance.todayOpening) : '₹0.00'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A]">
                <span className="text-xs text-emerald-500 font-semibold">+ 2. Cash Received / Float</span>
                <div className="text-lg font-bold text-emerald-500 mt-0.5">
                  {liveBalance ? formatRupee(liveBalance.todayReceived) : '₹0.00'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A]">
                <span className="text-xs text-rose-500 font-semibold">- 3. Approved Cash Expenses</span>
                <div className="text-lg font-bold text-rose-500 mt-0.5">
                  {liveBalance ? formatRupee(liveBalance.todayExpenses) : '₹0.00'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <span className="text-xs text-violet-400 font-bold">= 4. System Closing Balance</span>
                <div className="text-lg font-extrabold text-violet-600 dark:text-violet-300 mt-0.5">
                  {formatRupee(calculatedClosing)}
                </div>
              </div>
            </div>

            {/* Reconciliation Form */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
                Physical Cash Count Input
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    Physical Cash Counted (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Enter physical cash in drawer"
                    value={physicalCashInput}
                    onChange={(e) => setPhysicalCashInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#18181B] border border-slate-300 dark:border-[#27272A] text-lg font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    Calculated Variance (System - Physical)
                  </label>
                  <div className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#18181B] border border-slate-300 dark:border-[#27272A] text-lg font-bold flex items-center justify-between">
                    <span>{liveVariance != null ? formatRupee(liveVariance) : '-'}</span>
                    {liveVariance === 0 ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                        PERFECT MATCH
                      </span>
                    ) : liveVariance != null ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-500">
                        MISMATCH FLAGGED
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Reconciliation Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Physical count verified with branch accountant"
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#18181B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleReconcileSubmit}
                  disabled={isReconciling || !physicalCashInput}
                  className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition shadow-sm disabled:opacity-50"
                >
                  {isReconciling ? 'Reconciling...' : 'Lock Daily Closing & Reconcile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: CATEGORY MASTER & BUDGETS                                       */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Expense Categories & Budgets
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Configure expense categories and monthly budget limits with live spend alerts
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCatName('');
                setCatDesc('');
                setCatBudget('');
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-semibold transition"
            >
              <Plus size={16} />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => {
              const budgetPaise = c.monthlyBudgetLimit || 0;
              const spendPaise = c.currentMonthSpendPaise || 0;
              const percent = budgetPaise > 0 ? Math.min(100, Math.round((spendPaise / budgetPaise) * 100)) : 0;
              const isOver = budgetPaise > 0 && spendPaise > budgetPaise;

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{c.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">{c.description || 'No description'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(c);
                          setCatName(c.name);
                          setCatDesc(c.description || '');
                          setCatBudget(c.monthlyBudgetLimit ? String(c.monthlyBudgetLimit / 100) : '');
                          setIsCategoryModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-[#27272A] transition"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete category "${c.name}"?`)) {
                            await expensesApi.deleteCategory(c.id);
                            fetchCategoriesWithSpend();
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-[#27272A] transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Budget & Spend Progress */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-zinc-400">Monthly Budget</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {budgetPaise > 0 ? formatRupee(budgetPaise) : 'Unlimited'}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#27272A] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-violet-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-zinc-400">
                        Spent: {formatRupee(spendPaise)}
                      </span>
                      {isOver ? (
                        <span className="font-bold text-rose-500">Over Budget ({percent}%)</span>
                      ) : (
                        <span className="text-slate-400">{percent}% used</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: REPORTS & EXCEL EXPORT GENERATION                               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* 4 One-Click Excel Generator Cards */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Multi-Sheet Excel Report Generator (.xlsx)
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Server-side generated multi-sheet workbooks with currency formatting, category pivots & frozen headers
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Day-Wise Export Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-500">1. Day-Wise Report</span>
                  <FileSpreadsheet size={18} className="text-violet-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Itemized vouchers, opening float, closing balance & reconciliation
                </p>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-300 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-zinc-200"
                />
                <button
                  onClick={() => {
                    setReportPeriod('day');
                    handleDownloadExcel();
                  }}
                  disabled={isDownloadingExcel}
                  className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Day .xlsx</span>
                </button>
              </div>

              {/* Week-Wise Export Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">2. Week-Wise Report</span>
                  <FileSpreadsheet size={18} className="text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Mon–Sun daily rollup with category pivot columns & week total
                </p>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-300 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-zinc-200"
                />
                <button
                  onClick={() => {
                    setReportPeriod('week');
                    handleDownloadExcel();
                  }}
                  disabled={isDownloadingExcel}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Week .xlsx</span>
                </button>
              </div>

              {/* Month-Wise Export Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-500">3. Month-Wise Report</span>
                  <FileSpreadsheet size={18} className="text-blue-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Daily sub-totals, category pivot columns, and variance log
                </p>
                <div className="flex gap-2">
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(Number(e.target.value))}
                    className="w-1/2 px-2 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-300 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-zinc-200"
                  >
                    {[
                      'Jan',
                      'Feb',
                      'Mar',
                      'Apr',
                      'May',
                      'Jun',
                      'Jul',
                      'Aug',
                      'Sep',
                      'Oct',
                      'Nov',
                      'Dec',
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                    className="w-1/2 px-2 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-300 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-zinc-200"
                  />
                </div>
                <button
                  onClick={() => {
                    setReportPeriod('month');
                    handleDownloadExcel();
                  }}
                  disabled={isDownloadingExcel}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Month .xlsx</span>
                </button>
              </div>

              {/* Year-Wise Export Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-500">4. Year-Wise Report</span>
                  <FileSpreadsheet size={18} className="text-amber-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Annual category trends, monthly financial rollups & grand totals
                </p>
                <input
                  type="number"
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-300 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-zinc-200"
                />
                <button
                  onClick={() => {
                    setReportPeriod('year');
                    handleDownloadExcel();
                  }}
                  disabled={isDownloadingExcel}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Year .xlsx</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Chart: Category Spend Breakdown */}
            <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
                Category Spend Distribution
              </h3>

              {analytics?.categoryDistribution && analytics.categoryDistribution.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categoryDistribution || []}
                        dataKey="amountRupees"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {(analytics.categoryDistribution || []).map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Spent']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  No expense distribution data available
                </div>
              )}
            </div>

            {/* Bar Chart: Monthly Spend Trend */}
            <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
                Monthly Spend Trend ({reportYear})
              </h3>

              {analytics && Array.isArray(analytics.trendData) && analytics.trendData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.trendData || []}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                      <YAxis stroke="#888888" fontSize={11} />
                      <RechartsTooltip formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Spent']} />
                      <Bar dataKey="amountRupees" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  No monthly trend data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Cash Float Top-Up ────────────────────────────────────────── */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Cash Float Top-Up</h3>
              <button
                onClick={() => setIsTopUpModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Top-Up Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="e.g. 10000"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-lg font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Source of Cash Float
                </label>
                <select
                  value={topUpSource}
                  onChange={(e) => setTopUpSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs font-medium text-slate-800 dark:text-zinc-200"
                >
                  <option value="Cash from Bank">Cash from Bank (ATM / Cheque)</option>
                  <option value="HQ Cash Float">HQ Cash Float Transfer</option>
                  <option value="Director Advance">Director / Partner Cash Advance</option>
                  <option value="Customer Cash Inflow">Customer Cash Inflow</option>
                  <option value="Other">Other Top-Up</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Reference / Cheque No
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-889102"
                  value={topUpRef}
                  onChange={(e) => setTopUpRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Notes / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly petty cash replenish"
                  value={topUpNotes}
                  onChange={(e) => setTopUpNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#27272A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTopUp}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-sm"
                >
                  {isSubmittingTopUp ? 'Adding...' : 'Add Float to Live Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Add/Edit Category ────────────────────────────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transport & Travel"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Description</label>
                <input
                  type="text"
                  placeholder="Short description of items in this category"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Monthly Budget Limit (₹) (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 50000 for ₹50,000/month"
                  value={catBudget}
                  onChange={(e) => setCatBudget(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#27272A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCat}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-sm"
                >
                  {isSubmittingCat ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Rejection Prompt ─────────────────────────────────────────── */}
      {selectedRejectEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Reject Expense Entry</h3>
            <p className="text-xs text-slate-500">
              Voucher #{selectedRejectEntry.entryNumber} for {formatRupee(selectedRejectEntry.amount)}
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Rejection Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Reason for rejecting this expense (e.g. missing receipt, unapproved quote)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedRejectEntry(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Void Confirmation ────────────────────────────────────────── */}
      {voidModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-rose-500 flex items-center gap-1.5">
              <AlertTriangle size={18} />
              <span>Void Expense Entry</span>
            </h3>
            <p className="text-xs text-slate-500">
              This will reverse the financial movement for voucher #{voidModalEntry.entryNumber} (
              {formatRupee(voidModalEntry.amount)}) and record an immutable audit log.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Mandatory Void Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Explain why this entry is being voided..."
                value={voidReasonText}
                onChange={(e) => setVoidReasonText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setVoidModalEntry(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoid}
                disabled={isVoiding || !voidReasonText.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isVoiding ? 'Voiding...' : 'Confirm Void & Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Edit Expense Entry ────────────────────────────────────────── */}
      {isEditModalOpen && editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 size={18} className="text-violet-500" />
                  <span>Edit Expense Entry</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                  Voucher #{editingExpense.entryNumber} • {editingExpense.branch?.name || 'Branch Expense'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingExpense(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272A] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>

            {editingExpense.status === 'APPROVED' && !editingExpense.isVoid && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                <span>
                  <strong>Approved Voucher Notice:</strong> Changing the amount will automatically adjust the branch cash balance and reconcile daily ledger totals.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs font-bold text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {(categories || []).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Payment Mode</label>
                <div className="flex items-center gap-2">
                  {(['CASH', 'UPI', 'BANK_TRANSFER'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setEditPaymentMode(mode)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition border ${
                        editPaymentMode === mode
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-[#27272A] hover:bg-slate-100 dark:hover:bg-[#27272A]'
                      }`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid To */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Paid To / Vendor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editPaidTo}
                  onChange={(e) => setEditPaidTo(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"
                  placeholder="e.g. Swiggy, Cleaner, Supplier"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Description / Purpose <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"
                  placeholder="Detailed purpose of the expense..."
                />
              </div>

              {/* Slip File Upload / Attachment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Camera size={14} className="text-violet-500" />
                    <span>Receipt Slip / Voucher (Image / PDF)</span>
                  </label>
                  {editReceiptUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditReceiptUrl('');
                        setEditSlipName(null);
                      }}
                      className="text-[11px] text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={editFileInputRef}
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSlipFileUpload(file, true);
                  }}
                />

                {editReceiptUrl ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-emerald-700 dark:text-emerald-300 truncate font-medium">
                        {editSlipName || 'Receipt Slip Attached'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={editReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink size={11} /> View
                      </a>
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={isUploadingEditSlip}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-[#3F3F46] hover:border-violet-500 hover:bg-violet-500/5 transition flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer"
                    >
                      {isUploadingEditSlip ? (
                        <>
                          <RefreshCw size={14} className="animate-spin text-violet-500" />
                          <span>Uploading Slip to Cloud...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={15} className="text-violet-500" />
                          <span>Upload Slip / Photo (Image or PDF)</span>
                        </>
                      )}
                    </button>
                    <input
                      type="text"
                      placeholder="Or paste receipt URL directly"
                      value={editReceiptUrl}
                      onChange={(e) => setEditReceiptUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-[11px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Edit Reason */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Change Reason <span className="text-slate-400 font-normal">(for audit trail)</span>
                </label>
                <input
                  type="text"
                  value={editChangeReason}
                  onChange={(e) => setEditChangeReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"
                  placeholder="e.g. Corrected amount according to bill, updated vendor name"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#27272A]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#27272A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit || isUploadingEditSlip}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Delete Expense (Super Admin Only) ────────────────────────── */}
      {deleteModalEntry && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Expense Voucher</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                  #{deleteModalEntry.entryNumber} • {formatRupee(deleteModalEntry.amount)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete voucher <strong className="font-mono text-slate-900 dark:text-white">#{deleteModalEntry.entryNumber}</strong>?
            </p>

            {deleteModalEntry.status === 'APPROVED' && !deleteModalEntry.isVoid ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span>Automatic Balance Refund</span>
                </div>
                <p>
                  Because this voucher was approved, deleting it will automatically refund{' '}
                  <strong>{formatRupee(deleteModalEntry.amount)}</strong> back to{' '}
                  <strong>{deleteModalEntry.branch?.name || 'the branch'}</strong>'s cash balance and subtract it from today's expenses.
                </p>
              </div>
            ) : deleteModalEntry.isVoid ? (
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#27272A] text-xs text-slate-500 dark:text-zinc-400">
                This voucher was previously VOIDED. The record and its audit history will be permanently deleted.
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#27272A] text-xs text-slate-500 dark:text-zinc-400">
                This voucher is in {deleteModalEntry.status} status and has not impacted cash balances.
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Deletion Reason <span className="text-slate-400 font-normal">(Optional, for audit log)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Reason for deletion..."
                value={deleteReasonText}
                onChange={(e) => setDeleteReasonText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#27272A]">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalEntry(null);
                  setDeleteReasonText('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#27272A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingEntry}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isDeletingEntry ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Deleting Voucher...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Receipt Slip / Voucher Preview Modal ───────────────────────── */}
      {previewReceipt.isOpen && previewReceipt.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#27272A] bg-slate-50/50 dark:bg-[#18181B]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Camera size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Receipt Slip / Voucher Preview
                    </h3>
                    {previewReceipt.entry?.entryNumber && (
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50">
                        {previewReceipt.entry.entryNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Official financial document attached to expense voucher
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewReceipt({ isOpen: false, url: '', entry: null })}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272A] transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Metadata Strip */}
            {previewReceipt.entry && (
              <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-[#09090B] border-b border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-zinc-300">
                  <span>Branch: <strong className="text-slate-900 dark:text-white">{previewReceipt.entry.branch?.name || '-'}</strong></span>
                  <span>•</span>
                  <span>Date: <strong className="text-slate-900 dark:text-white">{formatDate(previewReceipt.entry.date)} {previewReceipt.entry.time}</strong></span>
                  <span>•</span>
                  <span>Paid To: <strong className="text-slate-900 dark:text-white">{previewReceipt.entry.paidTo}</strong></span>
                  <span>•</span>
                  <span>Category: <strong className="text-slate-900 dark:text-white">{previewReceipt.entry.category?.name || '-'}</strong></span>
                  <span>•</span>
                  <span>Mode: <strong className="text-slate-900 dark:text-white font-mono">{previewReceipt.entry.paymentMode}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Amount:</span>
                  <span className="text-sm font-extrabold text-violet-600 dark:text-violet-400">
                    {formatRupee(previewReceipt.entry.amount)}
                  </span>
                </div>
              </div>
            )}

            {/* Media Content Body */}
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100/40 dark:bg-[#09090B]/60 min-h-[350px]">
              {previewReceipt.url.toLowerCase().includes('.pdf') || previewReceipt.url.startsWith('data:application/pdf') ? (
                <div className="w-full h-full min-h-[500px] flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-[#27272A]">
                  <iframe
                    src={previewReceipt.url}
                    title="PDF Voucher Slip"
                    className="w-full flex-1 min-h-[480px] bg-white rounded-xl"
                  />
                </div>
              ) : (
                <div className="max-w-full max-h-[65vh] flex items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-black/20 p-2">
                  <img
                    src={previewReceipt.url}
                    alt="Receipt Slip Voucher"
                    className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-[#27272A] bg-slate-50/50 dark:bg-[#18181B]">
              <div className="flex items-center gap-2">
                <a
                  href={previewReceipt.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-[#3F3F46] text-slate-700 dark:text-zinc-200 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <ExternalLink size={14} />
                  <span>Open in New Tab</span>
                </a>
                <a
                  href={previewReceipt.url}
                  download={`voucher-slip-${previewReceipt.entry?.entryNumber || 'receipt'}`}
                  className="px-3.5 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Slip</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setPreviewReceipt({ isOpen: false, url: '', entry: null })}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ExpensesPage;
