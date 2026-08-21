export interface PoSubmissionLineItem {
  id?: string;
  productId?: string | null;
  variantId?: string | null;
  description: string;
  sku?: string | null;
  unit?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number | null;
  amount?: number;
  product?: {
    id: string;
    name: string;
    sku?: string;
    price?: number;
  } | null;
}

export interface AdminQueueMetrics {
  ALL: number;
  SUBMITTED: number;
  UNDER_REVIEW: number;
  CHANGES_REQUESTED: number;
  APPROVED: number;
  ACKNOWLEDGED: number;
  REJECTED: number;
  FULFILLMENT: number;
}

export interface AdminPoSubmission {
  id: string;
  submissionNumber: string;
  poNumber: string;
  poDate: string;
  sourceType: 'DIRECT' | 'QUOTATION';
  quotationId?: string | null;
  quotationReference?: string | null;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'ACKNOWLEDGED' | 'REJECTED' | 'FULFILLMENT';
  customerName: string;
  companyName: string;
  email: string;
  phone: string;
  gstin?: string | null;
  totalAmount: number;
  advancePercentage?: number | null;
  assignedTo?: { id: string; name?: string; email: string } | null;
  assignedToId?: string | null;
  lineItemsCount?: number;
  attachmentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPoSubmissionDetail extends AdminPoSubmission {
  notes?: string | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  changeRequestReason?: string | null;
  billingAddress?: any;
  shippingAddress?: any;
  lineItems: PoSubmissionLineItem[];
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSizeBytes?: number;
    mimeType?: string;
    createdAt: string;
  }>;
  activityLogs?: Array<{
    id: string;
    action: string;
    note?: string | null;
    createdAt: string;
    adminUser?: { id: string; name?: string; email: string } | null;
  }>;
  acknowledgement?: {
    id: string;
    ackNumber: string;
    pdfUrl?: string;
    issuedAt: string;
  } | null;
}

export interface PoTrackingData {
  id: string;
  submissionNumber: string;
  status: string;
  stages: Array<{
    name: string;
    completed: boolean;
    timestamp?: string | null;
    note?: string | null;
  }>;
}
