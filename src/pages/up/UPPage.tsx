import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Coins,
  LayoutDashboard,
  Boxes,
  Receipt,
  Wallet,
  Landmark,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  FolderTree,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Trash2,
  Edit2,
  Eye,
  FileText,
  Upload,
  Lock,
  Unlock,
  AlertTriangle,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { upApi } from "../../api/upApi";
import { UPInventoryHub } from "./components/UPInventoryHub";
import type {
  UPExpense,
  UPCategory,
  UPCashDay,
  UPAuditRecord,
  UPAccessUser,
  UPDashboardData,
} from "../../types/admin";

type UPTab = "dashboard" | "inventory" | "ledger" | "cash" | "reports" | "access" | "categories";

export function UPPage() {
  const { adminUser, setCurrentView } = useAdminAuth();

  // ─── Core Access State ───────────────────────────────────────────────────────
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // ─── Active Tab ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<UPTab>("dashboard");

  // ─── Feedback States ────────────────────────────────────────────────────────
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Dashboard State ────────────────────────────────────────────────────────
  const [dashboardRange, setDashboardRange] = useState<string>("month");
  const [dashboardData, setDashboardData] = useState<UPDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // ─── Ledger & Expenses State ────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<UPExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseTotalPages, setExpenseTotalPages] = useState(1);
  const [expenseTotalAmount, setExpenseTotalAmount] = useState(0);

  // Ledger Filters
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>("");
  const [filterVerified, setFilterVerified] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState<string>("");

  // ─── Categories State ───────────────────────────────────────────────────────
  const [categories, setCategories] = useState<UPCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySort, setNewCategorySort] = useState(0);

  // ─── Fast Expense Entry Modal State ─────────────────────────────────────────
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [entryAmount, setEntryAmount] = useState<string>("");
  const [entryCategoryId, setEntryCategoryId] = useState<string>("");
  const [entryPaymentMode, setEntryPaymentMode] = useState<string>("cash");
  const [entryPaidTo, setEntryPaidTo] = useState<string>("");
  const [entryNote, setEntryNote] = useState<string>("");
  const [entryReceiptFile, setEntryReceiptFile] = useState<File | null>(null);
  const [addAnother, setAddAnother] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // ─── Expense Detail & Audit Modal State ───────────────────────────────────────
  const [selectedExpense, setSelectedExpense] = useState<UPExpense | null>(null);
  const [auditLogs, setAuditLogs] = useState<UPAuditRecord[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // ─── Cash Reconciliation State ──────────────────────────────────────────────
  const [cashDate, setCashDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [cashStatus, setCashStatus] = useState<UPCashDay | null>(null);
  const [cashOpeningInput, setCashOpeningInput] = useState<string>("");
  const [cashClosingInput, setCashClosingInput] = useState<string>("");
  const [cashNotesInput, setCashNotesInput] = useState<string>("");
  const [loadingCash, setLoadingCash] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [cashDaysHistory, setCashDaysHistory] = useState<UPCashDay[]>([]);

  // ─── Allow-List Access Management State ──────────────────────────────────────
  const [accessUsers, setAccessUsers] = useState<UPAccessUser[]>([]);
  const [loadingAccessUsers, setLoadingAccessUsers] = useState(false);
  const [targetAdminToRevoke, setTargetAdminToRevoke] = useState<UPAccessUser | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // ─── 1. Check UP Access On Mount ────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      try {
        const res = await upApi.checkAccess();
        if (isMounted) {
          if (res.success && res.data?.hasAccess) {
            setHasAccess(true);
            setIsSuperAdmin(Boolean(res.data.isSuperAdmin));
          } else {
            setHasAccess(false);
            setIsSuperAdmin(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setHasAccess(false);
          setIsSuperAdmin(false);
        }
      } finally {
        if (isMounted) setAccessChecked(true);
      }
    };

    verifyAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 6000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  // ─── 2. Fetch Categories When Access Granted ────────────────────────────────
  const fetchCategoriesList = async () => {
    setLoadingCategories(true);
    try {
      const res = await upApi.listCategories(true);
      if (res.success && res.data) {
        setCategories(res.data);
        if (res.data.length > 0 && !entryCategoryId) {
          const firstActive = res.data.find((c) => c.active);
          if (firstActive) setEntryCategoryId(firstActive.id);
        }
      }
    } catch (err) {
      console.warn("Failed to load UP categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchCategoriesList();
    }
  }, [hasAccess]);

  // ─── 3. Fetch Dashboard ─────────────────────────────────────────────────────
  const fetchDashboardData = async () => {
    setLoadingDashboard(true);
    try {
      const res = await upApi.getDashboard(dashboardRange);
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load dashboard data");
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (hasAccess && activeTab === "dashboard") {
      fetchDashboardData();
    }
  }, [hasAccess, activeTab, dashboardRange]);

  // ─── 4. Fetch Ledger Expenses ───────────────────────────────────────────────
  const fetchExpensesList = async () => {
    setLoadingExpenses(true);
    try {
      const res = await upApi.listExpenses({
        page: expensePage,
        limit: 25,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        categoryId: filterCategory || undefined,
        paymentMode: filterPaymentMode || undefined,
        verified: filterVerified !== "all" ? filterVerified : undefined,
        search: filterSearch.trim() || undefined,
      });

      if (res.success && res.data) {
        setExpenses(res.data.items || []);
        setExpenseTotal(res.data.pagination.total);
        setExpenseTotalPages(res.data.pagination.totalPages);
        setExpenseTotalAmount(res.data.pagination.totalAmount);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load expenses list");
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => {
    if (hasAccess && (activeTab === "ledger" || activeTab === "reports")) {
      fetchExpensesList();
    }
  }, [
    hasAccess,
    activeTab,
    expensePage,
    filterStartDate,
    filterEndDate,
    filterCategory,
    filterPaymentMode,
    filterVerified,
    filterSearch,
  ]);

  // ─── 5. Fetch Daily Cash Status ─────────────────────────────────────────────
  const fetchCashDayStatus = async () => {
    setLoadingCash(true);
    try {
      const [statusRes, histRes] = await Promise.all([
        upApi.getCashStatus(cashDate),
        upApi.listCashDays(15),
      ]);

      if (statusRes.success && statusRes.data) {
        setCashStatus(statusRes.data);
        setCashOpeningInput(String(statusRes.data.openingBalance || 0));
        setCashClosingInput(statusRes.data.actualClosing !== null ? String(statusRes.data.actualClosing) : "");
        setCashNotesInput(statusRes.data.notes || "");
      }
      if (histRes.success && histRes.data) {
        setCashDaysHistory(histRes.data);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load daily cash status");
    } finally {
      setLoadingCash(false);
    }
  };

  useEffect(() => {
    if (hasAccess && activeTab === "cash") {
      fetchCashDayStatus();
    }
  }, [hasAccess, activeTab, cashDate]);

  // ─── 6. Fetch Allow-List Access Users ───────────────────────────────────────
  const fetchAccessUsersList = async () => {
    setLoadingAccessUsers(true);
    try {
      const res = await upApi.listAccessUsers();
      if (res.success && res.data) {
        setAccessUsers(res.data);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load UP access list");
    } finally {
      setLoadingAccessUsers(false);
    }
  };

  useEffect(() => {
    if (hasAccess && isSuperAdmin && activeTab === "access") {
      fetchAccessUsersList();
    }
  }, [hasAccess, isSuperAdmin, activeTab]);

  // ─── Save / Create Expense Handler ──────────────────────────────────────────
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(entryAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage("Please enter a valid expense amount greater than 0");
      return;
    }
    if (!entryCategoryId) {
      setErrorMessage("Please select a valid expense category");
      return;
    }
    if (!entryPaidTo.trim()) {
      setErrorMessage("Please provide the vendor or recipient name");
      return;
    }

    setIsSavingExpense(true);
    try {
      let savedExpense: UPExpense;

      if (editingExpenseId) {
        const res = await upApi.updateExpense(editingExpenseId, {
          expenseDate: entryDate,
          amount: amt,
          categoryId: entryCategoryId,
          paymentMode: entryPaymentMode,
          paidTo: entryPaidTo.trim(),
          note: entryNote.trim() || null,
        });
        if (!res.success || !res.data) throw new Error(res.error?.message || "Failed to update expense");
        savedExpense = res.data;
        setSuccessMessage("Expense updated successfully");
      } else {
        const res = await upApi.createExpense({
          expenseDate: entryDate,
          amount: amt,
          categoryId: entryCategoryId,
          paymentMode: entryPaymentMode,
          paidTo: entryPaidTo.trim(),
          note: entryNote.trim() || null,
        });
        if (!res.success || !res.data) throw new Error(res.error?.message || "Failed to record expense");
        savedExpense = res.data;
        setSuccessMessage("Expense recorded successfully");
      }

      // Upload receipt if provided
      if (entryReceiptFile && savedExpense.id) {
        try {
          await upApi.uploadReceipt(savedExpense.id, entryReceiptFile);
        } catch (uploadErr) {
          console.warn("Receipt upload warning:", uploadErr);
        }
      }

      // Refresh data
      fetchExpensesList();
      if (activeTab === "dashboard") fetchDashboardData();

      if (addAnother && !editingExpenseId) {
        // Keep category and date for fast repetitive entry
        setEntryAmount("");
        setEntryPaidTo("");
        setEntryNote("");
        setEntryReceiptFile(null);
      } else {
        setIsEntryModalOpen(false);
        setEditingExpenseId(null);
        setEntryAmount("");
        setEntryPaidTo("");
        setEntryNote("");
        setEntryReceiptFile(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save expense");
    } finally {
      setIsSavingExpense(false);
    }
  };

  // ─── Delete Expense Handler ─────────────────────────────────────────────────
  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Are you sure you want to soft-delete this expense? A permanent audit log will be recorded.")) {
      return;
    }
    try {
      const res = await upApi.deleteExpense(id);
      if (res.success) {
        setSuccessMessage("Expense soft-deleted and audited");
        fetchExpensesList();
        if (activeTab === "dashboard") fetchDashboardData();
        if (selectedExpense?.id === id) setSelectedExpense(null);
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to delete expense");
    }
  };

  // ─── Verify Expense Handler (Super Admin Only) ──────────────────────────────
  const handleToggleVerify = async (id: string, currentVerified: boolean) => {
    if (!isSuperAdmin) return;
    try {
      const res = await upApi.verifyExpense(id, !currentVerified);
      if (res.success) {
        setSuccessMessage(!currentVerified ? "Expense verified ✓" : "Expense unverified ○");
        fetchExpensesList();
        if (selectedExpense?.id === id && res.data) {
          setSelectedExpense(res.data);
        }
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to toggle verification");
    }
  };

  // ─── View Expense Details & Audit Trail ─────────────────────────────────────
  const handleViewDetails = async (exp: UPExpense) => {
    setSelectedExpense(exp);
    setLoadingAudit(true);
    try {
      const res = await upApi.getExpenseAudit(exp.id);
      if (res.success && res.data) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.warn("Failed to load audit logs:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // ─── Receipt Signed URL Viewer ──────────────────────────────────────────────
  const handleViewReceipt = async (expenseId: string) => {
    try {
      const res = await upApi.getReceiptSignedUrl(expenseId);
      if (res.success && res.data?.signedUrl) {
        window.open(res.data.signedUrl, "_blank");
      } else {
        throw new Error("Unable to generate receipt link");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not retrieve receipt link");
    }
  };

  // ─── Cash Reconcile Submit Handler ──────────────────────────────────────────
  const handleSaveCashReconciliation = async (closeDay: boolean = false) => {
    if (!cashStatus) return;
    if (cashStatus.closed) {
      setErrorMessage("This cash day is locked and closed");
      return;
    }

    const openAmt = parseFloat(cashOpeningInput);
    const closeAmt = cashClosingInput !== "" ? parseFloat(cashClosingInput) : null;

    if (isNaN(openAmt) || openAmt < 0) {
      setErrorMessage("Opening balance cannot be negative or invalid");
      return;
    }
    if (closeAmt !== null && (isNaN(closeAmt) || closeAmt < 0)) {
      setErrorMessage("Actual closing balance cannot be negative or invalid");
      return;
    }
    if (closeDay && closeAmt === null) {
      setErrorMessage("Please enter actual closing balance before closing the cash day");
      return;
    }

    if (closeDay && !window.confirm("Lock and close today's petty cash ledger? After closing, standard modifications are restricted.")) {
      return;
    }

    setIsReconciling(true);
    try {
      const res = await upApi.reconcileCash({
        cashDate,
        openingBalance: openAmt,
        actualClosing: closeAmt,
        notes: cashNotesInput.trim() || null,
        closed: closeDay,
      });

      if (res.success && res.data) {
        setCashStatus(res.data);
        setSuccessMessage(closeDay ? "Petty cash day locked and closed successfully" : "Cash reconciliation saved");
        fetchCashDayStatus();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to reconcile cash");
    } finally {
      setIsReconciling(false);
    }
  };

  // ─── Allow-List Grant & Revoke Handlers ──────────────────────────────────────
  const handleGrantAccess = async (adminId: string) => {
    try {
      const res = await upApi.grantAccess(adminId);
      if (res.success) {
        setSuccessMessage(res.data?.message || "UP access granted successfully");
        fetchAccessUsersList();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to grant UP access");
    }
  };

  const handleConfirmRevoke = async () => {
    if (!targetAdminToRevoke) return;
    setIsRevoking(true);
    try {
      const res = await upApi.revokeAccess(targetAdminToRevoke.adminId);
      if (res.success) {
        setSuccessMessage(`Revoked UP access for ${targetAdminToRevoke.name}`);
        setTargetAdminToRevoke(null);
        fetchAccessUsersList();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to revoke UP access");
    } finally {
      setIsRevoking(false);
    }
  };

  // ─── Create Category Handler ────────────────────────────────────────────────
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setErrorMessage("Please enter a category name");
      return;
    }
    try {
      const res = await upApi.createCategory({
        name: newCategoryName.trim(),
        sortOrder: Number(newCategorySort || 0),
      });
      if (res.success) {
        setSuccessMessage("Category created successfully");
        setIsCategoryModalOpen(false);
        setNewCategoryName("");
        fetchCategoriesList();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to create category");
    }
  };

  const handleToggleCategoryActive = async (cat: UPCategory) => {
    try {
      const res = await upApi.updateCategory(cat.id, { active: !cat.active });
      if (res.success) {
        setSuccessMessage(`Category '${cat.name}' ${!cat.active ? "activated" : "deactivated"}`);
        fetchCategoriesList();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update category");
    }
  };

  // ─── Loading / Authorization Barrier Check ──────────────────────────────────
  if (!accessChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-zinc-400">
        <RefreshCw className="animate-spin text-indigo-500" size={28} />
        <span className="text-xs font-semibold tracking-wider uppercase">Verifying Authorization...</span>
      </div>
    );
  }

  // ─── Layer 2: Frontend Route Guard Barrier ──────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/5">
          <ShieldAlert size={32} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white tracking-tight">Access Restricted: 403 Forbidden</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You do not have authorization to view the <strong className="text-zinc-200">UP</strong> ledger. Access is strictly controlled through an independent per-admin allow-list managed by the Super Administrator.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentView("dashboard")}
          className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700 shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ─── Primary UI Render (Authorized Users Only) ──────────────────────────────
  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-2 sm:px-4">
      {/* ─── Module Identity Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#18181B] p-5 sm:p-6 rounded-2xl border border-[#27272A] shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-sm tracking-wider">
              UP
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">UP</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              {isSuperAdmin ? "Super Admin" : "Authorized User"}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Private Factory Operations, Inventory & Financial Command Center
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setEditingExpenseId(null);
              setEntryAmount("");
              setEntryPaidTo("");
              setEntryNote("");
              setEntryReceiptFile(null);
              setIsEntryModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> Record Expense
          </button>

          <a
            href={upApi.exportExcelUrl({
              startDate: filterStartDate || undefined,
              endDate: filterEndDate || undefined,
              categoryId: filterCategory || undefined,
              paymentMode: filterPaymentMode || undefined,
              verified: filterVerified !== "all" ? filterVerified : undefined,
            })}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-200 hover:text-white font-bold text-xs transition-all border border-[#3F3F46] flex items-center gap-1.5 shadow-sm"
            title="Download Excel Report (.xlsx)"
          >
            <Download size={14} /> <span className="hidden sm:inline">Export Excel</span>
          </a>
        </div>
      </div>

      {/* ─── Feedback Banners ──────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
            <X size={14} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Tab Navigation ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#27272A] scrollbar-hide">
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "dashboard"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-[#27272A]"
          }`}
        >
          <LayoutDashboard size={15} /> Dashboard
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "inventory"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-[#27272A]"
          }`}
        >
          <Boxes size={15} /> Factory Inventory
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "ledger"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-[#27272A]"
          }`}
        >
          <Receipt size={15} /> Daily Ledger
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cash")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "cash"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-[#27272A]"
          }`}
        >
          <Landmark size={15} /> Petty Cash Reconcile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "reports"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-zinc-400 hover:text-white hover:bg-[#27272A]"
          }`}
        >
          <BarChart3 size={15} /> Reports & BI
        </button>

        {isSuperAdmin && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("access")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "access"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-[#27272A]"
              }`}
            >
              <ShieldCheck size={15} /> Access Allow-List
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "categories"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-[#27272A]"
              }`}
            >
              <FolderTree size={15} /> Categories
            </button>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: DASHBOARD                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Time Range Filter Bar */}
          <div className="flex items-center justify-between gap-3 bg-[#18181B] p-3 rounded-xl border border-[#27272A]">
            <span className="text-xs font-bold text-zinc-400">Analysis Horizon:</span>
            <div className="flex items-center gap-1">
              {(["today", "month", "year"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDashboardRange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    dashboardRange === r
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-[#27272A]"
                  }`}
                >
                  {r === "month" ? "This Month" : r === "year" ? "This Year" : "Today"}
                </button>
              ))}
            </div>
          </div>

          {loadingDashboard ? (
            <div className="py-20 text-center text-zinc-400 flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-indigo-500" size={20} /> Loading financial KPIs...
            </div>
          ) : dashboardData ? (
            <>
              {/* Primary Metric Deck */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Current Month Spend</span>
                  <div className="text-xl sm:text-2xl font-black text-white">
                    ₹{dashboardData.kpis.currentMonthTotal.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    Prev Month: ₹{dashboardData.kpis.previousMonthTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Today's Spend</span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">
                    ₹{dashboardData.kpis.todayTotal.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    Daily Average: ₹{dashboardData.kpis.averageDailyExpense.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Verified Amount</span>
                  <div className="text-xl sm:text-2xl font-black text-indigo-400">
                    ₹{dashboardData.kpis.verifiedTotal.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">Super Admin Approved</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Unverified Amount</span>
                  <div className="text-xl sm:text-2xl font-black text-amber-400">
                    ₹{dashboardData.kpis.unverifiedTotal.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    {dashboardData.kpis.transactionCount} Total Transactions
                  </span>
                </div>
              </div>

              {/* Category Breakdown & Trend Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Category Breakdown Card */}
                <div className="lg:col-span-1 p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Category Breakdown</h3>
                    <span className="text-[10px] text-zinc-400">Top: {dashboardData.kpis.topCategory}</span>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {dashboardData.categoryBreakdown.map((cat) => (
                      <div key={cat.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-200 truncate">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">₹{cat.total.toLocaleString("en-IN")}</span>
                            <span className="text-[10px] text-zinc-400">({cat.percentage}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, cat.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 30-Day Trend Chart */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">30-Day Expense Velocity</h3>
                    <span className="text-[10px] text-zinc-400">
                      Peak: ₹{dashboardData.kpis.highestExpense.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    {dashboardData.trend.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                        No expense velocity data recorded in the last 30 days.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="upTrendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                          <XAxis
                            dataKey="date"
                            stroke="#71717A"
                            fontSize={10}
                            tickLine={false}
                            tickFormatter={(v) => v.slice(5)}
                          />
                          <YAxis
                            stroke="#71717A"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#18181B",
                              borderColor: "#3F3F46",
                              borderRadius: "12px",
                              fontSize: "11px",
                              color: "#fff",
                            }}
                            formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Spend"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#6366F1"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#upTrendGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: FACTORY INVENTORY                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "inventory" && (
        <UPInventoryHub
          isSuperAdmin={isSuperAdmin}
          onShowSuccess={(msg) => setSuccessMessage(msg)}
          onShowError={(msg) => setErrorMessage(msg)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: DAILY LEDGER & TRANSACTIONS                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === "ledger" || activeTab === "reports") && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search vendor or notes..."
                  value={filterSearch}
                  onChange={(e) => {
                    setFilterSearch(e.target.value);
                    setExpensePage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Start Date */}
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setExpensePage(1);
                }}
                className="px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-indigo-500"
              />

              {/* End Date */}
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setExpensePage(1);
                }}
                className="px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-indigo-500"
              />

              {/* Category */}
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setExpensePage(1);
                }}
                className="px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Verification */}
              <select
                value={filterVerified}
                onChange={(e) => {
                  setFilterVerified(e.target.value);
                  setExpensePage(1);
                }}
                className="px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Verification</option>
                <option value="true">Verified Only</option>
                <option value="false">Unverified Only</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-[#27272A]/50">
              <span>
                Found <strong className="text-white">{expenseTotal}</strong> records totaling{" "}
                <strong className="text-indigo-400 font-mono font-bold">
                  ₹{expenseTotalAmount.toLocaleString("en-IN")}
                </strong>
              </span>
              {(filterSearch || filterStartDate || filterEndDate || filterCategory || filterVerified !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterSearch("");
                    setFilterStartDate("");
                    setFilterEndDate("");
                    setFilterCategory("");
                    setFilterPaymentMode("");
                    setFilterVerified("all");
                    setExpensePage(1);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Expenses List View (Mobile Cards + Desktop Table) */}
          {loadingExpenses ? (
            <div className="py-20 text-center text-zinc-400 flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-indigo-500" size={20} /> Loading ledger transactions...
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#18181B] border border-[#27272A] space-y-2">
              <Receipt size={32} className="mx-auto text-zinc-600" />
              <h3 className="text-sm font-bold text-white">No expenses recorded</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No transactions match the selected filters. Use the "Record Expense" button above to enter factory cash expenditures.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mobile Touch Cards View (visible on < md screens) */}
              <div className="grid grid-cols-1 gap-2.5 md:hidden">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">{exp.paidTo}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300">
                            {exp.categoryName}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {exp.expenseDate.split("T")[0]} · {(exp.paymentMode || "cash").toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white font-mono">
                          ₹{exp.amount.toLocaleString("en-IN")}
                        </span>
                        <div>
                          {exp.verified ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400">
                              ○ Unverified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {exp.note && <p className="text-[11px] text-zinc-400 line-clamp-2">{exp.note}</p>}

                    <div className="flex items-center justify-between pt-2 border-t border-[#27272A] text-xs">
                      <div className="flex items-center gap-2">
                        {exp.receiptPath && (
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(exp.id)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                          >
                            <Eye size={12} /> Receipt
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleViewDetails(exp)}
                          className="text-[10px] text-zinc-400 hover:text-white font-bold"
                        >
                          Audit Log
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleVerify(exp.id, exp.verified)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                              exp.verified
                                ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                            title={exp.verified ? "Mark Unverified" : "Verify Expense"}
                          >
                            {exp.verified ? <Clock size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExpenseId(exp.id);
                            setEntryDate(exp.expenseDate.split("T")[0]);
                            setEntryAmount(String(exp.amount));
                            setEntryCategoryId(exp.categoryId);
                            setEntryPaymentMode(exp.paymentMode || "cash");
                            setEntryPaidTo(exp.paidTo);
                            setEntryNote(exp.note || "");
                            setIsEntryModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white"
                          title="Edit Expense"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          title="Delete Expense"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Data Table (visible on >= md screens) */}
              <div className="hidden md:block rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#27272A] bg-[#09090B]/50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Paid To / Vendor</th>
                      <th className="py-3 px-4">Short Note</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Receipt</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A] text-xs">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-300 whitespace-nowrap">
                          {exp.expenseDate.split("T")[0]}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                            {exp.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white max-w-xs truncate">{exp.paidTo}</td>
                        <td className="py-3 px-4 text-zinc-400 max-w-xs truncate">{exp.note || "—"}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-white whitespace-nowrap">
                          ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {exp.verified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 size={11} /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock size={11} /> Unverified
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {exp.receiptPath ? (
                            <button
                              type="button"
                              onClick={() => handleViewReceipt(exp.id)}
                              className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] inline-flex items-center gap-1"
                            >
                              <Eye size={12} /> View
                            </button>
                          ) : (
                            <span className="text-zinc-600 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleToggleVerify(exp.id, exp.verified)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  exp.verified
                                    ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                }`}
                                title={exp.verified ? "Mark Unverified" : "Verify Expense"}
                              >
                                {exp.verified ? <Clock size={13} /> : <CheckCircle2 size={13} />}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleViewDetails(exp)}
                              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                              title="Audit History"
                            >
                              <FileText size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExpenseId(exp.id);
                                setEntryDate(exp.expenseDate.split("T")[0]);
                                setEntryAmount(String(exp.amount));
                                setEntryCategoryId(exp.categoryId);
                                setEntryPaymentMode(exp.paymentMode || "cash");
                                setEntryPaidTo(exp.paidTo);
                                setEntryNote(exp.note || "");
                                setIsEntryModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                              title="Edit Expense"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                              title="Delete Expense"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {expenseTotalPages > 1 && (
                <div className="flex items-center justify-between p-3 bg-[#18181B] rounded-xl border border-[#27272A] text-xs text-zinc-400">
                  <span>
                    Page <strong className="text-white">{expensePage}</strong> of{" "}
                    <strong className="text-white">{expenseTotalPages}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={expensePage <= 1}
                      onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={expensePage >= expenseTotalPages}
                      onClick={() => setExpensePage((p) => Math.min(expenseTotalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: DAILY PETTY CASH RECONCILIATION                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "cash" && (
        <div className="space-y-6">
          {/* Date Selector & Reconcile Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-6 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#27272A] pb-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Landmark size={18} className="text-indigo-400" /> Petty Cash Daily Reconciliation
                </h3>
                <p className="text-xs text-zinc-400">
                  Reconcile opening float against today's cash expenses and register closing cash in hand.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Date:</span>
                <input
                  type="date"
                  value={cashDate}
                  onChange={(e) => setCashDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {loadingCash ? (
              <div className="py-12 text-center text-zinc-400 flex items-center justify-center gap-2">
                <RefreshCw className="animate-spin text-indigo-500" size={18} /> Calculating petty cash balances...
              </div>
            ) : cashStatus ? (
              <div className="space-y-6">
                {/* 4 Calculation Balance Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">1. Opening Balance</span>
                    <input
                      type="number"
                      disabled={cashStatus.closed}
                      value={cashOpeningInput}
                      onChange={(e) => setCashOpeningInput(e.target.value)}
                      className="w-full text-lg font-black text-white bg-transparent border-b border-zinc-700 focus:outline-none focus:border-indigo-500 py-0.5"
                    />
                    <span className="text-[9px] text-zinc-500 block">Cash float at day start</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">2. Today's Cash Spend</span>
                    <div className="text-lg font-black text-rose-400">
                      - ₹{cashStatus.cashExpenses.toLocaleString("en-IN")}
                    </div>
                    <span className="text-[9px] text-zinc-500 block">Sum of recorded cash entries</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">3. Expected Closing</span>
                    <div className="text-lg font-black text-indigo-400">
                      ₹{cashStatus.expectedClosingBalance.toLocaleString("en-IN")}
                    </div>
                    <span className="text-[9px] text-zinc-500 block">Opening - Today's Expenses</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">4. Actual Closing Cash</span>
                    <input
                      type="number"
                      disabled={cashStatus.closed}
                      placeholder="Enter counted cash..."
                      value={cashClosingInput}
                      onChange={(e) => setCashClosingInput(e.target.value)}
                      className="w-full text-lg font-black text-white bg-transparent border-b border-zinc-700 focus:outline-none focus:border-indigo-500 py-0.5 placeholder-zinc-600"
                    />
                    <span className="text-[9px] text-zinc-500 block">Physical currency counted</span>
                  </div>
                </div>

                {/* Variance Alert Pill */}
                {cashStatus.difference !== null && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                      cashStatus.difference === 0
                        ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                        : "bg-amber-950/30 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {cashStatus.difference === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <span className="font-bold">
                        {cashStatus.difference === 0
                          ? "Reconciliation Matched: Exactly ₹0 variance between physical cash and expenses"
                          : `Reconciliation Variance: ₹${Math.abs(cashStatus.difference).toLocaleString("en-IN")} ${
                              cashStatus.difference > 0 ? "Surplus (Excess Cash)" : "Shortage (Missing Cash)"
                            }`}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-zinc-900/60 px-2 py-0.5 rounded">
                      Diff: ₹{cashStatus.difference.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {/* Notes & Actions */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Reconciliation Notes
                  </label>
                  <textarea
                    rows={2}
                    disabled={cashStatus.closed}
                    placeholder="Add petty cash reconciliation notes, physical denomination counts, or variance rationale..."
                    value={cashNotesInput}
                    onChange={(e) => setCashNotesInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Reconcile Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-[#27272A]">
                  <div>
                    {cashStatus.closed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                        <Lock size={13} /> Day Closed & Locked by {cashStatus.closedBy || "Admin"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                        <Unlock size={13} /> Day Active & Open
                      </span>
                    )}
                  </div>

                  {!cashStatus.closed && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isReconciling}
                        onClick={() => handleSaveCashReconciliation(false)}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 transition-all"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        disabled={isReconciling}
                        onClick={() => handleSaveCashReconciliation(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1"
                      >
                        <Lock size={13} /> Close & Lock Cash Day
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Historical Cash Days Log */}
          <div className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Past Petty Cash Reconciliations</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#27272A] text-[10px] font-bold text-zinc-400 uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Opening</th>
                    <th className="py-2.5 px-3 text-right">Expenses</th>
                    <th className="py-2.5 px-3 text-right">Expected</th>
                    <th className="py-2.5 px-3 text-right">Actual</th>
                    <th className="py-2.5 px-3 text-right">Variance</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {cashDaysHistory.map((d) => (
                    <tr key={d.id || d.cashDate} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3 font-mono text-zinc-200">{d.cashDate}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white">₹{d.openingBalance.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-400">-₹{d.cashExpenses.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-400">₹{d.expectedClosingBalance.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white">
                        {d.actualClosing !== null ? `₹${d.actualClosing.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {d.difference !== null ? (
                          <span className={d.difference === 0 ? "text-emerald-400" : "text-amber-400"}>
                            ₹{d.difference.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {d.closed ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Locked
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Open
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: ACCESS MANAGEMENT (SUPER ADMIN ONLY)                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "access" && isSuperAdmin && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-400" /> UP Independent Access Allow-List
            </h3>
            <p className="text-xs text-zinc-400">
              Control which system administrators can access the private factory ledger. Super Administrators automatically have permanent access. Other administrators receive zero access unless explicitly granted below.
            </p>
          </div>

          {loadingAccessUsers ? (
            <div className="py-16 text-center text-zinc-400 flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-indigo-500" size={18} /> Loading access directory...
            </div>
          ) : (
            <div className="rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#27272A] bg-[#09090B]/50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4 text-center">UP Access Status</th>
                    <th className="py-3 px-4">Granted By / At</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {accessUsers.map((user) => (
                    <tr key={user.adminId} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 font-bold text-white">{user.name}</td>
                      <td className="py-3 px-4 font-mono text-zinc-300">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {user.isSuperAdmin ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                            Super Admin (Permanent)
                          </span>
                        ) : user.hasAccess ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            Active Allow-List
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-500">
                            No Access
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-[11px]">
                        {user.isSuperAdmin ? (
                          "Direct Role Authority"
                        ) : user.grantedAt ? (
                          <span>
                            {user.grantedBy || "Super Admin"} on {new Date(user.grantedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.isSuperAdmin ? (
                          <span className="text-zinc-600 text-[10px]">—</span>
                        ) : user.hasAccess ? (
                          <button
                            type="button"
                            onClick={() => setTargetAdminToRevoke(user)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all"
                          >
                            Revoke Access
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGrantAccess(user.adminId)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
                          >
                            Grant UP Access
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 6: CATEGORIES MANAGEMENT (SUPER ADMIN ONLY)                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "categories" && isSuperAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-[#18181B] border border-[#27272A]">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FolderTree size={18} className="text-indigo-400" /> Factory Expense Categories
              </h3>
              <p className="text-xs text-zinc-400">
                Categories with existing transactions cannot be permanently deleted to preserve historical ledger integrity. Deactivating hides them from new entries.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{cat.name}</h4>
                  <span className="text-[10px] text-zinc-400">
                    {cat.expenseCount || 0} Transactions Recorded
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCategoryActive(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    cat.active
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                  }`}
                >
                  {cat.active ? "Active" : "Inactive"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: FAST EXPENSE ENTRY                                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[#18181B] border border-[#27272A] shadow-2xl overflow-hidden animate-scaleIn">
            <div className="flex items-center justify-between p-4 border-b border-[#27272A] bg-[#09090B]/50">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {editingExpenseId ? "Edit Expense Entry" : "Record Factory Cash Expense"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEntryModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-4 sm:p-5 space-y-4">
              {/* Amount (Big Touch Target) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xl font-black text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Date & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Category *
                  </label>
                  <select
                    required
                    value={entryCategoryId}
                    onChange={(e) => setEntryCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Category</option>
                    {categories
                      .filter((c) => c.active)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Paid To / Vendor */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Paid To / Vendor / Worker *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Hardware Supplies, Daily Wages, Freight Driver"
                  value={entryPaidTo}
                  onChange={(e) => setEntryPaidTo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Short Note / Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Purpose, bill reference, machine number, etc."
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Receipt File / Camera Upload */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Attach Receipt (JPG, PNG, PDF max 10MB)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEntryReceiptFile(e.target.files[0]);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                />
              </div>

              {/* Bottom Sticky Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#27272A]">
                {!editingExpenseId ? (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={addAnother}
                      onChange={(e) => setAddAnother(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-0"
                    />
                    <span>+ Add Another</span>
                  </label>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEntryModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingExpense}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                  >
                    {isSavingExpense && <RefreshCw size={13} className="animate-spin" />}
                    {editingExpenseId ? "Update" : "Save Expense"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: AUDIT TRAIL & EXPENSE DOSSIER                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[#18181B] border border-[#27272A] shadow-2xl overflow-hidden animate-scaleIn space-y-4 p-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Financial Audit Dossier</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Expense Snapshot */}
            <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{selectedExpense.paidTo}</span>
                <span className="font-mono font-black text-indigo-400">
                  ₹{selectedExpense.amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                <span>
                  {selectedExpense.categoryName} · {selectedExpense.expenseDate.split("T")[0]}
                </span>
                <span>{selectedExpense.verified ? "✓ Verified" : "○ Unverified"}</span>
              </div>
            </div>

            {/* Immutable Audit Log List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Immutable History</h4>
              {loadingAudit ? (
                <div className="py-8 text-center text-zinc-500 text-xs">Loading audit trail...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">No audit events recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{log.action}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      By: <strong className="text-zinc-300">{log.changedByName}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD CATEGORY (SUPER ADMIN)                                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#18181B] border border-[#27272A] p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">New Expense Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Factory Packaging, Die Maintenance"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={newCategorySort}
                  onChange={(e) => setNewCategorySort(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CONFIRM REVOKE ACCESS (SUPER ADMIN)                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {targetAdminToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#18181B] border border-[#27272A] p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle size={20} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Revoke UP Access</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Are you sure you want to revoke UP module access for{" "}
              <strong className="text-white">{targetAdminToRevoke.name}</strong>? They will immediately lose access to all UP financial data and APIs.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetAdminToRevoke(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-white font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevoking}
                onClick={handleConfirmRevoke}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm flex items-center gap-1"
              >
                {isRevoking && <RefreshCw size={12} className="animate-spin" />} Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
