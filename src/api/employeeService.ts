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
    return res?.data || res || { items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 } };
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    const res = await fetchAdminApi<any>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async getEmployee(id: string): Promise<Employee> {
    const res = await fetchAdminApi<any>(`/employees/detail/${encodeURIComponent(id)}`);
    return res?.data || res;
  },

  async updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    const res = await fetchAdminApi<any>(`/employees/detail/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async deactivateEmployee(id: string): Promise<Employee> {
    const res = await fetchAdminApi<any>(`/employees/detail/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res?.data || res;
  },

  // ─── Attendance ─────────────────────────────────────────────────────────────
  async listAttendance(params: { month: number; year: number; employeeId?: string }): Promise<ListAttendanceResponse> {
    const query = new URLSearchParams();
    query.append('month', params.month.toString());
    query.append('year', params.year.toString());
    if (params.employeeId) query.append('employeeId', params.employeeId);

    const res = await fetchAdminApi<any>(`/employees/attendance?${query.toString()}`);
    return res?.data || res || { month: params.month, year: params.year, totalDays: 30, records: [] };
  },

  async recordAttendance(payload: RecordAttendancePayload): Promise<EmployeeAttendance> {
    const res = await fetchAdminApi<any>('/employees/attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async batchRecordAttendance(payload: BatchAttendancePayload): Promise<{ updatedCount: number; records: EmployeeAttendance[] }> {
    const res = await fetchAdminApi<any>('/employees/attendance/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async deleteAttendance(params: { employeeId: string; date: string }): Promise<any> {
    const query = new URLSearchParams();
    query.append('employeeId', params.employeeId);
    query.append('date', params.date);
    const res = await fetchAdminApi<any>(`/employees/attendance?${query.toString()}`, {
      method: 'DELETE',
    });
    return res?.data || res;
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
    return res?.data || res;
  },

  async updateAdvance(id: string, payload: UpdateAdvancePayload): Promise<EmployeeAdvance> {
    const res = await fetchAdminApi<any>(`/employees/advances/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async deleteAdvance(id: string): Promise<any> {
    const res = await fetchAdminApi<any>(`/employees/advances/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res?.data || res;
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
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  async createDeduction(payload: CreateDeductionPayload): Promise<EmployeeDeduction> {
    const res = await fetchAdminApi<any>('/employees/deductions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async updateDeduction(id: string, payload: UpdateDeductionPayload): Promise<EmployeeDeduction> {
    const res = await fetchAdminApi<any>(`/employees/deductions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  async deleteDeduction(id: string): Promise<any> {
    const res = await fetchAdminApi<any>(`/employees/deductions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res?.data || res;
  },

  // ─── Payroll Engine ─────────────────────────────────────────────────────────
  async calculatePayroll(payload: CalculatePayrollPayload): Promise<EmployeePayrollRun[]> {
    const res = await fetchAdminApi<any>('/employees/payroll/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  async listPayroll(params: { month: number; year: number; employeeId?: string; status?: string }): Promise<EmployeePayrollRun[]> {
    const query = new URLSearchParams();
    query.append('month', params.month.toString());
    query.append('year', params.year.toString());
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.status) query.append('status', params.status);

    const res = await fetchAdminApi<any>(`/employees/payroll?${query.toString()}`);
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  async finalizePayroll(id: string): Promise<EmployeePayrollRun> {
    const res = await fetchAdminApi<any>(`/employees/payroll/${encodeURIComponent(id)}/finalize`, {
      method: 'POST',
    });
    return res?.data || res;
  },

  async revertPayrollToDraft(id: string): Promise<EmployeePayrollRun> {
    const res = await fetchAdminApi<any>(`/employees/payroll/${encodeURIComponent(id)}/revert-draft`, {
      method: 'POST',
    });
    return res?.data || res;
  },

  async markPayrollPaid(id: string, payload: MarkPayrollPaidPayload): Promise<EmployeePayrollRun> {
    const res = await fetchAdminApi<any>(`/employees/payroll/${encodeURIComponent(id)}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
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
