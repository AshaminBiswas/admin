import { API_BASE_URL, getAdminToken } from '../api/adminApi';

/**
 * Downloads the server-rendered GST Tax Invoice PDF.
 * For IRN_GENERATED invoices, the server PDF includes IRN, AckNo, AckDt,
 * and the IRIS-signed QR code. QR is NEVER generated client-side.
 */
export async function downloadGSTInvoicePdf(
  invoiceId: string,
  invoiceNumber: string
): Promise<void> {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE_URL}/gst/invoices/${invoiceId}/pdf`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(
      json.error?.message || json.message || `Invoice PDF not available (HTTP ${response.status})`
    );
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = invoiceNumber.replace(/[^a-zA-Z0-9\-_]/g, '_');
  a.download = `PRC_TaxInvoice_${safe}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Downloads the raw IRN JSON (IRIS signed invoice JWT payload).
 * Only available for IRN_GENERATED / ISSUED / CANCELLED invoices.
 */
export async function downloadIRNJson(
  invoiceId: string,
  invoiceNumber: string
): Promise<void> {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE_URL}/gst/einvoice/${invoiceId}/irn-json`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error?.message || 'IRN JSON not available');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = invoiceNumber.replace(/[^a-zA-Z0-9\-_]/g, '_');
  a.download = `IRN_${safe}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/** Copy text to clipboard with graceful fallback for non-HTTPS */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

/** Export array of objects to CSV and trigger browser download */
export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h] ?? '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
