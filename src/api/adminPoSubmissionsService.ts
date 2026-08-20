/**
 * adminPoSubmissionsService.ts
 *
 * API Client for PO Submissions Admin Operations.
 */

import { fetchAdminApi, API_BASE_URL, getAdminToken } from './adminApi';
import {
  AdminPoSubmission,
  AdminPoSubmissionDetail,
  AdminQueueMetrics,
  PoSubmissionLineItem,
} from '../types/poSubmissions';

export interface GetAdminPoSubmissionsParams {
  status?: string;
  sourceType?: string;
  search?: string;
  customerId?: string;
  assignedTo?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface GetAdminPoSubmissionsResponse {
  items: AdminPoSubmission[];
  metrics: AdminQueueMetrics;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function getAdminPoSubmissions(
  params?: GetAdminPoSubmissionsParams
): Promise<GetAdminPoSubmissionsResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  if (params?.sourceType && params.sourceType !== 'ALL') query.set('sourceType', params.sourceType);
  if (params?.search) query.set('search', params.search);
  if (params?.customerId) query.set('customerId', params.customerId);
  if (params?.assignedTo) query.set('assignedTo', params.assignedTo);
  if (params?.fromDate) query.set('fromDate', params.fromDate);
  if (params?.toDate) query.set('toDate', params.toDate);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetchAdminApi<AdminPoSubmission[]>(`/admin/po-submissions?${query.toString()}`);
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to load PO submissions queue');
  }

  const raw = res as any;
  return {
    items: res.data || [],
    metrics: raw.metrics || {
      ALL: 0,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      CHANGES_REQUESTED: 0,
      APPROVED: 0,
      ACKNOWLEDGED: 0,
      REJECTED: 0,
      FULFILLMENT: 0,
    },
    pagination: raw.pagination || {
      page: 1,
      limit: 15,
      totalItems: res.data?.length || 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}

export async function getAdminPoSubmissionById(id: string): Promise<AdminPoSubmissionDetail> {
  const res = await fetchAdminApi<AdminPoSubmissionDetail>(`/admin/po-submissions/${id}`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to load PO submission details');
  }
  return res.data;
}

export async function getPoSubmissionPdfSignedUrl(
  id: string
): Promise<{ url: string; attachmentId: string; fileName: string; fileSizeBytes: number }> {
  const res = await fetchAdminApi<{ url: string; attachmentId: string; fileName: string; fileSizeBytes: number }>(
    `/admin/po-submissions/${id}/pdf-signed-url`
  );
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to generate PDF viewer link');
  }
  return res.data;
}

export async function adminStartReview(id: string): Promise<void> {
  const res = await fetchAdminApi(`/admin/po-submissions/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to start review');
  }
}

export async function adminUpsertLineItems(
  id: string,
  items: Array<{
    productId?: string | null;
    variantId?: string | null;
    description: string;
    sku?: string | null;
    unit?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number | null;
  }>
): Promise<{ lineItems: PoSubmissionLineItem[]; mappedTotal: number }> {
  const res = await fetchAdminApi<{ lineItems: PoSubmissionLineItem[]; mappedTotal: number }>(
    `/admin/po-submissions/${id}/line-items`,
    {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }
  );
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to save mapped line items');
  }
  return res.data as any;
}

export async function adminApproveSubmission(
  id: string,
  opts?: { confirmMismatch?: boolean; note?: string }
): Promise<void> {
  const res = await fetchAdminApi(`/admin/po-submissions/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({
      confirmMismatch: opts?.confirmMismatch ?? false,
      note: opts?.note,
    }),
  });
  if (!res.success) {
    const errorObj = new Error(res.error?.message || 'Failed to approve purchase order');
    (errorObj as any).code = res.error?.code;
    throw errorObj;
  }
}

export async function adminIssueAcknowledgement(id: string): Promise<{ ackNumber: string }> {
  const res = await fetchAdminApi<{ ack: { ackNumber: string } }>(`/admin/po-submissions/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to generate Order Acknowledgement');
  }
  return { ackNumber: (res.data as any)?.ack?.ackNumber || 'ACK-ISSUED' };
}

export async function adminRejectSubmission(id: string, reason: string): Promise<void> {
  const res = await fetchAdminApi(`/admin/po-submissions/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to reject submission');
  }
}

export async function adminRequestChangesOnSubmission(id: string, reason: string): Promise<void> {
  const res = await fetchAdminApi(`/admin/po-submissions/${id}/request-changes`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to request changes');
  }
}

export async function adminAssignSubmission(id: string, adminUserId: string): Promise<void> {
  const res = await fetchAdminApi(`/admin/po-submissions/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ adminUserId }),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to assign reviewer');
  }
}

export async function adminAddInternalNote(id: string, note: string): Promise<void> {
  const res = await fetchAdminApi(`/admin/po-submissions/${id}/note`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to add internal note');
  }
}

export async function downloadAcknowledgementPdf(id: string, ackNumber: string): Promise<void> {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE_URL}/admin/po-submissions/${id}/acknowledgement`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error?.message || 'Acknowledgement PDF not found');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PRC_Acknowledgement_${ackNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function downloadAttachmentFile(
  attachmentId: string,
  fileName: string,
  inline = false
): Promise<void> {
  const token = getAdminToken();
  const response = await fetch(
    `${API_BASE_URL}/admin/po-submissions/attachments/${attachmentId}${inline ? '?inline=true' : ''}`,
    {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error?.message || 'Attachment not found');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  if (inline) {
    window.open(url, '_blank');
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export async function getAdminPoTracking(id: string): Promise<import('../types/poSubmissions').PoTrackingData> {
  const res = await fetchAdminApi<import('../types/poSubmissions').PoTrackingData>(`/admin/po-submissions/${id}/tracking`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to load PO tracking telemetry');
  }
  return res.data;
}
