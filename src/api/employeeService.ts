import { fetchAdminApi, API_BASE_URL, getAdminToken } from './adminApi';
import type {
  Employee,
  EmployeeAttendance,
  EmployeeLeaveLedger,
  EmployeeAdvance,
  EmployeeDeduction,
  EmployeePayrollRun,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  RecordAttendancePayload,
  BatchAttendancePayload,
  CreateAdvancePayload,
  UpdateAdvancePayload,
  CreateDeductionPayload,
  UpdateDeductionPayload,
  CalculatePayrollPayload,
  MarkPayrollPaidPayload,
  ListEmployeesResponse,
  ListAttendanceResponse,
} from '../types/employee';

function assertSuccess<T>(res: any, defaultMessage = 'Request failed'): T {
  if (!res || res.success === false) {
    const errorMsg = res?.error?.message || res?.message || defaultMessage;
    throw new Error(errorMsg);
  }
  return (res.data !== undefined ? res.data : res) as T;
}

export const employeeService = {
  // ─── Master Data ────────────────────────────────────────────────────────────
  async listEmployees(params: {
    search?: string;
    department?: string;
    designation?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ListEmployeesResponse> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.department) query.append('department', params.department);
    if (params.designation) query.append('designation', params.designation);
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const qStr = query.toString();
    const res = await fetchAdminApi<any>(`/employees${qStr ? `?${qStr}` : ''}`);
    if (res && res.success === false) {
      throw new Error(res.error?.message || res.message || 'Failed to load employees');
    }
    const data = res?.data || res;
    return {
      items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
      pagination: data?.pagination || { total: data?.items?.length || 0, page: 1, limit: 100, totalPages: 1 },
    };
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    const res = await fetchAdminApi<any>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return assertSuccess<Employee>(res, 'Failed to create employee');
  },

  async getEmployee(id: string): Promise<Employee> {
    const res = await fetchAdminApi<any>(`/employees/detail/${encodeURIComponent(id)}`);
    return assertSuccess<Employee>(res, 'Failed to load employee details');
  },

  async updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    const res = await fetchAdminApi<any>(`/employees/detail/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return assertSuccess<Employee>(res, 'Failed to update employee');
  },

  async deactivateEmployee(id: string): Promise<Employee> {
    const res = await fetchAdminApi<any>(`/employees/detail/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return assertSuccess<Employee>(res, 'Failed to deactivate employee');
  },

  // ─── Attendance ─────────────────────────────────────────────────────────────
  async listAttendance(params: { month: number; year: number; employeeId?: string }): Promise<ListAttendanceResponse> {
    const query = new URLSearchParams();
    query.append('month', params.month.toString());
    query.append('year', params.year.toString());
    if (params.employeeId) query.append('employeeId', params.employeeId);

    const res = await fetchAdminApi<any>(`/employees/attendance?${query.toString()}`);
    if (res && res.success === false) {
      throw new Error(res.error?.message || res.message || 'Failed to load attendance records');
    }
    return res?.data || res || { month: params.month, year: params.year, totalDays: 30, records: [] };
  },

  async recordAttendance(payload: RecordAttendancePayload): Promise<EmployeeAttendance> {
    const res = await fetchAdminApi<any>('/employees/attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return assertSuccess<EmployeeAttendance>(res, 'Failed to record attendance');
  },

  async batchRecordAttendance(payload: BatchAttendancePayload): Promise<{ updatedCount: number; records: EmployeeAttendance[] }> {
    const res = await fetchAdminApi<any>('/employees/attendance/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return assertSuccess<{ updatedCount: number; records: EmployeeAttendance[] }>(res, 'Failed to batch record attendance');
  },

  async deleteAttendance(params: { employeeId: string; date: string }): Promise<any> {
    const query = new URLSearchParams();
    query.append('employeeId', params.employeeId);
    query.append('date', params.date);
    const res = await fetchAdminApi<any>(`/employees/attendance?${query.toString()}`, {
      method: 'DELETE',
    });
    return assertSuccess<any>(res, 'Failed to delete attendance record');
  },

  // ─── Leave Ledger ───────────────────────────────────────────────────────────
  async accrueMonthlyLeave(payload: { month: number; year: number }): Promise<any> {
    const res = await fetchAdminApi<any>('/employees/leave/accrue-monthly', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async getLeaveLedger(employeeId: string): Promise<{ employee: Employee; history: EmployeeLeaveLedger[] }> {
    const res = await fetchAdminApi<any>(`/employees/${encodeURIComponent(employeeId)}/leave-ledger`);
    return res?.data || res;
  },

  async adjustLeave(
    employeeId: string,
    payload: { leaveType: string; transactionType: string; amount: number; month: number; year: number; reason: string }
  ): Promise<any> {
    const res = await fetchAdminApi<any>(`/employees/${encodeURIComponent(employeeId)}/leave-ledger`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  // ─── Advances ───────────────────────────────────────────────────────────────
  async listAdvances(params: {
    employeeId?: string;
    recoveryMonth?: number;
    recoveryYear?: number;
    isRecovered?: boolean;
  } = {}): Promise<EmployeeAdvance[]> {
    const query = new URLSearchParams();
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.recoveryMonth) query.append('recoveryMonth', params.recoveryMonth.toString());
    if (params.recoveryYear) query.append('recoveryYear', params.recoveryYear.toString());
    if (params.isRecovered !== undefined) query.append('isRecovered', params.isRecovered ? 'true' : 'false');

    const qStr = query.toString();
    const res = await fetchAdminApi<any>(`/employees/advances${qStr ? `?${qStr}` : ''}`);
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  async createAdvance(payload: CreateAdvancePayload): Promise<EmployeeAdvance> {
    const res = await fetchAdminApi<any>('/employees/advances', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return assertSuccess<EmployeeAdvance>(res, 'Failed to record advance');
  },

  async updateAdvance(id: string, payload: UpdateAdvancePayload): Promise<EmployeeAdvance> {
    const res = await fetchAdminApi<any>(`/employees/advances/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return assertSuccess<EmployeeAdvance>(res, 'Failed to update advance');
  },

  async deleteAdvance(id: string): Promise<any> {
    const res = await fetchAdminApi<any>(`/employees/advances/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return assertSuccess<any>(res, 'Failed to delete advance');
  },

  // ─── Deductions ─────────────────────────────────────────────────────────────
  async listDeductions(params: {
    employeeId?: string;
    applyMonth?: number;
    applyYear?: number;
    isApplied?: boolean;
  } = {}): Promise<EmployeeDeduction[]> {
    const query = new URLSearchParams();
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.applyMonth) query.append('applyMonth', params.applyMonth.toString());
    if (params.applyYear) query.append('applyYear', params.applyYear.toString());
    if (params.isApplied !== undefined) query.append('isApplied', params.isApplied ? 'true' : 'false');

    const qStr = query.toString();
    const res = await fetchAdminApi<any>(`/employees/deductions${qStr ? `?${qStr}` : ''}`);
    if (res && res.success === false) {
      throw new Error(res.error?.message || res.message || 'Failed to load deductions');
    }
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  async createDeduction(payload: CreateDeductionPayload): Promise<EmployeeDeduction> {
    const res = await fetchAdminApi<any>('/employees/deductions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return assertSuccess<EmployeeDeduction>(res, 'Failed to record deduction');
  },

  async updateDeduction(id: string, payload: UpdateDeductionPayload): Promise<EmployeeDeduction> {
    const res = await fetchAdminApi<any>(`/employees/deductions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return assertSuccess<EmployeeDeduction>(res, 'Failed to update deduction');
  },

  async deleteDeduction(id: string): Promise<any> {
    const res = await fetchAdminApi<any>(`/employees/deductions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return assertSuccess<any>(res, 'Failed to delete deduction');
  },

  // ─── Payroll Engine ─────────────────────────────────────────────────────────
  async calculatePayroll(payload: CalculatePayrollPayload): Promise<EmployeePayrollRun[]> {
    const res = await fetchAdminApi<any>('/employees/payroll/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && res.success === false) {
      throw new Error(res.error?.message || res.message || 'Failed to calculate payroll');
    }
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  async listPayroll(params: { month: number; year: number; employeeId?: string; status?: string }): Promise<EmployeePayrollRun[]> {
    const query = new URLSearchParams();
    query.append('month', params.month.toString());
    query.append('year', params.year.toString());
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.status) query.append('status', params.status);

    const res = await fetchAdminApi<any>(`/employees/payroll?${query.toString()}`);
    if (res && res.success === false) {
      throw new Error(res.error?.message || res.message || 'Failed to load payroll records');
    }
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  async finalizePayroll(id: string): Promise<EmployeePayrollRun> {
    const res = await fetchAdminApi<any>(`/employees/payroll/${encodeURIComponent(id)}/finalize`, {
      method: 'POST',
    });
    return assertSuccess<EmployeePayrollRun>(res, 'Failed to finalize payroll');
  },

  async revertPayrollToDraft(id: string): Promise<EmployeePayrollRun> {
    const res = await fetchAdminApi<any>(`/employees/payroll/${encodeURIComponent(id)}/revert-draft`, {
      method: 'POST',
    });
    return assertSuccess<EmployeePayrollRun>(res, 'Failed to revert payroll to draft');
  },

  async markPayrollPaid(id: string, payload: MarkPayrollPaidPayload): Promise<EmployeePayrollRun> {
    const res = await fetchAdminApi<any>(`/employees/payroll/${encodeURIComponent(id)}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return assertSuccess<EmployeePayrollRun>(res, 'Failed to mark payroll as paid');
  },

  async downloadPayslipPdf(id: string, filename?: string): Promise<void> {
    const token = getAdminToken() || localStorage.getItem('token') || '';
    const response = await fetch(`${API_BASE_URL}/employees/payroll/${encodeURIComponent(id)}/pdf`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download payslip (HTTP ${response.status})`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Payslip-${id.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async resendPayslipEmail(id: string, recipientEmail?: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetchAdminApi<any>(`/employees/payroll/${encodeURIComponent(id)}/resend-email`, {
      method: 'POST',
      body: JSON.stringify(recipientEmail ? { recipientEmail } : {}),
    });
    if (res && res.success === false) {
      throw new Error(res.message || 'Failed to dispatch payslip email');
    }
    return res?.data || res;
  },
};
