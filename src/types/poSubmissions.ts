export type PoSourceType = 'FORM' | 'PDF_UPLOAD';

export type PoSubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'APPROVED'
  | 'ACKNOWLEDGED'
  | 'FULFILLMENT';

export type LineItemSource = 'CUSTOMER_ENTERED' | 'ADMIN_MAPPED';

export type PoSubmissionAction =
  | 'SUBMITTED'
  | 'VIEWED'
  | 'UNDER_REVIEW'
  | 'MAPPED_LINE_ITEM'
  | 'CHANGES_REQUESTED'
  | 'CUSTOMER_RESUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'INTERNAL_NOTE';

export interface PoAddress {
  attentionTo: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email?: string;
}

export interface PoSubmissionLineItem {
  id: string;
  submissionId: string;
  slNo: number;
  productId?: string | null;
  variantId?: string | null;
  description: string;
  sku?: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number | null;
  taxAmount?: number | null;
  lineTotal: number;
  source: LineItemSource;
  sortOrder: number;
  createdAt: string;
}

export interface PoSubmissionAttachment {
  id: string;
  submissionId: string;
  fileStorageKey: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  checksum?: string | null;
  uploadedBy: string;
  uploadedAt: string;
}

export interface PoSubmissionLog {
  id: string;
  submissionId: string;
  actorId?: string | null;
  action: PoSubmissionAction;
  fromStatus?: PoSubmissionStatus | null;
  toStatus?: PoSubmissionStatus | null;
  comment?: string | null;
  isInternal: boolean;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  timestamp: string;
  actor?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  } | null;
}

export interface PoAcknowledgement {
  id: string;
  submissionId: string;
  ackNumber: string;
  fileStorageKey: string;
  issuedBy: string;
  issuedByName?: string | null;
  issuedAt: string;
}

export interface AdminPoSubmission {
  id: string;
  submissionNumber: string;
  customerId: string;
  sourceType: PoSourceType;
  status: PoSubmissionStatus;
  customerPoNumber: string;
  customerPoDate?: string | null;
  statedTotal?: number | null;
  mappedTotal?: number | null;
  currency: string;
  expectedDeliveryDate?: string | null;
  reviewedBy?: string | null;
  assignedTo?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  changeRequestReason?: string | null;
  paymentTerms?: string | null;
  customerNote?: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  hasPendingMapping?: boolean;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    phone?: string;
    gstin?: string;
  };
  assignee?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  reviewer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  approver?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  attachments?: Array<{
    id: string;
    originalFileName: string;
    fileSizeBytes: number;
  }>;
  acknowledgement?: {
    id: string;
    ackNumber: string;
    issuedAt: string;
  } | null;
  b2bPurchaseOrderId?: string | null;
  b2bPurchaseOrder?: {
    id: string;
    poNumber: string;
    status: string;
    advanceAmount?: number;
    balanceAmount?: number;
    receipts?: any[];
    packingList?: any;
    dispatch?: any;
    invoice?: any;
  } | null;
  lineItems?: Array<{
    id: string;
    productId?: string | null;
  }>;
}

export interface AdminPoSubmissionDetail extends AdminPoSubmission {
  billToAddress?: PoAddress | null;
  shipToAddress?: PoAddress | null;
  lineItems: PoSubmissionLineItem[];
  attachments: PoSubmissionAttachment[];
  logs: PoSubmissionLog[];
  acknowledgement?: PoAcknowledgement | null;
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

export interface PoTrackingStage {
  stage: number;
  code: string;
  title: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'ACTION_REQUIRED' | 'REJECTED';
  timestamp?: string;
  actor?: string;
  metadata?: Record<string, any>;
  artifacts?: {
    type: 'ORIGINAL_PDF' | 'ACKNOWLEDGEMENT_PDF' | 'PAYMENT_RECEIPT' | 'PACKING_LIST_PDF' | 'EWAY_BILL' | 'INVOICE_PDF';
    label: string;
    downloadUrl?: string;
    reference?: string;
  }[];
}

export interface PoTrackingData {
  submissionId: string;
  submissionNumber: string;
  customerPoNumber: string;
  sourceType: PoSourceType;
  currentStage: number;
  overallStatus: PoSubmissionStatus;
  b2bPurchaseOrderId?: string;
  masterPoNumber?: string;
  commercials: {
    statedTotal?: number;
    mappedTotal?: number;
    grandTotal: number;
    advancePercentage: number;
    advanceAmount: number;
    balanceAmount: number;
    currency: string;
  };
  stages: PoTrackingStage[];
}
