import { fetchAdminApi, API_BASE_URL, getAdminToken } from './adminApi';

export interface AdminPoAddress {
  attentionTo: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
}

export interface AdminPoItem {
  id: string;
  slNo: number;
  productId: string;
  productName: string;
  sku?: string | null;
  unit: string;
  quantity: number;
  rate: number;
  discount: number;
  taxRate: number;
  amount: number;
  taxAmount: number;
  total: number;
}

export interface AdminPoReceipt {
  id: string;
  status: 'PENDING_REVIEW' | 'REJECTED' | 'ACKNOWLEDGED' | 'VERIFIED';
  fileStorageKey: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  fileHash: string;
  version: number;
  amountReceived?: number | null;
  paymentDate?: string | null;
  paymentReference?: string | null;
  paymentMethod?: string | null;
  remarks?: string | null;
  rejectionReason?: string | null;
  uploadedAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
}

export interface AdminPoAuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByName?: string | null;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export interface AdminPurchaseOrder {
  id: string;
  poNumber: string;
  quotationId: string;
  quotationNumber: string;
  customerId: string;
  customer?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phone?: string;
  };
  quote?: {
    id: string;
    quoteNumber: string;
    referenceNo: string;
    projectName?: string;
    validUntil?: string;
  };
  status:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'VALIDATION_FAILED'
    | 'AWAITING_ADVANCE_PAYMENT'
    | 'PAYMENT_RECEIPT_SUBMITTED'
    | 'PAYMENT_ACKNOWLEDGED'
    | 'PAYMENT_VERIFIED'
    | 'PACKING_LIST_GENERATED'
    | 'DISPATCHED'
    | 'INVOICE_GENERATION_FAILED'
    | 'INVOICED'
    | 'REJECTED'
    | 'CANCELLED';
  customerPoReferenceNumber?: string | null;
  billingAddress: AdminPoAddress;
  deliveryAddress: AdminPoAddress;
  deliveryInstructions?: string | null;
  requestedDeliveryDate?: string | null;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  shippingCost: number;
  totalAmount: number;
  currency: string;
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;
  submittedAt: string;
  validatedAt?: string | null;
  rejectionReason?: string | null;
  items: AdminPoItem[];
  receipts: AdminPoReceipt[];
  packingList?: {
    id: string;
    fileStorageKey: string;
    generatedAt: string;
    totalPackages: number;
    totalQuantity: number;
  } | null;
  dispatch?: {
    id: string;
    carrierName: string;
    trackingNumber?: string | null;
    dispatchedAt: string;
    dispatchedByName?: string | null;
    dispatchNotes?: string | null;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    quotationNumber: string;
    poNumber: string;
    amountInvoiced: number;
    amountPaidAdvance: number;
    balanceDue: number;
    status: string;
    generatedAt: string;
  } | null;
  auditLogs?: AdminPoAuditLog[];
  createdAt: string;
}

export interface AdvanceSetting {
  id?: string;
  defaultPercentage: number;
  minPercentage: number;
  maxPercentage: number;
  allowCustomPerCustomer: boolean;
}

export interface BankSetting {
  id?: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscOrRoutingNumber: string;
  swiftCode?: string | null;
  branch?: string | null;
  upiId?: string | null;
  isActive: boolean;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export async function getAdminPurchaseOrders(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: AdminPurchaseOrder[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetchAdminApi<AdminPurchaseOrder[]>(`/purchase-orders?${query.toString()}`);
  return {
    items: res.data || [],
    pagination: {
      page: (res as any).pagination?.page || 1,
      limit: (res as any).pagination?.limit || 20,
      total: (res as any).pagination?.totalItems || (res.data ? res.data.length : 0),
      totalPages: (res as any).pagination?.totalPages || 1,
    },
  };
}

export async function getAdminPurchaseOrderById(id: string): Promise<AdminPurchaseOrder> {
  const res = await fetchAdminApi<AdminPurchaseOrder>(`/purchase-orders/${id}`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch Purchase Order details');
  }
  return res.data;
}

export async function adminAcknowledgePayment(
  poId: string,
  data: {
    amountReceived: number;
    paymentReference: string;
    paymentDate: string;
    paymentMethod: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'CHEQUE' | 'OTHER';
    remarks?: string;
  }
): Promise<any> {
  const res = await fetchAdminApi(`/admin/purchase-orders/${poId}/payment-receipt/acknowledge`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to acknowledge payment receipt');
  }
  return res.data;
}

export async function adminVerifyPayment(
  poId: string,
  data: {
    confirmedAmount: number;
    verificationNotes?: string;
    confirmBankCredit: boolean;
  }
): Promise<any> {
  const res = await fetchAdminApi(`/admin/purchase-orders/${poId}/payment-receipt/verify`, {
    method: 'POST',
    body: JSON.stringify({
      confirmedAmount: data.confirmedAmount,
      verificationNotes: data.verificationNotes,
      confirmBankCredit: true,
      confirmVerifiedAgainstBank: true,
    }),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to verify payment receipt');
  }
  return res.data;
}

export async function adminUpdatePurchaseOrder(
  poId: string,
  data: {
    customerPoReferenceNumber?: string;
    requestedDeliveryDate?: string | null;
    deliveryInstructions?: string | null;
    deliveryAddress?: any;
    billingAddress?: any;
    advancePercentage?: number;
    adminNotes?: string;
  }
): Promise<any> {
  const res = await fetchAdminApi(`/admin/purchase-orders/${poId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to update Purchase Order');
  }
  return res.data;
}

export async function downloadAdminPaymentReceipt(
  poId: string,
  poNumber: string,
  inline = false
): Promise<void> {
  const token = getAdminToken();
  const endpoint = inline
    ? `${API_BASE_URL}/admin/purchase-orders/${poId}/payment-receipt/view`
    : `${API_BASE_URL}/admin/purchase-orders/${poId}/payment-receipt/download`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error?.message || 'Payment receipt not available');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  if (inline) {
    window.open(url, '_blank');
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = `PaymentReceipt_${poNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export async function adminRejectReceipt(
  poId: string,
  data: {
    rejectionReason: string;
    allowReupload?: boolean;
  }
): Promise<any> {
  const res = await fetchAdminApi(`/admin/purchase-orders/${poId}/payment-receipt/reject`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to reject payment receipt');
  }
  return res.data;
}

export async function adminReopenReceipt(poId: string, reason: string): Promise<any> {
  const res = await fetchAdminApi(`/admin/purchase-orders/${poId}/payment-receipt/reopen`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

export async function adminRejectPurchaseOrder(poId: string, rejectionReason: string): Promise<any> {
  const res = await fetchAdminApi(`/admin/purchase-orders/${poId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ rejectionReason }),
  });
  return res.data;
}

export async function getAdvanceSetting(): Promise<AdvanceSetting> {
  const res = await fetchAdminApi<AdvanceSetting>('/admin/purchase-orders/settings/advance-payment');
  return res.data || { defaultPercentage: 30, minPercentage: 10, maxPercentage: 100, allowCustomPerCustomer: false };
}

export async function updateAdvanceSetting(data: Partial<AdvanceSetting>): Promise<AdvanceSetting> {
  const res = await fetchAdminApi<AdvanceSetting>('/admin/purchase-orders/settings/advance-payment', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data!;
}

export async function getBankSettings(): Promise<BankSetting[]> {
  const res = await fetchAdminApi<BankSetting[]>('/admin/purchase-orders/settings/bank-account');
  return res.data || [];
}

export async function updateBankSetting(data: Partial<BankSetting>): Promise<BankSetting> {
  const res = await fetchAdminApi<BankSetting>('/admin/purchase-orders/settings/bank-account', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data!;
}

export async function downloadAdminPoPdf(poId: string, poNumber: string): Promise<void> {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE_URL}/admin/purchase-orders/${poId}/download`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error?.message || 'Purchase Order PDF not available for download');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PRC_PurchaseOrder_${poNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function downloadAdminPackingListPdf(poId: string, poNumber: string): Promise<void> {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/packing-list`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error?.message || 'Packing list not available for download');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Commercial_PackingList_${poNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function adminDispatchPo(
  poId: string,
  data: {
    carrierName: string;
    trackingNumber?: string;
    dispatchedAt?: string;
    dispatchNotes?: string;
  }
): Promise<any> {
  const res = await fetchAdminApi(`/admin/purchase-orders/${poId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to record dispatch');
  }
  return res.data;
}

export async function adminRegenerateInvoice(poId: string): Promise<any> {
  const res = await fetchAdminApi(`/admin/purchase-orders/${poId}/invoice/regenerate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to regenerate invoice');
  }
  return res.data;
}

export async function downloadAdminInvoicePdf(poId: string, invoiceNumber: string): Promise<void> {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/invoice/download`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error?.message || 'Invoice PDF not available for download');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Commercial_TaxInvoice_${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function getAdminInvoices(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetchAdminApi<any[]>(`/admin/purchase-orders/invoices/all?${query.toString()}`);
  return {
    items: res.data || [],
    pagination: {
      page: (res as any).pagination?.page || 1,
      limit: (res as any).pagination?.limit || 20,
      total: (res as any).pagination?.totalItems || (res.data ? res.data.length : 0),
      totalPages: (res as any).pagination?.totalPages || 1,
    },
  };
}

