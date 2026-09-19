import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Search,
  Download,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  X,
  Check,
  CreditCard,
  ChevronRight,
  MessageCircle,
  Eye,
  FileText,
  Filter,
  ArrowRight,
  ShieldCheck,
  History,
  Calendar,
  AlertCircle,
  ExternalLink,
  Layers,
  Link2,
  PackageCheck,
  ArrowUpRight,
  ShoppingBag,
  FileCheck,
  CheckSquare,
  Copy,
  UserPlus,
  Send,
  MessageSquare,
  Ban,
  FileWarning,
  Sparkles,
  Sliders,
  RotateCcw,
  IndianRupee,
  Square,
  Printer,
  PhoneCall,
  Loader2,
} from 'lucide-react';
import { ProformaInvoice } from '../../types/proforma';
import { GSTInvoice, B2BOrder } from '../../types/admin';
import { proformaService } from '../../api/proformaService';
import { listGSTInvoices } from '../../api/gstInvoiceService';
import { b2bOrdersApi } from '../../api/b2bOrdersApi';
import { quotesService, AdminQuoteDetail } from '../../api/quotesService';
import { getPoSubmissions, getPoSubmissionById } from '../../api/poManagementService';
import { PoSubmissionItem, PoSubmissionDetail } from '../../types/poManagement';
import { fetchAdminApi } from '../../api/adminApi';
import { ProformaInvoiceDetailView } from './ProformaInvoiceDetailView';
import { ProformaInvoiceCreateView } from './ProformaInvoiceCreateView';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import type {
  CustomerDueSummary,
  DuesDashboardMetrics,
  FollowupRule,
} from '../../types/paymentFollowup';
import {
  AddOldCustomerModal,
  RecordPaymentAllocationModal,
  LogFollowupModal,
  SendLedgerModal,
  SendSmsReminderModal,
  DeclineDisputeModal,
  BulkCommunicationModal,
  CustomerDuesDetailDrawer,
} from '../../components/payment-followup';
import { printStatementOfAccount } from '../../utils/customerLedgerPdfGenerator';

// ─── Unified B2B Commercial Payment Record ─────────────────────────────────────
export interface B2BPaymentRecord {
  id: string;
  sourceType: 'PROFORMA_INVOICE' | 'GST_TAX_INVOICE' | 'B2B_ORDER';
  documentNumber: string;
  issueDate: string;
  dueDate: string;
  daysElapsed: number;
  daysRemaining: number;
  isOverdue: boolean;
  isExpiringSoon: boolean;

  // Customer / Enterprise Buyer Profile
  customerId?: string;
  customerName: string;
  companyName?: string;
  customerGstin?: string;
  customerPhone?: string;
  customerEmail?: string;
  placeOfSupply?: string;

  // Financial Ledger Values
  grandTotal: number;
  advancePayable: number;
  advancePaid: number;
  balanceDue: number;
  totalPaid: number;

  // Payment Lifecycle & Audit
  paymentStatus:
    | 'AWAITING_ADVANCE'
    | 'CUSTOMER_SUBMITTED'
    | 'ADVANCE_RECEIVED'
    | 'PARTIALLY_PAID'
    | 'FULLY_PAID'
    | 'OVERDUE'
    | 'CANCELLED';
  paymentType:
    | 'ADVANCE_DEPOSIT'
    | 'BALANCE_PAYMENT'
    | 'FULL_SETTLEMENT'
    | 'CREDIT_TERM_RECEIVABLE'
    | 'DIRECT_ORDER_PAYMENT';
  paymentMode?: string;
  transactionRef?: string;
  receiptUrl?: string;
  lastPaymentDate?: string;
  notes?: string;

  // Follow-up & Collections Intelligence
  lastFollowUp?: {
    date: string;
    channel: string;
    stage: string;
    notes: string;
    agent: string;
    ptpDate?: string | null;
    ptpAmount?: number | null;
    nextFollowupDate?: string | null;
  } | null;
  ptpDate?: string | null;
  ptpAmount?: number | null;
  nextFollowupDate?: string | null;
  followupStatus?: 'PTP_PROMISED' | 'FOLLOWUP_OVERDUE' | 'FOLLOWUP_DUE_TODAY' | 'FOLLOWUP_SCHEDULED' | 'NO_FOLLOWUP';
  history?: Array<{
    id?: string;
    action: string;
    performedBy?: string;
    details?: string;
    metadata?: any;
    createdAt?: string;
  }>;

  // Linked Upstream & Downstream Commercial Documents
  linkedDocuments: {
    quotation?: {
      id?: string;
      quoteNumber: string;
      referenceNo?: string | null;
      grandTotal?: number;
      status?: string;
      createdAt?: string;
    } | null;
    po?: {
      id?: string;
      poNumber: string;
      customerPoNumber?: string | null;
      poSubmissionId?: string | null;
      status?: string;
      subject?: string;
      receivedAt?: string;
    } | null;
    pi?: {
      id?: string;
      piNumber: string;
      grandTotal?: number;
      advanceAmount?: number;
      balanceDue?: number;
      status?: string;
      createdAt?: string;
    } | null;
    b2bOrder?: {
      id?: string;
      orderNumber: string;
      grandTotal?: number;
      paidAmount?: number;
      dueAmount?: number;
      status?: string;
      paymentStatus?: string;
      branchName?: string;
      createdAt?: string;
    } | null;
  };

  // Underlying Raw Document for Deep Navigation
  rawDoc?: any;
}

// ─── B2B Customer Account Summary ─────────────────────────────────────────────
export interface B2BCustomerAccountSummary {
  customerId: string;
  customerName: string;
  companyName: string;
  gstin: string;
  phone: string;
  email: string;
  placeOfSupply: string;

  totalInvoicedValue: number;
  totalAdvanceCollected: number;
  totalPaymentsReceived: number;
  totalOutstandingDue: number;

  totalDocumentsCount: number;
  openProformasCount: number;
  openGstInvoicesCount: number;
  openOrdersCount: number;

  oldestPendingDays: number;
  overdueDocumentsCount: number;
  overdueAmount: number;
  riskLevel: 'LOW_RISK' | 'MODERATE' | 'HIGH_RISK_OVERDUE';
}

// ─── Reminder Message Formatting Helpers ─────────────────────────────────────
export function generateWhatsAppReminderMessage(record: B2BPaymentRecord): string {
  const isPi = record.sourceType === 'PROFORMA_INVOICE';
  const docTitle = isPi ? `Proforma Invoice ${record.documentNumber}` : `Tax Invoice ${record.documentNumber}`;
  const amountDue = isPi && record.advancePayable > 0 && record.advancePaid === 0 ? record.advancePayable : record.balanceDue;
  const payType = isPi && record.advancePayable > 0 && record.advancePaid === 0
    ? `${record.rawDoc?.advancePercentage || 30}% Advance Deposit`
    : 'Commercial Settlement';

  const verificationToken = record.rawDoc?.verificationToken || record.rawDoc?.id;
  const onlinePayLink = verificationToken
    ? `https://prchardware.com/pi/${verificationToken}`
    : `https://prchardware.com`;

  return `*PRC HARDWARE — Commercial Accounts Remittance Notice*
━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear *${record.customerName || record.companyName}*,

This is a polite payment follow-up notice regarding *${docTitle}*.

• *Total Invoiced Value:* ₹${record.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• *Amount Pending:* *₹${amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}* (${payType})
• *Due Date:* ${new Date(record.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

*Official Bank Remittance Details (PRC Hardware):*
• *Bank Name:* HDFC Bank Ltd
• *Account Name:* Pacific Products and Solutions
• *Account No:* 50200088991122
• *IFSC Code:* HDFC0001234
• *Branch:* Mandoli Works, Delhi - 110093
• *UPI / VPA:* prchardware@hdfcbank

*View Invoice & Submit Payment Proof / UTR:*
${onlinePayLink}

Kindly share your Bank UTR or payment screenshot upon transfer for immediate dispatch clearance.

*PRC Hardware Commercial Accounts Desk*
www.prchardware.com`;
}

export function generateEmailReminder(record: B2BPaymentRecord): string {
  const isPi = record.sourceType === 'PROFORMA_INVOICE';
  const docTitle = isPi ? `Proforma Invoice ${record.documentNumber}` : `Tax Invoice ${record.documentNumber}`;
  const amountDue = isPi && record.advancePayable > 0 && record.advancePaid === 0 ? record.advancePayable : record.balanceDue;
  const subject = encodeURIComponent(`Payment Reminder Notice — ${docTitle} [₹${amountDue.toLocaleString('en-IN')}] | PRC Hardware`);
  const body = encodeURIComponent(
`Dear ${record.customerName || record.companyName},

Greetings from PRC Hardware Commercial Accounts Desk.

This is a gentle reminder regarding the pending remittance for ${docTitle}.

Amount Due: INR ${amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
Due Date: ${new Date(record.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

Kindly arrange the bank remittance via RTGS/NEFT/UPI to our HDFC Current Account (A/C: 50200088991122, IFSC: HDFC0001234) and provide the UTR reference for priority clearance.

Thank you,
Commercial Accounts Desk
PRC Hardware
www.prchardware.com`
  );
  return `mailto:${record.customerEmail || ''}?subject=${subject}&body=${body}`;
}

export type CockpitTab =
  | 'DUES_RECOVERY'
  | 'DOCUMENTS_LEDGER'
  | 'CUSTOMER_ACCOUNTS'
  | 'DISPUTED_ACCOUNTS'
  | 'AUTOMATION_RULES';

export function AdvancePaymentsTrackerPage() {
  // Active Cockpit Tab
  const [activeTab, setActiveTab] = useState<CockpitTab>('DUES_RECOVERY');

  // Dues Recovery & Aging Data States
  const [duesCustomers, setDuesCustomers] = useState<CustomerDueSummary[]>([]);
  const [duesMetrics, setDuesMetrics] = useState<DuesDashboardMetrics | null>(null);
  const [loadingDues, setLoadingDues] = useState(false);
  const [duesSearchQuery, setDuesSearchQuery] = useState('');
  const [agingBucketFilter, setAgingBucketFilter] = useState<string>('ALL');
  const [followupStatusFilter, setFollowupStatusFilter] = useState<string>('ALL');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Follow-up Rules Data States
  const [followupRules, setFollowupRules] = useState<FollowupRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [runningTrigger, setRunningTrigger] = useState(false);

  // New Modals State
  const [isAddOldCustomerOpen, setIsAddOldCustomerOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [drawerCustomerId, setDrawerCustomerId] = useState<string | null>(null);

  const [allocationModal, setAllocationModal] = useState<{
    isOpen: boolean;
    customerId: string;
    customerName: string;
    companyName?: string | null;
    totalOutstanding: number;
    initialDueId?: string;
  }>({
    isOpen: false,
    customerId: '',
    customerName: '',
    totalOutstanding: 0,
  });

  const [logFollowupModal, setLogFollowupModal] = useState<{
    isOpen: boolean;
    customerId: string;
    customerName: string;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
    outstandingAmount: number;
  }>({
    isOpen: false,
    customerId: '',
    customerName: '',
    outstandingAmount: 0,
  });

  const [sendLedgerModal, setSendLedgerModal] = useState<{
    isOpen: boolean;
    customerId: string;
    customerName: string;
    companyName?: string | null;
    email?: string | null;
    totalOutstanding: number;
  }>({
    isOpen: false,
    customerId: '',
    customerName: '',
    totalOutstanding: 0,
  });

  const [sendSmsModal, setSendSmsModal] = useState<{
    isOpen: boolean;
    customerId: string;
    customerName: string;
    companyName?: string | null;
    phone?: string | null;
    totalOutstanding: number;
  }>({
    isOpen: false,
    customerId: '',
    customerName: '',
    totalOutstanding: 0,
  });

  const [declineDisputeModal, setDeclineDisputeModal] = useState<{
    isOpen: boolean;
    customerId: string;
    customerName: string;
    companyName?: string | null;
    totalOutstanding: number;
  }>({
    isOpen: false,
    customerId: '',
    customerName: '',
    totalOutstanding: 0,
  });

  // Multi-Source Data States
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([]);
  const [gstInvoices, setGstInvoices] = useState<GSTInvoice[]>([]);
  const [b2bOrders, setB2bOrders] = useState<B2BOrder[]>([]);
  const [quotes, setQuotes] = useState<AdminQuoteDetail[]>([]);
  const [poSubmissions, setPoSubmissions] = useState<PoSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [agingFilter, setAgingFilter] = useState<string>('ALL');
  const [selectedCustomerIdFilter, setSelectedCustomerIdFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'aging' | 'balance' | 'total' | 'date'>('aging');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals & Sub-Views
  const [selectedProforma, setSelectedProforma] = useState<ProformaInvoice | null>(null);
  const [editingProforma, setEditingProforma] = useState<ProformaInvoice | null>(null);
  const [paymentModalRecord, setPaymentModalRecord] = useState<B2BPaymentRecord | null>(null);
  const [detailsModalRecord, setDetailsModalRecord] = useState<B2BPaymentRecord | null>(null);

  // Quick Document Inspectors
  const [inspectingQuoteId, setInspectingQuoteId] = useState<string | null>(null);
  const [quoteDetail, setQuoteDetail] = useState<AdminQuoteDetail | null>(null);
  const [loadingQuoteDetail, setLoadingQuoteDetail] = useState(false);

  const [inspectingPoId, setInspectingPoId] = useState<string | null>(null);
  const [poDetail, setPoDetail] = useState<PoSubmissionDetail | null>(null);
  const [loadingPoDetail, setLoadingPoDetail] = useState(false);

  const [inspectingB2bOrderId, setInspectingB2bOrderId] = useState<string | null>(null);
  const [b2bOrderDetail, setB2bOrderDetail] = useState<B2BOrder | null>(null);
  const [loadingB2bOrderDetail, setLoadingB2bOrderDetail] = useState(false);

  // Payment Form States
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('RTGS');
  const [paymentUtr, setPaymentUtr] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bankAccountCredited, setBankAccountCredited] = useState<string>('HDFC Bank - Current A/C (Mandoli Branch)');
  const [targetStatus, setTargetStatus] = useState<string>('ADVANCE_RECEIVED');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Follow-up Form States (Inside Details Modal)
  const [followupChannel, setFollowupChannel] = useState<'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON'>('PHONE');
  const [followupStage, setFollowupStage] = useState<'COURTESY_REMINDER' | 'DUE_WARNING' | 'OVERDUE_ALERT' | 'PROMISE_TO_PAY'>('COURTESY_REMINDER');
  const [followupNotes, setFollowupNotes] = useState<string>('');
  const [followupPtpDate, setFollowupPtpDate] = useState<string>('');
  const [followupPtpAmount, setFollowupPtpAmount] = useState<number>(0);
  const [followupNextDate, setFollowupNextDate] = useState<string>('');
  const [savingFollowup, setSavingFollowup] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ─── Quick Document Inspectors Handlers ─────────────────────────────────────
  const handleInspectQuote = async (quoteIdOrNum: string) => {
    setInspectingQuoteId(quoteIdOrNum);
    setLoadingQuoteDetail(true);
    try {
      const existing = quotes.find(
        (q) => q.id === quoteIdOrNum || q.quoteNumber === quoteIdOrNum || q.referenceNo === quoteIdOrNum
      );
      if (existing && existing.items && existing.items.length > 0) {
        setQuoteDetail(existing);
      } else {
        const qId = existing?.id || quoteIdOrNum;
        const fetched = await quotesService.getQuoteById(qId);
        setQuoteDetail(fetched || existing || null);
      }
    } catch (e: any) {
      console.error('Failed to load quote detail:', e);
      const fallback = quotes.find((q) => q.id === quoteIdOrNum || q.quoteNumber === quoteIdOrNum);
      if (fallback) setQuoteDetail(fallback);
      else showToast('Could not fetch quotation details', 'error');
    } finally {
      setLoadingQuoteDetail(false);
    }
  };

  const handleInspectPo = async (poIdOrNum: string) => {
    setInspectingPoId(poIdOrNum);
    setLoadingPoDetail(true);
    try {
      const existing = poSubmissions.find(
        (p) => p.id === poIdOrNum || p.poSubmissionId === poIdOrNum || p.customerPoNumber === poIdOrNum
      );
      const poId = existing?.id || poIdOrNum;
      const detail = await getPoSubmissionById(poId);
      setPoDetail(detail);
    } catch (e: any) {
      console.error('Failed to load PO detail:', e);
      const existing = poSubmissions.find(
        (p) => p.id === poIdOrNum || p.poSubmissionId === poIdOrNum || p.customerPoNumber === poIdOrNum
      );
      if (existing) {
        setPoDetail({
          ...existing,
          emails: [],
          attachments: [],
          internalNotes: [],
          activityLogs: [],
        });
      } else {
        showToast('Could not fetch PO details', 'error');
      }
    } finally {
      setLoadingPoDetail(false);
    }
  };

  const handleInspectB2bOrder = async (orderIdOrNum: string) => {
    setInspectingB2bOrderId(orderIdOrNum);
    setLoadingB2bOrderDetail(true);
    try {
      const existing = b2bOrders.find((o) => o.id === orderIdOrNum || o.orderNumber === orderIdOrNum);
      if (existing && existing.items && existing.items.length > 0) {
        setB2bOrderDetail(existing);
      } else {
        const ordId = existing?.id || orderIdOrNum;
        const res = await b2bOrdersApi.getB2BOrder(ordId);
        if (res.success && res.data) {
          setB2bOrderDetail(res.data);
        } else if (existing) {
          setB2bOrderDetail(existing);
        }
      }
    } catch (e: any) {
      console.error('Failed to load B2B order detail:', e);
      const existing = b2bOrders.find((o) => o.id === orderIdOrNum || o.orderNumber === orderIdOrNum);
      if (existing) setB2bOrderDetail(existing);
      else showToast('Could not fetch B2B order details', 'error');
    } finally {
      setLoadingB2bOrderDetail(false);
    }
  };

  const handleInspectPi = (piIdOrNum: string) => {
    const pi = proformaInvoices.find((p) => p.id === piIdOrNum || p.piNumber === piIdOrNum);
    if (pi) {
      setSelectedProforma(pi);
    } else {
      showToast(`Proforma ${piIdOrNum} not found in current ledger`, 'error');
    }
  };

  // ─── Fetch Multi-Source Commercial Data ──────────────────────────────────────
  const fetchAllCommercialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [piRes, gstRes, b2bRes, quoteRes, poRes, metricsRes, duesRes] = await Promise.allSettled([
        proformaService.listProformaInvoices({ limit: 100 }),
        listGSTInvoices({ limit: 100 }),
        b2bOrdersApi.listB2BOrders({ limit: 100 }),
        quotesService.listQuotes({ limit: 100 }),
        getPoSubmissions({ limit: 100 }),
        paymentFollowupApi.getDashboardMetrics(),
        paymentFollowupApi.listCustomerDues({ limit: 150 }),
      ]);

      if (piRes.status === 'fulfilled' && piRes.value) {
        const pis = Array.isArray(piRes.value.data)
          ? piRes.value.data
          : Array.isArray(piRes.value)
          ? piRes.value
          : [];
        setProformaInvoices(pis);
      }

      if (gstRes.status === 'fulfilled' && gstRes.value) {
        const gsts = Array.isArray(gstRes.value.items)
          ? gstRes.value.items
          : Array.isArray(gstRes.value)
          ? gstRes.value
          : [];
        setGstInvoices(gsts);
      }

      if (b2bRes.status === 'fulfilled' && b2bRes.value) {
        const ordersList = b2bRes.value.data?.items || [];
        setB2bOrders(Array.isArray(ordersList) ? ordersList : []);
      }

      if (quoteRes.status === 'fulfilled' && quoteRes.value) {
        const quotesList = quoteRes.value.data || [];
        setQuotes(Array.isArray(quotesList) ? quotesList : []);
      }

      if (poRes.status === 'fulfilled' && poRes.value) {
        const poList = poRes.value.items || [];
        setPoSubmissions(Array.isArray(poList) ? poList : []);
      }

      if (metricsRes.status === 'fulfilled' && metricsRes.value?.success) {
        setDuesMetrics(metricsRes.value.data);
      }

      if (duesRes.status === 'fulfilled' && duesRes.value?.success) {
        setDuesCustomers(duesRes.value.data.items || []);
      }
    } catch (err: any) {
      console.error('[AdvancePaymentsTracker] Load error:', err);
      setError(err?.message || 'Failed to aggregate commercial payment records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDuesData = async () => {
    setLoadingDues(true);
    try {
      const [metricsRes, duesRes] = await Promise.allSettled([
        paymentFollowupApi.getDashboardMetrics(),
        paymentFollowupApi.listCustomerDues({
          search: duesSearchQuery || undefined,
          agingBucket: agingBucketFilter !== 'ALL' ? agingBucketFilter : undefined,
          followupStatus: followupStatusFilter !== 'ALL' ? followupStatusFilter : undefined,
          limit: 150,
        }),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value?.success) {
        setDuesMetrics(metricsRes.value.data);
      }
      if (duesRes.status === 'fulfilled' && duesRes.value?.success) {
        setDuesCustomers(duesRes.value.data.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch dues recovery data:', e);
    } finally {
      setLoadingDues(false);
    }
  };

  const fetchFollowupRules = async () => {
    setLoadingRules(true);
    try {
      const res = await paymentFollowupApi.listRules();
      if (res.success && res.data) {
        setFollowupRules(res.data);
      }
    } catch (e) {
      console.error('Failed to load rules:', e);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleRunScheduledTrigger = async () => {
    setRunningTrigger(true);
    try {
      const res = await paymentFollowupApi.runScheduledTrigger();
      if (res.success) {
        showToast(res.data?.message || 'Scheduled follow-up reminder cycle executed successfully!');
        fetchDuesData();
      } else {
        showToast('Failed to trigger scheduled reminders', 'error');
      }
    } catch (e: any) {
      showToast(e?.message || 'Error running trigger', 'error');
    } finally {
      setRunningTrigger(false);
    }
  };

  const handleToggleRule = async (rule: FollowupRule) => {
    try {
      await paymentFollowupApi.upsertRule({
        id: rule.id,
        name: rule.name,
        isEnabled: !rule.isEnabled,
        agingThresholdDays: rule.agingThresholdDays,
        repeatIntervalDays: rule.repeatIntervalDays,
        communicationType: rule.communicationType,
        maxReminders: rule.maxReminders,
        templateSubject: rule.templateSubject || undefined,
        templateBody: rule.templateBody,
      });
      showToast(`Rule "${rule.name}" ${!rule.isEnabled ? 'activated' : 'paused'}`);
      fetchFollowupRules();
    } catch (e: any) {
      showToast(e?.message || 'Failed to update rule', 'error');
    }
  };

  const handleResumeCustomer = async (customerId: string) => {
    try {
      await paymentFollowupApi.resumeFollowup(customerId);
      showToast('Customer returned to active payment follow-up cycle!');
      fetchDuesData();
      fetchAllCommercialData();
    } catch (e: any) {
      showToast(e?.message || 'Failed to resume follow-up', 'error');
    }
  };

  const handleToggleSelectCustomer = (customerId: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    );
  };

  const handleSelectAllFilteredDues = () => {
    if (selectedCustomerIds.length === filteredDuesCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredDuesCustomers.map((c) => c.customerId));
    }
  };

  useEffect(() => {
    fetchAllCommercialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'AUTOMATION_RULES') {
      fetchFollowupRules();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'DUES_RECOVERY') {
      fetchDuesData();
    }
  }, [agingBucketFilter, followupStatusFilter]);

  // ─── Normalize Unified Commercial Records ────────────────────────────────────
  const unifiedRecords: B2BPaymentRecord[] = useMemo(() => {
    const records: B2BPaymentRecord[] = [];
    const now = Date.now();

    // 0. Lookup HashMaps for O(1) cross-document linking
    const quotesById = new Map<string, AdminQuoteDetail>();
    const quotesByNum = new Map<string, AdminQuoteDetail>();
    quotes.forEach((q) => {
      if (q.id) quotesById.set(q.id, q);
      if (q.quoteNumber) quotesByNum.set(q.quoteNumber.toLowerCase(), q);
      if (q.referenceNo) quotesByNum.set(q.referenceNo.toLowerCase(), q);
    });

    const posById = new Map<string, PoSubmissionItem>();
    const posByNum = new Map<string, PoSubmissionItem>();
    const posBySubId = new Map<string, PoSubmissionItem>();
    poSubmissions.forEach((p) => {
      if (p.id) posById.set(p.id, p);
      if (p.poSubmissionId) posBySubId.set(p.poSubmissionId.toLowerCase(), p);
      if (p.customerPoNumber) posByNum.set(p.customerPoNumber.toLowerCase(), p);
    });

    const pisById = new Map<string, ProformaInvoice>();
    const pisByNum = new Map<string, ProformaInvoice>();
    const pisByQuoteId = new Map<string, ProformaInvoice>();
    const pisByPoId = new Map<string, ProformaInvoice>();
    proformaInvoices.forEach((pi) => {
      if (pi.id) pisById.set(pi.id, pi);
      if (pi.piNumber) pisByNum.set(pi.piNumber.toLowerCase(), pi);
      if ((pi as any).quoteId) pisByQuoteId.set((pi as any).quoteId, pi);
      if (pi.quoteReference) pisByQuoteId.set(pi.quoteReference.toLowerCase(), pi);
      if ((pi as any).poId) pisByPoId.set((pi as any).poId, pi);
      if (pi.poReference) pisByPoId.set(pi.poReference.toLowerCase(), pi);
    });

    const b2bOrdersById = new Map<string, B2BOrder>();
    const b2bOrdersByNum = new Map<string, B2BOrder>();
    const b2bOrdersByPiId = new Map<string, B2BOrder>();
    const b2bOrdersByQuoteId = new Map<string, B2BOrder>();
    const b2bOrdersByPoId = new Map<string, B2BOrder>();
    b2bOrders.forEach((o) => {
      if (o.id) b2bOrdersById.set(o.id, o);
      if (o.orderNumber) b2bOrdersByNum.set(o.orderNumber.toLowerCase(), o);
      if (o.sourcePiId) b2bOrdersByPiId.set(o.sourcePiId, o);
      if (o.sourceQuotationId) b2bOrdersByQuoteId.set(o.sourceQuotationId, o);
      if (o.sourcePoId) b2bOrdersByPoId.set(o.sourcePoId, o);
    });

    // 1. Proforma Invoices (PIs)
    proformaInvoices.forEach((pi) => {
      const issueTime = new Date(pi.issueDate || (pi as any).createdAt || now).getTime();
      const daysElapsed = Math.max(0, Math.floor((now - issueTime) / (1000 * 60 * 60 * 24)));
      const validUntilTime = new Date(pi.validUntil || issueTime + 30 * 86400000).getTime();
      const daysRemaining = Math.ceil((validUntilTime - now) / (1000 * 60 * 60 * 24));

      const isCleared = pi.status === 'ADVANCE_RECEIVED' || pi.status === 'APPROVED' || pi.status === 'CONVERTED_TO_INVOICE';
      const isOverdue = !isCleared && daysRemaining < 0;
      const isExpiringSoon = !isCleared && daysRemaining >= 0 && daysRemaining <= 7;

      const customerFeedbackEvent = pi.history?.find((h) => h.action.toUpperCase().includes('CUSTOMER'));
      const customerUtr =
        customerFeedbackEvent?.metadata?.advancePaymentRef ||
        pi.notes?.match(/Advance Ref:\s*([^\s\]\)]+)/i)?.[1] ||
        pi.history?.find((h) => h.metadata?.transactionRef)?.metadata?.transactionRef ||
        undefined;

      const receiptUrl =
        customerFeedbackEvent?.metadata?.paymentReceiptUrl ||
        pi.history?.find((h) => h.metadata?.paymentReceiptUrl)?.metadata?.paymentReceiptUrl ||
        undefined;

      const grandTotal = Number(pi.grandTotal || 0);
      const advPayable = Number(pi.advancePayable || (grandTotal * (pi.advancePercentage || 30)) / 100);
      const advancePaid = isCleared ? advPayable : 0;
      const balanceDue = isCleared ? Number(pi.balancePayable || (grandTotal - advPayable)) : grandTotal;
      const totalPaid = advancePaid;

      let paymentStatus: B2BPaymentRecord['paymentStatus'] = 'AWAITING_ADVANCE';
      if (pi.status === 'CANCELLED') paymentStatus = 'CANCELLED';
      else if (isCleared) paymentStatus = pi.status === 'APPROVED' ? 'FULLY_PAID' : 'ADVANCE_RECEIVED';
      else if (pi.status === 'ACCEPTED' || Boolean(customerUtr)) paymentStatus = 'CUSTOMER_SUBMITTED';
      else if (isOverdue) paymentStatus = 'OVERDUE';

      // Cross-link Quotation
      const rawQuoteNum = (pi as any).quoteNumber || pi.quoteReference;
      const rawQuoteId = (pi as any).quoteId;
      const linkedQuote =
        (rawQuoteId ? quotesById.get(rawQuoteId) : undefined) ||
        (rawQuoteNum ? quotesByNum.get(rawQuoteNum.toLowerCase()) : undefined);

      // Cross-link PO
      const rawPoNum = (pi as any).customerPoNumber || (pi as any).poNumber || pi.poReference;
      const rawPoId = (pi as any).poId;
      const linkedPo =
        (rawPoId ? posById.get(rawPoId) : undefined) ||
        (rawPoNum ? posByNum.get(rawPoNum.toLowerCase()) : undefined);

      // Cross-link B2B Order
      const linkedOrder =
        b2bOrdersByPiId.get(pi.id) ||
        ((pi as any).orderId ? b2bOrdersById.get((pi as any).orderId) : undefined) ||
        (rawQuoteId ? b2bOrdersByQuoteId.get(rawQuoteId) : undefined) ||
        (rawPoId ? b2bOrdersByPoId.get(rawPoId) : undefined);

      records.push({
        id: `PI-${pi.id}`,
        sourceType: 'PROFORMA_INVOICE',
        documentNumber: pi.piNumber,
        issueDate: pi.issueDate || new Date().toISOString().slice(0, 10),
        dueDate: pi.validUntil || new Date(issueTime + 30 * 86400000).toISOString().slice(0, 10),
        daysElapsed,
        daysRemaining,
        isOverdue,
        isExpiringSoon,
        customerId: pi.customerId,
        customerName: pi.customerName || 'B2B Client',
        companyName: pi.companyName || pi.customerName,
        customerGstin: pi.customerGstin,
        customerPhone: pi.customerPhone,
        customerEmail: pi.customerEmail,
        placeOfSupply: pi.placeOfSupply,
        grandTotal,
        advancePayable: advPayable,
        advancePaid,
        balanceDue,
        totalPaid,
        paymentStatus,
        paymentType: 'ADVANCE_DEPOSIT',
        paymentMode: isCleared ? 'RTGS' : undefined,
        transactionRef: customerUtr,
        receiptUrl,
        notes: pi.notes,
        history: pi.history || [],
        rawDoc: pi,
        linkedDocuments: {
          quotation: linkedQuote
            ? {
                id: linkedQuote.id,
                quoteNumber: linkedQuote.quoteNumber,
                referenceNo: linkedQuote.referenceNo,
                grandTotal: linkedQuote.grandTotal,
                status: linkedQuote.status,
                createdAt: linkedQuote.createdAt,
              }
            : rawQuoteNum
            ? {
                id: rawQuoteId,
                quoteNumber: rawQuoteNum,
                referenceNo: rawQuoteNum,
                status: 'LINKED',
              }
            : null,
          po: linkedPo
            ? {
                id: linkedPo.id,
                poNumber: linkedPo.customerPoNumber || linkedPo.poSubmissionId || linkedPo.id,
                customerPoNumber: linkedPo.customerPoNumber,
                poSubmissionId: linkedPo.poSubmissionId,
                status: linkedPo.status,
                subject: linkedPo.subject,
                receivedAt: linkedPo.receivedAt,
              }
            : rawPoNum
            ? {
                id: rawPoId,
                poNumber: rawPoNum,
                customerPoNumber: rawPoNum,
                status: 'ATTACHED',
              }
            : null,
          pi: {
            id: pi.id,
            piNumber: pi.piNumber,
            grandTotal: pi.grandTotal,
            advanceAmount: pi.advancePayable,
            balanceDue: pi.balancePayable,
            status: pi.status,
            createdAt: pi.issueDate || (pi as any).createdAt,
          },
          b2bOrder: linkedOrder
            ? {
                id: linkedOrder.id,
                orderNumber: linkedOrder.orderNumber,
                grandTotal: linkedOrder.grandTotal,
                paidAmount: linkedOrder.paidAmount,
                dueAmount: linkedOrder.dueAmount,
                status: linkedOrder.status,
                paymentStatus: linkedOrder.paymentStatus,
                branchName: linkedOrder.branch?.name,
                createdAt: linkedOrder.createdAt,
              }
            : null,
        },
      });
    });

    // 2. GST Invoices
    gstInvoices.forEach((inv) => {
      const issueTime = new Date(inv.invoice_date || inv.created_at || now).getTime();
      const daysElapsed = Math.max(0, Math.floor((now - issueTime) / (1000 * 60 * 60 * 24)));
      const dueTime = issueTime + 30 * 86400000;
      const daysRemaining = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));

      const isPaid = (inv.status as string) === 'PAID' || Boolean(inv.notes?.includes('[Payment Cleared'));
      const isOverdue = !isPaid && daysRemaining < 0;
      const isExpiringSoon = !isPaid && daysRemaining >= 0 && daysRemaining <= 7;

      const grandTotal = Number(inv.grand_total || 0);
      const totalPaid = isPaid ? grandTotal : 0;
      const balanceDue = isPaid ? 0 : grandTotal;

      let paymentStatus: B2BPaymentRecord['paymentStatus'] = 'AWAITING_ADVANCE';
      if (inv.status === 'CANCELLED') paymentStatus = 'CANCELLED';
      else if (isPaid) paymentStatus = 'FULLY_PAID';
      else if (isOverdue) paymentStatus = 'OVERDUE';
      else paymentStatus = 'PARTIALLY_PAID';

      const rawPiId = (inv as any).proforma_invoice_id;
      const rawOrderId = (inv as any).order_id;
      const linkedPi = rawPiId ? pisById.get(rawPiId) : undefined;
      const linkedOrder = rawOrderId
        ? b2bOrdersById.get(rawOrderId)
        : linkedPi
        ? b2bOrdersByPiId.get(linkedPi.id)
        : undefined;
      const linkedQuote = (linkedPi as any)?.quoteId
        ? quotesById.get((linkedPi as any).quoteId)
        : linkedOrder?.sourceQuotationId
        ? quotesById.get(linkedOrder.sourceQuotationId)
        : undefined;
      const linkedPo = (linkedPi as any)?.poId
        ? posById.get((linkedPi as any).poId)
        : linkedOrder?.sourcePoId
        ? posById.get(linkedOrder.sourcePoId)
        : undefined;

      records.push({
        id: `GST-${inv.id}`,
        sourceType: 'GST_TAX_INVOICE',
        documentNumber: inv.invoice_number,
        issueDate: inv.invoice_date || new Date().toISOString().slice(0, 10),
        dueDate: new Date(dueTime).toISOString().slice(0, 10),
        daysElapsed,
        daysRemaining,
        isOverdue,
        isExpiringSoon,
        customerName: inv.customer_legal_name || (inv as any).customer_name || 'B2B Client',
        companyName: inv.customer_legal_name || (inv as any).company_name || 'B2B Client',
        customerGstin: inv.customer_gstin,
        customerPhone: (inv.billing_address as any)?.phone || (inv as any).customer_phone,
        customerEmail: (inv.billing_address as any)?.email || (inv as any).customer_email,
        placeOfSupply: inv.place_of_supply,
        grandTotal,
        advancePayable: 0,
        advancePaid: totalPaid,
        balanceDue,
        totalPaid,
        paymentStatus,
        paymentType: 'FULL_SETTLEMENT',
        paymentMode: isPaid ? 'RTGS' : undefined,
        notes: inv.notes,
        rawDoc: inv,
        linkedDocuments: {
          quotation: linkedQuote
            ? {
                id: linkedQuote.id,
                quoteNumber: linkedQuote.quoteNumber,
                referenceNo: linkedQuote.referenceNo,
                grandTotal: linkedQuote.grandTotal,
                status: linkedQuote.status,
                createdAt: linkedQuote.createdAt,
              }
            : null,
          po: linkedPo
            ? {
                id: linkedPo.id,
                poNumber: linkedPo.customerPoNumber || linkedPo.poSubmissionId || linkedPo.id,
                customerPoNumber: linkedPo.customerPoNumber,
                poSubmissionId: linkedPo.poSubmissionId,
                status: linkedPo.status,
                subject: linkedPo.subject,
                receivedAt: linkedPo.receivedAt,
              }
            : null,
          pi: linkedPi
            ? {
                id: linkedPi.id,
                piNumber: linkedPi.piNumber,
                grandTotal: linkedPi.grandTotal,
                advanceAmount: linkedPi.advancePayable,
                balanceDue: linkedPi.balancePayable,
                status: linkedPi.status,
                createdAt: linkedPi.issueDate,
              }
            : null,
          b2bOrder: linkedOrder
            ? {
                id: linkedOrder.id,
                orderNumber: linkedOrder.orderNumber,
                grandTotal: linkedOrder.grandTotal,
                paidAmount: linkedOrder.paidAmount,
                dueAmount: linkedOrder.dueAmount,
                status: linkedOrder.status,
                paymentStatus: linkedOrder.paymentStatus,
                branchName: linkedOrder.branch?.name,
                createdAt: linkedOrder.createdAt,
              }
            : null,
        },
      });
    });

    // 3. Official B2B Wholesale Orders (b2b_orders)
    b2bOrders.forEach((ord) => {
      const issueTime = new Date(ord.createdAt || now).getTime();
      const daysElapsed = Math.max(0, Math.floor((now - issueTime) / (1000 * 60 * 60 * 24)));
      const isPaid = ord.paymentStatus === 'PAID' || ord.status === 'completed';
      const grandTotal = Number(ord.grandTotal || 0);
      const totalPaid = Number(ord.paidAmount || 0);
      const balanceDue = Number(
        ord.dueAmount !== undefined && ord.dueAmount !== null ? ord.dueAmount : Math.max(0, grandTotal - totalPaid)
      );
      const advancePayable = isPaid ? 0 : balanceDue;
      const isOverdue = !isPaid && daysElapsed > 15;

      const custName = ord.customer
        ? `${ord.customer.firstName || ''} ${ord.customer.lastName || ''}`.trim() ||
          ord.customer.companyName ||
          (ord.branch ? ord.branch.name : 'B2B Wholesale Buyer')
        : ord.branch
        ? ord.branch.name
        : 'B2B Wholesale Buyer';
      const compName = ord.customer?.companyName || ord.branch?.name || custName;
      const custPhone = ord.customer?.phone || undefined;
      const custEmail = ord.customer?.email || undefined;
      const custGstin = ord.customer?.gstin || undefined;
      const placeOfSupply = ord.branch?.city || 'Delhi';

      // Cross-link Quotation
      const linkedQuote =
        (ord.sourceQuotationId ? quotesById.get(ord.sourceQuotationId) : undefined) ||
        (ord.sourceQuotation
          ? {
              id: ord.sourceQuotation.id,
              quoteNumber: ord.sourceQuotation.quoteNumber,
              referenceNo: ord.sourceQuotation.referenceNo,
              grandTotal: ord.sourceQuotation.grandTotal,
              status: ord.sourceQuotation.status,
              createdAt: ord.sourceQuotation.createdAt,
            }
          : undefined);

      // Cross-link PO
      const linkedPo =
        (ord.sourcePoId ? posById.get(ord.sourcePoId) : undefined) ||
        (ord.sourcePo
          ? {
              id: ord.sourcePo.id,
              poNumber: ord.sourcePo.customerPoNumber || ord.sourcePo.poSubmissionId || ord.sourcePo.id,
              customerPoNumber: ord.sourcePo.customerPoNumber,
              poSubmissionId: ord.sourcePo.poSubmissionId,
              status: ord.sourcePo.status,
              subject: ord.sourcePo.subject,
              receivedAt: ord.sourcePo.receivedAt,
            }
          : undefined);

      // Cross-link PI
      const linkedPi =
        (ord.sourcePiId ? pisById.get(ord.sourcePiId) : undefined) ||
        (ord.sourcePi
          ? {
              id: ord.sourcePi.id,
              piNumber: ord.sourcePi.piNumber,
              grandTotal: ord.sourcePi.grandTotal,
              status: ord.sourcePi.status,
            }
          : undefined) ||
        (ord.sourceQuotationId ? pisByQuoteId.get(ord.sourceQuotationId) : undefined) ||
        (ord.sourcePoId ? pisByPoId.get(ord.sourcePoId) : undefined);

      let paymentStatus: B2BPaymentRecord['paymentStatus'] = 'AWAITING_ADVANCE';
      if (ord.status === 'cancelled') paymentStatus = 'CANCELLED';
      else if (isPaid) paymentStatus = 'FULLY_PAID';
      else if (ord.paymentStatus === 'PARTIAL') paymentStatus = 'PARTIALLY_PAID';
      else if (isOverdue) paymentStatus = 'OVERDUE';

      records.push({
        id: `B2B-${ord.id}`,
        sourceType: 'B2B_ORDER',
        documentNumber: ord.orderNumber,
        issueDate: new Date(issueTime).toISOString().slice(0, 10),
        dueDate: new Date(issueTime + 15 * 86400000).toISOString().slice(0, 10),
        daysElapsed,
        daysRemaining: 15 - daysElapsed,
        isOverdue,
        isExpiringSoon: !isPaid && daysElapsed >= 10 && daysElapsed <= 15,
        customerId: ord.customerId,
        customerName: custName,
        companyName: compName,
        customerGstin: custGstin,
        customerPhone: custPhone,
        customerEmail: custEmail,
        placeOfSupply,
        grandTotal,
        advancePayable,
        advancePaid: totalPaid,
        balanceDue,
        totalPaid,
        paymentStatus,
        paymentType: 'DIRECT_ORDER_PAYMENT',
        paymentMode: ord.paymentMethod || 'BANK_TRANSFER',
        notes: (ord as any).notes || ord.rejectedReason || ord.cancellationReason || undefined,
        rawDoc: ord,
        linkedDocuments: {
          quotation: linkedQuote
            ? {
                id: linkedQuote.id,
                quoteNumber: linkedQuote.quoteNumber,
                referenceNo: linkedQuote.referenceNo,
                grandTotal: linkedQuote.grandTotal,
                status: linkedQuote.status,
                createdAt: linkedQuote.createdAt,
              }
            : null,
          po: linkedPo
            ? {
                id: linkedPo.id,
                poNumber: (linkedPo as any).customerPoNumber || (linkedPo as any).poSubmissionId || linkedPo.id,
                customerPoNumber: (linkedPo as any).customerPoNumber,
                poSubmissionId: (linkedPo as any).poSubmissionId,
                status: linkedPo.status,
                subject: (linkedPo as any).subject,
                receivedAt: (linkedPo as any).receivedAt,
              }
            : null,
          pi: linkedPi
            ? {
                id: linkedPi.id,
                piNumber: linkedPi.piNumber,
                grandTotal: linkedPi.grandTotal,
                status: linkedPi.status,
              }
            : null,
          b2bOrder: {
            id: ord.id,
            orderNumber: ord.orderNumber,
            grandTotal: ord.grandTotal,
            paidAmount: ord.paidAmount,
            dueAmount: ord.dueAmount,
            status: ord.status,
            paymentStatus: ord.paymentStatus,
            branchName: ord.branch?.name,
            createdAt: ord.createdAt,
          },
        },
      });
    });

    return records;
  }, [proformaInvoices, gstInvoices, b2bOrders, quotes, poSubmissions]);

  // ─── Customer Accounts Aggregation ──────────────────────────────────────────
  const customerAccounts: B2BCustomerAccountSummary[] = useMemo(() => {
    const customerMap = new Map<string, B2BCustomerAccountSummary>();

    unifiedRecords.forEach((rec) => {
      const key = (rec.companyName || rec.customerName || rec.customerEmail || 'Guest B2B Buyer').toLowerCase().trim();

      let entry = customerMap.get(key);
      if (!entry) {
        entry = {
          customerId: rec.customerId || key,
          customerName: rec.customerName,
          companyName: rec.companyName || rec.customerName,
          gstin: rec.customerGstin || '',
          phone: rec.customerPhone || '',
          email: rec.customerEmail || '',
          placeOfSupply: rec.placeOfSupply || 'Delhi',
          totalInvoicedValue: 0,
          totalAdvanceCollected: 0,
          totalPaymentsReceived: 0,
          totalOutstandingDue: 0,
          totalDocumentsCount: 0,
          openProformasCount: 0,
          openGstInvoicesCount: 0,
          openOrdersCount: 0,
          oldestPendingDays: 0,
          overdueDocumentsCount: 0,
          overdueAmount: 0,
          riskLevel: 'LOW_RISK',
        };
        customerMap.set(key, entry);
      }

      entry.totalInvoicedValue += rec.grandTotal;
      entry.totalPaymentsReceived += rec.totalPaid;
      entry.totalAdvanceCollected += rec.advancePaid;
      entry.totalOutstandingDue += rec.balanceDue;
      entry.totalDocumentsCount++;

      if (rec.balanceDue > 0) {
        if (rec.sourceType === 'PROFORMA_INVOICE') entry.openProformasCount++;
        else if (rec.sourceType === 'GST_TAX_INVOICE') entry.openGstInvoicesCount++;
        else if (rec.sourceType === 'B2B_ORDER') entry.openOrdersCount++;

        if (rec.daysElapsed > entry.oldestPendingDays) {
          entry.oldestPendingDays = rec.daysElapsed;
        }

        if (rec.isOverdue) {
          entry.overdueDocumentsCount++;
          entry.overdueAmount += rec.balanceDue;
        }
      }

      if (!entry.gstin && rec.customerGstin) entry.gstin = rec.customerGstin;
      if (!entry.phone && rec.customerPhone) entry.phone = rec.customerPhone;
      if (!entry.email && rec.customerEmail) entry.email = rec.customerEmail;
    });

    return Array.from(customerMap.values()).map((c) => {
      if (c.overdueDocumentsCount > 0 || c.oldestPendingDays > 30) {
        c.riskLevel = 'HIGH_RISK_OVERDUE';
      } else if (c.totalOutstandingDue > 0 && c.oldestPendingDays > 15) {
        c.riskLevel = 'MODERATE';
      } else {
        c.riskLevel = 'LOW_RISK';
      }
      return c;
    });
  }, [unifiedRecords]);

  // ─── Executive KPIs ─────────────────────────────────────────────────────────
  const executiveKpis = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let overdueValue = 0;

    unifiedRecords.forEach((r) => {
      totalInvoiced += r.grandTotal;
      totalCollected += r.totalPaid;
      totalOutstanding += r.balanceDue;
      if (r.isOverdue) {
        overdueCount++;
        overdueValue += r.balanceDue;
      }
    });

    const activeDebtorsCount = customerAccounts.filter((c) => c.totalOutstandingDue > 0).length;

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      overdueCount,
      overdueValue,
      activeDebtorsCount,
      totalDocuments: unifiedRecords.length,
      collectionRatio: totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0,
    };
  }, [unifiedRecords, customerAccounts]);

  // ─── Filtered Invoices ──────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return unifiedRecords
      .filter((rec) => {
        if (selectedCustomerIdFilter) {
          const matchId = rec.customerId === selectedCustomerIdFilter;
          const matchComp = (rec.companyName || '').toLowerCase() === selectedCustomerIdFilter.toLowerCase();
          if (!matchId && !matchComp) return false;
        }

        if (sourceTypeFilter !== 'ALL' && rec.sourceType !== sourceTypeFilter) {
          return false;
        }

        const q = searchQuery.toLowerCase().trim();
        if (q) {
          const matchDoc = rec.documentNumber.toLowerCase().includes(q);
          const matchCust = rec.customerName.toLowerCase().includes(q);
          const matchComp = (rec.companyName || '').toLowerCase().includes(q);
          const matchPhone = (rec.customerPhone || '').toLowerCase().includes(q);
          const matchGstin = (rec.customerGstin || '').toLowerCase().includes(q);
          const matchUtr = (rec.transactionRef || '').toLowerCase().includes(q);

          // Multi-document search: Quote, PO, PI, B2B Order
          const matchQuote = Boolean(
            rec.linkedDocuments?.quotation?.quoteNumber?.toLowerCase().includes(q) ||
            rec.linkedDocuments?.quotation?.referenceNo?.toLowerCase().includes(q)
          );
          const matchPo = Boolean(
            rec.linkedDocuments?.po?.customerPoNumber?.toLowerCase().includes(q) ||
            rec.linkedDocuments?.po?.poNumber?.toLowerCase().includes(q) ||
            rec.linkedDocuments?.po?.poSubmissionId?.toLowerCase().includes(q)
          );
          const matchPi = Boolean(
            rec.linkedDocuments?.pi?.piNumber?.toLowerCase().includes(q)
          );
          const matchB2b = Boolean(
            rec.linkedDocuments?.b2bOrder?.orderNumber?.toLowerCase().includes(q)
          );

          if (
            !matchDoc &&
            !matchCust &&
            !matchComp &&
            !matchPhone &&
            !matchGstin &&
            !matchUtr &&
            !matchQuote &&
            !matchPo &&
            !matchPi &&
            !matchB2b
          ) {
            return false;
          }
        }

        if (statusFilter === 'AWAITING') {
          if (rec.paymentStatus !== 'AWAITING_ADVANCE' && rec.balanceDue <= 0) return false;
        } else if (statusFilter === 'CUSTOMER_SUBMITTED') {
          if (rec.paymentStatus !== 'CUSTOMER_SUBMITTED' && !rec.transactionRef) return false;
        } else if (statusFilter === 'CLEARED') {
          if (rec.paymentStatus !== 'ADVANCE_RECEIVED' && rec.paymentStatus !== 'FULLY_PAID') return false;
        } else if (statusFilter === 'OVERDUE') {
          if (!rec.isOverdue) return false;
        }

        if (agingFilter === 'UNDER_7' && rec.daysElapsed > 7) return false;
        if (agingFilter === '7_TO_14' && (rec.daysElapsed < 7 || rec.daysElapsed > 14)) return false;
        if (agingFilter === '15_TO_30' && (rec.daysElapsed < 15 || rec.daysElapsed > 30)) return false;
        if (agingFilter === 'OVER_30' && rec.daysElapsed <= 30) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'aging') return sortOrder === 'desc' ? b.daysElapsed - a.daysElapsed : a.daysElapsed - b.daysElapsed;
        if (sortBy === 'balance') return sortOrder === 'desc' ? b.balanceDue - a.balanceDue : a.balanceDue - b.balanceDue;
        if (sortBy === 'total') return sortOrder === 'desc' ? b.grandTotal - a.grandTotal : a.grandTotal - b.grandTotal;
        return sortOrder === 'desc'
          ? new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
          : new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
      });
  }, [unifiedRecords, searchQuery, sourceTypeFilter, statusFilter, agingFilter, selectedCustomerIdFilter, sortBy, sortOrder]);

  // ─── Filtered Dues Recovery Customers ───────────────────────────────────────
  const filteredDuesCustomers = useMemo(() => {
    let list = duesCustomers;
    if (duesSearchQuery.trim()) {
      const q = duesSearchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.customerName || '').toLowerCase().includes(q) ||
          (c.companyName || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.gstin || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [duesCustomers, duesSearchQuery]);

  const disputedCustomers = useMemo(() => {
    return duesCustomers.filter(
      (c) => c.followupStatus === 'DISPUTED' || c.followupStatus === 'DECLINED'
    );
  }, [duesCustomers]);

  // ─── Actions & Handlers ─────────────────────────────────────────────────────
  const handleOpenRecordPaymentModal = (record: B2BPaymentRecord) => {
    setPaymentModalRecord(record);
    setPaymentAmount(record.advancePayable > 0 && record.advancePaid === 0 ? record.advancePayable : record.balanceDue);
    setPaymentMode('RTGS');
    setPaymentUtr(record.transactionRef || '');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setBankAccountCredited('HDFC Bank - Current A/C (Mandoli Branch)');
    setTargetStatus(record.sourceType === 'PROFORMA_INVOICE' ? 'ADVANCE_RECEIVED' : 'FULLY_PAID');
    setPaymentNotes('');
  };

  const handleOpenDetailsModal = (record: B2BPaymentRecord) => {
    setDetailsModalRecord(record);
    setFollowupChannel('PHONE');
    setFollowupStage(record.isOverdue ? 'OVERDUE_ALERT' : 'COURTESY_REMINDER');
    setFollowupNotes('');
    setFollowupPtpDate(record.ptpDate || '');
    setFollowupPtpAmount(record.balanceDue);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3);
    setFollowupNextDate(nextDate.toISOString().slice(0, 10));
  };

  const handleSendWhatsApp = (record: B2BPaymentRecord) => {
    const rawPhone = (record.customerPhone || '').replace(/[^\d]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = generateWhatsAppReminderMessage(record);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalRecord) return;
    if (!paymentUtr.trim()) {
      showToast('Please provide Bank Reference / UTR Number', 'error');
      return;
    }
    if (paymentAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setSavingPayment(true);
    try {
      if (paymentModalRecord.sourceType === 'PROFORMA_INVOICE') {
        const rawPi = paymentModalRecord.rawDoc as ProformaInvoice;
        await proformaService.recordPayment(rawPi.id, {
          amountPaid: Number(paymentAmount),
          paymentMode,
          transactionRef: paymentUtr.trim(),
          paymentDate,
          status: targetStatus,
          notes: `${paymentNotes ? `${paymentNotes} | ` : ''}Credited to: ${bankAccountCredited}`,
        });
      } else if (paymentModalRecord.sourceType === 'B2B_ORDER') {
        const rawOrd = paymentModalRecord.rawDoc as B2BOrder;
        await b2bOrdersApi.recordPayment(rawOrd.id, {
          amountPaid: Number(paymentAmount),
          paymentMode,
          transactionRef: paymentUtr.trim(),
          paymentDate,
          notes: `${paymentNotes ? `${paymentNotes} | ` : ''}Credited to: ${bankAccountCredited}`,
        });
      } else if (paymentModalRecord.sourceType === 'GST_TAX_INVOICE') {
        const rawGst = paymentModalRecord.rawDoc as GSTInvoice;
        await fetchAdminApi(`/gst/invoices/${rawGst.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: targetStatus === 'FULLY_PAID' ? 'PAID' : 'DRAFT',
            notes: `${rawGst.notes ? `${rawGst.notes}\n` : ''}[Payment Cleared ${paymentDate}]: ₹${paymentAmount.toLocaleString('en-IN')} via ${paymentMode} (Ref: ${paymentUtr.trim()})`,
          }),
        });
      }

      showToast(`Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded successfully!`);
      setPaymentModalRecord(null);
      fetchAllCommercialData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to record payment', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSubmitFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailsModalRecord) return;
    if (!followupNotes.trim()) {
      showToast('Please enter follow-up remarks', 'error');
      return;
    }

    setSavingFollowup(true);
    try {
      if (detailsModalRecord.sourceType === 'PROFORMA_INVOICE') {
        const rawPi = detailsModalRecord.rawDoc as ProformaInvoice;
        await proformaService.logFollowUp(rawPi.id, {
          channel: followupChannel,
          stage: followupStage,
          notes: followupNotes.trim(),
          contactPhone: detailsModalRecord.customerPhone,
          contactEmail: detailsModalRecord.customerEmail,
          ptpDate: followupPtpDate || undefined,
          ptpAmount: followupPtpAmount > 0 ? Number(followupPtpAmount) : undefined,
          nextFollowupDate: followupNextDate || undefined,
        });
      }

      showToast('Follow-up logged successfully!');
      setDetailsModalRecord(null);
      fetchAllCommercialData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to record follow-up', 'error');
    } finally {
      setSavingFollowup(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      showToast('No records available to export', 'error');
      return;
    }

    const headers = [
      'Document Type',
      'Document Number',
      'Issue Date',
      'Due Date',
      'Customer',
      'Company',
      'Phone',
      'Total Value',
      'Paid',
      'Balance Due',
      'Status',
      'UTR',
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.sourceType}"`,
      `"${r.documentNumber}"`,
      `"${r.issueDate}"`,
      `"${r.dueDate}"`,
      `"${r.customerName}"`,
      `"${r.companyName || ''}"`,
      `"${r.customerPhone || ''}"`,
      r.grandTotal,
      r.totalPaid,
      r.balanceDue,
      `"${r.paymentStatus}"`,
      `"${r.transactionRef || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `PRC-B2B-Receivables-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Interactive Commercial Document Pipeline Chain ─────────────────────────
  const renderDocumentChain = (record: B2BPaymentRecord, isCompact = false) => {
    const { quotation, po, pi, b2bOrder } = record.linkedDocuments || {};

    return (
      <div className={`flex items-center flex-wrap gap-1.5 ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
        {/* 1. Quotation Node */}
        {quotation ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleInspectQuote(quotation.id || quotation.quoteNumber);
            }}
            className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium transition-all shadow-sm"
            title={`View Quotation ${quotation.quoteNumber}`}
          >
            <FileText size={11} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold">{quotation.quoteNumber}</span>
            {quotation.status && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900/60 text-indigo-200 uppercase font-mono">
                {quotation.status}
              </span>
            )}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-600 border border-dashed border-zinc-800 text-[10px]">
            No QT
          </span>
        )}

        <ArrowRight size={10} className="text-zinc-600 flex-shrink-0" />

        {/* 2. Purchase Order Node */}
        {po ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleInspectPo(po.id || po.poSubmissionId || po.customerPoNumber || po.poNumber);
            }}
            className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium transition-all shadow-sm"
            title={`View Purchase Order ${po.customerPoNumber || po.poNumber}`}
          >
            <Layers size={11} className="text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold">{po.customerPoNumber || po.poNumber || 'PO Attached'}</span>
            {po.status && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-900/60 text-amber-200 uppercase font-mono">
                {po.status}
              </span>
            )}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-600 border border-dashed border-zinc-800 text-[10px]">
            No PO
          </span>
        )}

        <ArrowRight size={10} className="text-zinc-600 flex-shrink-0" />

        {/* 3. Proforma Invoice Node */}
        {pi ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleInspectPi(pi.id || pi.piNumber);
            }}
            className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium transition-all shadow-sm"
            title={`View Proforma Invoice ${pi.piNumber}`}
          >
            <FileCheck size={11} className="text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold">{pi.piNumber}</span>
            {pi.status && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900/60 text-purple-200 uppercase font-mono">
                {pi.status}
              </span>
            )}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-600 border border-dashed border-zinc-800 text-[10px]">
            No PI
          </span>
        )}

        <ArrowRight size={10} className="text-zinc-600 flex-shrink-0" />

        {/* 4. B2B Wholesale Order Node */}
        {b2bOrder ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleInspectB2bOrder(b2bOrder.id || b2bOrder.orderNumber);
            }}
            className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium transition-all shadow-sm"
            title={`View B2B Wholesale Order ${b2bOrder.orderNumber}`}
          >
            <ShoppingBag size={11} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold">{b2bOrder.orderNumber}</span>
            {b2bOrder.paymentStatus && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-900/60 text-emerald-200 uppercase font-mono">
                {b2bOrder.paymentStatus}
              </span>
            )}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-600 border border-dashed border-zinc-800 text-[10px]">
            No Order
          </span>
        )}
      </div>
    );
  };

  // ─── Proforma Sub-Views (Edit & Detail) ──────────────────────────────────────
  if (editingProforma) {
    return (
      <ProformaInvoiceCreateView
        initialInvoice={editingProforma}
        onBack={() => {
          setEditingProforma(null);
          fetchAllCommercialData();
        }}
        onSaved={(updated) => {
          setEditingProforma(null);
          setSelectedProforma(updated);
          fetchAllCommercialData();
        }}
      />
    );
  }

  if (selectedProforma) {
    return (
      <ProformaInvoiceDetailView
        invoice={selectedProforma}
        onBack={() => {
          setSelectedProforma(null);
          fetchAllCommercialData();
        }}
        onEdit={(inv) => {
          setEditingProforma(inv);
        }}
      />
    );
  }

  // ─── Render Sub-Views for Payment Follow-up Cockpit ────────────────────────
  const renderDuesRecoveryTab = () => (
    <div className="p-4 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-4">
      {/* Selection Action Bar if items exist */}
      {filteredDuesCustomers.length > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAllFilteredDues}
              className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-medium"
            >
              {selectedCustomerIds.length === filteredDuesCustomers.length && filteredDuesCustomers.length > 0 ? (
                <CheckSquare size={16} className="text-purple-400" />
              ) : (
                <Square size={16} className="text-zinc-500" />
              )}
              <span>Select All ({filteredDuesCustomers.length})</span>
            </button>

            {selectedCustomerIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[11px]">
                {selectedCustomerIds.length} Selected
              </span>
            )}
          </div>

          {selectedCustomerIds.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow"
            >
              <Send size={13} />
              <span>Launch Bulk Reminder ({selectedCustomerIds.length})</span>
            </button>
          )}
        </div>
      )}

      {filteredDuesCustomers.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
          <CheckCircle2 size={36} className="text-emerald-500" />
          <div className="text-sm font-semibold text-zinc-300">No customers found matching filter criteria</div>
          <div className="text-xs">All customers are either fully settled or do not match the current filters.</div>
        </div>
      ) : (
        <>
          {/* Mobile Touch Cards (< lg) */}
          <div className="block lg:hidden space-y-3.5">
            {filteredDuesCustomers.map((c) => {
              const isSelected = selectedCustomerIds.includes(c.customerId);
              const cleanPhone = c.phone?.replace(/\D/g, '') || '';
              return (
                <div
                  key={c.customerId}
                  onClick={() => setDrawerCustomerId(c.customerId)}
                  className={`p-4 rounded-2xl bg-[#09090B] border transition-all space-y-3 shadow-md cursor-pointer hover:border-purple-500/50 ${
                    isSelected ? 'border-purple-500 bg-purple-950/10' : 'border-[#27272A] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectCustomer(c.customerId);
                        }}
                        className="p-1 text-zinc-400 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="text-purple-400" />
                        ) : (
                          <Square size={18} className="text-zinc-600" />
                        )}
                      </button>
                      <div>
                        <h3 className="font-extrabold text-white text-sm hover:text-purple-300 transition-colors flex items-center gap-1.5">
                          <span>{c.companyName || c.customerName}</span>
                          <ChevronRight size={13} className="text-zinc-500" />
                        </h3>
                        {c.companyName && c.customerName && (
                          <div className="text-[11px] text-zinc-400">{c.customerName}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          c.agingBucket === '90_PLUS'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : c.agingBucket === '61_90'
                            ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                            : c.agingBucket === '31_60'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'
                        }`}
                      >
                        {c.agingBucket.replace('_', '-')} Days
                      </span>
                      {c.source === 'OLD_CUSTOMER' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Legacy
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Direct Phone & WhatsApp */}
                  <div className="p-2.5 rounded-xl bg-[#141417] border border-[#27272A] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {cleanPhone ? (
                        <a
                          href={`tel:+91${cleanPhone}`}
                          className="text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                        >
                          <PhoneCall size={12} />
                          <span>+91 {cleanPhone}</span>
                        </a>
                      ) : (
                        <span className="text-zinc-500 italic text-[11px]">No phone</span>
                      )}
                      {c.gstin && <span className="text-zinc-500 font-mono text-[10px]">GST: {c.gstin}</span>}
                    </div>

                    {cleanPhone && (
                      <a
                        href={`https://wa.me/91${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        title="WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#27272A]">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block">Open Documents</span>
                      <span className="text-zinc-300 font-mono">
                        {c.invoicesCount} doc(s)
                      </span>
                      {c.overdueAmount > 0 && (
                        <span className="block text-[10px] text-amber-400 font-bold">
                          ₹{Math.round(c.overdueAmount).toLocaleString('en-IN')} overdue
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 uppercase block">Outstanding Balance</span>
                      <span className="font-black text-sm font-mono text-rose-400">
                        ₹{Math.round(c.totalOutstanding).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Follow-up / PTP status */}
                  {(c.lastFollowupDate || c.ptpDate) && (
                    <div className="p-2 rounded-xl bg-[#18181B] text-[11px] text-zinc-400 flex items-center justify-between border border-[#27272A]">
                      {c.lastFollowupDate && (
                        <span>Last: {new Date(c.lastFollowupDate).toLocaleDateString('en-IN')} ({c.lastFollowupOutcome || c.lastFollowupChannel || 'TOUCHPOINT'})</span>
                      )}
                      {c.ptpDate && (
                        <span className="text-purple-300 font-bold">
                          PTP: {new Date(c.ptpDate).toLocaleDateString('en-IN')} {c.ptpAmount ? `(₹${c.ptpAmount.toLocaleString('en-IN')})` : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#27272A]">
                    <button
                      type="button"
                      onClick={() =>
                        setAllocationModal({
                          isOpen: true,
                          customerId: c.customerId,
                          customerName: c.customerName,
                          companyName: c.companyName,
                          totalOutstanding: c.totalOutstanding,
                        })
                      }
                      className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold text-center"
                    >
                      Pay
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLogFollowupModal({
                          isOpen: true,
                          customerId: c.customerId,
                          customerName: c.customerName,
                          companyName: c.companyName,
                          phone: c.phone,
                          email: c.email,
                          outstandingAmount: c.totalOutstanding,
                        })
                      }
                      className="py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold text-center"
                    >
                      Log Call
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSendLedgerModal({
                          isOpen: true,
                          customerId: c.customerId,
                          customerName: c.customerName,
                          companyName: c.companyName,
                          email: c.email,
                          totalOutstanding: c.totalOutstanding,
                        })
                      }
                      className="py-1.5 px-2 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-[11px] font-bold text-center"
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerCustomerId(c.customerId)}
                      className="py-1.5 px-2 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-purple-300 text-[11px] font-bold text-center"
                    >
                      360 Dues
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= lg) */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-[#27272A]">
            <table className="w-full text-left text-xs text-zinc-300 divide-y divide-[#27272A]">
              <thead className="bg-[#09090B] text-zinc-400 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllFilteredDues}
                      className="p-1 hover:text-white"
                    >
                      {selectedCustomerIds.length === filteredDuesCustomers.length && filteredDuesCustomers.length > 0 ? (
                        <CheckSquare size={16} className="text-purple-400" />
                      ) : (
                        <Square size={16} className="text-zinc-600" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Customer & Company</th>
                  <th className="py-3 px-3">Direct Contact</th>
                  <th className="py-3 px-3 text-right">Invoiced / Paid</th>
                  <th className="py-3 px-3 text-right">Outstanding Dues</th>
                  <th className="py-3 px-3 text-center">Aging</th>
                  <th className="py-3 px-3">Follow-up / PTP Status</th>
                  <th className="py-3 px-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] bg-[#121214]">
                {filteredDuesCustomers.map((c) => {
                  const isSelected = selectedCustomerIds.includes(c.customerId);
                  const cleanPhone = c.phone?.replace(/\D/g, '') || '';
                  return (
                    <tr
                      key={c.customerId}
                      onClick={() => setDrawerCustomerId(c.customerId)}
                      className={`hover:bg-[#18181B] transition-colors cursor-pointer ${
                        isSelected ? 'bg-purple-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleSelectCustomer(c.customerId)}
                          className="p-1 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-purple-400" />
                          ) : (
                            <Square size={16} className="text-zinc-600" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white hover:text-purple-300 transition-colors flex items-center gap-1.5">
                          <span>{c.companyName || c.customerName}</span>
                          <ChevronRight size={13} className="text-zinc-500 opacity-60" />
                          {c.source === 'OLD_CUSTOMER' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Legacy
                            </span>
                          )}
                        </div>
                        {c.companyName && c.customerName && (
                          <div className="text-[11px] text-zinc-400">{c.customerName}</div>
                        )}
                        {c.gstin && (
                          <div className="text-[10px] font-mono text-zinc-500">GST: {c.gstin}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {cleanPhone ? (
                            <a
                              href={`tel:+91${cleanPhone}`}
                              className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
                            >
                              <PhoneCall size={12} />
                              <span className="font-mono">+91 {cleanPhone}</span>
                            </a>
                          ) : (
                            <span className="text-zinc-500 text-[11px] italic">No phone</span>
                          )}
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/91${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              title="WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                        </div>
                        {c.email && !c.email.includes('@internal.prc') && (
                          <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">
                            {c.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="text-zinc-300">{c.invoicesCount} doc(s)</div>
                        {c.overdueAmount > 0 && (
                          <div className="text-[10px] text-amber-400 font-bold">
                            ₹{Math.round(c.overdueAmount).toLocaleString('en-IN')} overdue
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="text-base font-black text-rose-400">
                          ₹{Math.round(c.totalOutstanding).toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            c.agingBucket === '90_PLUS'
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : c.agingBucket === '61_90'
                              ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                              : c.agingBucket === '31_60'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'
                          }`}
                        >
                          {c.agingBucket.replace('_', '-')} Days
                        </span>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{c.maxDaysOverdue}d overdue</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.followupStatus === 'OVERDUE'
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : c.followupStatus === 'PAYMENT_PROMISED'
                                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                : c.followupStatus === 'PARTIALLY_PAID'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {c.followupStatus.replace('_', ' ')}
                          </span>
                        </div>
                        {c.ptpDate && (
                          <div className="text-[10px] text-purple-300 font-bold mt-0.5">
                            PTP: {new Date(c.ptpDate).toLocaleDateString('en-IN')} (₹
                            {c.ptpAmount?.toLocaleString('en-IN')})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setAllocationModal({
                                isOpen: true,
                                customerId: c.customerId,
                                customerName: c.customerName,
                                companyName: c.companyName,
                                totalOutstanding: c.totalOutstanding,
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow"
                            title="Allocate Payment"
                          >
                            Pay
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setLogFollowupModal({
                                isOpen: true,
                                customerId: c.customerId,
                                customerName: c.customerName,
                                companyName: c.companyName,
                                phone: c.phone,
                                email: c.email,
                                outstandingAmount: c.totalOutstanding,
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-all shadow"
                            title="Log Follow-up Touchpoint"
                          >
                            Log
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSendLedgerModal({
                                isOpen: true,
                                customerId: c.customerId,
                                customerName: c.customerName,
                                companyName: c.companyName,
                                email: c.email,
                                totalOutstanding: c.totalOutstanding,
                              })
                            }
                            className="p-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 hover:text-white"
                            title="Send Statement of Account Email"
                          >
                            <Mail size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSendSmsModal({
                                isOpen: true,
                                customerId: c.customerId,
                                customerName: c.customerName,
                                companyName: c.companyName,
                                phone: c.phone,
                                totalOutstanding: c.totalOutstanding,
                              })
                            }
                            className="p-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 hover:text-white"
                            title="Send SMS Reminder"
                          >
                            <MessageSquare size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrawerCustomerId(c.customerId)}
                            className="p-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-purple-300 hover:text-white"
                            title="Inspect 360 Dues"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeclineDisputeModal({
                                isOpen: true,
                                customerId: c.customerId,
                                customerName: c.customerName,
                                companyName: c.companyName,
                                totalOutstanding: c.totalOutstanding,
                              })
                            }
                            className="p-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-rose-400 hover:text-white"
                            title="Mark Disputed or Declined"
                          >
                            <Ban size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  const renderDisputedAccountsTab = () => (
    <div className="p-4 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Ban size={18} className="text-rose-400" />
            <span>Declined & Disputed Accounts Queue ({disputedCustomers.length})</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Accounts manually flagged for disputes, rate reconciliations, or collection suspensions.
            These accounts are isolated from automated communications.
          </p>
        </div>
      </div>

      {disputedCustomers.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
          <ShieldCheck size={36} className="text-emerald-500" />
          <div className="text-sm font-semibold text-zinc-300">No Disputed or Declined Accounts</div>
          <div className="text-xs">All active client receivables are moving through regular recovery cycles.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {disputedCustomers.map((c) => (
            <div
              key={c.customerId}
              onClick={() => setDrawerCustomerId(c.customerId)}
              className="p-4 rounded-2xl bg-[#09090B] border border-rose-900/40 space-y-3 shadow-md cursor-pointer hover:border-rose-500/60 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-white text-sm hover:text-rose-300 transition-colors">{c.companyName || c.customerName}</h4>
                  <div className="text-xs text-zinc-400">{c.customerName} • {c.phone}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                    c.followupStatus === 'DISPUTED'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {c.followupStatus}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-xs space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Dispute / Suspension Reason</div>
                <div className="text-zinc-200">{c.declineReason || 'No detailed reason specified'}</div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#27272A]">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Disputed Balance</span>
                  <span className="text-sm font-black font-mono text-rose-400">
                    ₹{Math.round(c.totalOutstanding).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDrawerCustomerId(c.customerId);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold"
                  >
                    Inspect 360
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResumeCustomer(c.customerId);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                  >
                    <RotateCcw size={12} />
                    <span>Resume Recovery</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAutomationRulesTab = () => (
    <div className="p-4 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            <span>Follow-up Automation & Scheduled Rules</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Configured triggers send automated SMS and Email reminders based on invoice maturity and overdue SLA.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunScheduledTrigger}
          disabled={runningTrigger}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-900/30 disabled:opacity-50"
        >
          {runningTrigger ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          <span>Run Scheduled Trigger Now</span>
        </button>
      </div>

      {loadingRules ? (
        <div className="py-12 flex flex-col items-center justify-center text-xs text-zinc-400 gap-2">
          <Loader2 size={20} className="animate-spin text-purple-500" />
          <span>Loading configured automation rules...</span>
        </div>
      ) : followupRules.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 text-xs">
          No rules found. Rules are automatically initialized on startup.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {followupRules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 rounded-2xl bg-[#09090B] border border-[#27272A] hover:border-[#3F3F46] transition-all space-y-3 shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-white text-sm">{rule.name}</h4>
                  <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                    {rule.templateSubject || rule.templateBody || 'Automated customer touchpoint rule'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleRule(rule)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                    rule.isEnabled
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                  }`}
                >
                  {rule.isEnabled ? 'Active' : 'Paused'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Trigger Schedule</span>
                  <span className="font-bold text-zinc-200">
                    {rule.agingThresholdDays === 0
                      ? 'On Due Date'
                      : rule.agingThresholdDays < 0
                      ? `${Math.abs(rule.agingThresholdDays)} Days Before Due`
                      : `${rule.agingThresholdDays} Days Overdue`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Communication Channel</span>
                  <span className="font-mono text-purple-300 font-bold">
                    {rule.communicationType.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <span>Repeat: Every {rule.repeatIntervalDays} days</span>
                <span>Max Reminders: {rule.maxReminders}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Main View ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2 text-sm font-semibold transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : 'bg-rose-950 border-rose-700 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toastMessage.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#18181B] to-[#27272A] border border-[#3F3F46] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Landmark size={20} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Payment Follow-up & Dues Recovery Cockpit
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Receivables Recovery
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Track customer receivables across Delivered Goods & Opening Balances, dynamic aging buckets, automated reminders, and partial payment allocation.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsAddOldCustomerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-900/30"
          >
            <UserPlus size={14} />
            <span>+ Add Old Customer</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            disabled={selectedCustomerIds.length === 0}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              selectedCustomerIds.length > 0
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-900/30'
                : 'bg-[#27272A] text-zinc-500 border-transparent cursor-not-allowed opacity-60'
            }`}
          >
            <Send size={14} />
            <span>Bulk Reminder {selectedCustomerIds.length > 0 && `(${selectedCustomerIds.length})`}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            type="button"
            onClick={() => {
              fetchAllCommercialData();
              fetchDuesData();
            }}
            disabled={loading || loadingDues}
            className="px-3.5 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading || loadingDues ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 5 Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
        {/* Total Outstanding */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Outstanding</div>
            <div className="text-lg sm:text-xl font-black text-rose-400">
              ₹{Math.round(duesMetrics?.totalOutstanding ?? executiveKpis.totalOutstanding).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-zinc-500">Across open dues & balances</div>
          </div>
        </div>

        {/* Overdue Receivables */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock size={18} />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Overdue Dues</div>
            <div className="text-lg sm:text-xl font-black text-amber-400">
              ₹{Math.round(duesMetrics?.overdueAmount ?? executiveKpis.overdueValue).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-zinc-500">{executiveKpis.overdueCount} account(s) overdue</div>
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Collections Received</div>
            <div className="text-lg sm:text-xl font-black text-emerald-400">
              ₹{Math.round(executiveKpis.totalCollected).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-zinc-500">{executiveKpis.collectionRatio.toFixed(1)}% recovery rate</div>
          </div>
        </div>

        {/* Active Debtors */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Building2 size={18} />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Active Debtors</div>
            <div className="text-lg sm:text-xl font-black text-purple-300">
              {duesMetrics?.customersWithDuesCount ?? executiveKpis.activeDebtorsCount}
            </div>
            <div className="text-[10px] text-zinc-500">Commercial enterprise clients</div>
          </div>
        </div>

        {/* Disputed / Declined */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="p-2.5 rounded-xl bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            <Ban size={18} />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Declined / Disputed</div>
            <div className="text-lg sm:text-xl font-black text-zinc-300">
              {duesMetrics?.declinedDisputedCount ?? disputedCustomers.length}
            </div>
            <div className="text-[10px] text-zinc-500">Excluded from auto queues</div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Container */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-3.5 shadow-md">
        {/* Navigation Tabs + 1-Click Customer Filter Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-1.5 p-1 bg-[#09090B] rounded-xl border border-[#27272A]">
            <button
              type="button"
              onClick={() => setActiveTab('DUES_RECOVERY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'DUES_RECOVERY'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <AlertTriangle size={13} />
              <span>Dues Recovery & Aging ({duesCustomers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DOCUMENTS_LEDGER')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'DOCUMENTS_LEDGER'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText size={13} />
              <span>Advance Payments & PI ({filteredRecords.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CUSTOMER_ACCOUNTS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'CUSTOMER_ACCOUNTS'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 size={13} />
              <span>Company Ledgers ({customerAccounts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DISPUTED_ACCOUNTS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'DISPUTED_ACCOUNTS'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Ban size={13} />
              <span>Declined & Disputed ({disputedCustomers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('AUTOMATION_RULES')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'AUTOMATION_RULES'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              <span>Follow-up Rules ({followupRules.length})</span>
            </button>
          </div>

          {selectedCustomerIdFilter && (
            <div className="flex items-center gap-2 text-xs bg-purple-950/40 border border-purple-800/60 px-2.5 py-1 rounded-xl text-purple-300">
              <span>Filtered by company: <strong>{selectedCustomerIdFilter}</strong></span>
              <button
                type="button"
                onClick={() => setSelectedCustomerIdFilter(null)}
                className="hover:text-white"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Search & Select Filters for DUES_RECOVERY */}
        {activeTab === 'DUES_RECOVERY' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-[#27272A]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search Customer, Company, Phone, Email, GSTIN..."
                value={duesSearchQuery}
                onChange={(e) => setDuesSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={agingBucketFilter}
                onChange={(e) => setAgingBucketFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Aging Buckets</option>
                <option value="0-30">0 - 30 Days (Current)</option>
                <option value="31-60">31 - 60 Days</option>
                <option value="61-90">61 - 90 Days</option>
                <option value="90+">&gt; 90 Days Overdue</option>
              </select>

              <select
                value={followupStatusFilter}
                onChange={(e) => setFollowupStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Follow-up Statuses</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="DUE">Due for Follow-up</option>
                <option value="PTP_PROMISED">Promise-To-Pay (PTP)</option>
                <option value="CURRENT">Current / On-Time</option>
              </select>
            </div>
          </div>
        )}

        {/* Search & Select Filters for DOCUMENTS_LEDGER */}
        {activeTab === 'DOCUMENTS_LEDGER' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-[#27272A]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search Document #, Customer, Company, Phone, UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sourceTypeFilter}
                onChange={(e) => setSourceTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Document Types</option>
                <option value="PROFORMA_INVOICE">Proforma (PI)</option>
                <option value="GST_TAX_INVOICE">GST Tax Invoice</option>
                <option value="B2B_ORDER">B2B Order</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="AWAITING">Pending / Due</option>
                <option value="CUSTOMER_SUBMITTED">UTR Submitted</option>
                <option value="CLEARED">Cleared / Settled</option>
                <option value="OVERDUE">Overdue Only</option>
              </select>

              <select
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Aging</option>
                <option value="UNDER_7">&lt; 7 Days</option>
                <option value="7_TO_14">7 - 14 Days</option>
                <option value="15_TO_30">15 - 30 Days</option>
                <option value="OVER_30">&gt; 30 Days Overdue</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-[#18181B] border border-[#27272A] flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-purple-500" />
          <span className="text-sm text-zinc-400">Loading B2B payments & receivables ledger...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAllCommercialData} className="underline font-bold">Retry</button>
        </div>
      ) : activeTab === 'DUES_RECOVERY' ? (
        /* ─── TAB 1: DUES RECOVERY & AGING COCKPIT ─── */
        renderDuesRecoveryTab()
      ) : activeTab === 'DOCUMENTS_LEDGER' ? (
        /* ─── TAB 2: INVOICES LEDGER ─── */
        <div className="p-4 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
              <Landmark size={36} className="text-zinc-600" />
              <div className="text-sm font-semibold text-zinc-300">No payment records found</div>
              <div className="text-xs">Adjust your search query or filters above.</div>
            </div>
          ) : (
            <>
              {/* Mobile / Tablet Touch Cards (< lg) */}
              <div className="block lg:hidden space-y-3.5">
                {filteredRecords.map((r) => {
                  const isPi = r.sourceType === 'PROFORMA_INVOICE';
                  const isGst = r.sourceType === 'GST_TAX_INVOICE';

                  return (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl bg-[#09090B] border border-[#27272A] hover:border-[#3F3F46] transition-all space-y-3 shadow-md"
                    >
                      {/* Top Header: Doc Number + Source + Aging Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-white text-sm">{r.documentNumber}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isPi
                                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                  : isGst
                                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {isPi ? 'Proforma (PI)' : isGst ? 'GST Tax Inv' : 'B2B Order'}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            Issued: {new Date(r.issueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>

                        <div>
                          {r.balanceDue === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 size={11} /> Cleared
                            </span>
                          ) : r.isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse">
                              <AlertTriangle size={11} /> Overdue {Math.abs(r.daysRemaining)}d
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock size={11} /> Due in {r.daysRemaining}d
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Commercial Document Chain */}
                      <div className="p-2.5 rounded-xl bg-[#141417] border border-[#27272A] space-y-1.5">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Link2 size={11} className="text-purple-400" />
                            <span>Commercial Document Chain</span>
                          </span>
                          <span className="text-[9px] text-zinc-500">Tap to inspect</span>
                        </div>
                        {renderDocumentChain(r, true)}
                      </div>

                      {/* Customer Details Box */}
                      <div
                        onClick={() => r.customerId && setDrawerCustomerId(r.customerId)}
                        className={`p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1 text-xs ${
                          r.customerId ? 'cursor-pointer hover:border-purple-500/50 hover:bg-[#202024] transition-all' : ''
                        }`}
                      >
                        <div className="font-bold text-zinc-200 flex items-center justify-between">
                          <span>{r.companyName || r.customerName}</span>
                          {r.customerId && (
                            <span className="text-[10px] text-purple-400 font-normal">360° Dues &rarr;</span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 flex flex-wrap gap-2">
                          {r.customerPhone && <span>📞 {r.customerPhone}</span>}
                          {r.customerEmail && <span>✉️ {r.customerEmail}</span>}
                        </div>
                        {r.customerGstin && (
                          <div className="text-[10px] font-mono text-zinc-400">GST: {r.customerGstin}</div>
                        )}
                      </div>

                      {/* Financials & Balance Due */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#27272A]/70">
                        <div>
                          <span className="text-zinc-500 text-[11px]">Invoiced: </span>
                          <span className="font-bold text-zinc-300">₹{r.grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-zinc-500 text-[11px]">Balance Due: </span>
                          <span className={`font-black text-sm ${r.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ₹{r.balanceDue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* UTR Tag if present */}
                      {r.transactionRef && (
                        <div className="text-[11px] bg-purple-950/30 border border-purple-800/40 px-2 py-1 rounded-lg text-purple-300 font-mono flex items-center justify-between">
                          <span>UTR: {r.transactionRef}</span>
                          <span className="text-[10px] uppercase font-bold text-purple-400">Verified</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#27272A]">
                        {r.balanceDue > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRecordPaymentModal(r)}
                            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <CreditCard size={13} />
                            <span>Record Payment</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenDetailsModal(r)}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#27272A] text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5"
                          >
                            <Eye size={13} />
                            <span>View History</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(r)}
                          className="p-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30"
                          title="WhatsApp Reminder"
                        >
                          <MessageCircle size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDetailsModal(r)}
                          className="p-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300"
                          title="More Info"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= lg) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#09090B] text-zinc-400 uppercase text-[10px] font-black border-b border-[#27272A]">
                    <tr>
                      <th className="py-3.5 px-3">Document & Date</th>
                      <th className="py-3.5 px-3">Commercial Pipeline (QT ➔ PO ➔ PI ➔ Order)</th>
                      <th className="py-3.5 px-3">Customer / Enterprise</th>
                      <th className="py-3.5 px-3">Invoiced Value</th>
                      <th className="py-3.5 px-3">Total Paid</th>
                      <th className="py-3.5 px-3">Balance Due</th>
                      <th className="py-3.5 px-3">Aging & Status</th>
                      <th className="py-3.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]">
                    {filteredRecords.map((r) => {
                      const isPi = r.sourceType === 'PROFORMA_INVOICE';
                      const isGst = r.sourceType === 'GST_TAX_INVOICE';

                      return (
                        <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* Document # & Date */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{r.documentNumber}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1">
                              <span>{new Date(r.issueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span>•</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  isPi
                                    ? 'bg-purple-500/15 text-purple-300'
                                    : isGst
                                    ? 'bg-blue-500/15 text-blue-300'
                                    : 'bg-emerald-500/15 text-emerald-300'
                                }`}
                              >
                                {isPi ? 'PI' : isGst ? 'GST' : 'B2B Ord'}
                              </span>
                            </div>
                          </td>

                          {/* Commercial Pipeline */}
                          <td className="py-3.5 px-3">
                            {renderDocumentChain(r, true)}
                          </td>

                          {/* Customer & Company */}
                          <td
                            className={`py-3.5 px-3 ${r.customerId ? 'cursor-pointer group' : ''}`}
                            onClick={() => r.customerId && setDrawerCustomerId(r.customerId)}
                          >
                            <div className="font-bold text-zinc-200 group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                              <span>{r.companyName || r.customerName}</span>
                              {r.customerId && (
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-purple-400 transition-opacity font-normal">
                                  360°
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                              {r.customerPhone && <span>{r.customerPhone}</span>}
                              {r.customerGstin && (
                                <span className="px-1.5 py-0.2 rounded bg-[#27272A] text-[10px] text-zinc-300 font-mono">
                                  GST: {r.customerGstin}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Invoiced Value */}
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-white">
                              ₹{r.grandTotal.toLocaleString('en-IN')}
                            </div>
                            {isPi && r.advancePayable > 0 && (
                              <div className="text-[10px] text-purple-400">
                                Adv: ₹{r.advancePayable.toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>

                          {/* Paid */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-emerald-400">
                              ₹{r.totalPaid.toLocaleString('en-IN')}
                            </div>
                            {r.transactionRef && (
                              <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]" title={r.transactionRef}>
                                Ref: {r.transactionRef}
                              </div>
                            )}
                          </td>

                          {/* Balance Due */}
                          <td className="py-3.5 px-3">
                            <div className={`font-black text-sm ${r.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              ₹{r.balanceDue.toLocaleString('en-IN')}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3">
                            {r.balanceDue === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 size={11} /> Cleared
                              </span>
                            ) : r.isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse">
                                <AlertTriangle size={11} /> Overdue {Math.abs(r.daysRemaining)}d
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <Clock size={11} /> Due in {r.daysRemaining}d
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {r.balanceDue > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRecordPaymentModal(r)}
                                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                                >
                                  <CreditCard size={12} />
                                  <span>Record</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(r)}
                                className="p-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 transition-colors"
                                title="Send WhatsApp Remittance Notice"
                              >
                                <MessageCircle size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDetailsModal(r)}
                                className="p-1.5 rounded-lg bg-[#27272A] hover:bg-purple-600/20 text-zinc-300 hover:text-purple-300 transition-colors"
                                title="View Details & Notes"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : activeTab === 'CUSTOMER_ACCOUNTS' ? (
        /* ─── TAB 3: COMPANY BALANCES & LEDGERS ─── */
        <div className="p-4 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {customerAccounts.map((c) => (
              <div
                key={c.customerId}
                onClick={() => setDrawerCustomerId(c.customerId)}
                className="p-4 rounded-2xl bg-[#09090B] border border-[#27272A] hover:border-purple-500/50 transition-all space-y-3 cursor-pointer shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-white text-sm hover:text-purple-300 transition-colors flex items-center gap-1.5">
                      <span>{c.companyName || c.customerName}</span>
                      <ChevronRight size={13} className="text-zinc-500 opacity-60" />
                    </h3>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{c.customerName}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      c.riskLevel === 'HIGH_RISK_OVERDUE'
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : c.riskLevel === 'MODERATE'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {c.riskLevel.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-zinc-400 bg-[#18181B] p-2.5 rounded-xl border border-[#27272A]">
                  {c.phone && <div>📞 {c.phone}</div>}
                  {c.email && <div>✉️ {c.email}</div>}
                  {c.gstin && <div className="font-mono text-[10px]">GSTIN: {c.gstin}</div>}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#27272A]">
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Total Invoiced</span>
                    <span className="font-bold text-white">₹{c.totalInvoicedValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-zinc-500 block">Outstanding Due</span>
                    <span className={`font-black ${c.totalOutstandingDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ₹{c.totalOutstandingDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#27272A] flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">
                    {c.totalDocumentsCount} document(s)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomerIdFilter(c.companyName || c.customerName);
                      setActiveTab('DOCUMENTS_LEDGER');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-600/15 hover:bg-purple-600/30 text-purple-300 text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>Filter Invoices</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'DISPUTED_ACCOUNTS' ? (
        /* ─── TAB 4: DECLINED & DISPUTED ACCOUNTS ─── */
        renderDisputedAccountsTab()
      ) : (
        /* ─── TAB 5: AUTOMATION & FOLLOW-UP RULES ─── */
        renderAutomationRulesTab()
      )}

      {/* ─── RECORD PAYMENT MODAL ────────────────────────────────────────── */}
      {paymentModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CreditCard size={20} />
                <h3 className="text-base font-bold text-white">Record Commercial Remittance</h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalRecord(null)}
                className="p-1 rounded-lg hover:bg-[#27272A] text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Document Ref:</span>
                <span className="font-bold text-white">{paymentModalRecord.documentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Customer:</span>
                <span className="font-semibold text-zinc-200">{paymentModalRecord.companyName || paymentModalRecord.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Invoiced:</span>
                <span className="text-white font-medium">₹{paymentModalRecord.grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-[#27272A] pt-1.5">
                <span className="text-zinc-300 font-semibold">Remaining Balance Due:</span>
                <span className="text-rose-400 font-black text-sm">₹{paymentModalRecord.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Linked Commercial Pipeline Chain */}
            <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1.5">
              <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Link2 size={11} className="text-purple-400" />
                  <span>Synchronized Commercial Pipeline</span>
                </span>
                <span className="text-[9px] text-emerald-400 font-semibold">Auto-Sync Active</span>
              </div>
              {renderDocumentChain(paymentModalRecord, true)}
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Amount Received (INR) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="RTGS">RTGS (Bank Transfer)</option>
                    <option value="NEFT">NEFT (Bank Transfer)</option>
                    <option value="IMPS">IMPS (Immediate Payment)</option>
                    <option value="UPI">UPI / VPA</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                    <option value="CASH">Cash Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Bank UTR / Transaction Reference <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC123456789012"
                  value={paymentUtr}
                  onChange={(e) => setPaymentUtr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-xs font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Target Status</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ADVANCE_RECEIVED">Advance Received (Clear for Dispatch)</option>
                  <option value="FULLY_PAID">Fully Settled / Paid in Full</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Internal Clearance Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Verified in HDFC current account statement"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  disabled={savingPayment}
                  onClick={() => setPaymentModalRecord(null)}
                  className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingPayment && <RefreshCw size={13} className="animate-spin" />}
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DETAILS & QUICK FOLLOW-UP MODAL ────────────────────────────── */}
      {detailsModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <FileText size={18} />
                <h3 className="text-base font-bold text-white">Document Details & Follow-up</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalRecord(null)}
                className="p-1 rounded-lg hover:bg-[#27272A] text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Document:</span>
                <span className="font-bold text-white">{detailsModalRecord.documentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Customer:</span>
                <span className="font-semibold text-zinc-200">{detailsModalRecord.companyName || detailsModalRecord.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Contact:</span>
                <span className="text-zinc-300">{detailsModalRecord.customerPhone || 'N/A'} • {detailsModalRecord.customerEmail || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Value:</span>
                <span className="text-white font-bold">₹{detailsModalRecord.grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Balance Due:</span>
                <span className="text-rose-400 font-extrabold text-sm">₹{detailsModalRecord.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Commercial Document Pipeline Linked Stages */}
            <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2.5">
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Link2 size={13} className="text-purple-400" />
                  <span>Commercial Document Pipeline</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-normal">Click to inspect</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Quotation */}
                <div className="p-2 rounded-lg bg-[#18181B] border border-[#27272A] space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold flex items-center justify-between">
                    <span>1. Quotation</span>
                    {detailsModalRecord.linkedDocuments?.quotation?.status && (
                      <span className="text-indigo-400 font-mono text-[9px]">
                        {detailsModalRecord.linkedDocuments.quotation.status}
                      </span>
                    )}
                  </div>
                  {detailsModalRecord.linkedDocuments?.quotation ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectQuote(
                          detailsModalRecord.linkedDocuments.quotation!.id ||
                          detailsModalRecord.linkedDocuments.quotation!.quoteNumber
                        )
                      }
                      className="text-xs font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1 truncate w-full text-left"
                    >
                      <FileText size={12} className="flex-shrink-0" />
                      <span className="truncate">{detailsModalRecord.linkedDocuments.quotation.quoteNumber}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-600 italic">Not Linked</span>
                  )}
                </div>

                {/* PO */}
                <div className="p-2 rounded-lg bg-[#18181B] border border-[#27272A] space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold flex items-center justify-between">
                    <span>2. Purchase Order</span>
                    {detailsModalRecord.linkedDocuments?.po?.status && (
                      <span className="text-amber-400 font-mono text-[9px]">
                        {detailsModalRecord.linkedDocuments.po.status}
                      </span>
                    )}
                  </div>
                  {detailsModalRecord.linkedDocuments?.po ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectPo(
                          detailsModalRecord.linkedDocuments.po!.id ||
                          detailsModalRecord.linkedDocuments.po!.poSubmissionId ||
                          detailsModalRecord.linkedDocuments.po!.customerPoNumber ||
                          detailsModalRecord.linkedDocuments.po!.poNumber
                        )
                      }
                      className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 truncate w-full text-left"
                    >
                      <Layers size={12} className="flex-shrink-0" />
                      <span className="truncate">
                        {detailsModalRecord.linkedDocuments.po.customerPoNumber ||
                          detailsModalRecord.linkedDocuments.po.poNumber ||
                          'PO Attached'}
                      </span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-600 italic">Not Linked</span>
                  )}
                </div>

                {/* PI */}
                <div className="p-2 rounded-lg bg-[#18181B] border border-[#27272A] space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold flex items-center justify-between">
                    <span>3. Proforma</span>
                    {detailsModalRecord.linkedDocuments?.pi?.status && (
                      <span className="text-purple-400 font-mono text-[9px]">
                        {detailsModalRecord.linkedDocuments.pi.status}
                      </span>
                    )}
                  </div>
                  {detailsModalRecord.linkedDocuments?.pi ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectPi(
                          detailsModalRecord.linkedDocuments.pi!.id ||
                          detailsModalRecord.linkedDocuments.pi!.piNumber
                        )
                      }
                      className="text-xs font-bold text-purple-300 hover:text-purple-200 flex items-center gap-1 truncate w-full text-left"
                    >
                      <FileCheck size={12} className="flex-shrink-0" />
                      <span className="truncate">{detailsModalRecord.linkedDocuments.pi.piNumber}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-600 italic">Not Linked</span>
                  )}
                </div>

                {/* B2B Order */}
                <div className="p-2 rounded-lg bg-[#18181B] border border-[#27272A] space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold flex items-center justify-between">
                    <span>4. B2B Order</span>
                    {detailsModalRecord.linkedDocuments?.b2bOrder?.status && (
                      <span className="text-emerald-400 font-mono text-[9px]">
                        {detailsModalRecord.linkedDocuments.b2bOrder.status}
                      </span>
                    )}
                  </div>
                  {detailsModalRecord.linkedDocuments?.b2bOrder ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectB2bOrder(
                          detailsModalRecord.linkedDocuments.b2bOrder!.id ||
                          detailsModalRecord.linkedDocuments.b2bOrder!.orderNumber
                        )
                      }
                      className="text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 truncate w-full text-left"
                    >
                      <ShoppingBag size={12} className="flex-shrink-0" />
                      <span className="truncate">{detailsModalRecord.linkedDocuments.b2bOrder.orderNumber}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-600 italic">Not Linked</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Link for Proformas */}
            {detailsModalRecord.sourceType === 'PROFORMA_INVOICE' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProforma(detailsModalRecord.rawDoc);
                  setDetailsModalRecord(null);
                }}
                className="w-full py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/30 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>View Full Proforma Invoice Dossier</span>
                <ExternalLink size={13} />
              </button>
            )}

            {/* Follow-up Logger Form */}
            <form onSubmit={handleSubmitFollowup} className="space-y-3 pt-2 border-t border-[#27272A]">
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Log Follow-up Touchpoint
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Channel</label>
                  <select
                    value={followupChannel}
                    onChange={(e: any) => setFollowupChannel(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="PHONE">Phone Call</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                    <option value="IN_PERSON">In-Person</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Stage</label>
                  <select
                    value={followupStage}
                    onChange={(e: any) => setFollowupStage(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="COURTESY_REMINDER">Courtesy Reminder</option>
                    <option value="DUE_WARNING">Due Warning</option>
                    <option value="OVERDUE_ALERT">Overdue Alert</option>
                    <option value="PROMISE_TO_PAY">Promise to Pay (PTP)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Discussion Notes <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Client confirmed accounts head will release payment by Thursday..."
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">PTP Promised Date</label>
                  <input
                    type="date"
                    value={followupPtpDate}
                    onChange={(e) => setFollowupPtpDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Next Follow-up Due</label>
                  <input
                    type="date"
                    value={followupNextDate}
                    onChange={(e) => setFollowupNextDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDetailsModalRecord(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingFollowup}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingFollowup && <RefreshCw size={13} className="animate-spin" />}
                  <span>Save Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── QUOTATION QUICK INSPECTOR MODAL ────────────────────────────── */}
      {inspectingQuoteId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#18181B] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5 text-indigo-400">
                <FileText size={20} />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Quotation Inspector</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {quoteDetail?.quoteNumber || inspectingQuoteId}
                    </span>
                  </h3>
                  <div className="text-xs text-zinc-400">Upstream commercial pricing & approved line items</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectingQuoteId(null);
                  setQuoteDetail(null);
                }}
                className="p-1 rounded-lg hover:bg-[#27272A] text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {loadingQuoteDetail ? (
              <div className="py-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw size={22} className="animate-spin text-indigo-500" />
                <span className="text-xs">Fetching quotation dossier...</span>
              </div>
            ) : quoteDetail ? (
              <div className="space-y-4">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xs">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Client / Buyer</span>
                    <span className="font-bold text-white">{quoteDetail.companyName || `${quoteDetail.firstName} ${quoteDetail.lastName}`}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Reference / Project</span>
                    <span className="font-medium text-zinc-300">{quoteDetail.projectName || quoteDetail.referenceNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">GSTIN</span>
                    <span className="font-mono text-zinc-300">{quoteDetail.gstNo || 'Unregistered'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Quotation Status</span>
                    <span className="font-bold text-indigo-400">{quoteDetail.status}</span>
                  </div>
                </div>

                {/* Line items table */}
                {quoteDetail.items && quoteDetail.items.length > 0 && (
                  <div className="border border-[#27272A] rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-[#09090B] text-zinc-400 text-[11px] font-bold uppercase tracking-wider border-b border-[#27272A]">
                      Approved Line Items ({quoteDetail.items.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs text-zinc-300">
                        <thead className="bg-[#18181B] text-zinc-500 text-[10px] uppercase border-b border-[#27272A]">
                          <tr>
                            <th className="py-2 px-3">Item Description</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Rate</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272A]">
                          {quoteDetail.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="py-2 px-3 font-medium text-white">
                                {item.productNameSnapshot || item.product?.name || 'Product'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-400">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-400">
                                ₹{Number(item.rate).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-white font-mono">
                                ₹{Number(item.amount).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-500 text-[11px]">Subtotal: </span>
                    <span className="text-zinc-300 font-mono">₹{Number(quoteDetail.subtotal || 0).toLocaleString('en-IN')}</span>
                    <span className="mx-2 text-zinc-600">•</span>
                    <span className="text-zinc-500 text-[11px]">Tax: </span>
                    <span className="text-zinc-300 font-mono">₹{Number(quoteDetail.taxTotal || quoteDetail.gstAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-400 text-xs">Grand Total: </span>
                    <span className="text-base font-black text-indigo-400 font-mono">
                      ₹{Number(quoteDetail.grandTotal || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {quoteDetail.digitalSignature && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                    <span>Digitally Signed by <strong>{quoteDetail.signedBy || 'Authorized Signatory'}</strong> on {new Date(quoteDetail.signedAt || quoteDetail.updatedAt).toLocaleDateString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingQuoteId(null);
                      setQuoteDetail(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs">No quotation record found for this identifier.</div>
            )}
          </div>
        </div>
      )}

      {/* ─── PURCHASE ORDER QUICK INSPECTOR MODAL ────────────────────────────── */}
      {inspectingPoId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#18181B] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Layers size={20} />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Purchase Order Inspector</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {poDetail?.customerPoNumber || poDetail?.poSubmissionId || inspectingPoId}
                    </span>
                  </h3>
                  <div className="text-xs text-zinc-400">Customer purchase commitment and uploaded PO files</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectingPoId(null);
                  setPoDetail(null);
                }}
                className="p-1 rounded-lg hover:bg-[#27272A] text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {loadingPoDetail ? (
              <div className="py-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw size={22} className="animate-spin text-amber-500" />
                <span className="text-xs">Fetching PO submission & attachments...</span>
              </div>
            ) : poDetail ? (
              <div className="space-y-4">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xs">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Customer / Organization</span>
                    <span className="font-bold text-white">{poDetail.companyName || poDetail.customerName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Customer PO #</span>
                    <span className="font-mono font-bold text-amber-300">{poDetail.customerPoNumber || 'Attached in file'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Contact Email / Phone</span>
                    <span className="text-zinc-300">{poDetail.customerEmail || poDetail.customerPhone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">PO Status</span>
                    <span className="font-bold text-amber-400">{poDetail.status}</span>
                  </div>
                </div>

                {/* Email Subject / Message preview */}
                <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1.5 text-xs">
                  <div className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Mail size={13} className="text-amber-400" />
                    <span>{poDetail.subject || 'Purchase Order Submission'}</span>
                  </div>
                  {poDetail.previewText && (
                    <p className="text-zinc-400 text-[11px] line-clamp-3 italic">
                      "{poDetail.previewText}"
                    </p>
                  )}
                  <div className="text-[10px] text-zinc-500">
                    Received: {new Date(poDetail.receivedAt || poDetail.createdAt).toLocaleString('en-IN')} • Source: {poDetail.source}
                  </div>
                </div>

                {/* Attachments Section */}
                {poDetail.attachments && poDetail.attachments.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2">
                    <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ExternalLink size={13} className="text-amber-400" />
                      <span>PO Attachments & Invoices ({poDetail.attachments.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {poDetail.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.storageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] border border-[#3F3F46] flex items-center justify-between text-xs text-zinc-200 transition-colors group"
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold block truncate group-hover:text-amber-300">{att.fileName}</span>
                            <span className="text-[10px] text-zinc-500">{(att.fileSize / 1024).toFixed(1)} KB</span>
                          </div>
                          <Download size={14} className="text-zinc-400 group-hover:text-amber-400 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingPoId(null);
                      setPoDetail(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs">No PO record found for this identifier.</div>
            )}
          </div>
        </div>
      )}

      {/* ─── B2B ORDER QUICK INSPECTOR MODAL ────────────────────────────── */}
      {inspectingB2bOrderId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#18181B] border border-[#27272A] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <ShoppingBag size={20} />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>B2B Wholesale Order Inspector</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {b2bOrderDetail?.orderNumber || inspectingB2bOrderId}
                    </span>
                  </h3>
                  <div className="text-xs text-zinc-400">Downstream fulfillment, warehouse branch, and payment ledger</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectingB2bOrderId(null);
                  setB2bOrderDetail(null);
                }}
                className="p-1 rounded-lg hover:bg-[#27272A] text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {loadingB2bOrderDetail ? (
              <div className="py-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw size={22} className="animate-spin text-emerald-500" />
                <span className="text-xs">Fetching B2B order fulfillment dossier...</span>
              </div>
            ) : b2bOrderDetail ? (
              <div className="space-y-4">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xs">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Customer / Account</span>
                    <span className="font-bold text-white">{b2bOrderDetail.customer?.companyName || (b2bOrderDetail.customer ? `${b2bOrderDetail.customer.firstName} ${b2bOrderDetail.customer.lastName}`.trim() : 'B2B Client')}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Fulfillment Branch</span>
                    <span className="font-medium text-zinc-300">{b2bOrderDetail.branch?.name || 'Primary Warehouse'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Payment Status</span>
                    <span className={`font-bold uppercase ${b2bOrderDetail.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {b2bOrderDetail.paymentStatus || 'PENDING'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Order Status</span>
                    <span className="font-bold text-purple-400">{b2bOrderDetail.status}</span>
                  </div>
                </div>

                {/* Upstream links pill row */}
                <div className="flex items-center gap-2 flex-wrap text-xs bg-[#09090B] p-2.5 rounded-xl border border-[#27272A]">
                  <span className="text-zinc-500 text-[11px]">Commercial Chain:</span>
                  {b2bOrderDetail.sourceQuotation && (
                    <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono">
                      QT: {b2bOrderDetail.sourceQuotation.quoteNumber}
                    </span>
                  )}
                  {b2bOrderDetail.sourcePo && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-mono">
                      PO: {b2bOrderDetail.sourcePo.customerPoNumber || b2bOrderDetail.sourcePo.poSubmissionId}
                    </span>
                  )}
                  {b2bOrderDetail.sourcePi && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px] font-mono">
                      PI: {b2bOrderDetail.sourcePi.piNumber}
                    </span>
                  )}
                </div>

                {/* Items table */}
                {b2bOrderDetail.items && b2bOrderDetail.items.length > 0 && (
                  <div className="border border-[#27272A] rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-[#09090B] text-zinc-400 text-[11px] font-bold uppercase tracking-wider border-b border-[#27272A]">
                      Fulfillment Items ({b2bOrderDetail.items.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs text-zinc-300">
                        <thead className="bg-[#18181B] text-zinc-500 text-[10px] uppercase border-b border-[#27272A]">
                          <tr>
                            <th className="py-2 px-3">Product / SKU</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Unit Price</th>
                            <th className="py-2 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272A]">
                          {b2bOrderDetail.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="py-2 px-3">
                                <div className="font-medium text-white">{item.product?.name || item.sku}</div>
                                <div className="text-[10px] text-zinc-500 font-mono">SKU: {item.sku}</div>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-400">
                                {item.quantity}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-400">
                                ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-white font-mono">
                                ₹{Number(item.lineTotal || (Number(item.unitPrice) * Number(item.quantity))).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-500 text-[11px]">Total Paid: </span>
                    <span className="text-emerald-400 font-mono font-bold">₹{Number(b2bOrderDetail.paidAmount || 0).toLocaleString('en-IN')}</span>
                    <span className="mx-2 text-zinc-600">•</span>
                    <span className="text-zinc-500 text-[11px]">Balance Due: </span>
                    <span className="text-rose-400 font-mono font-bold">₹{Number(b2bOrderDetail.dueAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-400 text-xs">Grand Total: </span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      ₹{Number(b2bOrderDetail.grandTotal || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingB2bOrderId(null);
                      setB2bOrderDetail(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs">No B2B order record found for this identifier.</div>
            )}
          </div>
        </div>
      )}

      {/* ─── PAYMENT FOLLOW-UP & DUES RECOVERY MODALS ─────────────────────── */}
      <AddOldCustomerModal
        isOpen={isAddOldCustomerOpen}
        onClose={() => setIsAddOldCustomerOpen(false)}
        onSuccess={() => {
          showToast('Legacy customer onboarded with opening balance!');
          fetchDuesData();
          fetchAllCommercialData();
        }}
      />

      <RecordPaymentAllocationModal
        isOpen={allocationModal.isOpen}
        customerId={allocationModal.customerId}
        customerName={allocationModal.customerName}
        companyName={allocationModal.companyName}
        totalOutstanding={allocationModal.totalOutstanding}
        initialDueId={allocationModal.initialDueId}
        onClose={() => setAllocationModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          showToast('Payment allocated and recorded successfully!');
          fetchDuesData();
          fetchAllCommercialData();
        }}
      />

      <LogFollowupModal
        isOpen={logFollowupModal.isOpen}
        customerId={logFollowupModal.customerId}
        customerName={logFollowupModal.customerName}
        companyName={logFollowupModal.companyName}
        phone={logFollowupModal.phone}
        email={logFollowupModal.email}
        outstandingAmount={logFollowupModal.outstandingAmount}
        onClose={() => setLogFollowupModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          showToast('Follow-up touchpoint recorded!');
          fetchDuesData();
        }}
      />

      <SendLedgerModal
        isOpen={sendLedgerModal.isOpen}
        customerId={sendLedgerModal.customerId}
        customerName={sendLedgerModal.customerName}
        companyName={sendLedgerModal.companyName}
        email={sendLedgerModal.email}
        totalOutstanding={sendLedgerModal.totalOutstanding}
        onClose={() => setSendLedgerModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          showToast('Statement of Account PDF dispatched via email!');
          fetchDuesData();
        }}
      />

      <SendSmsReminderModal
        isOpen={sendSmsModal.isOpen}
        customerId={sendSmsModal.customerId}
        customerName={sendSmsModal.customerName}
        companyName={sendSmsModal.companyName}
        phone={sendSmsModal.phone}
        totalOutstanding={sendSmsModal.totalOutstanding}
        onClose={() => setSendSmsModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          showToast('SMS payment reminder dispatched!');
          fetchDuesData();
        }}
      />

      <DeclineDisputeModal
        isOpen={declineDisputeModal.isOpen}
        customerId={declineDisputeModal.customerId}
        customerName={declineDisputeModal.customerName}
        companyName={declineDisputeModal.companyName}
        totalOutstanding={declineDisputeModal.totalOutstanding}
        onClose={() => setDeclineDisputeModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          showToast('Account status updated. Excluded from automated reminders.');
          fetchDuesData();
          fetchAllCommercialData();
        }}
      />

      <BulkCommunicationModal
        isOpen={isBulkModalOpen}
        selectedCustomerIds={selectedCustomerIds}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          showToast('Bulk communication batch completed!');
          setSelectedCustomerIds([]);
          fetchDuesData();
        }}
      />

      <CustomerDuesDetailDrawer
        isOpen={Boolean(drawerCustomerId)}
        customerId={drawerCustomerId}
        onClose={() => setDrawerCustomerId(null)}
        onRecordPayment={(cId, outAmt, dId) => {
          const cust = duesCustomers.find((c) => c.customerId === cId);
          setAllocationModal({
            isOpen: true,
            customerId: cId,
            customerName: cust?.customerName || '',
            companyName: cust?.companyName,
            totalOutstanding: outAmt,
            initialDueId: dId,
          });
        }}
        onLogFollowup={(cId, outAmt) => {
          const cust = duesCustomers.find((c) => c.customerId === cId);
          setLogFollowupModal({
            isOpen: true,
            customerId: cId,
            customerName: cust?.customerName || '',
            companyName: cust?.companyName,
            phone: cust?.phone,
            email: cust?.email,
            outstandingAmount: outAmt,
          });
        }}
        onSendLedger={(cId, outAmt) => {
          const cust = duesCustomers.find((c) => c.customerId === cId);
          setSendLedgerModal({
            isOpen: true,
            customerId: cId,
            customerName: cust?.customerName || '',
            companyName: cust?.companyName,
            email: cust?.email,
            totalOutstanding: outAmt,
          });
        }}
        onSendSms={(cId, outAmt) => {
          const cust = duesCustomers.find((c) => c.customerId === cId);
          setSendSmsModal({
            isOpen: true,
            customerId: cId,
            customerName: cust?.customerName || '',
            companyName: cust?.companyName,
            phone: cust?.phone,
            totalOutstanding: outAmt,
          });
        }}
        onDeclineDispute={(cId, outAmt) => {
          const cust = duesCustomers.find((c) => c.customerId === cId);
          setDeclineDisputeModal({
            isOpen: true,
            customerId: cId,
            customerName: cust?.customerName || '',
            companyName: cust?.companyName,
            totalOutstanding: outAmt,
          });
        }}
        onResumeFollowup={handleResumeCustomer}
        onRefreshParent={fetchDuesData}
      />
    </div>
  );
}
