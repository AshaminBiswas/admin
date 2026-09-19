/**
 * paymentFollowupApi.ts
 *
 * Client API methods for Payment Follow-up & Dues Recovery module.
 */

import { fetchAdminApi, API_BASE_URL, getAdminToken } from './adminApi';
import type {
  CustomerDueSummary,
  CustomerDuesDetail,
  DuesDashboardMetrics,
  AddOldCustomerInput,
  DuplicateWarningMatch,
  RecordPaymentAllocationInput,
  LogFollowupInput,
  DeclineDisputeInput,
  FollowupRule,
  BulkActionPreviewResult,
  BulkActionResult,
  AddCustomerBalanceEntryInput,
  SendCustomerCommunicationInput,
  CustomerLedgerData,
} from '../types/paymentFollowup';

export const paymentFollowupApi = {
  /**
   * Get KPI metrics deck for dashboard
   */
  getDashboardMetrics: async (): Promise<{ success: boolean; data: DuesDashboardMetrics }> => {
    return (await fetchAdminApi('/payment-followup/metrics')) as any;
  },

  /**
   * List customers with outstanding dues and dynamic aging
   */
  listCustomerDues: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    agingBucket?: string;
    followupStatus?: string;
    missingInfo?: string;
    sortBy?: 'aging' | 'amount' | 'lastFollowup' | 'customer';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    success: boolean;
    data: {
      items: CustomerDueSummary[];
      total: number;
      page: number;
      limit: number;
    };
  }> => {
    const qs = new URLSearchParams();
    if (params.page) qs.append('page', String(params.page));
    if (params.limit) qs.append('limit', String(params.limit));
    if (params.search) qs.append('search', params.search);
    if (params.agingBucket && params.agingBucket !== 'ALL') qs.append('agingBucket', params.agingBucket);
    if (params.followupStatus && params.followupStatus !== 'ALL') qs.append('followupStatus', params.followupStatus);
    if (params.missingInfo) qs.append('missingInfo', params.missingInfo);
    if (params.sortBy) qs.append('sortBy', params.sortBy);
    if (params.sortOrder) qs.append('sortOrder', params.sortOrder);

    return (await fetchAdminApi(`/payment-followup/customers?${qs.toString()}`)) as any;
  },

  /**
   * Get 360-degree dues detail for a customer
   */
  getCustomerDuesDetail: async (customerId: string): Promise<{ success: boolean; data: CustomerDuesDetail }> => {
    return (await fetchAdminApi(`/payment-followup/customers/${customerId}`)) as any;
  },

  /**
   * Check for duplicate customers before onboarding
   */
  checkDuplicateCustomer: async (input: {
    phone?: string;
    email?: string;
    gstin?: string;
    companyName?: string;
  }): Promise<{
    success: boolean;
    data: {
      matches: DuplicateWarningMatch[];
      hasDuplicates: boolean;
    };
  }> => {
    return (await fetchAdminApi('/payment-followup/check-duplicate', {
      method: 'POST',
      body: JSON.stringify(input),
    })) as any;
  },

  /**
   * Add legacy old customer with opening dues balance
   */
  addOldCustomer: async (input: AddOldCustomerInput): Promise<{ success: boolean; data: any }> => {
    return (await fetchAdminApi('/payment-followup/customers/old', {
      method: 'POST',
      body: JSON.stringify(input),
    })) as any;
  },

  /**
   * Record payment and execute allocation
   */
  recordPaymentAllocation: async (input: RecordPaymentAllocationInput): Promise<{ success: boolean; data: any }> => {
    return (await fetchAdminApi('/payment-followup/payments/allocate', {
      method: 'POST',
      body: JSON.stringify(input),
    })) as any;
  },

  /**
   * Log follow-up touchpoint (Call, SMS, Email, Note)
   */
  logFollowupTouchpoint: async (
    customerId: string,
    input: LogFollowupInput
  ): Promise<{ success: boolean; data: any }> => {
    return (await fetchAdminApi(`/payment-followup/customers/${customerId}/touchpoint`, {
      method: 'POST',
      body: JSON.stringify(input),
    })) as any;
  },

  /**
   * Decline or dispute customer follow-up
   */
  declineOrDispute: async (
    customerId: string,
    input: DeclineDisputeInput
  ): Promise<{ success: boolean; data: any }> => {
    return (await fetchAdminApi(`/payment-followup/customers/${customerId}/decline-dispute`, {
      method: 'POST',
      body: JSON.stringify(input),
    })) as any;
  },

  /**
   * Resume active follow-up for a disputed or declined account
   */
  resumeFollowup: async (customerId: string): Promise<{ success: boolean; data: any }> => {
    return (await fetchAdminApi(`/payment-followup/customers/${customerId}/resume`, {
      method: 'POST',
    })) as any;
  },

  /**
   * Add opening dues balance (Debit) or past payment (Credit) with custom date
   */
  addCustomerBalanceEntry: async (
    customerId: string,
    input: AddCustomerBalanceEntryInput
  ): Promise<{ success: boolean; data: any; message: string }> => {
    return (await fetchAdminApi(`/payment-followup/customers/${customerId}/balance-entry`, {
      method: 'POST',
      body: JSON.stringify(input),
    })) as any;
  },

  /**
   * Get dynamic ledger / Statement of Account data with date filtering
   */
  getCustomerLedger: async (
    customerId: string,
    params?: { fromDate?: string; toDate?: string }
  ): Promise<{ success: boolean; data: CustomerLedgerData }> => {
    const qs = new URLSearchParams();
    if (params?.fromDate) qs.append('fromDate', params.fromDate);
    if (params?.toDate) qs.append('toDate', params.toDate);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return (await fetchAdminApi(`/payment-followup/customers/${customerId}/ledger${query}`)) as any;
  },

  /**
   * Download Statement of Account PDF
   */
  downloadLedgerPdf: async (
    customerId: string,
    params?: { fromDate?: string; toDate?: string; filename?: string }
  ): Promise<void> => {
    const token = getAdminToken();
    const qs = new URLSearchParams();
    if (params?.fromDate) qs.append('fromDate', params.fromDate);
    if (params?.toDate) qs.append('toDate', params.toDate);
    const query = qs.toString() ? `?${qs.toString()}` : '';

    const res = await fetch(`${API_BASE_URL}/payment-followup/customers/${customerId}/ledger-pdf${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to download Statement of Account PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = params?.filename || `Statement-of-Account-${customerId.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Dispatch multi-channel communication (Email, WhatsApp, SMS) with dynamic document selection
   */
  sendCustomerCommunication: async (
    customerId: string,
    input: SendCustomerCommunicationInput
  ): Promise<{
    success: boolean;
    data: {
      emailSent?: boolean;
      smsSent?: boolean;
      whatsappUrl?: string;
      whatsappMessage?: string;
      attachmentsCount: number;
      message: string;
    };
  }> => {
    return (await fetchAdminApi(`/payment-followup/customers/${customerId}/send-communication`, {
      method: 'POST',
      body: JSON.stringify(input),
    })) as any;
  },

  /**
   * Send Statement of Account PDF email via Resend
   */
  sendLedgerEmail: async (
    customerId: string,
    input?: { recipientEmail?: string; subject?: string; body?: string }
  ): Promise<{ success: boolean; data: any }> => {
    return (await fetchAdminApi(`/payment-followup/customers/${customerId}/send-ledger`, {
      method: 'POST',
      body: JSON.stringify(input || {}),
    })) as any;
  },

  /**
   * Send SMS reminder
   */
  sendSmsReminder: async (
    customerId: string,
    input?: { phoneNumber?: string; template?: string }
  ): Promise<{ success: boolean; data: any }> => {
    return (await fetchAdminApi(`/payment-followup/customers/${customerId}/send-sms`, {
      method: 'POST',
      body: JSON.stringify(input || {}),
    })) as any;
  },

  /**
   * Generate preview for bulk action
   */
  previewBulk: async (
    customerIds: string[],
    actionType: 'SEND_LEDGER' | 'SEND_SMS'
  ): Promise<{ success: boolean; data: BulkActionPreviewResult }> => {
    return (await fetchAdminApi('/payment-followup/bulk/preview', {
      method: 'POST',
      body: JSON.stringify({ customerIds, actionType }),
    })) as any;
  },

  /**
   * Execute bulk ledger dispatch
   */
  executeBulkLedger: async (
    customerIds: string[],
    templates?: { subject?: string; body?: string }
  ): Promise<{ success: boolean; data: BulkActionResult }> => {
    return (await fetchAdminApi('/payment-followup/bulk/send-ledger', {
      method: 'POST',
      body: JSON.stringify({ customerIds, templates }),
    })) as any;
  },

  /**
   * Execute bulk SMS dispatch
   */
  executeBulkSms: async (
    customerIds: string[],
    template?: string
  ): Promise<{ success: boolean; data: BulkActionResult }> => {
    return (await fetchAdminApi('/payment-followup/bulk/send-sms', {
      method: 'POST',
      body: JSON.stringify({ customerIds, template }),
    })) as any;
  },

  /**
   * Follow-up rules management
   */
  listRules: async (): Promise<{ success: boolean; data: FollowupRule[] }> => {
    return (await fetchAdminApi('/payment-followup/rules')) as any;
  },

  upsertRule: async (input: Partial<FollowupRule>): Promise<{ success: boolean; data: FollowupRule }> => {
    return (await fetchAdminApi('/payment-followup/rules', {
      method: 'POST',
      body: JSON.stringify(input),
    })) as any;
  },

  deleteRule: async (ruleId: string): Promise<{ success: boolean }> => {
    return (await fetchAdminApi(`/payment-followup/rules/${ruleId}`, {
      method: 'DELETE',
    })) as any;
  },

  runScheduledTrigger: async (): Promise<{ success: boolean; data: any }> => {
    return (await fetchAdminApi('/payment-followup/rules/run-now', {
      method: 'POST',
    })) as any;
  },
};
