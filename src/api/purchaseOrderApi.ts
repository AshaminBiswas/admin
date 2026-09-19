/**
 * purchaseOrderApi.ts
 *
 * API client methods for the Multi Stock Purchase Order (PO) module.
 */

import { fetchAdminApi } from './adminApi';
import type {
  PurchaseOrder,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  SendPoEmailInput,
  ReceivePoGoodsInput,
  PurchaseOrderMetrics,
  PoStatus,
} from '../types/purchaseOrder';

export const purchaseOrderApi = {
  /**
   * List Purchase Orders with filters and metrics
   */
  listPurchaseOrders: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: PoStatus | 'ALL';
    supplierId?: string;
    companyEntity?: string;
    branchId?: string;
  }): Promise<{
    success: boolean;
    data: PurchaseOrder[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    metrics: PurchaseOrderMetrics;
  }> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.supplierId && params.supplierId !== 'ALL') query.append('supplierId', params.supplierId);
    if (params.companyEntity && params.companyEntity !== 'ALL') query.append('companyEntity', params.companyEntity);
    if (params.branchId && params.branchId !== 'ALL') query.append('branchId', params.branchId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return fetchAdminApi(`/purchase-orders${queryString}`) as any;
  },

  /**
   * Get single Purchase Order details with items, events, and dispatches
   */
  getPurchaseOrderById: async (id: string): Promise<{ success: boolean; data: PurchaseOrder }> => {
    return fetchAdminApi(`/purchase-orders/${id}`) as any;
  },

  /**
   * Create new Purchase Order
   */
  createPurchaseOrder: async (data: CreatePurchaseOrderInput): Promise<{ success: boolean; data: PurchaseOrder }> => {
    return fetchAdminApi('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as any;
  },

  /**
   * Update Purchase Order (creates revision -R1 if already sent)
   */
  updatePurchaseOrder: async (id: string, data: UpdatePurchaseOrderInput): Promise<{ success: boolean; data: PurchaseOrder }> => {
    return fetchAdminApi(`/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as any;
  },

  /**
   * Send PO via email to supplier with vector PDF attached
   */
  sendPurchaseOrderEmail: async (id: string, data: SendPoEmailInput): Promise<{ success: boolean; message: string }> => {
    return fetchAdminApi(`/purchase-orders/${id}/send-email`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as any;
  },

  /**
   * Record partial or full physical receipt of goods against a PO
   */
  recordGoodsReceipt: async (id: string, data: ReceivePoGoodsInput): Promise<{ success: boolean; data: PurchaseOrder }> => {
    return fetchAdminApi(`/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as any;
  },

  /**
   * Update PO lifecycle status manually (e.g. Acknowledged, Cancelled)
   */
  updateStatus: async (id: string, status: PoStatus, note?: string): Promise<{ success: boolean; message: string }> => {
    return fetchAdminApi(`/purchase-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }) as any;
  },

  /**
   * Get URL for direct vector PDF stream
   */
  getPdfDownloadUrl: (id: string): string => {
    return `/api/v1/purchase-orders/${id}/pdf`;
  },
};
