import { fetchAdminApi, API_BASE_URL, getAdminToken } from './adminApi';
import type {
  UPExpense,
  UPCategory,
  UPCashDay,
  UPAuditRecord,
  UPAccessUser,
  UPDashboardData,
} from '../types/admin';

export const upApi = {
  checkAccess: async () => {
    return fetchAdminApi<{ hasAccess: boolean; isSuperAdmin: boolean }>('/up/access');
  },

  listAccessUsers: async () => {
    return fetchAdminApi<UPAccessUser[]>('/up/access/users');
  },

  grantAccess: async (adminId: string) => {
    return fetchAdminApi<{ success: boolean; message: string }>('/up/access', {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    });
  },

  revokeAccess: async (adminId: string) => {
    return fetchAdminApi<{ success: boolean; message: string }>(`/up/access/${adminId}`, {
      method: 'DELETE',
    });
  },

  getDashboard: async (range: string = 'month', startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ range });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchAdminApi<UPDashboardData>(`/up/dashboard?${params.toString()}`);
  },

  listExpenses: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    paymentMode?: string;
    verified?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.paymentMode) query.append('paymentMode', params.paymentMode);
    if (params?.verified) query.append('verified', params.verified);
    if (params?.search) query.append('search', params.search);

    return fetchAdminApi<{
      items: UPExpense[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        totalAmount: number;
      };
    }>(`/up/expenses?${query.toString()}`);
  },

  getExpenseById: async (id: string) => {
    return fetchAdminApi<UPExpense>(`/up/expenses/${id}`);
  },

  createExpense: async (data: {
    expenseDate: string;
    amount: number;
    categoryId: string;
    paymentMode?: string;
    paidTo: string;
    note?: string | null;
    receiptPath?: string | null;
  }) => {
    return fetchAdminApi<UPExpense>('/up/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateExpense: async (
    id: string,
    data: {
      expenseDate?: string;
      amount?: number;
      categoryId?: string;
      paymentMode?: string;
      paidTo?: string;
      note?: string | null;
      receiptPath?: string | null;
    }
  ) => {
    return fetchAdminApi<UPExpense>(`/up/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteExpense: async (id: string) => {
    return fetchAdminApi<{ success: boolean; message: string }>(`/up/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  verifyExpense: async (id: string, verified: boolean) => {
    return fetchAdminApi<UPExpense>(`/up/expenses/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verified }),
    });
  },

  getExpenseAudit: async (id: string) => {
    return fetchAdminApi<UPAuditRecord[]>(`/up/expenses/${id}/audit`);
  },

  listCategories: async (includeInactive: boolean = false) => {
    return fetchAdminApi<UPCategory[]>(`/up/categories?includeInactive=${includeInactive}`);
  },

  createCategory: async (data: { name: string; sortOrder?: number }) => {
    return fetchAdminApi<UPCategory>('/up/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCategory: async (id: string, data: { name?: string; active?: boolean; sortOrder?: number }) => {
    return fetchAdminApi<UPCategory>(`/up/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getCashStatus: async (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return fetchAdminApi<UPCashDay>(`/up/cash/status${query}`);
  },

  reconcileCash: async (data: {
    cashDate: string;
    openingBalance?: number;
    actualClosing?: number | null;
    notes?: string | null;
    closed?: boolean;
  }) => {
    return fetchAdminApi<UPCashDay>('/up/cash/reconcile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listCashDays: async (limit: number = 30) => {
    return fetchAdminApi<UPCashDay[]>(`/up/cash?limit=${limit}`);
  },

  getReceiptSignedUrl: async (expenseId: string) => {
    return fetchAdminApi<{ signedUrl: string }>(`/up/expenses/${expenseId}/receipt-url`);
  },

  uploadReceipt: async (expenseId: string, file: File) => {
    const formData = new FormData();
    formData.append('receipt', file);
    const token = getAdminToken();

    const res = await fetch(`${API_BASE_URL}/up/expenses/${expenseId}/receipt`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    return res.json();
  },

  deleteReceipt: async (expenseId: string) => {
    return fetchAdminApi<{ success: boolean; message: string }>(`/up/expenses/${expenseId}/receipt`, {
      method: 'DELETE',
    });
  },

  exportExcelUrl: (params?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    paymentMode?: string;
    verified?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    const token = getAdminToken();
    if (token) query.append('token', token);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.paymentMode) query.append('paymentMode', params.paymentMode);
    if (params?.verified) query.append('verified', params.verified);
    if (params?.search) query.append('search', params.search);

    return `${API_BASE_URL}/up/reports/export?${query.toString()}`;
  },
};
