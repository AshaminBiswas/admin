import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Mail,
  Edit2,
  Trash2,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  CreditCard,
  Building2,
  Award,
  ArrowDownRight,
  ArrowUpRight,
  X,
  Check,
  Percent,
  RotateCcw,
} from 'lucide-react';
import { employeeService } from '../api/employeeService';
import { useAdminAuth } from '../context/AdminAuthContext';
import type {
  Employee,
  EmployeeAttendance,
  EmployeeLeaveLedger,
  EmployeeAdvance,
  EmployeeDeduction,
  EmployeePayrollRun,
  AttendanceStatus,
  GovernmentIdType,
  EmployeeStatus,
  UpdateAdvancePayload,
  UpdateDeductionPayload,
} from '../types/employee';

// ─── Constants & Helpers ──────────────────────────────────────────────────────
const DEPARTMENTS = [
  'All Departments',
  'Operations',
  'Installation & Site Execution',
  'Sales & Business Development',
  'Procurement & Inventory',
  'Finance & Accounts',
  'Administration & HR',
  'Engineering & QA',
];

const COMMON_DESIGNATIONS = [
  'Workers',
  'Hardware Technician',
  'Cubicle Installer',
  'Site Supervisor',
  'Operations Executive',
  'Senior Hardware Engineer',
  'Sales & Business Development',
  'Finance & Accounts',
  'Administration & HR',
  'Fabricator / Carpenter',
  'Helper / Support Staff',
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  PRESENT: { label: 'Present', color: '#10B981', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  CL: { label: 'CL (Casual)', color: '#3B82F6', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  EL: { label: 'EL (Earned)', color: '#8B5CF6', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  HALF_DAY: { label: 'Half Day', color: '#F59E0B', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  UL: { label: 'UL (Unpaid)', color: '#EF4444', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  LEAVE: { label: 'Leave', color: '#DC2626', bg: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function formatINR(val: number | string | null | undefined): string {
  const n = Number(val || 0);
  return `\u20B9${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function EmployeeManagementPage() {
  const { adminUser } = useAdminAuth();
  const isSuperAdmin = adminUser?.role === 'super_admin';

  // ─── Active Top Tab ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance' | 'leaves' | 'advances' | 'payroll'>('directory');

  // Common Date Selector State (defaults to current month/year)
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  // ─── Data States ────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedDesignation, setSelectedDesignation] = useState('All Designations');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<EmployeeAttendance[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [selectedAttendanceDay, setSelectedAttendanceDay] = useState<number>(today.getDate());

  // Leave Ledger State
  const [selectedEmployeeForLeave, setSelectedEmployeeForLeave] = useState<string>('');
  const [leaveHistory, setLeaveHistory] = useState<EmployeeLeaveLedger[]>([]);
  const [isLoadingLeaveHistory, setIsLoadingLeaveHistory] = useState(false);

  // Advances & Deductions State
  const [advancesSubTab, setAdvancesSubTab] = useState<'advances' | 'deductions'>('advances');
  const [advancesList, setAdvancesList] = useState<EmployeeAdvance[]>([]);
  const [deductionsList, setDeductionsList] = useState<EmployeeDeduction[]>([]);
  const [isLoadingAdvances, setIsLoadingAdvances] = useState(false);

  // Payroll Runs State
  const [payrollRuns, setPayrollRuns] = useState<EmployeePayrollRun[]>([]);
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);
  const [isCalculatingPayroll, setIsCalculatingPayroll] = useState(false);

  // Modals State
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [modalDesignation, setModalDesignation] = useState<string>('Workers');
  const [customDesignation, setCustomDesignation] = useState<string>('');
  const [isLeaveAdjustModalOpen, setIsLeaveAdjustModalOpen] = useState(false);
  const [isAddAdvanceModalOpen, setIsAddAdvanceModalOpen] = useState(false);
  const [isAddDeductionModalOpen, setIsAddDeductionModalOpen] = useState(false);
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [selectedPayrollForPaid, setSelectedPayrollForPaid] = useState<EmployeePayrollRun | null>(null);

  // Edit Modals State
  const [editingAttendance, setEditingAttendance] = useState<{
    employee: Employee;
    record?: EmployeeAttendance;
    day: number;
    dateStr: string;
  } | null>(null);
  const [editingAdvance, setEditingAdvance] = useState<EmployeeAdvance | null>(null);
  const [editingDeduction, setEditingDeduction] = useState<EmployeeDeduction | null>(null);

  // Leave Adjustment Form State
  const [leaveAdjustEmpId, setLeaveAdjustEmpId] = useState<string>('');
  const [leaveAdjustType, setLeaveAdjustType] = useState<'CL' | 'EL'>('CL');
  const [leaveAdjustAction, setLeaveAdjustAction] = useState<'USAGE' | 'ACCRUAL' | 'ADJUSTMENT'>('USAGE');
  const [leaveAdjustAmount, setLeaveAdjustAmount] = useState<string>('1');
  const [leaveAdjustReason, setLeaveAdjustReason] = useState<string>('');

  // Toast / Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Sync modal designation when adding or editing an employee
  useEffect(() => {
    if (editingEmployee) {
      if (COMMON_DESIGNATIONS.includes(editingEmployee.designation)) {
        setModalDesignation(editingEmployee.designation);
        setCustomDesignation('');
      } else {
        setModalDesignation('OTHER');
        setCustomDesignation(editingEmployee.designation);
      }
    } else {
      setModalDesignation('Workers');
      setCustomDesignation('');
    }
  }, [editingEmployee, isAddEmployeeModalOpen]);

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await employeeService.listEmployees({
        search: searchQuery || undefined,
        department: selectedDepartment !== 'All Departments' ? selectedDepartment : undefined,
        designation: selectedDesignation !== 'All Designations' ? selectedDesignation : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: 100,
      });
      setEmployees(res.items);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to load employees');
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [searchQuery, selectedDepartment, selectedDesignation, statusFilter]);

  const fetchAttendance = useCallback(async () => {
    setIsLoadingAttendance(true);
    try {
      const res = await employeeService.listAttendance({
        month: selectedMonth,
        year: selectedYear,
      });
      setAttendanceRecords(res.records);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to load attendance records');
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchAdvancesAndDeductions = useCallback(async () => {
    setIsLoadingAdvances(true);
    try {
      const [advRes, dedRes] = await Promise.all([
        employeeService.listAdvances({ recoveryMonth: selectedMonth, recoveryYear: selectedYear }),
        employeeService.listDeductions({ applyMonth: selectedMonth, applyYear: selectedYear }),
      ]);
      setAdvancesList(advRes);
      setDeductionsList(dedRes);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to load financial records');
    } finally {
      setIsLoadingAdvances(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchPayroll = useCallback(async () => {
    setIsLoadingPayroll(true);
    try {
      const res = await employeeService.listPayroll({
        month: selectedMonth,
        year: selectedYear,
      });
      setPayrollRuns(res);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to load payroll runs');
    } finally {
      setIsLoadingPayroll(false);
    }
  }, [selectedMonth, selectedYear]);

  // Initial loads
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (activeTab === 'attendance') fetchAttendance();
    if (activeTab === 'advances') fetchAdvancesAndDeductions();
    if (activeTab === 'payroll') fetchPayroll();
  }, [activeTab, fetchAttendance, fetchAdvancesAndDeductions, fetchPayroll]);

  // When selected employee for leave ledger changes
  useEffect(() => {
    if (selectedEmployeeForLeave) {
      setIsLoadingLeaveHistory(true);
      employeeService
        .getLeaveLedger(selectedEmployeeForLeave)
        .then((res) => setLeaveHistory(res.history))
        .catch(() => showFeedback('error', 'Failed to load leave history'))
        .finally(() => setIsLoadingLeaveHistory(false));
    }
  }, [selectedEmployeeForLeave]);

  // Days in selected month
  const totalDaysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // KPI Metrics
  const kpis = useMemo(() => {
    const activeStaff = employees.filter((e) => e.status === 'ACTIVE').length;
    const totalMonthlyCtc = employees
      .filter((e) => e.status === 'ACTIVE')
      .reduce((sum, e) => sum + Number(e.monthlyCtc || 0), 0);
    const pendingAdvances = advancesList
      .filter((a) => !a.isRecovered)
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const finalizedNetPayroll = payrollRuns.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);

    return { activeStaff, totalMonthlyCtc, pendingAdvances, finalizedNetPayroll };
  }, [employees, advancesList, payrollRuns]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSaveEmployee = async (formData: any) => {
    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee.id, formData);
        showFeedback('success', 'Employee updated successfully');
      } else {
        await employeeService.createEmployee(formData);
        showFeedback('success', 'Employee added successfully');
      }
      setIsAddEmployeeModalOpen(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to save employee');
    }
  };

  const handleDeactivateEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this employee?')) return;
    try {
      await employeeService.deactivateEmployee(id);
      showFeedback('success', 'Employee deactivated');
      fetchEmployees();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to deactivate employee');
    }
  };

  const handleToggleSundayOverride = (record: EmployeeAttendance) => {
    const newOverride = !record.isSundayOverride;
    const dateStr = new Date(record.date).toISOString().slice(0, 10);

    // Optimistic instant state update
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, isSundayOverride: newOverride } : r))
    );

    employeeService
      .recordAttendance({
        employeeId: record.employeeId,
        date: dateStr,
        status: record.status,
        isSundayOverride: newOverride,
        overtimeHours: Number(record.overtimeHours || 0),
        notes: record.notes || undefined,
      })
      .then(() => {
        showFeedback('success', `Sunday work status updated: ${newOverride ? 'Approved (Paid)' : 'Off'}`);
      })
      .catch((err: any) => {
        showFeedback('error', err?.message || 'Failed to update Sunday status');
        fetchAttendance();
      });
  };

  const handleQuickStatusChange = (employeeId: string, day: number, status: AttendanceStatus) => {
    const padDay = String(day).padStart(2, '0');
    const padMonth = String(selectedMonth).padStart(2, '0');
    const dateStr = `${selectedYear}-${padMonth}-${padDay}`;
    const isSunday = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;

    // 1. Optimistic 0ms UI update
    setAttendanceRecords((prev) => {
      const existingIndex = prev.findIndex(
        (r) => r.employeeId === employeeId && new Date(r.date).toISOString().slice(0, 10) === dateStr
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], status };
        return next;
      }
      return [
        ...prev,
        {
          id: 'temp-' + Date.now(),
          employeeId,
          date: dateStr,
          status,
          isSunday,
          isSundayOverride: false,
          overtimeHours: 0,
        },
      ];
    });

    // 2. Silent background network call without blocking or refetching
    employeeService
      .recordAttendance({
        employeeId,
        date: dateStr,
        status,
      })
      .catch((err: any) => {
        showFeedback('error', err?.message || 'Failed to update status');
        fetchAttendance();
      });
  };

  const handleOvertimeChange = (employeeId: string, day: number, hours: number) => {
    const padDay = String(day).padStart(2, '0');
    const padMonth = String(selectedMonth).padStart(2, '0');
    const dateStr = `${selectedYear}-${padMonth}-${padDay}`;
    const isSunday = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;

    setAttendanceRecords((prev) => {
      const existingIndex = prev.findIndex(
        (r) => r.employeeId === employeeId && new Date(r.date).toISOString().slice(0, 10) === dateStr
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], overtimeHours: hours };
        return next;
      }
      return [
        ...prev,
        {
          id: 'temp-' + Date.now(),
          employeeId,
          date: dateStr,
          status: 'PRESENT',
          isSunday,
          isSundayOverride: false,
          overtimeHours: hours,
        },
      ];
    });

    const record = attendanceRecords.find(
      (r) => r.employeeId === employeeId && new Date(r.date).toISOString().slice(0, 10) === dateStr
    );

    employeeService
      .recordAttendance({
        employeeId,
        date: dateStr,
        status: record?.status || 'PRESENT',
        overtimeHours: hours,
        isSundayOverride: record?.isSundayOverride || false,
        notes: record?.notes || undefined,
      })
      .catch((err: any) => {
        showFeedback('error', err?.message || 'Failed to update overtime hours');
        fetchAttendance();
      });
  };

  const handleMarkAllPresentForDay = async (day: number) => {
    const padDay = String(day).padStart(2, '0');
    const padMonth = String(selectedMonth).padStart(2, '0');
    const dateStr = `${selectedYear}-${padMonth}-${padDay}`;
    const activeStaff = employees.filter((e) => e.status === 'ACTIVE');
    const isSunday = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;

    if (!confirm(`Mark all ${activeStaff.length} active employees as PRESENT for ${dateStr}?`)) return;

    // 1. Optimistic 0ms UI update for all active staff
    setAttendanceRecords((prev) => {
      const copy = [...prev];
      activeStaff.forEach((emp) => {
        const idx = copy.findIndex(
          (r) => r.employeeId === emp.id && new Date(r.date).toISOString().slice(0, 10) === dateStr
        );
        if (idx >= 0) {
          copy[idx] = { ...copy[idx], status: 'PRESENT' };
        } else {
          copy.push({
            id: 'temp-' + emp.id + '-' + Date.now(),
            employeeId: emp.id,
            date: dateStr,
            status: 'PRESENT',
            isSunday,
            isSundayOverride: false,
            overtimeHours: 0,
          });
        }
      });
      return copy;
    });

    showFeedback('success', `Marked all ${activeStaff.length} active employees as PRESENT`);

    // 2. Parallelized background batch update
    try {
      await employeeService.batchRecordAttendance({
        date: dateStr,
        records: activeStaff.map((e) => ({
          employeeId: e.id,
          status: 'PRESENT',
        })),
      });
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to batch mark attendance');
      fetchAttendance();
    }
  };

  const handleSaveEditedAttendance = async (formData: {
    status: AttendanceStatus;
    overtimeHours: number;
    isSundayOverride: boolean;
    notes?: string;
  }) => {
    if (!editingAttendance) return;
    const { employee, dateStr, day } = editingAttendance;
    const isSunday = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;

    // Optimistic state update
    setAttendanceRecords((prev) => {
      const idx = prev.findIndex(
        (r) => r.employeeId === employee.id && new Date(r.date).toISOString().slice(0, 10) === dateStr
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          status: formData.status,
          overtimeHours: formData.overtimeHours,
          isSundayOverride: formData.isSundayOverride,
          notes: formData.notes || null,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: 'temp-' + Date.now(),
          employeeId: employee.id,
          date: dateStr,
          status: formData.status,
          isSunday,
          isSundayOverride: formData.isSundayOverride,
          overtimeHours: formData.overtimeHours,
          notes: formData.notes || null,
        },
      ];
    });

    const targetEmpName = employee.name;
    setEditingAttendance(null);
    showFeedback('success', `Attendance updated for ${targetEmpName}`);

    try {
      await employeeService.recordAttendance({
        employeeId: employee.id,
        date: dateStr,
        status: formData.status,
        overtimeHours: formData.overtimeHours,
        isSundayOverride: formData.isSundayOverride,
        notes: formData.notes,
      });
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to save attendance record');
      fetchAttendance();
    }
  };

  const handleSaveEditedAdvance = async (formData: UpdateAdvancePayload) => {
    if (!editingAdvance) return;
    try {
      await employeeService.updateAdvance(editingAdvance.id, formData);
      showFeedback('success', 'Advance record updated successfully');
      setEditingAdvance(null);
      fetchAdvancesAndDeductions();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to update advance');
    }
  };

  const handleSaveEditedDeduction = async (formData: UpdateDeductionPayload) => {
    if (!editingDeduction) return;
    try {
      await employeeService.updateDeduction(editingDeduction.id, formData);
      showFeedback('success', 'Deduction record updated successfully');
      setEditingDeduction(null);
      fetchAdvancesAndDeductions();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to update deduction');
    }
  };

  const handleRunMonthlyAccrual = async () => {
    if (!confirm(`Run automated leave accrual (+1.00 CL, +0.25 EL) for ${selectedMonth}/${selectedYear}?`)) return;
    try {
      const res = await employeeService.accrueMonthlyLeave({ month: selectedMonth, year: selectedYear });
      showFeedback('success', res.message || 'Leave accrual completed successfully');
      fetchEmployees();
      if (selectedEmployeeForLeave) {
        employeeService.getLeaveLedger(selectedEmployeeForLeave).then((r) => setLeaveHistory(r.history));
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to run leave accrual');
    }
  };

  const handleCalculatePayroll = async () => {
    setIsCalculatingPayroll(true);
    try {
      await employeeService.calculatePayroll({
        month: selectedMonth,
        year: selectedYear,
        previewOnly: false,
      });
      showFeedback('success', `Calculated payroll for ${selectedMonth}/${selectedYear}`);
      fetchPayroll();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to calculate payroll');
    } finally {
      setIsCalculatingPayroll(false);
    }
  };

  const handleFinalizePayroll = async (id: string) => {
    try {
      await employeeService.finalizePayroll(id);
      showFeedback('success', 'Payroll run finalized and deductions locked');
      fetchPayroll();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to finalize payroll');
    }
  };

  const handleRevertPayrollToDraft = async (runId: string) => {
    if (!confirm('Are you sure you want to revert this payroll run back to DRAFT? Any recovered advances and applied deductions will be reopened.')) return;
    try {
      await employeeService.revertPayrollToDraft(runId);
      showFeedback('success', 'Payroll run reverted to DRAFT');
      fetchPayroll();
      fetchAdvancesAndDeductions();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to revert payroll run to draft');
    }
  };

  const handleMarkPaid = async (formData: { paymentMode: string; paymentReference?: string; paymentNotes?: string }) => {
    if (!selectedPayrollForPaid) return;
    try {
      await employeeService.markPayrollPaid(selectedPayrollForPaid.id, formData);
      showFeedback('success', 'Disbursement recorded and payslip emailed to employee');
      setIsMarkPaidModalOpen(false);
      setSelectedPayrollForPaid(null);
      fetchPayroll();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to mark as paid');
    }
  };

  const handleDownloadPdf = async (run: EmployeePayrollRun) => {
    try {
      const filename = `Payslip-${run.employee?.employeeId || 'PRC'}-${selectedMonth}-${selectedYear}.pdf`;
      await employeeService.downloadPayslipPdf(run.id, filename);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to download payslip PDF');
    }
  };

  const handleResendEmail = async (id: string) => {
    try {
      await employeeService.resendPayslipEmail(id);
      showFeedback('success', 'Payslip advice re-dispatched via email');
      fetchPayroll();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to email payslip');
    }
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-12 font-sans">
      {/* ── Feedback Alert ──────────────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm animate-in fade-in slide-in-from-top-4 ${
            feedback.type === 'success'
              ? 'bg-[#0f172a] text-emerald-400 border-emerald-500/30'
              : 'bg-[#18181b] text-rose-400 border-rose-500/30'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── Top Header & Global Controls ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#27272A] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              HR & Payroll
            </span>
            <span className="text-xs text-[#71717A]">• PRC Hardware Enterprise</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FAFAFA] mt-1">
            Employee & Compensation Suite
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Master directory, daily attendance tracking, leave ledgers, advances & automated payroll disbursement.
          </p>
        </div>

        {/* Global Month / Year Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-[#18181B] border border-[#27272A] text-sm text-[#FAFAFA] rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              if (activeTab === 'directory') fetchEmployees();
              if (activeTab === 'attendance') fetchAttendance();
              if (activeTab === 'advances') fetchAdvancesAndDeductions();
              if (activeTab === 'payroll') fetchPayroll();
            }}
            className="p-2 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A] rounded-xl transition"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={() => {
              setEditingEmployee(null);
              setIsAddEmployeeModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-amber-900/20 transition"
          >
            <Plus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-2xl space-y-1.5">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-xs font-medium uppercase tracking-wider">Active Staff</span>
            <Users size={18} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-[#FAFAFA]">{kpis.activeStaff}</div>
          <p className="text-xs text-[#71717A]">{employees.length} total registered</p>
        </div>

        <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-2xl space-y-1.5">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-xs font-medium uppercase tracking-wider">Total Monthly CTC</span>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[#FAFAFA]">{formatINR(kpis.totalMonthlyCtc)}</div>
          <p className="text-xs text-[#71717A]">Active payroll commitment</p>
        </div>

        <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-2xl space-y-1.5">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Advances</span>
            <CreditCard size={18} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#FAFAFA]">{formatINR(kpis.pendingAdvances)}</div>
          <p className="text-xs text-[#71717A]">Recovery in {MONTHS[selectedMonth - 1]?.label}</p>
        </div>

        <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-2xl space-y-1.5">
          <div className="flex items-center justify-between text-[#A1A1AA]">
            <span className="text-xs font-medium uppercase tracking-wider">Disbursed Net Pay</span>
            <DollarSign size={18} className="text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-[#FAFAFA]">{formatINR(kpis.finalizedNetPayroll)}</div>
          <p className="text-xs text-[#71717A]">{payrollRuns.length} calculated records</p>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-[#27272A] pb-px no-scrollbar">
        {[
          { id: 'directory', label: 'Employee Directory', icon: <Users size={16} />, badge: employees.length },
          { id: 'attendance', label: 'Attendance Matrix', icon: <Calendar size={16} /> },
          { id: 'leaves', label: 'Leave Ledger (CL / EL)', icon: <Award size={16} /> },
          { id: 'advances', label: 'Advances & Deductions', icon: <DollarSign size={16} /> },
          { id: 'payroll', label: 'Monthly Payroll Runs', icon: <FileText size={16} />, badge: payrollRuns.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#27272A] text-[#FAFAFA]">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: EMPLOYEE DIRECTORY                                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#18181B] p-3 rounded-2xl border border-[#27272A]">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                <input
                  type="text"
                  placeholder="Search by name, ID (PPSE...), email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-sm text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-[#09090B] border border-[#27272A] text-sm text-[#FAFAFA] rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className="bg-[#09090B] border border-[#27272A] text-sm text-[#FAFAFA] rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                <option value="All Designations">All Designations</option>
                {COMMON_DESIGNATIONS.map((desig) => (
                  <option key={desig} value={desig}>
                    {desig}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#09090B] border border-[#27272A] text-sm text-[#FAFAFA] rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Staff</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#09090B] text-[#71717A] text-xs uppercase tracking-wider border-b border-[#27272A]">
                  <tr>
                    <th className="px-4 py-3.5">Employee ID</th>
                    <th className="px-4 py-3.5">Name & Contact</th>
                    <th className="px-4 py-3.5">Designation / Dept</th>
                    <th className="px-4 py-3.5">Government ID</th>
                    <th className="px-4 py-3.5">Bank Details</th>
                    <th className="px-4 py-3.5">Monthly CTC</th>
                    <th className="px-4 py-3.5">Leave Balances</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {isLoadingEmployees ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-[#71717A]">
                        <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                        Loading employee directory...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-[#71717A]">
                        No employees found matching the criteria. Click &quot;Add Employee&quot; to register staff.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-[#27272A]/40 transition">
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-amber-400">
                          {emp.employeeId}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-[#FAFAFA]">{emp.name}</div>
                          <div className="text-xs text-[#71717A]">{emp.email} • {emp.phone}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[#FAFAFA] font-medium">{emp.designation}</span>
                            {emp.designation.toLowerCase() === 'workers' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                Worker
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#71717A]">{emp.department}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#09090B] border border-[#27272A] text-[#FAFAFA]">
                            {emp.governmentIdType}: {emp.governmentIdNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#A1A1AA]">
                          {emp.bankName || emp.bankAccountNumber ? (
                            <>
                              <div className="font-medium text-[#FAFAFA]">{emp.bankName || 'Disbursement Account'}</div>
                              <div className="font-mono text-[11px] text-[#71717A]">
                                {emp.bankAccountNumber || '—'} {emp.bankIfsc ? `(${emp.bankIfsc})` : ''}
                              </div>
                            </>
                          ) : (
                            <span className="inline-flex items-center text-[11px] text-[#71717A] italic px-1.5 py-0.5 rounded bg-zinc-800/40 border border-zinc-700/30">
                              Optional (Not Provided)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[#FAFAFA]">
                          {formatINR(emp.monthlyCtc)}
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          <div className="text-blue-400">CL: {Number(emp.clBalance).toFixed(2)}</div>
                          <div className="text-purple-400">EL: {Number(emp.elBalance).toFixed(2)}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full border ${
                              emp.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingEmployee(emp);
                              setIsAddEmployeeModalOpen(true);
                            }}
                            className="p-1.5 text-[#A1A1AA] hover:text-amber-400 transition"
                            title="Edit Employee"
                          >
                            <Edit2 size={15} />
                          </button>
                          {isSuperAdmin && emp.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleDeactivateEmployee(emp.id)}
                              className="p-1.5 text-[#A1A1AA] hover:text-rose-400 transition"
                              title="Deactivate Employee"
                            >
                              <UserX size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ATTENDANCE MATRIX                                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#18181B] p-3 rounded-2xl border border-[#27272A]">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[#FAFAFA]">
                Target Day:
              </span>
              <select
                value={selectedAttendanceDay}
                onChange={(e) => setSelectedAttendanceDay(Number(e.target.value))}
                className="bg-[#09090B] border border-[#27272A] text-sm text-[#FAFAFA] rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500"
              >
                {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const d = new Date(selectedYear, selectedMonth - 1, dayNum);
                  const isSun = d.getDay() === 0;
                  return (
                    <option key={dayNum} value={dayNum}>
                      Day {dayNum} ({d.toLocaleDateString('en-US', { weekday: 'short' })}){isSun ? ' - Sunday' : ''}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={() => handleMarkAllPresentForDay(selectedAttendanceDay)}
                className="px-3 py-1.5 bg-[#09090B] hover:bg-[#27272A] text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/30 transition flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Mark All Present for Day {selectedAttendanceDay}</span>
              </button>
            </div>

            <div className="text-xs text-[#71717A]">
              Sundays are off by default. Use &quot;Sunday Work Approved&quot; to credit approved Sunday shifts.
            </div>
          </div>

          {/* Attendance Daily Sheet Table */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#09090B] text-[#71717A] text-xs uppercase tracking-wider border-b border-[#27272A]">
                  <tr>
                    <th className="px-4 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Current Status</th>
                    <th className="px-4 py-3.5">Mark Attendance</th>
                    <th className="px-4 py-3.5">Overtime (Hrs)</th>
                    <th className="px-4 py-3.5">Sunday Shift Override</th>
                    <th className="px-4 py-3.5 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {employees
                    .filter((e) => e.status === 'ACTIVE')
                    .map((emp) => {
                      const padDay = String(selectedAttendanceDay).padStart(2, '0');
                      const padMonth = String(selectedMonth).padStart(2, '0');
                      const targetDateStr = `${selectedYear}-${padMonth}-${padDay}`;

                      const record = attendanceRecords.find(
                        (r) =>
                          r.employeeId === emp.id &&
                          new Date(r.date).toISOString().slice(0, 10) === targetDateStr
                      );

                      const isTargetSunday = new Date(selectedYear, selectedMonth - 1, selectedAttendanceDay).getDay() === 0;

                      return (
                        <tr key={emp.id} className="hover:bg-[#27272A]/40 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-[#FAFAFA]">{emp.name}</div>
                            <div className="text-xs font-mono text-amber-400">{emp.employeeId}</div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-[#A1A1AA]">{emp.department}</td>
                          <td className="px-4 py-3.5">
                            {record ? (
                              <div>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium border inline-block ${
                                    ATTENDANCE_STATUS_LABELS[record.status]?.bg || 'bg-zinc-800 text-zinc-300'
                                  }`}
                                >
                                  {ATTENDANCE_STATUS_LABELS[record.status]?.label || record.status}
                                </span>
                                {record.notes && (
                                  <div className="text-[11px] text-[#71717A] italic mt-1 max-w-[150px] truncate" title={record.notes}>
                                    Note: {record.notes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-[#71717A] italic">Not Recorded</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap items-center gap-1">
                              {(['PRESENT', 'CL', 'EL', 'HALF_DAY', 'UL'] as AttendanceStatus[]).map((st) => (
                                <button
                                  key={st}
                                  onClick={() => handleQuickStatusChange(emp.id, selectedAttendanceDay, st)}
                                  className={`px-2 py-1 text-xs rounded-lg border transition ${
                                    record?.status === st
                                      ? ATTENDANCE_STATUS_LABELS[st].bg + ' font-semibold'
                                      : 'bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:bg-[#27272A] hover:text-[#FAFAFA]'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              defaultValue={record ? Number(record.overtimeHours) : 0}
                              key={`${emp.id}-${targetDateStr}-${record?.overtimeHours || 0}`}
                              onBlur={(e) => {
                                const val = Number(e.target.value || 0);
                                if (Number(record?.overtimeHours || 0) !== val) {
                                  handleOvertimeChange(emp.id, selectedAttendanceDay, val);
                                }
                              }}
                              className="w-20 px-2 py-1 bg-[#09090B] border border-[#27272A] rounded-lg text-xs text-[#FAFAFA] focus:outline-none focus:border-amber-500 font-mono"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            {isTargetSunday ? (
                              <button
                                onClick={() => record && handleToggleSundayOverride(record)}
                                className={`px-2.5 py-1 text-xs rounded-xl border transition ${
                                  record?.isSundayOverride
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold'
                                    : 'bg-[#09090B] text-[#71717A] border-[#27272A] hover:text-[#FAFAFA]'
                                }`}
                              >
                                {record?.isSundayOverride ? 'Approved Sunday Work (Paid)' : 'Off (Default)'}
                              </button>
                            ) : (
                              <span className="text-xs text-[#71717A]">— Weekday —</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() =>
                                setEditingAttendance({
                                  employee: emp,
                                  record,
                                  day: selectedAttendanceDay,
                                  dateStr: targetDateStr,
                                })
                              }
                              className="p-1.5 text-[#A1A1AA] hover:text-amber-400 hover:bg-[#27272A] rounded-lg transition inline-flex items-center gap-1"
                              title="Edit Details & Notes"
                            >
                              <Edit2 size={13} />
                              <span className="text-xs">Edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: LEAVE LEDGER                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#18181B] p-3.5 rounded-2xl border border-[#27272A]">
            <div>
              <h3 className="text-base font-semibold text-[#FAFAFA]">Leave Accrual & Ledger Rules</h3>
              <p className="text-xs text-[#A1A1AA]">
                Casual Leave (CL) accrues +1 per month. Earned Leave (EL) accrues +0.25 per month (1 every 4 months).
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRunMonthlyAccrual}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Award size={15} />
                <span>Run Monthly Accrual (+1 CL, +0.25 EL)</span>
              </button>

              <button
                onClick={() => {
                  const defaultEmp = selectedEmployeeForLeave || employees.find((e) => e.status === 'ACTIVE')?.id || '';
                  setLeaveAdjustEmpId(defaultEmp);
                  setLeaveAdjustType('CL');
                  setLeaveAdjustAction('USAGE');
                  setLeaveAdjustAmount('1');
                  setLeaveAdjustReason('');
                  setIsLeaveAdjustModalOpen(true);
                }}
                className="px-4 py-2 bg-[#09090B] hover:bg-[#27272A] text-[#FAFAFA] text-xs font-semibold rounded-xl border border-[#27272A] transition"
              >
                Manual Leave Adjustment
              </button>
            </div>
          </div>

          {/* Employee Balances Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {employees
              .filter((e) => e.status === 'ACTIVE')
              .map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployeeForLeave(emp.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    selectedEmployeeForLeave === emp.id
                      ? 'bg-[#18181B] border-amber-500/50 ring-1 ring-amber-500'
                      : 'bg-[#18181B] border-[#27272A] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-[#FAFAFA]">{emp.name}</div>
                      <div className="text-xs text-[#71717A] font-mono">{emp.employeeId}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#09090B] text-[#A1A1AA]">
                      {emp.department}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-[#27272A]">
                    <div className="p-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <span className="text-[11px] text-blue-400 uppercase font-semibold">CL Balance</span>
                      <div className="text-lg font-bold text-blue-300">{Number(emp.clBalance).toFixed(2)}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-500/5 border border-purple-500/10">
                      <span className="text-[11px] text-purple-400 uppercase font-semibold">EL Balance</span>
                      <div className="text-lg font-bold text-purple-300">{Number(emp.elBalance).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Selected Employee History */}
          {selectedEmployeeForLeave && (
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-[#FAFAFA]">
                Detailed Leave History: {employees.find((e) => e.id === selectedEmployeeForLeave)?.name}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#09090B] text-[#71717A] uppercase border-b border-[#27272A]">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Leave Type</th>
                      <th className="px-3 py-2">Action</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Balance After</th>
                      <th className="px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]">
                    {isLoadingLeaveHistory ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-[#71717A]">
                          Loading history...
                        </td>
                      </tr>
                    ) : leaveHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-[#71717A]">
                          No leave transactions logged yet.
                        </td>
                      </tr>
                    ) : (
                      leaveHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-[#27272A]/30">
                          <td className="px-3 py-2 text-[#A1A1AA]">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-3 py-2 font-semibold">
                            <span className={item.leaveType === 'CL' ? 'text-blue-400' : 'text-purple-400'}>
                              {item.leaveType}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded bg-[#09090B] text-[10px] text-[#A1A1AA]">
                              {item.transactionType}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono font-bold">
                            <span className={Number(item.amount) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {Number(item.amount) > 0 ? `+${Number(item.amount)}` : item.amount}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-[#FAFAFA]">{Number(item.balanceAfter).toFixed(2)}</td>
                          <td className="px-3 py-2 text-[#71717A]">{item.reason || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: ADVANCES & DEDUCTIONS                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#18181B] p-3 rounded-2xl border border-[#27272A]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAdvancesSubTab('advances')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition ${
                  advancesSubTab === 'advances'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:text-[#FAFAFA]'
                }`}
              >
                Salary Advances ({advancesList.length})
              </button>
              <button
                onClick={() => setAdvancesSubTab('deductions')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition ${
                  advancesSubTab === 'deductions'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:text-[#FAFAFA]'
                }`}
              >
                Other Deductions & Penalties ({deductionsList.length})
              </button>
            </div>

            <div>
              {advancesSubTab === 'advances' ? (
                <button
                  onClick={() => setIsAddAdvanceModalOpen(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Give Advance</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsAddDeductionModalOpen(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-rose-700 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add Deduction</span>
                </button>
              )}
            </div>
          </div>

          {/* Advances Table */}
          {advancesSubTab === 'advances' ? (
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#09090B] text-[#71717A] text-xs uppercase tracking-wider border-b border-[#27272A]">
                    <tr>
                      <th className="px-4 py-3.5">Employee</th>
                      <th className="px-4 py-3.5">Amount</th>
                      <th className="px-4 py-3.5">Advance Date</th>
                      <th className="px-4 py-3.5">Reason</th>
                      <th className="px-4 py-3.5">Recovery Scheduled</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]">
                    {isLoadingAdvances ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-[#71717A]">
                          Loading advances...
                        </td>
                      </tr>
                    ) : advancesList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-[#71717A]">
                          No advances scheduled for {MONTHS[selectedMonth - 1]?.label} {selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      advancesList.map((adv) => (
                        <tr key={adv.id} className="hover:bg-[#27272A]/40 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-[#FAFAFA]">{adv.employee?.name}</div>
                            <div className="text-xs font-mono text-amber-400">{adv.employee?.employeeId}</div>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-[#FAFAFA]">{formatINR(adv.amount)}</td>
                          <td className="px-4 py-3.5 text-xs text-[#FAFAFA]">
                            {adv.advanceDate
                              ? new Date(adv.advanceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : adv.createdAt
                              ? new Date(adv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-[#A1A1AA]">{adv.reason}</td>
                          <td className="px-4 py-3.5 text-xs text-[#FAFAFA]">
                            {MONTHS[adv.recoveryMonth - 1]?.label} {adv.recoveryYear}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full border ${
                                adv.isRecovered
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {adv.isRecovered ? 'Recovered' : 'Pending Recovery'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1">
                            <button
                              onClick={() => setEditingAdvance(adv)}
                              className="p-1.5 text-[#A1A1AA] hover:text-amber-400 hover:bg-[#27272A] rounded-lg transition"
                              title="Edit Advance"
                            >
                              <Edit2 size={14} />
                            </button>
                            {!adv.isRecovered && (
                              <button
                                onClick={async () => {
                                  if (!confirm('Cancel/Delete this advance record?')) return;
                                  await employeeService.deleteAdvance(adv.id);
                                  fetchAdvancesAndDeductions();
                                }}
                                className="p-1.5 text-[#71717A] hover:text-rose-400 hover:bg-[#27272A] rounded-lg transition"
                                title="Delete Advance"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Deductions Table */
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#09090B] text-[#71717A] text-xs uppercase tracking-wider border-b border-[#27272A]">
                    <tr>
                      <th className="px-4 py-3.5">Employee</th>
                      <th className="px-4 py-3.5">Amount</th>
                      <th className="px-4 py-3.5">Reason</th>
                      <th className="px-4 py-3.5">Apply Period</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]">
                    {isLoadingAdvances ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[#71717A]">
                          Loading deductions...
                        </td>
                      </tr>
                    ) : deductionsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[#71717A]">
                          No deductions scheduled for {MONTHS[selectedMonth - 1]?.label} {selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      deductionsList.map((ded) => (
                        <tr key={ded.id} className="hover:bg-[#27272A]/40 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-[#FAFAFA]">{ded.employee?.name}</div>
                            <div className="text-xs font-mono text-amber-400">{ded.employee?.employeeId}</div>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-rose-400">{formatINR(ded.amount)}</td>
                          <td className="px-4 py-3.5 text-xs text-[#A1A1AA]">{ded.reason}</td>
                          <td className="px-4 py-3.5 text-xs text-[#FAFAFA]">
                            {MONTHS[ded.applyMonth - 1]?.label} {ded.applyYear}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full border ${
                                ded.isApplied
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {ded.isApplied ? 'Applied' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1">
                            <button
                              onClick={() => setEditingDeduction(ded)}
                              className="p-1.5 text-[#A1A1AA] hover:text-amber-400 hover:bg-[#27272A] rounded-lg transition"
                              title="Edit Deduction"
                            >
                              <Edit2 size={14} />
                            </button>
                            {!ded.isApplied && (
                              <button
                                onClick={async () => {
                                  if (!confirm('Delete this deduction record?')) return;
                                  await employeeService.deleteDeduction(ded.id);
                                  fetchAdvancesAndDeductions();
                                }}
                                className="p-1.5 text-[#71717A] hover:text-rose-400 hover:bg-[#27272A] rounded-lg transition"
                                title="Delete Deduction"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: MONTHLY PAYROLL RUNS                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#18181B] p-3.5 rounded-2xl border border-[#27272A]">
            <div>
              <h3 className="text-base font-semibold text-[#FAFAFA]">
                Payroll Computation: {MONTHS[selectedMonth - 1]?.label} {selectedYear}
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Formula: Payable Days = Total Days - Default Sundays + Approved Sundays. Net = Gross - Advance - Deductions.
              </p>
            </div>

            <button
              onClick={handleCalculatePayroll}
              disabled={isCalculatingPayroll}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg transition flex items-center gap-2"
            >
              {isCalculatingPayroll ? <RefreshCw className="animate-spin" size={15} /> : <TrendingUp size={15} />}
              <span>{isCalculatingPayroll ? 'Computing Formulas...' : 'Calculate Monthly Payroll'}</span>
            </button>
          </div>

          {/* Payroll Sheet */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#09090B] text-[#71717A] text-xs uppercase tracking-wider border-b border-[#27272A]">
                  <tr>
                    <th className="px-4 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Monthly CTC</th>
                    <th className="px-4 py-3.5">Payable / Paid Days</th>
                    <th className="px-4 py-3.5">OT Hours & Pay</th>
                    <th className="px-4 py-3.5">Gross Salary</th>
                    <th className="px-4 py-3.5">Deductions</th>
                    <th className="px-4 py-3.5">Net Salary</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {isLoadingPayroll ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-[#71717A]">
                        Loading payroll run...
                      </td>
                    </tr>
                  ) : payrollRuns.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-[#71717A]">
                        No payroll calculated yet for {MONTHS[selectedMonth - 1]?.label} {selectedYear}. Click &quot;Calculate Monthly Payroll&quot; above.
                      </td>
                    </tr>
                  ) : (
                    payrollRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-[#27272A]/40 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-[#FAFAFA]">{run.employee?.name}</div>
                          <div className="text-xs font-mono text-amber-400">{run.employee?.employeeId}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#FAFAFA]">{formatINR(run.monthlyCtc)}</td>
                        <td className="px-4 py-3.5 text-xs">
                          <div className="font-bold text-[#FAFAFA]">
                            {run.paidDays} / {run.payableDays} Days
                          </div>
                          <div className="text-[11px] text-[#71717A]">
                            P: {run.presentDays} | CL: {run.clDays} | EL: {run.elDays} | Half: {run.halfDays}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          <div>{run.overtimeHours} hrs</div>
                          <div className="text-emerald-400 font-medium">+{formatINR(run.overtimePay)}</div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[#FAFAFA]">{formatINR(run.grossSalary)}</td>
                        <td className="px-4 py-3.5 text-xs">
                          <div className="text-rose-400">Adv: -{formatINR(run.advanceDeduction)}</div>
                          <div className="text-rose-400">Other: -{formatINR(run.otherDeductions)}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-base font-bold text-emerald-400">{formatINR(run.netSalary)}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 text-xs rounded-full border ${
                              run.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : run.status === 'FINALIZED'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {run.status}
                          </span>
                          {run.emailSent && (
                            <span className="block text-[10px] text-emerald-400 mt-1">Emailed</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {/* Download PDF button */}
                          <button
                            onClick={() => handleDownloadPdf(run)}
                            className="p-1.5 text-[#A1A1AA] hover:text-[#FAFAFA] bg-[#09090B] border border-[#27272A] rounded-lg transition"
                            title="Download Official Payslip PDF"
                          >
                            <Download size={14} />
                          </button>

                          {/* Email Payslip button */}
                          <button
                            onClick={() => handleResendEmail(run.id)}
                            className="p-1.5 text-[#A1A1AA] hover:text-amber-400 bg-[#09090B] border border-[#27272A] rounded-lg transition"
                            title="Email Payslip to Employee"
                          >
                            <Mail size={14} />
                          </button>

                          {/* Finalize Button */}
                          {run.status === 'DRAFT' && (
                            <button
                              onClick={() => handleFinalizePayroll(run.id)}
                              className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold rounded-lg transition"
                            >
                              Finalize
                            </button>
                          )}

                          {/* Super Admin Revert to Draft */}
                          {isSuperAdmin && (run.status === 'FINALIZED' || run.status === 'PAID') && (
                            <button
                              onClick={() => handleRevertPayrollToDraft(run.id)}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1"
                              title="Revert to Draft (Super Admin only)"
                            >
                              <RotateCcw size={12} />
                              <span>Make Draft</span>
                            </button>
                          )}

                          {/* Super Admin Mark as Paid */}
                          {isSuperAdmin && run.status !== 'PAID' && (
                            <button
                              onClick={() => {
                                setSelectedPayrollForPaid(run);
                                setIsMarkPaidModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg transition"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD / EDIT EMPLOYEE                                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isAddEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-lg font-bold text-[#FAFAFA]">
                {editingEmployee ? `Edit Employee: ${editingEmployee.name}` : 'Register New Employee'}
              </h3>
              <button
                onClick={() => {
                  setIsAddEmployeeModalOpen(false);
                  setEditingEmployee(null);
                }}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const rawBankAcct = ((formData.get('bankAccountNumber') as string) || '').trim();
                const rawBankIfsc = ((formData.get('bankIfsc') as string) || '').trim().toUpperCase();
                const rawBankName = ((formData.get('bankName') as string) || '').trim();
                const rawBankHolder = ((formData.get('bankAccountHolder') as string) || '').trim();

                const computedDesignation =
                  (modalDesignation === 'OTHER' ? customDesignation : modalDesignation).trim() || 'Workers';

                const payload = {
                  name: (formData.get('name') as string).trim(),
                  email: (formData.get('email') as string).trim().toLowerCase(),
                  phone: (formData.get('phone') as string).trim(),
                  address: (formData.get('address') as string).trim(),
                  governmentIdType: formData.get('governmentIdType') as GovernmentIdType,
                  governmentIdNumber: (formData.get('governmentIdNumber') as string).trim().toUpperCase(),
                  bankAccountNumber: rawBankAcct || undefined,
                  bankIfsc: rawBankIfsc || undefined,
                  bankName: rawBankName || undefined,
                  bankAccountHolder: rawBankHolder || undefined,
                  designation: computedDesignation,
                  department: (formData.get('department') as string).trim(),
                  responsibilities: ((formData.get('responsibilities') as string) || '').trim() || undefined,
                  monthlyCtc: Number(formData.get('monthlyCtc')),
                  joiningDate: formData.get('joiningDate') as string,
                  status: (formData.get('status') as EmployeeStatus) || 'ACTIVE',
                };
                handleSaveEmployee(payload);
              }}
              className="space-y-4 text-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Full Name *</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingEmployee?.name || ''}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={editingEmployee?.email || ''}
                    placeholder="payslips will be sent here"
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Phone Number *</label>
                  <input
                    name="phone"
                    required
                    defaultValue={editingEmployee?.phone || ''}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                    Designation * <span className="text-amber-400 font-normal">(Default: Workers)</span>
                  </label>
                  <select
                    value={modalDesignation}
                    onChange={(e) => {
                      setModalDesignation(e.target.value);
                      if (e.target.value !== 'OTHER') {
                        setCustomDesignation('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500 font-medium text-xs"
                  >
                    {COMMON_DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value="OTHER">+ Other (Custom Designation)</option>
                  </select>

                  {modalDesignation === 'OTHER' && (
                    <input
                      type="text"
                      required
                      placeholder="Enter custom designation (e.g. CNC Operator)"
                      value={customDesignation}
                      onChange={(e) => setCustomDesignation(e.target.value)}
                      className="w-full mt-2 px-3 py-2 bg-[#09090B] border border-amber-500/60 rounded-xl text-[#FAFAFA] text-xs focus:outline-none focus:border-amber-500 placeholder-[#71717A]"
                    />
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-[#71717A]">Quick pick:</span>
                    {['Workers', 'Hardware Technician', 'Cubicle Installer', 'Site Supervisor'].map((role) => (
                      <button
                        type="button"
                        key={role}
                        onClick={() => {
                          setModalDesignation(role);
                          setCustomDesignation('');
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-md border transition ${
                          modalDesignation === role
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                            : 'bg-[#27272A]/50 text-[#A1A1AA] border-[#27272A] hover:bg-[#27272A] hover:text-[#FAFAFA]'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Department *</label>
                  <select
                    name="department"
                    defaultValue={editingEmployee?.department || 'Operations'}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500"
                  >
                    {DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Monthly CTC (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    name="monthlyCtc"
                    required
                    defaultValue={editingEmployee ? Number(editingEmployee.monthlyCtc) : ''}
                    placeholder="e.g. 45000"
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Joining Date *</label>
                  <input
                    type="date"
                    name="joiningDate"
                    required
                    defaultValue={
                      editingEmployee?.joiningDate
                        ? new Date(editingEmployee.joiningDate).toISOString().slice(0, 10)
                        : new Date().toISOString().slice(0, 10)
                    }
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Employment Status</label>
                  <select
                    name="status"
                    defaultValue={editingEmployee?.status || 'ACTIVE'}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Residential Address *</label>
                <textarea
                  name="address"
                  required
                  rows={2}
                  defaultValue={editingEmployee?.address || ''}
                  placeholder="Street, City, State, PIN"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              {/* Government ID Section */}
              <div className="p-3.5 bg-[#09090B] border border-[#27272A] rounded-xl space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  Government Identification
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#71717A] mb-1">ID Type *</label>
                    <select
                      name="governmentIdType"
                      defaultValue={editingEmployee?.governmentIdType || 'AADHAAR'}
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500 text-xs"
                    >
                      <option value="AADHAAR">Aadhaar (12 digits)</option>
                      <option value="PAN">PAN (ABCDE1234F)</option>
                      <option value="VOTER_ID">Voter ID (ABC1234567)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#71717A] mb-1">ID Number *</label>
                    <input
                      name="governmentIdNumber"
                      required
                      defaultValue={editingEmployee?.governmentIdNumber || ''}
                      placeholder="e.g. 123456789012"
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Account Section (Optional) */}
              <div className="p-3.5 bg-[#09090B] border border-[#27272A] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                      Bank Disbursement Account
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Optional / Can be added later
                  </span>
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Bank details are entirely optional (e.g. for cash workers or daily wage staff). You can leave all bank fields blank or update them anytime.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#71717A] mb-1">
                      Bank Name <span className="text-[#52525B] font-normal">(Optional)</span>
                    </label>
                    <input
                      name="bankName"
                      defaultValue={editingEmployee?.bankName || ''}
                      placeholder="e.g. State Bank of India"
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#71717A] mb-1">
                      Account Holder Name <span className="text-[#52525B] font-normal">(Optional)</span>
                    </label>
                    <input
                      name="bankAccountHolder"
                      defaultValue={editingEmployee?.bankAccountHolder || ''}
                      placeholder="as per bank passbook"
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#71717A] mb-1">
                      Account Number <span className="text-[#52525B] font-normal">(Optional)</span>
                    </label>
                    <input
                      name="bankAccountNumber"
                      defaultValue={editingEmployee?.bankAccountNumber || ''}
                      placeholder="e.g. 123456789012"
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#71717A] mb-1">
                      IFSC Code <span className="text-[#52525B] font-normal">(Optional)</span>
                    </label>
                    <input
                      name="bankIfsc"
                      defaultValue={editingEmployee?.bankIfsc || ''}
                      placeholder="e.g. SBIN0001234"
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs font-mono uppercase focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#A1A1AA] hover:text-[#FAFAFA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs rounded-xl shadow-lg transition"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: MANUAL LEAVE ADJUSTMENT                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isLeaveAdjustModalOpen && (() => {
        const activeStaff = employees.filter((e) => e.status === 'ACTIVE');
        const selectedEmp =
          activeStaff.find((e) => e.id === leaveAdjustEmpId) ||
          activeStaff.find((e) => e.id === selectedEmployeeForLeave) ||
          activeStaff[0];

        const currentBal = selectedEmp
          ? Number(leaveAdjustType === 'CL' ? selectedEmp.clBalance : selectedEmp.elBalance)
          : 0;

        const numAmount = Math.max(0, Number(leaveAdjustAmount) || 0);
        const delta =
          leaveAdjustAction === 'USAGE'
            ? -numAmount
            : leaveAdjustAction === 'ACCRUAL'
            ? numAmount
            : Number(leaveAdjustAmount) || 0;

        const rawRemaining = currentBal + delta;
        const remainingBal = Math.max(0, rawRemaining);
        const isNegativeRemaining = rawRemaining < 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#FAFAFA]">Manual Leave Adjustment</h3>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Credit, debit (usage), or adjust employee leave balances
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLeaveAdjustModalOpen(false)}
                  className="p-1 text-[#71717A] hover:text-[#FAFAFA] rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedEmp) {
                    showFeedback('error', 'Please select an employee');
                    return;
                  }
                  if (numAmount <= 0) {
                    showFeedback('error', 'Please enter a valid leave amount');
                    return;
                  }

                  const payload = {
                    leaveType: leaveAdjustType,
                    transactionType: leaveAdjustAction,
                    amount: numAmount,
                    month: selectedMonth,
                    year: selectedYear,
                    reason: leaveAdjustReason.trim(),
                  };

                  try {
                    const res = await employeeService.adjustLeave(selectedEmp.id, payload);
                    const newBal = res?.currentBalance !== undefined ? Number(res.currentBalance) : remainingBal;

                    // Optimistic update of local employees list
                    setEmployees((prev) =>
                      prev.map((emp) =>
                        emp.id === selectedEmp.id
                          ? {
                              ...emp,
                              clBalance: leaveAdjustType === 'CL' ? newBal : emp.clBalance,
                              elBalance: leaveAdjustType === 'EL' ? newBal : emp.elBalance,
                            }
                          : emp
                      )
                    );

                    const actionVerb =
                      leaveAdjustAction === 'USAGE'
                        ? 'Deducted'
                        : leaveAdjustAction === 'ACCRUAL'
                        ? 'Added'
                        : 'Adjusted';

                    showFeedback(
                      'success',
                      `${actionVerb} ${numAmount} ${leaveAdjustType} for ${selectedEmp.name}. Remaining Balance: ${newBal.toFixed(2)} days.`
                    );

                    setIsLeaveAdjustModalOpen(false);
                    fetchEmployees();

                    if (selectedEmployeeForLeave === selectedEmp.id) {
                      employeeService.getLeaveLedger(selectedEmp.id).then((r) => setLeaveHistory(r.history));
                    }
                  } catch (err: any) {
                    showFeedback('error', err?.message || 'Leave adjustment failed');
                  }
                }}
                className="space-y-3.5 text-sm"
              >
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Select Employee *</label>
                  <select
                    value={selectedEmp?.id || ''}
                    onChange={(e) => setLeaveAdjustEmpId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs focus:outline-none focus:border-amber-500"
                  >
                    {activeStaff.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId}) • CL: {Number(emp.clBalance).toFixed(2)}, EL: {Number(emp.elBalance).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-1">Leave Type *</label>
                    <select
                      value={leaveAdjustType}
                      onChange={(e) => setLeaveAdjustType(e.target.value as 'CL' | 'EL')}
                      className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="CL">Casual Leave (CL)</option>
                      <option value="EL">Earned Leave (EL)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-1">Action Type *</label>
                    <select
                      value={leaveAdjustAction}
                      onChange={(e) => setLeaveAdjustAction(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="USAGE">CL/EL Debit (Used / Deduct)</option>
                      <option value="ACCRUAL">Credit (Accrual / Add)</option>
                      <option value="ADJUSTMENT">Custom Adjustment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-[#A1A1AA]">
                      {leaveAdjustAction === 'USAGE'
                        ? 'Days to Deduct (Debit) *'
                        : leaveAdjustAction === 'ACCRUAL'
                        ? 'Days to Credit (Accrual) *'
                        : 'Days to Adjust *'}
                    </label>
                    <span className="text-[11px] text-[#71717A]">Step: 0.25 / 0.5 / 1.0 day</span>
                  </div>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={leaveAdjustAmount}
                    onChange={(e) => setLeaveAdjustAmount(e.target.value)}
                    required
                    placeholder="e.g. 1.0"
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* ─── Real-Time Balance & Remaining Calculation Card ────────────── */}
                <div className="p-3.5 bg-[#09090B] border border-[#27272A] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">Current {leaveAdjustType} Balance:</span>
                    <span className="font-mono font-semibold text-[#FAFAFA]">{currentBal.toFixed(2)} days</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">
                      {leaveAdjustAction === 'USAGE'
                        ? `Debit (${leaveAdjustType} Used):`
                        : leaveAdjustAction === 'ACCRUAL'
                        ? `Credit (${leaveAdjustType} Added):`
                        : `Adjustment (${leaveAdjustType}):`}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        delta < 0 ? 'text-rose-400' : delta > 0 ? 'text-emerald-400' : 'text-[#71717A]'
                      }`}
                    >
                      {delta < 0 ? `-${Math.abs(delta).toFixed(2)}` : `+${delta.toFixed(2)}`} days
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#27272A] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[#FAFAFA]">
                        Remaining {leaveAdjustType} Balance:
                      </span>
                      {isNegativeRemaining && (
                        <span className="block text-[10px] text-rose-400 font-medium">
                          Note: Exceeds balance by {Math.abs(rawRemaining).toFixed(2)} days (clamped to 0.00)
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-sm font-mono font-bold ${
                        isNegativeRemaining ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      {remainingBal.toFixed(2)} days
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Reason for Adjustment *</label>
                  <input
                    type="text"
                    value={leaveAdjustReason}
                    onChange={(e) => setLeaveAdjustReason(e.target.value)}
                    required
                    placeholder="e.g. Leave taken on 10th Sep / Compensatory off granted"
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => setIsLeaveAdjustModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-1.5 font-semibold text-xs rounded-xl shadow transition text-white ${
                      leaveAdjustAction === 'USAGE'
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : 'bg-amber-600 hover:bg-amber-500'
                    }`}
                  >
                    {leaveAdjustAction === 'USAGE' ? 'Deduct Leave (Debit)' : 'Confirm Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: GIVE SALARY ADVANCE                                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isAddAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-[#FAFAFA]">Issue Salary Advance</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const payload = {
                  employeeId: formData.get('employeeId') as string,
                  amount: Number(formData.get('amount')),
                  advanceDate: (formData.get('advanceDate') as string) || new Date().toISOString().slice(0, 10),
                  reason: formData.get('reason') as string,
                  recoveryMonth: Number(formData.get('recoveryMonth')),
                  recoveryYear: Number(formData.get('recoveryYear')),
                };
                try {
                  await employeeService.createAdvance(payload);
                  showFeedback('success', 'Salary advance registered');
                  setIsAddAdvanceModalOpen(false);
                  fetchAdvancesAndDeductions();
                } catch (err: any) {
                  showFeedback('error', err?.message || 'Failed to issue advance');
                }
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Employee *</label>
                <select
                  name="employeeId"
                  required
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                >
                  <option value="" disabled selected>
                    -- Select Employee --
                  </option>
                  {employees
                    .filter((e) => e.status === 'ACTIVE')
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Advance Taken Date *</label>
                  <input
                    type="date"
                    name="advanceDate"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Advance Amount (₹) *</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="1"
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Recovery Month</label>
                  <select
                    name="recoveryMonth"
                    defaultValue={selectedMonth}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Recovery Year</label>
                  <select
                    name="recoveryYear"
                    defaultValue={selectedYear}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Reason for Advance *</label>
                <textarea
                  name="reason"
                  required
                  rows={2}
                  placeholder="e.g. Medical emergency / Festival advance"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsAddAdvanceModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl transition"
                >
                  Issue Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD DEDUCTION / PENALTY                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isAddDeductionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-[#FAFAFA]">Record Other Deduction</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const payload = {
                  employeeId: formData.get('employeeId') as string,
                  amount: Number(formData.get('amount')),
                  reason: formData.get('reason') as string,
                  applyMonth: Number(formData.get('applyMonth')),
                  applyYear: Number(formData.get('applyYear')),
                };
                try {
                  await employeeService.createDeduction(payload);
                  showFeedback('success', 'Deduction registered');
                  setIsAddDeductionModalOpen(false);
                  fetchAdvancesAndDeductions();
                } catch (err: any) {
                  showFeedback('error', err?.message || 'Failed to add deduction');
                }
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Employee *</label>
                <select
                  name="employeeId"
                  required
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                >
                  <option value="" disabled selected>
                    -- Select Employee --
                  </option>
                  {employees
                    .filter((e) => e.status === 'ACTIVE')
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Deduction Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Apply Month</label>
                  <select
                    name="applyMonth"
                    defaultValue={selectedMonth}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Apply Year</label>
                  <select
                    name="applyYear"
                    defaultValue={selectedYear}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Reason *</label>
                <textarea
                  name="reason"
                  required
                  rows={2}
                  placeholder="e.g. Penalty / Tool damage / Statutory deduction"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsAddDeductionModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition"
                >
                  Record Deduction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: SUPER ADMIN MARK PAID                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isMarkPaidModalOpen && selectedPayrollForPaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck size={20} />
              <h3 className="text-base font-bold text-[#FAFAFA]">Authorize Salary Disbursement</h3>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Confirming payment for <strong>{selectedPayrollForPaid.employee?.name}</strong> (
              {selectedPayrollForPaid.employee?.employeeId}) for amount{' '}
              <strong className="text-emerald-400">{formatINR(selectedPayrollForPaid.netSalary)}</strong>.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                handleMarkPaid({
                  paymentMode: formData.get('paymentMode') as string,
                  paymentReference: formData.get('paymentReference') as string,
                  paymentNotes: formData.get('paymentNotes') as string,
                });
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Payment Mode *</label>
                <select
                  name="paymentMode"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                >
                  <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                  <option value="IMPS / Instant Transfer">IMPS / Instant Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">UTR / Transaction Reference</label>
                <input
                  type="text"
                  name="paymentReference"
                  placeholder="e.g. UTR123456789"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Internal Notes</label>
                <input
                  type="text"
                  name="paymentNotes"
                  placeholder="e.g. Disbursed via SBI corporate netbanking"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => {
                    setIsMarkPaidModalOpen(false);
                    setSelectedPayrollForPaid(null);
                  }}
                  className="px-3 py-1.5 text-xs text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition"
                >
                  Confirm & Auto-Email Payslip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: EDIT ATTENDANCE RECORD                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {editingAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#FAFAFA]">Edit Attendance Record</h3>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Editing attendance for <strong className="text-amber-400">{editingAttendance.employee.name}</strong> on{' '}
                <span className="font-mono text-[#FAFAFA]">{editingAttendance.dateStr}</span> (Day {editingAttendance.day})
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                handleSaveEditedAttendance({
                  status: formData.get('status') as AttendanceStatus,
                  overtimeHours: Number(formData.get('overtimeHours') || 0),
                  isSundayOverride: formData.get('isSundayOverride') === 'true',
                  notes: (formData.get('notes') as string)?.trim() || undefined,
                });
              }}
              className="space-y-3.5 text-sm"
            >
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Attendance Status *</label>
                <select
                  name="status"
                  defaultValue={editingAttendance.record?.status || 'PRESENT'}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                >
                  <option value="PRESENT">Present (Full Day)</option>
                  <option value="CL">CL (Casual Leave)</option>
                  <option value="EL">EL (Earned Leave)</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="UL">UL (Unpaid Leave)</option>
                  <option value="LEAVE">Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    name="overtimeHours"
                    min="0"
                    max="24"
                    step="0.5"
                    defaultValue={editingAttendance.record ? Number(editingAttendance.record.overtimeHours) : 0}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Sunday Shift</label>
                  <select
                    name="isSundayOverride"
                    defaultValue={editingAttendance.record?.isSundayOverride ? 'true' : 'false'}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  >
                    <option value="false">Standard / Off</option>
                    <option value="true">Approved Sunday Work (Paid)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Remarks / Reason / Notes</label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={editingAttendance.record?.notes || ''}
                  placeholder="e.g. Late reporting by 30 mins, client visit"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEditingAttendance(null)}
                  className="px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: EDIT SALARY ADVANCE                                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {editingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#FAFAFA]">Edit Salary Advance</h3>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Employee: <strong className="text-[#FAFAFA]">{editingAdvance.employee?.name}</strong> ({editingAdvance.employee?.employeeId})
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                handleSaveEditedAdvance({
                  amount: Number(formData.get('amount')),
                  advanceDate: (formData.get('advanceDate') as string) || new Date().toISOString().slice(0, 10),
                  recoveryMonth: Number(formData.get('recoveryMonth')),
                  recoveryYear: Number(formData.get('recoveryYear')),
                  reason: formData.get('reason') as string,
                  isRecovered: formData.get('isRecovered') === 'true',
                });
              }}
              className="space-y-3 text-sm"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Advance Taken Date *</label>
                  <input
                    type="date"
                    name="advanceDate"
                    required
                    defaultValue={
                      editingAdvance.advanceDate
                        ? new Date(editingAdvance.advanceDate).toISOString().slice(0, 10)
                        : editingAdvance.createdAt
                        ? new Date(editingAdvance.createdAt).toISOString().slice(0, 10)
                        : new Date().toISOString().slice(0, 10)
                    }
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="1"
                    defaultValue={Number(editingAdvance.amount)}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Recovery Month</label>
                  <select
                    name="recoveryMonth"
                    defaultValue={editingAdvance.recoveryMonth}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Recovery Year</label>
                  <select
                    name="recoveryYear"
                    defaultValue={editingAdvance.recoveryYear}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Reason for Advance *</label>
                <textarea
                  name="reason"
                  required
                  rows={2}
                  defaultValue={editingAdvance.reason}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Recovery Status</label>
                <select
                  name="isRecovered"
                  defaultValue={editingAdvance.isRecovered ? 'true' : 'false'}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                >
                  <option value="false">Pending Recovery</option>
                  <option value="true">Recovered (Deducted from salary)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEditingAdvance(null)}
                  className="px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: EDIT DEDUCTION / PENALTY                                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {editingDeduction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#FAFAFA]">Edit Deduction</h3>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Employee: <strong className="text-[#FAFAFA]">{editingDeduction.employee?.name}</strong> ({editingDeduction.employee?.employeeId})
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                handleSaveEditedDeduction({
                  amount: Number(formData.get('amount')),
                  applyMonth: Number(formData.get('applyMonth')),
                  applyYear: Number(formData.get('applyYear')),
                  reason: formData.get('reason') as string,
                  isApplied: formData.get('isApplied') === 'true',
                });
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  defaultValue={Number(editingDeduction.amount)}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Apply Month</label>
                  <select
                    name="applyMonth"
                    defaultValue={editingDeduction.applyMonth}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Apply Year</label>
                  <select
                    name="applyYear"
                    defaultValue={editingDeduction.applyYear}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Reason *</label>
                <textarea
                  name="reason"
                  required
                  rows={2}
                  defaultValue={editingDeduction.reason}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Deduction Status</label>
                <select
                  name="isApplied"
                  defaultValue={editingDeduction.isApplied ? 'true' : 'false'}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-[#FAFAFA] text-xs"
                >
                  <option value="false">Pending</option>
                  <option value="true">Applied (Deducted from salary)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setEditingDeduction(null)}
                  className="px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
