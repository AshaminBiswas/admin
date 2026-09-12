export type GovernmentIdType = 'AADHAAR' | 'PAN' | 'VOTER_ID';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
export type AttendanceStatus = 'PRESENT' | 'CL' | 'EL' | 'UL' | 'HALF_DAY' | 'LEAVE';
export type PayrollStatus = 'DRAFT' | 'FINALIZED' | 'PAID';
export type LeaveType = 'CL' | 'EL';
export type LeaveTransactionType = 'ACCRUAL' | 'USAGE' | 'ADJUSTMENT';

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  governmentIdType: GovernmentIdType;
  governmentIdNumber: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankAccountHolder: string;
  designation: string;
  department: string;
  responsibilities?: string | null;
  monthlyCtc: number | string;
  joiningDate: string;
  status: EmployeeStatus;
  clBalance: number | string;
  elBalance: number | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeAttendance {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  isSunday: boolean;
  isSundayOverride: boolean;
  overtimeHours: number | string;
  notes?: string | null;
  markedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    designation: string;
  };
}

export interface EmployeeLeaveLedger {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  transactionType: LeaveTransactionType;
  amount: number | string;
  balanceAfter: number | string;
  month: number;
  year: number;
  reason?: string | null;
  recordedById?: string | null;
  createdAt?: string;
}

export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  amount: number | string;
  reason: string;
  advanceDate?: string;
  recoveryMonth: number;
  recoveryYear: number;
  isRecovered: boolean;
  recoveredAt?: string | null;
  payrollRunId?: string | null;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department?: string;
  };
}

export interface EmployeeDeduction {
  id: string;
  employeeId: string;
  amount: number | string;
  reason: string;
  applyMonth: number;
  applyYear: number;
  isApplied: boolean;
  appliedAt?: string | null;
  payrollRunId?: string | null;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department?: string;
  };
}

export interface EmployeePayrollRun {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  monthlyCtc: number | string;
  totalCalendarDays: number;
  sundaysCount: number;
  approvedSundays: number;
  payableDays: number | string;
  perDayRate: number | string;
  presentDays: number | string;
  clDays: number | string;
  elDays: number | string;
  halfDays: number | string;
  unpaidDays: number | string;
  paidDays: number | string;
  overtimeHours: number | string;
  overtimeRate: number | string;
  overtimePay: number | string;
  grossSalary: number | string;
  advanceDeduction: number | string;
  otherDeductions: number | string;
  deductionSummary?: any;
  netSalary: number | string;
  status: PayrollStatus;
  paidAt?: string | null;
  paymentMode?: string | null;
  paymentReference?: string | null;
  paymentNotes?: string | null;
  emailSent: boolean;
  emailSentAt?: string | null;
  emailStatus?: string | null;
  emailError?: string | null;
  createdById?: string | null;
  finalizedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: Employee;
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  phone: string;
  address: string;
  governmentIdType: GovernmentIdType;
  governmentIdNumber: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankAccountHolder: string;
  designation: string;
  department: string;
  responsibilities?: string;
  monthlyCtc: number;
  joiningDate: string;
  status?: EmployeeStatus;
}

export interface UpdateEmployeePayload extends Partial<CreateEmployeePayload> {}

export interface RecordAttendancePayload {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  isSundayOverride?: boolean;
  overtimeHours?: number;
  notes?: string;
}

export interface BatchAttendancePayload {
  date: string;
  records: {
    employeeId: string;
    status: AttendanceStatus;
    isSundayOverride?: boolean;
    overtimeHours?: number;
    notes?: string;
  }[];
}

export interface CreateAdvancePayload {
  employeeId: string;
  amount: number;
  reason: string;
  advanceDate?: string;
  recoveryMonth: number;
  recoveryYear: number;
}

export interface UpdateAdvancePayload extends Partial<CreateAdvancePayload> {
  isRecovered?: boolean;
}

export interface CreateDeductionPayload {
  employeeId: string;
  amount: number;
  reason: string;
  applyMonth: number;
  applyYear: number;
}

export interface UpdateDeductionPayload extends Partial<CreateDeductionPayload> {
  isApplied?: boolean;
}

export interface CalculatePayrollPayload {
  month: number;
  year: number;
  employeeId?: string;
  previewOnly?: boolean;
}

export interface MarkPayrollPaidPayload {
  paymentMode: string;
  paymentReference?: string;
  paymentNotes?: string;
  paidAt?: string;
}

export interface ListEmployeesResponse {
  items: Employee[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListAttendanceResponse {
  month: number;
  year: number;
  totalDays: number;
  records: EmployeeAttendance[];
}
