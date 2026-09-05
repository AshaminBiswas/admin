import { fetchAdminApi } from './adminApi';
import {
  GetPoSubmissionsResponse,
  PoClassification,
  PoManagementMetrics,
  PoPriority,
  PoStatus,
  PoSubmissionDetail,
  PoSubmissionItem,
  AiPoDetectionResult,
} from '../types/poManagement';

export interface GetPoSubmissionsParams {
  tab?: 'ALL' | 'PO_DETECTED' | 'POSSIBLE_PO' | 'GENERAL_EMAIL';
  classification?: PoClassification;
  status?: PoStatus;
  priority?: PoPriority;
  assignedUserId?: string;
  assignedDepartment?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getPoSubmissions(
  params?: GetPoSubmissionsParams
): Promise<GetPoSubmissionsResponse> {
  const query = new URLSearchParams();
  if (params?.tab && params.tab !== 'ALL') query.set('tab', params.tab);
  if (params?.classification) query.set('classification', params.classification);
  if (params?.status) query.set('status', params.status);
  if (params?.priority) query.set('priority', params.priority);
  if (params?.assignedUserId) query.set('assignedUserId', params.assignedUserId);
  if (params?.assignedDepartment) query.set('assignedDepartment', params.assignedDepartment);
  if (params?.search) query.set('search', params.search);
  if (params?.fromDate) query.set('fromDate', params.fromDate);
  if (params?.toDate) query.set('toDate', params.toDate);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const res = await fetchAdminApi<{
    items: PoSubmissionItem[];
    pagination: any;
    metrics: PoManagementMetrics;
  }>(`/po-management?${query.toString()}`);

  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to load PO submissions');
  }

  return res.data;
}

export async function getPoMetrics(): Promise<PoManagementMetrics> {
  const res = await fetchAdminApi<PoManagementMetrics>('/po-management/metrics');
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to load PO metrics');
  }
  return res.data;
}

export async function getPoSubmissionById(id: string): Promise<PoSubmissionDetail> {
  const res = await fetchAdminApi<PoSubmissionDetail>(`/po-management/${id}`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to load PO details');
  }
  return res.data;
}

export async function updatePoStatus(
  id: string,
  status: PoStatus,
  comment?: string
): Promise<PoSubmissionItem> {
  const res = await fetchAdminApi<PoSubmissionItem>(`/po-management/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to update status');
  }
  return res.data;
}

export async function updatePoPriority(
  id: string,
  priority: PoPriority
): Promise<PoSubmissionItem> {
  const res = await fetchAdminApi<PoSubmissionItem>(`/po-management/${id}/priority`, {
    method: 'PATCH',
    body: JSON.stringify({ priority }),
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to update priority');
  }
  return res.data;
}

export async function assignPoSubmission(
  id: string,
  assignedUserId?: string | null,
  assignedDepartment?: string | null
): Promise<PoSubmissionItem> {
  const res = await fetchAdminApi<PoSubmissionItem>(`/po-management/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedUserId, assignedDepartment }),
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to update assignment');
  }
  return res.data;
}

export async function reclassifyPo(
  id: string,
  classification: PoClassification
): Promise<PoSubmissionItem> {
  const res = await fetchAdminApi<PoSubmissionItem>(`/po-management/${id}/classification`, {
    method: 'PATCH',
    body: JSON.stringify({ classification }),
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to reclassify submission');
  }
  return res.data;
}

export async function updateCustomerPoNumber(
  id: string,
  customerPoNumber: string
): Promise<PoSubmissionItem> {
  const res = await fetchAdminApi<PoSubmissionItem>(`/po-management/${id}/customer-po-number`, {
    method: 'PATCH',
    body: JSON.stringify({ customerPoNumber }),
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to update customer PO number');
  }
  return res.data;
}

export async function addInternalNote(
  id: string,
  note: string
): Promise<any> {
  const res = await fetchAdminApi<any>(`/po-management/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to add internal note');
  }
  return res.data;
}

export async function syncInboundEmails(): Promise<{
  syncedCount: number;
  deletedCount?: number;
  duplicateCount: number;
  message: string;
}> {
  const res = await fetchAdminApi<{
    syncedCount: number;
    deletedCount?: number;
    duplicateCount: number;
    message: string;
  }>('/po-management/sync', {
    method: 'POST',
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to sync inbound emails');
  }
  return res.data;
}

export async function deletePoSubmission(id: string): Promise<{ success: boolean; id: string }> {
  const res = await fetchAdminApi<{ success: boolean; id: string }>(`/po-management/${id}`, {
    method: 'DELETE',
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to delete PO submission');
  }
  return res.data || { success: true, id };
}

export async function bulkDeletePoSubmissions(ids: string[]): Promise<{ success: boolean; deletedCount: number; ids: string[] }> {
  const res = await fetchAdminApi<{ success: boolean; deletedCount: number; ids: string[] }>('/po-management/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to delete selected PO submissions');
  }
  return res.data;
}

export async function replyToPoSubmission(id: string, formData: FormData): Promise<PoSubmissionDetail> {
  const res = await fetchAdminApi<PoSubmissionDetail>(`/po-management/${id}/reply`, {
    method: 'POST',
    body: formData,
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to send reply');
  }
  return res.data;
}

export async function aiDetectPo(id: string): Promise<{
  po: PoSubmissionDetail;
  aiDetectionResult: AiPoDetectionResult;
}> {
  const res = await fetchAdminApi<{
    po: PoSubmissionDetail;
    aiDetectionResult: AiPoDetectionResult;
  }>(`/po-management/${id}/ai-detect`, {
    method: 'POST',
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to run AI PO detection');
  }
  return res.data;
}

export async function aiDetectBatch(ids: string[]): Promise<{
  success: boolean;
  processedCount: number;
  detectedCount: number;
  updatedItems: PoSubmissionItem[];
}> {
  const res = await fetchAdminApi<{
    success: boolean;
    processedCount: number;
    detectedCount: number;
    updatedItems: PoSubmissionItem[];
  }>('/po-management/ai-detect-batch', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to run batch AI PO detection');
  }
  return res.data;
}

