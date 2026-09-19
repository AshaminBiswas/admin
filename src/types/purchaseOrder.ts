/**
 * purchaseOrder.ts
 *
 * TypeScript types for the Multi Stock Purchase Order (PO) module.
 */

export type PoStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export type CompanyEntity = 'PACIFIC_PRODUCTS' | 'PRC_HARDWARE';
export type CompanyLogo = 'pacific' | 'prc';

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId?: string | null;
  itemSku: string;
  itemName: string;
  description?: string | null;
  hsnCode?: string | null;
  quantity: number;
  quantityReceived: number;
  unit: string;
  unitRate: number;
  discountPercent: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
  createdAt: string;
}

export interface PurchaseOrderEvent {
  id: string;
  purchaseOrderId: string;
  status: string;
  note?: string | null;
  performedById?: string | null;
  performedByName?: string | null;
  createdAt: string;
}

export interface PurchaseOrderDispatch {
  id: string;
  purchaseOrderId: string;
  recipientEmail: string;
  cc?: string | null;
  subject: string;
  body?: string | null;
  status: string;
  errorMessage?: string | null;
  dispatchedById?: string | null;
  dispatchedByName?: string | null;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  revision: number;
  financialYear: string;
  sequenceNo: number;
  companyEntity: CompanyEntity;
  companyLogo: CompanyLogo;
  supplierId: string;
  branchId: string;
  status: PoStatus;
  issueDate: string;
  expectedDeliveryDate?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  termsAndConditions?: string | null;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  totalInWords?: string | null;
  isInterState: boolean;
  notes?: string | null;
  sentAt?: string | null;
  sentById?: string | null;
  sentToEmail?: string | null;
  sentCc?: string | null;
  pdfUrl?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
  supplier?: {
    id: string;
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    gstNumber?: string | null;
  };
  branch?: {
    id: string;
    name: string;
    code?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    gstin?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  events?: PurchaseOrderEvent[];
  dispatches?: PurchaseOrderDispatch[];
}

export interface CreatePoItemInput {
  productId?: string | null;
  itemSku: string;
  itemName: string;
  description?: string | null;
  hsnCode?: string | null;
  quantity: number;
  unit?: string;
  unitRate: number;
  discountPercent?: number;
  gstRate?: number;
}

export interface CreatePurchaseOrderInput {
  companyEntity: CompanyEntity;
  companyLogo: CompanyLogo;
  supplierId: string;
  branchId: string;
  issueDate?: string;
  expectedDeliveryDate?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  termsAndConditions?: string | null;
  notes?: string | null;
  items: CreatePoItemInput[];
}

export interface UpdatePurchaseOrderInput {
  companyEntity?: CompanyEntity;
  companyLogo?: CompanyLogo;
  supplierId?: string;
  branchId?: string;
  issueDate?: string;
  expectedDeliveryDate?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  termsAndConditions?: string | null;
  notes?: string | null;
  items?: CreatePoItemInput[];
}

export interface SendPoEmailInput {
  recipientEmail?: string;
  cc?: string;
  subject?: string;
  customMessage?: string;
}

export interface ReceivePoGoodsInput {
  items: Array<{
    itemId: string;
    quantityReceivedNow: number;
  }>;
  notes?: string;
  invoiceNumber?: string;
}

export interface PurchaseOrderMetrics {
  total: number;
  draft: number;
  sent: number;
  acknowledged: number;
  partiallyReceived: number;
  received: number;
  cancelled: number;
}
