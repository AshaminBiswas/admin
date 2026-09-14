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

  // ─── Core State ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'entry' | 'approvals' | 'reconciliation' | 'categories' | 'reports'>('entry');
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
  const [ledgerFilterCategory, setLedgerFilterCategory] = useState('');
  const [ledgerFilterStatus, setLedgerFilterStatus] = useState('ALL');
  const [ledgerFilterSearch, setLedgerFilterSearch] = useState('');
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

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
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryCategory, setEntryCategory] = useState<string>(() => {
    return localStorage.getItem('prc_last_expense_category') || '';
  });
  const [entryPaymentMode, setEntryPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [entryDescription, setEntryDescription] = useState<string>('');
  const [entryPaidTo, setEntryPaidTo] = useState<string>('');
  const [entryReceiptUrl, setEntryReceiptUrl] = useState<string>('');
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [entrySuccessMsg, setEntrySuccessMsg] = useState<string | null>(null);
  const [entryWarningMsg, setEntryWarningMsg] = useState<string | null>(null);

  // Void confirmation modal
  const [voidModalEntry, setVoidModalEntry] = useState<ExpenseEntry | null>(null);
  const [voidReasonText, setVoidReasonText] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // ─── Network & Offline Event Listeners ───────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshOfflineQueue();
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
        const bList = await expensesApi.getBranches();
        setBranches(bList);
        if (bList.length > 0 && !selectedBranchId) {
          // Default to Delhi HQ or first branch
          const del = bList.find((b) => b.code.toUpperCase().includes('DEL')) || bList[0];
          setSelectedBranchId(del.id);
        }

        const cList = await expensesApi.getCategories();
        setCategories(cList);
        if (cList.length > 0 && !entryCategory) {
          setEntryCategory(cList[0].id);
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
      setTodayEntries(res.entries);
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
      setPendingEntries(res.entries);
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
      setCategories(list);
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
    if (!selectedBranchId && !isAllBranches) {
      alert('Please select a branch location');
      return;
    }

    const branchToUse = isAllBranches ? branches[0]?.id : selectedBranchId;
    if (!branchToUse) return;

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
        if (res.budgetWarning) {
          setEntryWarningMsg(res.budgetWarning);
        }
      }

      // Prepend to today's list
      setTodayEntries((prev) => [res.expense, ...prev]);

      // Reset form fields
      setEntryAmount('');
      setEntryDescription('');
      setEntryPaidTo('');
      setEntryReceiptUrl('');

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
      alert(`Synchronized ${res.syncedCount} offline entries successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to sync offline queue');
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // ─── Approve Entry ─────────────────────────────────────────────────────────
  const handleApproveEntry = async (entry: ExpenseEntry) => {
    try {
      await expensesApi.approveExpense(entry.id);
      setPendingEntries((prev) => prev.filter((e) => e.id !== entry.id));
      fetchBalance();
    } catch (err: any) {
      alert(err.message || 'Failed to approve expense');
    }
  };

  // ─── Reject Entry ──────────────────────────────────────────────────────────
  const handleConfirmReject = async () => {
    if (!selectedRejectEntry || !rejectionReason.trim()) return;
    try {
      await expensesApi.rejectExpense(selectedRejectEntry.id, rejectionReason.trim());
      setPendingEntries((prev) => prev.filter((e) => e.id !== selectedRejectEntry.id));
      setSelectedRejectEntry(null);
      setRejectionReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to reject expense');
    }
  };

  // ─── Void Entry ────────────────────────────────────────────────────────────
  const handleConfirmVoid = async () => {
    if (!voidModalEntry || !voidReasonText.trim()) return;
    setIsVoiding(true);
    try {
      await expensesApi.voidExpense(voidModalEntry.id, voidReasonText.trim());
      setTodayEntries((prev) => prev.filter((e) => e.id !== voidModalEntry.id));
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
            From {todayEntries.filter((e) => e.status === 'APPROVED').length} approved vouchers
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

              <form onSubmit={handleFastEntrySubmit} className="space-y-4">
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

                {/* Receipt Upload / URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                    <span>Receipt Attachment (Optional)</span>
                    <Camera size={14} className="text-slate-400" />
                  </label>
                  <input
                    type="text"
                    placeholder="Paste receipt image/PDF URL or leave empty"
                    value={entryReceiptUrl}
                    onChange={(e) => setEntryReceiptUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                  />
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

              {todayEntries.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-zinc-500 text-sm">
                  <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                  No cash expenses logged today yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Mobile stacked cards */}
                  <div className="block sm:hidden space-y-2.5">
                    {todayEntries.map((e) => (
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
                        {isSuperAdmin && (
                          <div className="pt-2 border-t border-slate-200 dark:border-[#27272A] flex justify-end">
                            <button
                              onClick={() => setVoidModalEntry(e)}
                              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                            >
                              Void Entry
                            </button>
                          </div>
                        )}
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
                          {isSuperAdmin && <th className="py-2.5 px-3 text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                        {todayEntries.map((e) => (
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
                            {isSuperAdmin && (
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => setVoidModalEntry(e)}
                                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                                >
                                  Void
                                </button>
                              </td>
                            )}
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
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: APPROVAL QUEUE                                                  */}
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

          {pendingEntries.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-zinc-500 text-sm">
              <CheckCircle size={36} className="mx-auto mb-2 text-emerald-500/50" />
              All caught up! Zero pending approvals in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingEntries.map((e) => (
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
                      <button
                        onClick={() => setSelectedRejectEntry(e)}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveEntry(e)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
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

              {analytics && analytics.categoryDistribution.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categoryDistribution}
                        dataKey="amountRupees"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {analytics.categoryDistribution.map((_, idx) => (
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

              {analytics && (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                      <YAxis stroke="#888888" fontSize={11} />
                      <RechartsTooltip formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Spent']} />
                      <Bar dataKey="amountRupees" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
    </div>
  );
}
export default ExpensesPage;
