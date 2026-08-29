export type PoClassification = 'PO_DETECTED' | 'POSSIBLE_PO' | 'GENERAL_EMAIL';
export type PoSource = 'EMAIL' | 'QUOTATION' | 'PO_FORM' | 'CUSTOM_PDF_UPLOAD';
export type PoStatus = 'NEW' | 'UNDER_REVIEW' | 'PROCESSING' | 'WAITING_FOR_CUSTOMER' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
export type PoPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type EmailDirection = 'INCOMING' | 'OUTGOING';

export interface PoEmailAttachmentItem {
  id: string;
  poSubmissionId?: string | null;
  emailMessageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  storageUrl: string;
  extractedText?: string | null;
  createdAt: string;
}

export interface PoEmailMessageItem {
  id: string;
  poSubmissionId?: string | null;
  messageId: string;
  providerEmailId?: string | null;
  threadId?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  direction: EmailDirection;
  senderName?: string | null;
  senderEmail: string;
  recipientEmail: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  plainTextBody?: string | null;
  htmlBody?: string | null;
  rawHeaders?: Record<string, any> | null;
  receivedAt: string;
  createdAt: string;
  attachments?: PoEmailAttachmentItem[];
}

export interface PoInternalNoteItem {
  id: string;
  poSubmissionId: string;
  userId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string | null;
  } | null;
}

export interface PoActivityLogItem {
  id: string;
  poSubmissionId: string;
  activityType: string;
  title: string;
  description: string;
  previousValue?: string | null;
  newValue?: string | null;
  performedByUserId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  performedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface PoSubmissionItem {
  id: string;
  poSubmissionId?: string | null;
  source: PoSource;
  classification: PoClassification;
  confidenceScore: number;
  customerPoNumber?: string | null;
  customerName?: string | null;
  companyName?: string | null;
  customerEmail: string;
  customerPhone?: string | null;
  subject: string;
  previewText?: string | null;
  status: PoStatus;
  priority: PoPriority;
  assignedUserId?: string | null;
  assignedDepartment?: string | null;
  receivedAt: string;
  lastActivityAt: string;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string | null;
  } | null;
  _count?: {
    emails: number;
    attachments: number;
    internalNotes: number;
  };
}

export interface PoSubmissionDetail extends PoSubmissionItem {
  emails: PoEmailMessageItem[];
  attachments: PoEmailAttachmentItem[];
  internalNotes: PoInternalNoteItem[];
  activityLogs: PoActivityLogItem[];
}

export interface PoManagementMetrics {
  totalReceived: number;
  poDetectedCount: number;
  possiblePoCount: number;
  generalEmailCount: number;
  newCount: number;
  inReviewCount: number;
  processingCount: number;
  completedCount: number;
  urgentCount: number;
}

export interface GetPoSubmissionsResponse {
  items: PoSubmissionItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  metrics: PoManagementMetrics;
}
