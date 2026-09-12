export interface CubicleModel {
  id: string;
  modelName: string;
  installationPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    billItems: number;
  };
}

export interface InstallerBillItem {
  id: string;
  billId: string;
  modelId: string;
  modelName: string;
  quantity: number;
  installationPrice: number;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
  model?: CubicleModel;
}

export interface InstallerBillPayment {
  id: string;
  billId: string;
  amount: number;
  paymentDate: string;
  paymentMode?: string | null;
  referenceNote?: string | null;
  recordedById?: string | null;
  createdAt: string;
}

export type InstallerPaymentStatus = 'PARTIAL' | 'CLEARED';

export interface CubicleInstaller {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    bills: number;
  };
}

export interface CreateCubicleInstallerPayload {
  name: string;
  email: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateCubicleInstallerPayload {
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export interface InstallerBill {
  id: string;
  billNo: string;
  installerId?: string | null;
  installerName: string;
  installerEmail: string;
  installDate: string;
  isNcr: boolean;
  travelExpenses: number;
  siteAddress: string;
  sitePin: string;
  subtotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: InstallerPaymentStatus;
  paymentDate?: string | null;
  notes?: string | null;
  emailSent: boolean;
  emailSentAt?: string | null;
  emailStatus?: string | null;
  emailError?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  installer?: CubicleInstaller | null;
  items: InstallerBillItem[];
  payments?: InstallerBillPayment[];
  createdBy?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  } | null;
}

export interface InstallerPaymentKpis {
  totalBills: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  clearedCount: number;
  partialCount: number;
}

export interface ListInstallerBillsResponse {
  bills: InstallerBill[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  kpis: InstallerPaymentKpis;
}

export interface CreateInstallerBillPayload {
  installerId?: string;
  installerName: string;
  installerEmail: string;
  installDate: string;
  isNcr: boolean;
  travelExpenses: number;
  siteAddress: string;
  sitePin: string;
  items: Array<{
    modelId: string;
    quantity: number;
  }>;
  initialAmountPaid?: number;
  paymentDate?: string;
  paymentMode?: string;
  notes: string;
  sendEmailToInstaller?: boolean;
}

export interface UpdateInstallerBillPayload {
  installerName?: string;
  installerEmail?: string;
  installDate?: string;
  isNcr?: boolean;
  travelExpenses?: number;
  siteAddress?: string;
  sitePin?: string;
  notes?: string;
}

export interface RecordPaymentPayload {
  amount: number;
  paymentDate: string;
  paymentMode?: string;
  referenceNote?: string;
}

export interface CreateCubicleModelPayload {
  modelName: string;
  installationPrice: number;
  isActive?: boolean;
}

export interface UpdateCubicleModelPayload {
  modelName?: string;
  installationPrice?: number;
  isActive?: boolean;
}

export interface InstallerBillsFilter {
  search?: string;
  status?: 'ALL' | 'PARTIAL' | 'CLEARED';
  isNcr?: 'all' | 'true' | 'false';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface InstallerExportFilter {
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
  status?: 'ALL' | 'PARTIAL' | 'CLEARED';
}
