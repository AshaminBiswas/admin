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

  // ─── UP Factory Floor Inventory & Operations ───────────────────────────────────

  getInventoryDashboard: async (branchId?: string) => {
    const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return fetchAdminApi<UPInventoryDashboardData>(`/up/inventory/dashboard${q}`);
  },

  searchSKU: async (query: string, branchId?: string) => {
    const params = new URLSearchParams({ q: query });
    if (branchId) params.append('branchId', branchId);
    return fetchAdminApi<UPSkuSearchResult[]>(`/up/inventory/search?${params.toString()}`);
  },

  listStock: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    branchId?: string;
    category?: string;
    stockStatus?: string;
    itemType?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.search) q.append('search', params.search);
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.category) q.append('category', params.category);
    if (params?.stockStatus) q.append('stockStatus', params.stockStatus);
    if (params?.itemType) q.append('itemType', params.itemType);

    return fetchAdminApi<{
      data: UPStockItem[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/up/inventory/stock?${q.toString()}`);
  },

  receiveMaterial: async (data: {
    productId: string;
    branchId: string;
    quantity: number;
    unitCost?: number;
    supplierName?: string;
    invoiceNumber?: string;
    notes?: string;
  }) => {
    return fetchAdminApi<{ success: boolean; quantityReceived: number }>('/up/inventory/receive', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  issueMaterial: async (data: {
    productId: string;
    branchId: string;
    quantity: number;
    productionOrderId?: string;
    notes?: string;
  }) => {
    return fetchAdminApi<{ success: boolean; quantityIssued: number }>('/up/inventory/issue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  transferStock: async (data: {
    productId: string;
    fromBranchId: string;
    toBranchId: string;
    quantity: number;
    notes?: string;
  }) => {
    return fetchAdminApi<{ success: boolean; transferred: number }>('/up/inventory/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  recordDamage: async (data: {
    productId: string;
    branchId: string;
    quantity: number;
    reason: string;
    photoUrl?: string;
    actionTaken?: string;
    notes?: string;
  }) => {
    return fetchAdminApi<{ success: boolean; ticketNumber: string; quantity: number }>('/up/inventory/damage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  recordScrap: async (data: {
    materialName: string;
    productId?: string;
    productionOrderId?: string;
    branchId: string;
    quantity: number;
    unit?: string;
    reason: string;
    estimatedLossPaise?: number;
    recoveredValuePaise?: number;
  }) => {
    return fetchAdminApi<{ success: boolean; scrapNumber: string; quantity: number }>('/up/inventory/scrap', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listBoms: async () => {
    return fetchAdminApi<UPBom[]>('/up/inventory/bom');
  },

  getBom: async (id: string) => {
    return fetchAdminApi<UPBom>(`/up/inventory/bom/${id}`);
  },

  createBom: async (data: {
    name: string;
    productId: string;
    sku?: string;
    version?: string;
    notes?: string;
    items: Array<{
      rawMaterialId: string;
      rawMaterialSku?: string;
      rawMaterialName?: string;
      quantityRequired: number;
      unit?: string;
      wastePercentage?: number;
      notes?: string;
    }>;
  }) => {
    return fetchAdminApi<{ success: boolean; id: string }>('/up/inventory/bom', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listProductionOrders: async (params?: { branchId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.status) q.append('status', params.status);
    return fetchAdminApi<UPProductionOrder[]>(`/up/inventory/production?${q.toString()}`);
  },

  createProductionOrder: async (data: {
    productId: string;
    bomId?: string;
    branchId: string;
    plannedQuantity: number;
    notes?: string;
  }) => {
    return fetchAdminApi<{ id: string; orderNumber: string }>('/up/inventory/production', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  startProductionOrder: async (id: string) => {
    return fetchAdminApi<{ success: boolean }>(`/up/inventory/production/${id}/start`, {
      method: 'POST',
    });
  },

  completeProductionOrder: async (id: string, data: { producedQuantity: number; rejectedQuantity?: number; notes?: string }) => {
    return fetchAdminApi<{ success: boolean; producedQuantity: number; orderNumber: string }>(
      `/up/inventory/production/${id}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  listPhysicalCounts: async (branchId?: string) => {
    const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return fetchAdminApi<UPPhysicalCount[]>(`/up/inventory/physical-counts${q}`);
  },

  createPhysicalCount: async (data: {
    branchId: string;
    notes?: string;
    items: Array<{
      productId: string;
      sku: string;
      name: string;
      systemQty: number;
      countedQty: number;
      notes?: string;
    }>;
  }) => {
    return fetchAdminApi<{ success: boolean; countNumber: string; totalItemsCounted: number; totalVariance: number }>(
      '/up/inventory/physical-counts',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  getInventoryReports: async (params?: { branchId?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    return fetchAdminApi<UPInventoryReports>(`/up/inventory/reports?${q.toString()}`);
  },

  createProduct: async (data: {
    name: string;
    sku: string;
    barcode?: string;
    productType?: 'FINISHED_GOOD' | 'SEMI_FINISHED_GOOD' | 'RAW_MATERIAL';
    categoryName?: string;
    finish?: string;
    colour?: string;
    dimensions?: string;
    unitOfMeasure?: string;
    unitCost?: number;
    transferPrice?: number;
    initialStock?: number;
    reorderLevel?: number;
    description?: string;
  }) => {
    return fetchAdminApi<{
      id: string;
      name: string;
      sku: string;
      productType: string;
      stock: number;
      unitCost: number;
      transferPrice: number;
      categoryId: string;
    }>('/up/inventory/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  supplyToPrc: async (data: {
    destinationBranchId?: string;
    destinationBranchName?: string;
    items: Array<{
      productId: string;
      sku: string;
      name: string;
      quantity: number;
      transferPrice?: number;
    }>;
    transportMode?: string;
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
    notes?: string;
  }) => {
    return fetchAdminApi<{
      success: boolean;
      dispatchId: string;
      challanNumber: string;
      destinationBranchName: string;
      totalUnits: number;
      totalTransferValue: number;
      itemsCount: number;
    }>('/up/inventory/supply-prc', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listPrcDispatches: async (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    return fetchAdminApi<{
      data: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/up/inventory/dispatches?${q.toString()}`);
  },
};

// ─── UP Inventory Types ───────────────────────────────────────────────────────

export interface UPInventoryDashboardData {
  branchId?: string;
  branchName: string;
  totalSku: number;
  totalStockUnits: number;
  estimatedValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  productionOrders: {
    inProgress: number;
    draft: number;
    completed: number;
  };
  todayFloorMetrics: {
    damagedUnits: number;
    scrapQty: number;
    scrapLossRupees: number;
  };
  recentMovements: Array<{
    id: string;
    type: string;
    quantity: number;
    previousQty: number;
    newQty: number;
    notes?: string;
    createdAt: string;
    productName?: string;
    sku?: string;
  }>;
}

export interface UPSkuSearchResult {
  id: string;
  name: string;
  sku: string;
  price: number;
  salesPrice?: number;
  finish?: string;
  colour?: string;
  dimensions?: any;
  categoryName?: string;
  onHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface UPStockItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  salesPrice?: number;
  finish?: string;
  colour?: string;
  dimensions?: any;
  categoryName?: string;
  onHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  itemType: 'ALL' | 'RAW_MATERIAL' | 'SEMI_FINISHED_GOOD' | 'FINISHED_GOOD';
}

export interface UPBom {
  id: string;
  name: string;
  productId: string;
  sku?: string;
  version: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  productName?: string;
  productStock?: number;
  categoryName?: string;
  itemCount?: number;
  items?: Array<{
    id: string;
    rawMaterialId: string;
    rawMaterialSku?: string;
    rawMaterialName?: string;
    quantityRequired: number;
    unit: string;
    wastePercentage: number;
    notes?: string;
    currentStock?: number;
  }>;
}

export interface UPProductionOrder {
  id: string;
  orderNumber: string;
  bomId?: string;
  productId: string;
  branchId: string;
  plannedQuantity: number;
  producedQuantity: number;
  rejectedQuantity: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  productName?: string;
  productSku?: string;
  bomName?: string;
  branchName?: string;
}

export interface UPPhysicalCount {
  id: string;
  countNumber: string;
  branchId: string;
  status: string;
  totalItemsCounted: number;
  totalVarianceUnits: number;
  notes?: string;
  performedBy: string;
  createdAt: string;
  branchName?: string;
}

export interface UPInventoryReports {
  movementBreakdown: Array<{
    type: string;
    count: number;
    totalUnits: number;
  }>;
  damagedSummary: Array<{
    reason: string;
    count: number;
    totalUnits: number;
  }>;
  scrapSummary: Array<{
    materialName: string;
    count: number;
    totalQuantity: number;
    totalLossRupees: number;
  }>;
}

