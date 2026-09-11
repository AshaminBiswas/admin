import { fetchAdminApi, API_BASE_URL, getAdminToken } from './adminApi';
import type {
  InstallerBill,
  CubicleModel,
  CubicleInstaller,
  ListInstallerBillsResponse,
  CreateInstallerBillPayload,
  UpdateInstallerBillPayload,
  RecordPaymentPayload,
  CreateCubicleModelPayload,
  UpdateCubicleModelPayload,
  CreateCubicleInstallerPayload,
  UpdateCubicleInstallerPayload,
  InstallerBillsFilter,
  InstallerExportFilter,
} from '../types/installerPayment';

export const installerPaymentsService = {
  // ─── Bills Operations ──────────────────────────────────────────────────────

  async listBills(params: InstallerBillsFilter = {}): Promise<ListInstallerBillsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.isNcr && params.isNcr !== 'all') query.append('isNcr', params.isNcr);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const qStr = query.toString();
    const res = await fetchAdminApi<any>(`/installer-payments${qStr ? `?${qStr}` : ''}`);
    return (
      res?.data ||
      res || {
        bills: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        kpis: { totalBills: 0, totalAmount: 0, totalPaid: 0, totalDue: 0, clearedCount: 0, partialCount: 0 },
      }
    );
  },

  async getBill(id: string): Promise<InstallerBill> {
    const res = await fetchAdminApi<any>(`/installer-payments/${encodeURIComponent(id)}`);
    return res?.data || res;
  },

  async createBill(payload: CreateInstallerBillPayload): Promise<InstallerBill> {
    const res = await fetchAdminApi<any>('/installer-payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async updateBill(id: string, payload: UpdateInstallerBillPayload): Promise<InstallerBill> {
    const res = await fetchAdminApi<any>(`/installer-payments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async recordPayment(billId: string, payload: RecordPaymentPayload): Promise<InstallerBill> {
    const res = await fetchAdminApi<any>(`/installer-payments/${encodeURIComponent(billId)}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async downloadBillPdf(id: string, billNo: string): Promise<void> {
    const token = getAdminToken() || localStorage.getItem('token') || '';
    const response = await fetch(`${API_BASE_URL}/installer-payments/${encodeURIComponent(id)}/pdf`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`PDF download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(billNo || 'PPSI-Bill').replace(/[\/\\]/g, '-')}-Payment-Advice.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async resendClearanceEmail(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetchAdminApi<any>(`/installer-payments/${encodeURIComponent(id)}/resend-email`, {
      method: 'POST',
    });
    return res?.data || res;
  },

  // ─── Cubicle Model Master (Super Admin Only) ───────────────────────────────

  async listModels(activeOnly = false): Promise<CubicleModel[]> {
    const query = activeOnly ? '?activeOnly=true' : '';
    const res = await fetchAdminApi<any>(`/installer-payments/models${query}`);
    return res?.data || res || [];
  },

  async createModel(payload: CreateCubicleModelPayload): Promise<CubicleModel> {
    const res = await fetchAdminApi<any>('/installer-payments/models', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async updateModel(id: string, payload: UpdateCubicleModelPayload): Promise<CubicleModel> {
    const res = await fetchAdminApi<any>(`/installer-payments/models/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async deactivateModel(id: string): Promise<CubicleModel> {
    const res = await fetchAdminApi<any>(`/installer-payments/models/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res?.data || res;
  },

  // ─── Installers Directory (Master) ────────────────────────────────────────

  async listInstallers(includeInactive = false): Promise<CubicleInstaller[]> {
    const res = await fetchAdminApi<any>(`/installer-payments/installers${includeInactive ? '?includeInactive=true' : ''}`);
    return res?.data || res || [];
  },

  async createInstaller(payload: CreateCubicleInstallerPayload): Promise<CubicleInstaller> {
    const res = await fetchAdminApi<any>('/installer-payments/installers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async updateInstaller(id: string, payload: UpdateCubicleInstallerPayload): Promise<CubicleInstaller> {
    const res = await fetchAdminApi<any>(`/installer-payments/installers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async deactivateInstaller(id: string): Promise<CubicleInstaller> {
    const res = await fetchAdminApi<any>(`/installer-payments/installers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res?.data || res;
  },

  // ─── Full History Export (Super Admin Only) ────────────────────────────────

  async exportExcel(filters: InstallerExportFilter = {}): Promise<void> {
    const query = new URLSearchParams();
    if (filters.month) query.append('month', filters.month.toString());
    if (filters.year) query.append('year', filters.year.toString());
    if (filters.startDate) query.append('startDate', filters.startDate);
    if (filters.endDate) query.append('endDate', filters.endDate);
    if (filters.status && filters.status !== 'ALL') query.append('status', filters.status);

    const token = getAdminToken() || localStorage.getItem('token') || '';
    const qStr = query.toString();
    const response = await fetch(`${API_BASE_URL}/installer-payments/export/excel${qStr ? `?${qStr}` : ''}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Access denied: Super Admin privileges required to export full payment history.');
      }
      throw new Error(`Export failed with HTTP status ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.download = `Installer-Payments-History-${dateStamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
