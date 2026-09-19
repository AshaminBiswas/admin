import { fetchAdminApi } from './adminApi';
import { B2BOrder, B2BOrderStatus } from '../types/admin';

export interface B2BOrderListResponse {
  items: B2BOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  statusCounts: Record<string, number>;
  sourceCounts?: Record<string, number>;
}

export const b2bOrdersApi = {
  listB2BOrders: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    branchId?: string;
    search?: string;
    customerId?: string;
    source?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.branchId && params.branchId !== 'ALL') query.set('branchId', params.branchId);
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.customerId) query.set('customerId', params.customerId);
    if (params.source && params.source !== 'ALL') query.set('source', params.source);

    return fetchAdminApi<B2BOrderListResponse>(`/b2b-orders?${query.toString()}`);
  },

  getB2BOrder: async (id: string) => {
    return fetchAdminApi<B2BOrder>(`/b2b-orders/${id}`);
  },

  adminCreateB2BOrder: async (payload: {
    clientRequestId: string;
    customerId: string;
    branchId: string;
    sourceQuotationId?: string | null;
    sourcePoId?: string | null;
    paymentMethod?: string;
    items: {
      productId: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      taxRate?: number;
      taxPercent?: number;
      configuration?: any;
    }[];
    notes?: string;
  }) => {
    return fetchAdminApi<B2BOrder>('/b2b-orders/admin-create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  approveB2BOrder: async (id: string) => {
    return fetchAdminApi<B2BOrder>(`/b2b-orders/${id}/approve`, {
      method: 'POST',
    });
  },

  rejectB2BOrder: async (id: string, reason: string) => {
    return fetchAdminApi<B2BOrder>(`/b2b-orders/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  adminCancelB2BOrder: async (id: string, reason: string) => {
    return fetchAdminApi<B2BOrder>(`/b2b-orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  adminEditB2BOrder: async (id: string, payload: {
    items: {
      orderItemId?: string | null;
      productId: string;
      sku: string;
      quantity: number;
      unitPrice?: number;
      discount?: number;
      taxRate?: number;
      taxPercent?: number;
      isRemoved?: boolean;
    }[];
    notes?: string;
  }) => {
    return fetchAdminApi<B2BOrder>(`/b2b-orders/${id}/edit`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateB2BOrderStatus: async (id: string, status: 'processing' | 'ready' | 'completed') => {
    return fetchAdminApi<B2BOrder>(`/b2b-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  checkProductStock: async (branchId: string, productIds: string[]) => {
    const query = new URLSearchParams({
      branchId,
      productIds: productIds.join(','),
    });
    return fetchAdminApi<{
      productId: string;
      sku: string;
      name: string;
      physicalStock: number;
      reservedStock: number;
      availableStock: number;
    }[]>(`/b2b-orders/check-stock?${query.toString()}`);
  },

  recordPayment: async (
    id: string,
    payload: {
      amountPaid: number;
      paymentMode: string;
      transactionRef?: string;
      paymentDate?: string;
      notes?: string;
    }
  ) => {
    return fetchAdminApi<B2BOrder>(`/b2b-orders/${id}/record-payment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
