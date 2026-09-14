import { API_BASE_URL, getAdminToken, fetchAdminApi } from './adminApi';
import type {
  ExpenseEntry,
  UpdateExpenseInput,
  ExpenseCategory,
  ExpenseDailyLedger,
  ExpenseFloatTopUp,
  BranchCashBalanceInfo,
  MultiBranchSummaryInfo,
  ExpenseRollupAnalytics,
} from '../types/admin';

const OFFLINE_QUEUE_KEY = 'prc_offline_expense_queue';

// ─── Offline Queue Engine ────────────────────────────────────────────────────

export interface OfflineQueuedExpense {
  clientTempId: string;
  amount: number;
  amountInPaise?: boolean;
  categoryId: string;
  categoryName?: string;
  subCategory?: string | null;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  description: string;
  paidTo: string;
  receiptAttachment?: string | null;
  branchId: string;
  branchName?: string;
  departmentId?: string | null;
  employeeId?: string | null;
  date?: string;
  time?: string;
  queuedAt: string;
}

export function getOfflineQueue(): OfflineQueuedExpense[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueuedExpense[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function addToOfflineQueue(item: Omit<OfflineQueuedExpense, 'clientTempId' | 'queuedAt'>): OfflineQueuedExpense {
  const queue = getOfflineQueue();
  const now = new Date();
  const dateStr = item.date || now.toISOString().split('T')[0];
  const timeStr = item.time || now.toTimeString().split(' ')[0];
  const queued: OfflineQueuedExpense = {
    ...item,
    date: dateStr,
    time: timeStr,
    clientTempId: `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: now.toISOString(),
  };
  queue.push(queued);
  saveOfflineQueue(queue);
  return queued;
}

export function removeFromOfflineQueue(clientTempId: string) {
  const queue = getOfflineQueue().filter((q) => q.clientTempId !== clientTempId);
  saveOfflineQueue(queue);
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// ─── Expenses API Client ─────────────────────────────────────────────────────

export const expensesApi = {
  // 1. Live Running Balance
  async getLiveBalance(branchId: string): Promise<BranchCashBalanceInfo> {
    const res = await fetchAdminApi<BranchCashBalanceInfo>(`/expenses/live-balance/${branchId}`);
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to fetch live balance');
    return res.data!;
  },

  // 2. Multi-Branch Summary (Super Admin)
  async getMultiBranchSummary(): Promise<MultiBranchSummaryInfo> {
    const res = await fetchAdminApi<MultiBranchSummaryInfo>('/expenses/summary/multi-branch');
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to fetch multi-branch summary');
    return res.data!;
  },

  // 3. Paginated Expense List
  async getExpenses(params: Record<string, any> = {}): Promise<{
    entries: ExpenseEntry[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  }> {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });

    const res = await fetchAdminApi(`/expenses?${sp.toString()}`);
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to load expenses');
    return {
      entries: res.data || [],
      nextCursor: res.nextCursor ?? null,
      hasMore: res.hasMore ?? false,
      totalCount: res.totalCount ?? 0,
    };
  },

  // 4. Create Single Expense (with offline fallback)
  async createExpense(data: {
    amount: number;
    amountInPaise?: boolean;
    categoryId: string;
    subCategory?: string | null;
    paymentMode?: 'CASH' | 'UPI' | 'BANK_TRANSFER';
    description: string;
    paidTo: string;
    receiptAttachment?: string | null;
    branchId: string;
    departmentId?: string | null;
    employeeId?: string | null;
    date?: string;
    time?: string;
    clientTempId?: string | null;
  }): Promise<{ expense: ExpenseEntry; budgetWarning?: string | null; isOffline?: boolean }> {
    // Check if browser is offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const queued = addToOfflineQueue(data as any);
      const optimistic: ExpenseEntry = {
        id: queued.clientTempId,
        entryNumber: `OFFLINE-${queued.clientTempId.slice(-4).toUpperCase()}`,
        date: queued.date || new Date().toISOString().split('T')[0],
        time: queued.time || new Date().toTimeString().split(' ')[0],
        amount: Math.round(data.amount * 100),
        categoryId: data.categoryId,
        subCategory: data.subCategory,
        paymentMode: data.paymentMode || 'CASH',
        description: data.description,
        paidTo: data.paidTo,
        receiptAttachment: data.receiptAttachment,
        branchId: data.branchId,
        departmentId: data.departmentId,
        employeeId: data.employeeId,
        addedById: 'current-user',
        status: 'PENDING',
        isVoid: false,
        clientTempId: queued.clientTempId,
        createdAt: queued.queuedAt,
        updatedAt: queued.queuedAt,
      };
      return { expense: optimistic, isOffline: true };
    }

    try {
      const res = await fetchAdminApi('/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to record expense');
      return { expense: res.data, budgetWarning: res.budgetWarning };
    } catch (err: any) {
      // If network failed or abort, save offline
      if (err.name === 'TypeError' || err.name === 'AbortError' || err.message?.includes('fetch') || err.message?.includes('network')) {
        const queued = addToOfflineQueue(data as any);
        const optimistic: ExpenseEntry = {
          id: queued.clientTempId,
          entryNumber: `OFFLINE-${queued.clientTempId.slice(-4).toUpperCase()}`,
          date: queued.date || new Date().toISOString().split('T')[0],
          time: queued.time || new Date().toTimeString().split(' ')[0],
          amount: Math.round(data.amount * 100),
          categoryId: data.categoryId,
          subCategory: data.subCategory,
          paymentMode: data.paymentMode || 'CASH',
          description: data.description,
          paidTo: data.paidTo,
          receiptAttachment: data.receiptAttachment,
          branchId: data.branchId,
          departmentId: data.departmentId,
          employeeId: data.employeeId,
          addedById: 'current-user',
          status: 'PENDING',
          isVoid: false,
          clientTempId: queued.clientTempId,
          createdAt: queued.queuedAt,
          updatedAt: queued.queuedAt,
        };
        return { expense: optimistic, isOffline: true };
      }
      throw err;
    }
  },

  // 5. Batch Sync Offline Queue
  async syncOfflineQueue(): Promise<{
    syncedCount: number;
    duplicateCount: number;
    errorCount: number;
    synced: any[];
  }> {
    const queue = getOfflineQueue();
    if (queue.length === 0) {
      return { syncedCount: 0, duplicateCount: 0, errorCount: 0, synced: [] };
    }

    const payload = queue.map((q) => ({
      amount: q.amount,
      amountInPaise: false,
      categoryId: q.categoryId,
      subCategory: q.subCategory,
      paymentMode: q.paymentMode,
      description: q.description,
      paidTo: q.paidTo,
      receiptAttachment: q.receiptAttachment,
      branchId: q.branchId,
      departmentId: q.departmentId,
      employeeId: q.employeeId,
      date: q.date,
      time: q.time,
      clientTempId: q.clientTempId,
    }));

    const res = await fetchAdminApi('/expenses/batch-sync', {
      method: 'POST',
      body: JSON.stringify({ entries: payload }),
    });

    if (!res.success) throw new Error(res.message || res.error?.message || 'Batch sync failed');

    // On success, clear the offline queue
    clearOfflineQueue();
    return res.data;
  },

  // 6. Approve Expense
  async approveExpense(id: string, notes?: string): Promise<ExpenseEntry> {
    const res = await fetchAdminApi<ExpenseEntry>(`/expenses/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to approve expense');
    return res.data!;
  },

  // 7. Reject Expense
  async rejectExpense(id: string, rejectionReason: string): Promise<ExpenseEntry> {
    const res = await fetchAdminApi<ExpenseEntry>(`/expenses/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to reject expense');
    return res.data!;
  },

  // 8. Void Expense
  async voidExpense(id: string, voidReason: string): Promise<ExpenseEntry> {
    const res = await fetchAdminApi<ExpenseEntry>(`/expenses/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({ voidReason }),
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to void expense');
    return res.data!;
  },

  // 8b. Update Expense Entry
  async updateExpense(id: string, data: UpdateExpenseInput): Promise<ExpenseEntry> {
    const res = await fetchAdminApi<ExpenseEntry>(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to update expense');
    return res.data!;
  },

  // 8c. Delete Expense Entry (Super Admin Only)
  async deleteExpense(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetchAdminApi<{ success: boolean; message: string }>(`/expenses/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to delete expense entry');
    return res.data || { success: true, message: 'Expense deleted' };
  },

  // 8d. Upload Receipt Slip (Image or PDF)
  async uploadReceipt(file: File): Promise<{ url: string; fileName: string; size?: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetchAdminApi<{ url: string; fileName: string; size?: number }>('/expenses/upload-receipt', {
      method: 'POST',
      body: formData,
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to upload receipt slip');
    return res.data!;
  },

  // 9. Daily Closing Reconciliation
  async reconcileDaily(data: {
    branchId: string;
    date: string;
    physicalCashCounted: number;
    physicalCashInPaise?: boolean;
    reconciliationNotes?: string | null;
  }): Promise<ExpenseDailyLedger> {
    const res = await fetchAdminApi<ExpenseDailyLedger>('/expenses/ledger/reconcile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Reconciliation failed');
    return res.data!;
  },

  // 10. Cash Float Top-Up
  async addFloatTopUp(data: {
    branchId: string;
    date?: string;
    amount: number;
    amountInPaise?: boolean;
    source: string;
    referenceNo?: string | null;
    notes?: string | null;
  }): Promise<ExpenseFloatTopUp> {
    const res = await fetchAdminApi<ExpenseFloatTopUp>('/expenses/ledger/float-topup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to record float top-up');
    return res.data!;
  },

  // 11. Category Master
  async getCategories(params: { year?: number; month?: number; branchId?: string } = {}): Promise<ExpenseCategory[]> {
    const sp = new URLSearchParams();
    if (params.year) sp.set('year', String(params.year));
    if (params.month) sp.set('month', String(params.month));
    if (params.branchId) sp.set('branchId', params.branchId);

    const queryStr = sp.toString();
    const endpoint = queryStr ? `/expenses/categories?${queryStr}` : '/expenses/categories';
    const res = await fetchAdminApi<ExpenseCategory[]>(endpoint);
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to fetch categories');
    return res.data || [];
  },

  async createCategory(data: {
    name: string;
    description?: string | null;
    monthlyBudgetLimit?: number | null;
    budgetInPaise?: boolean;
    isActive?: boolean;
  }): Promise<ExpenseCategory> {
    const res = await fetchAdminApi<ExpenseCategory>('/expenses/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to create category');
    return res.data!;
  },

  async updateCategory(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      monthlyBudgetLimit?: number | null;
      budgetInPaise?: boolean;
      isActive?: boolean;
    }
  ): Promise<ExpenseCategory> {
    const res = await fetchAdminApi<ExpenseCategory>(`/expenses/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to update category');
    return res.data!;
  },

  async deleteCategory(id: string): Promise<ExpenseCategory> {
    const res = await fetchAdminApi<ExpenseCategory>(`/expenses/categories/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to delete category');
    return res.data!;
  },

  // 12. Rollup Analytics
  async getAnalytics(params: {
    branchId?: string;
    year?: number;
    month?: number;
    period?: 'month' | 'year';
  } = {}): Promise<ExpenseRollupAnalytics> {
    const sp = new URLSearchParams();
    if (params.branchId) sp.set('branchId', params.branchId);
    if (params.year) sp.set('year', String(params.year));
    if (params.month) sp.set('month', String(params.month));
    if (params.period) sp.set('period', params.period);

    const res = await fetchAdminApi<ExpenseRollupAnalytics>(`/expenses/reports/analytics?${sp.toString()}`);
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to fetch analytics');
    return res.data!;
  },

  // 13. Download Multi-Sheet Excel Report (.xlsx)
  async downloadExcelReport(query: {
    period: 'day' | 'week' | 'month' | 'year';
    branchId?: string;
    date?: string;
    startDate?: string;
    month?: number;
    year?: number;
  }): Promise<void> {
    const sp = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });

    const token = getAdminToken();
    const res = await fetch(`${API_BASE_URL}/expenses/reports/export?${sp.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || 'Failed to generate Excel report');
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `Expenses_Report_${query.period}.xlsx`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // 14. Settings
  async getSettings(branchId?: string): Promise<any> {
    const sp = branchId ? `?branchId=${branchId}` : '';
    const res = await fetchAdminApi(`/expenses/settings${sp}`);
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to load settings');
    return res.data;
  },

  async updateSettings(data: any): Promise<any> {
    const res = await fetchAdminApi('/expenses/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to update settings');
    return res.data;
  },

  // 15. Fetch Active Branches
  async getBranches(): Promise<{ id: string; name: string; code: string }[]> {
    const res = await fetchAdminApi('/branches');
    if (!res.success) throw new Error(res.message || res.error?.message || 'Failed to load branches');
    return res.data?.branches || res.data || [];
  },
};
