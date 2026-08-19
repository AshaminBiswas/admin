import { fetchAdminApi, API_BASE_URL, getAdminToken } from './adminApi';
import {
  CompanySettings,
  GSTCustomer,
  GSTInvoice,
  GSTAuditLog,
  GSTReportFilter,
} from '../types/admin';

/* ─── Company Settings ───────────────────────────────────────────────────── */

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const res = await fetchAdminApi<CompanySettings>('/gst/company-settings');
  return res.data || null;
}

export async function updateCompanySettings(
  data: Partial<CompanySettings>
): Promise<CompanySettings> {
  const res = await fetchAdminApi<CompanySettings>('/gst/company-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error?.message || res.message || 'Failed to save settings');
  return res.data!;
}

/* ─── GST Customers ──────────────────────────────────────────────────────── */

export async function searchGSTCustomers(
  query = '',
  page = 1,
  limit = 20
): Promise<{ items: GSTCustomer[]; total: number; totalPages: number }> {
  const q = new URLSearchParams();
  if (query) q.set('search', query);
  q.set('page', String(page));
  q.set('limit', String(limit));
  const res = await fetchAdminApi<GSTCustomer[]>(`/gst/customers?${q.toString()}`);
  return {
    items: res.data || [],
    total: (res as any).pagination?.total || 0,
    totalPages: (res as any).pagination?.totalPages || 1,
  };
}

export async function getGSTCustomerById(id: string): Promise<GSTCustomer> {
  const res = await fetchAdminApi<GSTCustomer>(`/gst/customers/${id}`);
  if (!res.success || !res.data) throw new Error(res.error?.message || 'Customer not found');
  return res.data;
}

export async function createGSTCustomer(
  data: Omit<GSTCustomer, 'id' | 'created_at' | 'updated_at'>
): Promise<GSTCustomer> {
  const res = await fetchAdminApi<GSTCustomer>('/gst/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error?.message || res.message || 'Failed to create customer');
  return res.data!;
}

export async function updateGSTCustomer(
  id: string,
  data: Partial<Omit<GSTCustomer, 'id' | 'created_at' | 'updated_at'>>
): Promise<GSTCustomer> {
  const res = await fetchAdminApi<GSTCustomer>(`/gst/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error?.message || res.message || 'Failed to update customer');
  return res.data!;
}

/* ─── Invoices ───────────────────────────────────────────────────────────── */

export async function listGSTInvoices(params?: {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: GSTInvoice[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats?: {
    total_invoices: number;
    this_month_invoices: number;
    irn_generated: number;
    irn_pending: number;
    irn_cancelled: number;
    total_taxable_sales: number;
    total_gst_collected: number;
  };
}> {
  const q = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') q.set('status', params.status);
  if (params?.search) q.set('search', params.search);
  if (params?.date_from) q.set('date_from', params.date_from);
  if (params?.date_to) q.set('date_to', params.date_to);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));

  const res = await fetchAdminApi<GSTInvoice[]>(`/gst/invoices?${q.toString()}`);
  return {
    items: res.data || [],
    pagination: {
      page: (res as any).pagination?.page || 1,
      limit: (res as any).pagination?.limit || 20,
      total: (res as any).pagination?.total || 0,
      totalPages: (res as any).pagination?.totalPages || 1,
    },
    stats: (res as any).stats,
  };
}

export async function getGSTInvoiceById(id: string): Promise<GSTInvoice> {
  const res = await fetchAdminApi<GSTInvoice>(`/gst/invoices/${id}`);
  if (!res.success || !res.data) throw new Error(res.error?.message || 'Invoice not found');
  return res.data;
}

export interface CreateGSTInvoicePayload {
  invoice_date: string;
  customer_id: string;
  place_of_supply: string;
  place_of_supply_state_code: string;
  supply_type: 'B2B' | 'B2C';
  notes?: string;
  items: Array<{
    sl_no: number;
    product_id?: string;
    description: string;
    hsn_sac: string;
    is_service: boolean;
    quantity: number;
    unit: string;
    unit_price: number;
    discount: number;
    gst_rate: number;
    cess_rate?: number;
  }>;
}

export async function createGSTInvoice(data: CreateGSTInvoicePayload): Promise<GSTInvoice> {
  const res = await fetchAdminApi<GSTInvoice>('/gst/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error?.message || res.message || 'Failed to create invoice');
  return res.data!;
}

export async function updateDraftGSTInvoice(
  id: string,
  data: CreateGSTInvoicePayload
): Promise<GSTInvoice> {
  const res = await fetchAdminApi<GSTInvoice>(`/gst/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error?.message || res.message || 'Failed to update invoice');
  return res.data!;
}

export async function validateGSTInvoice(id: string): Promise<{
  invoice: GSTInvoice;
  validationResults: Array<{ field: string; label: string; passed: boolean; message?: string }>;
}> {
  const res = await fetchAdminApi<any>(`/gst/invoices/${id}/validate`, {
    method: 'POST',
  });
  if (!res.success) throw new Error(res.error?.message || res.message || 'Validation failed');
  return {
    invoice: res.data?.invoice || res.data,
    validationResults: res.data?.validationResults || [],
  };
}

/* ─── E-Invoice / IRN ────────────────────────────────────────────────────── */

export async function generateIRN(invoiceId: string): Promise<GSTInvoice> {
  const res = await fetchAdminApi<GSTInvoice>(`/gst/einvoice/${invoiceId}/generate`, {
    method: 'POST',
  });
  if (!res.success) throw new Error(res.error?.message || res.message || 'IRN generation failed. Please check audit logs for details.');
  return res.data!;
}

export async function cancelIRN(
  invoiceId: string,
  cancelData: { reason_code: string; reason_remark: string }
): Promise<GSTInvoice> {
  const res = await fetchAdminApi<GSTInvoice>(`/gst/einvoice/${invoiceId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(cancelData),
  });
  if (!res.success) throw new Error(res.error?.message || res.message || 'IRN cancellation failed');
  return res.data!;
}

export async function checkIRNStatus(invoiceId: string): Promise<GSTInvoice> {
  const res = await fetchAdminApi<GSTInvoice>(`/gst/einvoice/${invoiceId}/status`);
  if (!res.success) throw new Error(res.error?.message || 'Failed to check IRN status');
  return res.data!;
}

/* ─── PDF Download ───────────────────────────────────────────────────────── */

export async function downloadGSTInvoicePdf(
  invoiceId: string,
  invoiceNumber: string
): Promise<void> {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE_URL}/gst/invoices/${invoiceId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error?.message || `PDF not available (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PRC_TaxInvoice_${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/* ─── Reports ────────────────────────────────────────────────────────────── */

export async function getInvoiceRegisterReport(
  filter: GSTReportFilter
): Promise<{ items: any[]; totals: any; pagination: any }> {
  const q = new URLSearchParams();
  if (filter.date_from) q.set('date_from', filter.date_from);
  if (filter.date_to) q.set('date_to', filter.date_to);
  if (filter.customer_id) q.set('customer_id', filter.customer_id);
  if (filter.status && filter.status !== 'ALL') q.set('status', filter.status);
  if (filter.gstin) q.set('gstin', filter.gstin);
  if (filter.page) q.set('page', String(filter.page));
  if (filter.limit) q.set('limit', String(filter.limit));
  const res = await fetchAdminApi<any>(`/gst/reports/invoice-register?${q.toString()}`);
  return {
    items: res.data?.items || res.data || [],
    totals: res.data?.totals || {},
    pagination: (res as any).pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getGSTSummaryReport(
  filter: GSTReportFilter
): Promise<{ slabs: any[]; totals: any }> {
  const q = new URLSearchParams();
  if (filter.date_from) q.set('date_from', filter.date_from);
  if (filter.date_to) q.set('date_to', filter.date_to);
  if (filter.customer_id) q.set('customer_id', filter.customer_id);
  const res = await fetchAdminApi<any>(`/gst/reports/gst-summary?${q.toString()}`);
  return {
    slabs: res.data?.slabs || res.data || [],
    totals: res.data?.totals || {},
  };
}

export async function getEInvoiceReport(
  filter: GSTReportFilter
): Promise<{ items: any[]; pagination: any }> {
  const q = new URLSearchParams();
  if (filter.date_from) q.set('date_from', filter.date_from);
  if (filter.date_to) q.set('date_to', filter.date_to);
  if (filter.status && filter.status !== 'ALL') q.set('irn_status', filter.status);
  if (filter.page) q.set('page', String(filter.page));
  const res = await fetchAdminApi<any>(`/gst/reports/einvoice?${q.toString()}`);
  return {
    items: res.data?.items || res.data || [],
    pagination: (res as any).pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

/* ─── GST Audit Logs ─────────────────────────────────────────────────────── */

export async function getGSTAuditLogs(params?: {
  action?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: GSTAuditLog[]; pagination: any }> {
  const q = new URLSearchParams();
  if (params?.action) q.set('action', params.action);
  if (params?.entity_type) q.set('entity_type', params.entity_type);
  if (params?.date_from) q.set('date_from', params.date_from);
  if (params?.date_to) q.set('date_to', params.date_to);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const res = await fetchAdminApi<GSTAuditLog[]>(`/gst/audit-logs?${q.toString()}`);
  return {
    items: res.data || [],
    pagination: (res as any).pagination || { page: 1, limit: 50, total: 0, totalPages: 1 },
  };
}

/* ─── Validation helpers (client-side format check only) ─────────────────── */

/** GSTIN: 2-digit state + 5-char PAN + 4-digit + 1 + Z + 1 */
export function validateGSTIN(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.toUpperCase());
}

export function validatePAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase());
}

export function validatePincode(pin: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pin);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Returns current financial year string e.g. "2026-27" */
export function getCurrentFinancialYear(): string {
  const now = new Date();
  const month = now.getMonth(); // 0=Jan ... 11=Dec
  const year = now.getFullYear();
  if (month >= 3) {
    // April (3) onwards → FY starts this year
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}
