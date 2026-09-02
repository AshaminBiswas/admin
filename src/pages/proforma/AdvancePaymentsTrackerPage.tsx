import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark, ArrowLeft, Search, Filter, Download, RefreshCw,
  Clock, AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck,
  Calendar, FileText, ExternalLink, Eye, ChevronRight, UserCheck,
  Building2, Phone, Mail, DollarSign, ArrowUpDown, X, Check,
  CreditCard, Sparkles, Receipt, Layers, Users, TrendingUp,
  Percent, ArrowDownRight, ArrowUpRight, ChevronDown, CheckCheck,
  PhoneForwarded, MessageSquare, CalendarPlus, History, Send,
  CalendarCheck, AlertOctagon, MessageCircle, PhoneCall
} from 'lucide-react';
import { ProformaInvoice } from '../../types/proforma';
import { GSTInvoice } from '../../types/admin';
import { proformaService } from '../../api/proformaService';
import { listGSTInvoices } from '../../api/gstInvoiceService';
import { fetchAdminApi } from '../../api/adminApi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ProformaInvoiceDetailView } from './ProformaInvoiceDetailView';
import { ProformaInvoiceCreateView } from './ProformaInvoiceCreateView';

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
function generateWhatsAppReminderMessage(record: B2BPaymentRecord): string {
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

function generateEmailReminder(record: B2BPaymentRecord) {
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

export function AdvancePaymentsTrackerPage() {
  const { setCurrentView } = useAdminAuth();

  // Active View Tab: 'DOCUMENTS_LEDGER' | 'CUSTOMER_ACCOUNTS'
  const [activeTab, setActiveTab] = useState<'DOCUMENTS_LEDGER' | 'CUSTOMER_ACCOUNTS'>('DOCUMENTS_LEDGER');

  // Multi-Source Data States
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([]);
  const [gstInvoices, setGstInvoices] = useState<GSTInvoice[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [agingFilter, setAgingFilter] = useState<string>('ALL');
  const [followupFilter, setFollowupFilter] = useState<string>('ALL');
  const [selectedCustomerIdFilter, setSelectedCustomerIdFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'aging' | 'balance' | 'total' | 'date'>('aging');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Detail & Action Views
  const [selectedProforma, setSelectedProforma] = useState<ProformaInvoice | null>(null);
  const [editingProforma, setEditingProforma] = useState<ProformaInvoice | null>(null);

  // Universal Record Payment Modal State
  const [paymentModalRecord, setPaymentModalRecord] = useState<B2BPaymentRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<string>('ADVANCE_DEPOSIT');
  const [paymentMode, setPaymentMode] = useState<string>('RTGS');
  const [paymentUtr, setPaymentUtr] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bankAccountCredited, setBankAccountCredited] = useState<string>('HDFC Bank - Current A/C (Mandoli Branch)');
  const [targetStatus, setTargetStatus] = useState<string>('ADVANCE_RECEIVED');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Commercial Follow-up Modal State
  const [followupModalRecord, setFollowupModalRecord] = useState<B2BPaymentRecord | null>(null);
  const [followupChannel, setFollowupChannel] = useState<'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON' | 'LEGAL_NOTICE' | 'OTHER'>('PHONE');
  const [followupStage, setFollowupStage] = useState<'COURTESY_REMINDER' | 'DUE_WARNING' | 'OVERDUE_ALERT' | 'PROMISE_TO_PAY' | 'ESCALATED' | 'DISPUTED' | 'OTHER'>('COURTESY_REMINDER');
  const [followupNotes, setFollowupNotes] = useState<string>('');
  const [followupContactPerson, setFollowupContactPerson] = useState<string>('');
  const [followupContactPhone, setFollowupContactPhone] = useState<string>('');
  const [followupContactEmail, setFollowupContactEmail] = useState<string>('');
  const [followupPtpDate, setFollowupPtpDate] = useState<string>('');
  const [followupPtpAmount, setFollowupPtpAmount] = useState<number>(0);
  const [followupNextDate, setFollowupNextDate] = useState<string>('');
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [followupSuccessMsg, setFollowupSuccessMsg] = useState<string | null>(null);

  // Follow-up History Timeline Modal State
  const [historyModalRecord, setHistoryModalRecord] = useState<B2BPaymentRecord | null>(null);

  // Receipt Lightbox Modal State
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // ─── Load Multi-Source Commercial Data ──────────────────────────────────────
  const fetchAllCommercialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [piRes, gstRes, orderRes] = await Promise.allSettled([
        proformaService.listProformaInvoices({ limit: 100 }),
        listGSTInvoices({ limit: 100 }),
        fetchAdminApi('/orders?limit=100'),
      ]);

      if (piRes.status === 'fulfilled' && piRes.value) {
        const pis = Array.isArray(piRes.value.data)
          ? piRes.value.data
          : Array.isArray(piRes.value)
          ? piRes.value
          : [];
        setProformaInvoices(pis);
      } else if (piRes.status === 'rejected') {
        console.warn('[AdvancePaymentsTracker] Failed to load PIs:', piRes.reason);
      }

      if (gstRes.status === 'fulfilled' && gstRes.value) {
        const gsts = Array.isArray(gstRes.value.items)
          ? gstRes.value.items
          : Array.isArray(gstRes.value)
          ? gstRes.value
          : [];
        setGstInvoices(gsts);
      } else if (gstRes.status === 'rejected') {
        console.warn('[AdvancePaymentsTracker] Failed to load GST Invoices:', gstRes.reason);
      }

      if (orderRes.status === 'fulfilled' && orderRes.value) {
        const rawOrders =
          orderRes.value.data?.items ||
          orderRes.value.data?.orders ||
          orderRes.value.data ||
          orderRes.value;
        setOrders(Array.isArray(rawOrders) ? rawOrders : []);
      } else if (orderRes.status === 'rejected') {
        console.warn('[AdvancePaymentsTracker] Failed to load Orders:', orderRes.reason);
      }
    } catch (err: any) {
      console.error('[AdvancePaymentsTracker] Load error:', err);
      setError(err?.message || 'Failed to aggregate commercial payment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCommercialData();
  }, []);

  // ─── Transform & Normalize All Commercial Records ───────────────────────────
  const unifiedRecords: B2BPaymentRecord[] = useMemo(() => {
    const records: B2BPaymentRecord[] = [];
    const now = Date.now();

    // 1. Process Proforma Invoices (PIs)
    proformaInvoices.forEach((pi) => {
      const issueTime = new Date(pi.issueDate || (pi as any).createdAt || now).getTime();
      const daysElapsed = Math.max(0, Math.floor((now - issueTime) / (1000 * 60 * 60 * 24)));
      const validUntilTime = new Date(pi.validUntil || (issueTime + 30 * 86400000)).getTime();
      const daysRemaining = Math.ceil((validUntilTime - now) / (1000 * 60 * 60 * 24));

      const isCleared = pi.status === 'ADVANCE_RECEIVED' || pi.status === 'APPROVED' || pi.status === 'CONVERTED_TO_INVOICE';
      const isOverdue = !isCleared && daysRemaining < 0;
      const isExpiringSoon = !isCleared && daysRemaining >= 0 && daysRemaining <= 7;

      const customerFeedbackEvent = pi.history?.find((h) => h.action.toUpperCase().includes('CUSTOMER'));
      const customerUtr =
        customerFeedbackEvent?.metadata?.advancePaymentRef ||
        (pi.notes?.match(/Advance Ref:\s*([^\s\]\)]+)/i)?.[1]) ||
        (pi.history?.find((h) => h.metadata?.transactionRef)?.metadata?.transactionRef) ||
        undefined;

      const receiptUrl =
        customerFeedbackEvent?.metadata?.paymentReceiptUrl ||
        pi.history?.find((h) => h.metadata?.paymentReceiptUrl)?.metadata?.paymentReceiptUrl ||
        (pi.notes?.match(/\[Receipt:\s*(https?:\/\/[^\s\]]+|\/uploads\/[^\s\]]+)\]/i)?.[1]) ||
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

      // Follow-up intelligence from History & Notes
      const followUpEvents = (pi.history || []).filter(
        (h) => h.action === 'FOLLOW_UP_LOGGED' || (h.details && h.details.toLowerCase().includes('follow-up'))
      );
      const latestFollowUpEvent = followUpEvents[0];

      let lastFollowUp: B2BPaymentRecord['lastFollowUp'] = null;
      if (latestFollowUpEvent) {
        const meta = latestFollowUpEvent.metadata || {};
        lastFollowUp = {
          date: latestFollowUpEvent.createdAt || meta.loggedAt || new Date().toISOString(),
          channel: meta.channel || 'PHONE',
          stage: meta.stage || 'COURTESY_REMINDER',
          notes: meta.notes || latestFollowUpEvent.details || '',
          agent: meta.loggedBy || latestFollowUpEvent.performedBy || 'Accounts Desk',
          ptpDate: meta.ptpDate || null,
          ptpAmount: meta.ptpAmount || null,
          nextFollowupDate: meta.nextFollowupDate || null,
        };
      } else if (pi.notes && pi.notes.includes('[Follow-up')) {
        const match = pi.notes.match(/\[Follow-up\s+([^\|\]]+)\s*\|\s*([^-]+)-\s*([^\]]+)\]:\s*([^\[]+)(?:\[PTP Promised:\s*₹?([0-9,]+)\s+on\s+([^\]]+)\])?(?:\[Next Follow-up Due:\s*([^\]]+)\])?/i);
        if (match) {
          lastFollowUp = {
            date: match[1].trim(),
            channel: match[2].trim(),
            stage: match[3].trim(),
            notes: match[4].trim(),
            agent: 'Accounts Desk',
            ptpAmount: match[5] ? Number(match[5].replace(/,/g, '')) : null,
            ptpDate: match[6] ? match[6].trim() : null,
            nextFollowupDate: match[7] ? match[7].trim() : null,
          };
        }
      }

      let ptpDate = lastFollowUp?.ptpDate || null;
      let ptpAmount = lastFollowUp?.ptpAmount || null;
      let nextFollowupDate = lastFollowUp?.nextFollowupDate || null;
      let followupStatus: B2BPaymentRecord['followupStatus'] = 'NO_FOLLOWUP';

      const todayStr = new Date().toISOString().slice(0, 10);
      if (ptpDate) {
        followupStatus = 'PTP_PROMISED';
      } else if (nextFollowupDate) {
        if (nextFollowupDate < todayStr) {
          followupStatus = 'FOLLOWUP_OVERDUE';
        } else if (nextFollowupDate === todayStr) {
          followupStatus = 'FOLLOWUP_DUE_TODAY';
        } else {
          followupStatus = 'FOLLOWUP_SCHEDULED';
        }
      } else if (lastFollowUp) {
        followupStatus = 'FOLLOWUP_SCHEDULED';
      } else if (isOverdue || isExpiringSoon) {
        followupStatus = 'FOLLOWUP_OVERDUE';
      }

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
        lastFollowUp,
        ptpDate,
        ptpAmount,
        nextFollowupDate,
        followupStatus,
        history: pi.history || [],
        rawDoc: pi,
      });
    });

    // 2. Process GST Tax Invoices
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

      let lastFollowUp: B2BPaymentRecord['lastFollowUp'] = null;
      if (inv.notes && inv.notes.includes('[Follow-up')) {
        const match = inv.notes.match(/\[Follow-up\s+([^\|\]]+)\s*\|\s*([^-]+)-\s*([^\]]+)\]:\s*([^\[]+)(?:\[PTP Promised:\s*₹?([0-9,]+)\s+on\s+([^\]]+)\])?(?:\[Next Follow-up Due:\s*([^\]]+)\])?/i);
        if (match) {
          lastFollowUp = {
            date: match[1].trim(),
            channel: match[2].trim(),
            stage: match[3].trim(),
            notes: match[4].trim(),
            agent: 'Accounts Desk',
            ptpAmount: match[5] ? Number(match[5].replace(/,/g, '')) : null,
            ptpDate: match[6] ? match[6].trim() : null,
            nextFollowupDate: match[7] ? match[7].trim() : null,
          };
        }
      }

      let ptpDate = lastFollowUp?.ptpDate || null;
      let ptpAmount = lastFollowUp?.ptpAmount || null;
      let nextFollowupDate = lastFollowUp?.nextFollowupDate || null;
      let followupStatus: B2BPaymentRecord['followupStatus'] = 'NO_FOLLOWUP';

      const todayStr = new Date().toISOString().slice(0, 10);
      if (ptpDate) {
        followupStatus = 'PTP_PROMISED';
      } else if (nextFollowupDate) {
        if (nextFollowupDate < todayStr) {
          followupStatus = 'FOLLOWUP_OVERDUE';
        } else if (nextFollowupDate === todayStr) {
          followupStatus = 'FOLLOWUP_DUE_TODAY';
        } else {
          followupStatus = 'FOLLOWUP_SCHEDULED';
        }
      } else if (lastFollowUp) {
        followupStatus = 'FOLLOWUP_SCHEDULED';
      } else if (isOverdue || isExpiringSoon) {
        followupStatus = 'FOLLOWUP_OVERDUE';
      }

      records.push({
        id: `GST-${inv.id}`,
        sourceType: 'GST_TAX_INVOICE',
        documentNumber: inv.invoice_number,
        issueDate: inv.invoice_date ? new Date(inv.invoice_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        dueDate: new Date(dueTime).toISOString().slice(0, 10),
        daysElapsed,
        daysRemaining,
        isOverdue,
        isExpiringSoon,
        customerId: inv.customer_id,
        customerName: inv.customer_legal_name || 'B2B Enterprise',
        companyName: inv.customer_legal_name,
        customerGstin: inv.customer_gstin,
        placeOfSupply: inv.place_of_supply || 'Delhi',
        grandTotal,
        advancePayable: 0,
        advancePaid: isPaid ? grandTotal : 0,
        balanceDue,
        totalPaid,
        paymentStatus,
        paymentType: 'FULL_SETTLEMENT',
        paymentMode: isPaid ? 'Bank Remittance (Net 30)' : undefined,
        notes: inv.notes,
        lastFollowUp,
        ptpDate,
        ptpAmount,
        nextFollowupDate,
        followupStatus,
        rawDoc: inv,
      });
    });

    // 3. Process B2B Orders (where user has company / B2B metadata)
    orders.forEach((ord) => {
      const issueTime = new Date(ord.createdAt || ord.created_at || now).getTime();
      const daysElapsed = Math.max(0, Math.floor((now - issueTime) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.ceil((issueTime + 15 * 86400000 - now) / (1000 * 60 * 60 * 24));

      const isPaid = ord.paymentStatus === 'PAID' || ord.status === 'DELIVERED';
      const isOverdue = !isPaid && daysRemaining < 0;
      const isExpiringSoon = !isPaid && daysRemaining >= 0 && daysRemaining <= 5;

      const grandTotal = Number(ord.grandTotal || ord.total || 0);
      const totalPaid = isPaid ? grandTotal : 0;
      const balanceDue = isPaid ? 0 : grandTotal;

      const custName = ord.user ? `${ord.user.firstName || ''} ${ord.user.lastName || ''}`.trim() : (ord.shippingAddress?.name || 'Store Customer');
      const compName = ord.user?.companyName || ord.billingAddress?.company || custName;

      let paymentStatus: B2BPaymentRecord['paymentStatus'] = 'AWAITING_ADVANCE';
      if (ord.status === 'CANCELLED') paymentStatus = 'CANCELLED';
      else if (isPaid) paymentStatus = 'FULLY_PAID';
      else if (isOverdue) paymentStatus = 'OVERDUE';
      else paymentStatus = 'PARTIALLY_PAID';

      let followupStatus: B2BPaymentRecord['followupStatus'] = isOverdue ? 'FOLLOWUP_OVERDUE' : 'NO_FOLLOWUP';

      records.push({
        id: `ORD-${ord.id}`,
        sourceType: 'B2B_ORDER',
        documentNumber: ord.orderNumber || `ORD-${ord.id.slice(0, 8)}`,
        issueDate: new Date(issueTime).toISOString().slice(0, 10),
        dueDate: new Date(issueTime + 15 * 86400000).toISOString().slice(0, 10),
        daysElapsed,
        daysRemaining,
        isOverdue,
        isExpiringSoon,
        customerId: ord.userId || ord.user?.id,
        customerName: custName,
        companyName: compName,
        customerGstin: ord.user?.gstin,
        customerPhone: ord.user?.phone || ord.shippingAddress?.phone,
        customerEmail: ord.user?.email,
        placeOfSupply: ord.shippingAddress?.state || 'Delhi',
        grandTotal,
        advancePayable: 0,
        advancePaid: totalPaid,
        balanceDue,
        totalPaid,
        paymentStatus,
        paymentType: 'DIRECT_ORDER_PAYMENT',
        paymentMode: ord.paymentMethod || 'RAZORPAY',
        transactionRef: ord.trackingNumber || undefined,
        notes: ord.notes,
        followupStatus,
        rawDoc: ord,
      });
    });

    return records;
  }, [proformaInvoices, gstInvoices, orders]);

  // ─── Aggregated Customer Accounts 360° Matrix ────────────────────────────────
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

      // Aggregate values
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

    // Evaluate Risk Levels
    return Array.from(customerMap.values()).map((c) => {
      if (c.overdueDocumentsCount > 0 || c.oldestPendingDays > 45) {
        c.riskLevel = 'HIGH_RISK_OVERDUE';
      } else if (c.totalOutstandingDue > 0 && c.oldestPendingDays > 15) {
        c.riskLevel = 'MODERATE';
      } else {
        c.riskLevel = 'LOW_RISK';
      }
      return c;
    });
  }, [unifiedRecords]);

  // ─── Executive Financial Matrix ─────────────────────────────────────────────
  const executiveKpis = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let overdueValue = 0;
    let customerUtrCount = 0;
    let customerUtrValue = 0;
    let followupDueTodayCount = 0;
    let ptpPromisedCount = 0;
    let followupOverdueCount = 0;

    unifiedRecords.forEach((r) => {
      totalInvoiced += r.grandTotal;
      totalCollected += r.totalPaid;
      totalOutstanding += r.balanceDue;

      if (r.isOverdue) {
        overdueCount++;
        overdueValue += r.balanceDue;
      }

      if (r.paymentStatus === 'CUSTOMER_SUBMITTED' || Boolean(r.transactionRef)) {
        customerUtrCount++;
        customerUtrValue += r.advancePayable || r.grandTotal;
      }

      if (r.followupStatus === 'FOLLOWUP_DUE_TODAY') followupDueTodayCount++;
      if (r.followupStatus === 'PTP_PROMISED') ptpPromisedCount++;
      if (r.followupStatus === 'FOLLOWUP_OVERDUE') followupOverdueCount++;
    });

    const activeDebtorsCount = customerAccounts.filter((c) => c.totalOutstandingDue > 0).length;

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      overdueCount,
      overdueValue,
      customerUtrCount,
      customerUtrValue,
      activeDebtorsCount,
      followupDueTodayCount,
      ptpPromisedCount,
      followupOverdueCount,
      totalDocuments: unifiedRecords.length,
      collectionRatio: totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0,
    };
  }, [unifiedRecords, customerAccounts]);

  // ─── Filtered & Sorted Ledger Records ───────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return unifiedRecords
      .filter((rec) => {
        // Customer ID / Company Filter (from 1-click drilldown)
        if (selectedCustomerIdFilter) {
          const matchId = rec.customerId === selectedCustomerIdFilter;
          const matchCompany = (rec.companyName || '').toLowerCase() === selectedCustomerIdFilter.toLowerCase();
          if (!matchId && !matchCompany) return false;
        }

        // Source Type Filter
        if (sourceTypeFilter !== 'ALL' && rec.sourceType !== sourceTypeFilter) {
          return false;
        }

        // Search Query
        const q = searchQuery.toLowerCase().trim();
        if (q) {
          const matchDoc = rec.documentNumber.toLowerCase().includes(q);
          const matchCust = rec.customerName.toLowerCase().includes(q);
          const matchComp = (rec.companyName || '').toLowerCase().includes(q);
          const matchGstin = (rec.customerGstin || '').toLowerCase().includes(q);
          const matchPhone = (rec.customerPhone || '').toLowerCase().includes(q);
          const matchUtr = (rec.transactionRef || '').toLowerCase().includes(q);
          if (!matchDoc && !matchCust && !matchComp && !matchGstin && !matchPhone && !matchUtr) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter === 'AWAITING_ADVANCE') {
          if (rec.paymentStatus !== 'AWAITING_ADVANCE') return false;
        } else if (statusFilter === 'CUSTOMER_SUBMITTED') {
          if (rec.paymentStatus !== 'CUSTOMER_SUBMITTED' && !rec.transactionRef) return false;
        } else if (statusFilter === 'ADVANCE_CLEARED') {
          if (rec.paymentStatus !== 'ADVANCE_RECEIVED') return false;
        } else if (statusFilter === 'FULLY_PAID') {
          if (rec.paymentStatus !== 'FULLY_PAID') return false;
        } else if (statusFilter === 'OVERDUE') {
          if (!rec.isOverdue) return false;
        }

        // Follow-up Filter
        if (followupFilter === 'DUE_TODAY') {
          if (rec.followupStatus !== 'FOLLOWUP_DUE_TODAY') return false;
        } else if (followupFilter === 'OVERDUE') {
          if (rec.followupStatus !== 'FOLLOWUP_OVERDUE') return false;
        } else if (followupFilter === 'PTP_PROMISED') {
          if (rec.followupStatus !== 'PTP_PROMISED') return false;
        } else if (followupFilter === 'NO_FOLLOWUP') {
          if (rec.followupStatus !== 'NO_FOLLOWUP') return false;
        }

        // Aging Filter
        if (agingFilter === 'UNDER_7') {
          if (rec.daysElapsed > 7) return false;
        } else if (agingFilter === '7_TO_14') {
          if (rec.daysElapsed < 7 || rec.daysElapsed > 14) return false;
        } else if (agingFilter === '15_TO_30') {
          if (rec.daysElapsed < 15 || rec.daysElapsed > 30) return false;
        } else if (agingFilter === '31_TO_60') {
          if (rec.daysElapsed < 31 || rec.daysElapsed > 60) return false;
        } else if (agingFilter === 'OVER_60') {
          if (rec.daysElapsed <= 60) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'aging') {
          return sortOrder === 'desc' ? b.daysElapsed - a.daysElapsed : a.daysElapsed - b.daysElapsed;
        } else if (sortBy === 'balance') {
          return sortOrder === 'desc' ? b.balanceDue - a.balanceDue : a.balanceDue - b.balanceDue;
        } else if (sortBy === 'total') {
          return sortOrder === 'desc' ? b.grandTotal - a.grandTotal : a.grandTotal - b.grandTotal;
        } else {
          const dateA = new Date(a.issueDate).getTime();
          const dateB = new Date(b.issueDate).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        }
      });
  }, [unifiedRecords, searchQuery, sourceTypeFilter, statusFilter, followupFilter, agingFilter, selectedCustomerIdFilter, sortBy, sortOrder]);

  // ─── Open Universal Record Payment Modal ────────────────────────────────────
  const handleOpenPaymentModal = (record: B2BPaymentRecord) => {
    setPaymentModalRecord(record);
    setPaymentAmount(record.advancePayable > 0 && record.advancePaid === 0 ? record.advancePayable : record.balanceDue);
    setPaymentType(record.sourceType === 'PROFORMA_INVOICE' ? 'ADVANCE_DEPOSIT' : 'FULL_SETTLEMENT');
    setPaymentMode('RTGS');
    setPaymentUtr(record.transactionRef || '');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setBankAccountCredited('HDFC Bank - Current A/C (Mandoli Branch)');
    setTargetStatus(record.sourceType === 'PROFORMA_INVOICE' ? 'ADVANCE_RECEIVED' : 'PAID');
    setPaymentNotes('');
    setPaymentSuccessMsg(null);
  };

  // ─── Open Commercial Follow-up Modal ─────────────────────────────────────────
  const handleOpenFollowupModal = (record: B2BPaymentRecord) => {
    setFollowupModalRecord(record);
    setFollowupContactPerson(record.customerName || '');
    setFollowupContactPhone(record.customerPhone || '');
    setFollowupContactEmail(record.customerEmail || '');
    setFollowupNotes('');
    setFollowupPtpDate(record.ptpDate || '');
    setFollowupPtpAmount(record.ptpAmount || (record.sourceType === 'PROFORMA_INVOICE' && record.advancePayable > 0 && record.advancePaid === 0 ? record.advancePayable : record.balanceDue));
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3);
    setFollowupNextDate(nextDate.toISOString().slice(0, 10));
    setFollowupChannel('PHONE');
    setFollowupStage(record.isOverdue ? 'OVERDUE_ALERT' : record.isExpiringSoon ? 'DUE_WARNING' : 'COURTESY_REMINDER');
    setFollowupSuccessMsg(null);
  };

  // ─── Submit Follow-up Touchpoint ───────────────────────────────────────────
  const handleSubmitFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupModalRecord) return;
    if (!followupNotes.trim()) {
      alert('Please enter follow-up remarks / discussion notes.');
      return;
    }

    setSavingFollowup(true);
    try {
      if (followupModalRecord.sourceType === 'PROFORMA_INVOICE') {
        const rawPi = followupModalRecord.rawDoc as ProformaInvoice;
        await proformaService.logFollowUp(rawPi.id, {
          channel: followupChannel,
          stage: followupStage,
          notes: followupNotes.trim(),
          contactedPerson: followupContactPerson.trim() || undefined,
          contactPhone: followupContactPhone.trim() || undefined,
          contactEmail: followupContactEmail.trim() || undefined,
          ptpDate: followupPtpDate || undefined,
          ptpAmount: followupPtpAmount > 0 ? Number(followupPtpAmount) : undefined,
          nextFollowupDate: followupNextDate || undefined,
        });
      } else if (followupModalRecord.sourceType === 'GST_TAX_INVOICE') {
        const rawGst = followupModalRecord.rawDoc as GSTInvoice;
        const ptpStr = followupPtpDate ? ` [PTP: ₹${Number(followupPtpAmount || 0).toLocaleString('en-IN')} on ${followupPtpDate}]` : '';
        const nextStr = followupNextDate ? ` [Next Due: ${followupNextDate}]` : '';
        await fetchAdminApi(`/gst/invoices/${rawGst.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            notes: `${rawGst.notes ? `${rawGst.notes}\n` : ''}[Follow-up ${new Date().toLocaleDateString('en-IN')} | ${followupChannel} - ${followupStage}]: ${followupNotes.trim()}${ptpStr}${nextStr}`,
          }),
        });
      }

      setFollowupSuccessMsg(`Follow-up logged successfully for ${followupModalRecord.documentNumber}!`);
      await fetchAllCommercialData();
      setTimeout(() => {
        setFollowupModalRecord(null);
        setFollowupSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      console.error('[AdvancePaymentsTracker] Followup error:', err);
      alert(err?.message || 'Failed to record follow-up touchpoint on server.');
    } finally {
      setSavingFollowup(false);
    }
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

  // ─── Submit Payment Clearance ───────────────────────────────────────────────
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalRecord) return;

    if (!paymentUtr.trim()) {
      alert('Please provide the Bank UTR / Transaction Reference Number.');
      return;
    }

    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount.');
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
      } else if (paymentModalRecord.sourceType === 'GST_TAX_INVOICE') {
        const rawGst = paymentModalRecord.rawDoc as GSTInvoice;
        await fetchAdminApi(`/gst/invoices/${rawGst.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: targetStatus === 'PAID' ? 'PAID' : 'DRAFT',
            notes: `${rawGst.notes ? `${rawGst.notes}\n` : ''}[Payment Cleared - ${paymentDate}]: ₹${paymentAmount.toLocaleString('en-IN')} via ${paymentMode} (Ref: ${paymentUtr.trim()})`,
          }),
        });
      }

      setPaymentSuccessMsg(`Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded & reconciled successfully!`);
      setTimeout(() => {
        setPaymentModalRecord(null);
        fetchAllCommercialData();
      }, 1200);
    } catch (err: any) {
      console.error('[AdvancePaymentsTracker] Payment save error:', err);
      alert(err?.message || 'Failed to record payment on server.');
    } finally {
      setSavingPayment(false);
    }
  };

  // ─── Export Ledger to CSV ───────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'Document Type',
      'Document Number',
      'Issue Date',
      'Due Date',
      'Days Elapsed',
      'SLA Status',
      'Customer Legal Name',
      'Company Name',
      'GSTIN',
      'Phone',
      'Place of Supply',
      'Grand Total (INR)',
      'Advance Payable (INR)',
      'Advance Paid (INR)',
      'Balance Due (INR)',
      'Payment Status',
      'Bank UTR Reference',
      'Payment Mode',
    ];

    const rows = filteredRecords.map((r) => {
      let slaText = 'Within Credit SLA';
      if (r.paymentStatus === 'FULLY_PAID' || r.paymentStatus === 'ADVANCE_RECEIVED') slaText = 'Payment Cleared';
      else if (r.isOverdue) slaText = `Overdue by ${Math.abs(r.daysRemaining)} days`;
      else if (r.isExpiringSoon) slaText = `Due in ${r.daysRemaining} days`;

      return [
        `"${r.sourceType}"`,
        `"${r.documentNumber}"`,
        `"${r.issueDate}"`,
        `"${r.dueDate}"`,
        r.daysElapsed,
        `"${slaText}"`,
        `"${r.customerName}"`,
        `"${r.companyName || ''}"`,
        `"${r.customerGstin || ''}"`,
        `"${r.customerPhone || ''}"`,
        `"${r.placeOfSupply || ''}"`,
        r.grandTotal,
        r.advancePayable,
        r.advancePaid,
        r.balanceDue,
        `"${r.paymentStatus}"`,
        `"${r.transactionRef || ''}"`,
        `"${r.paymentMode || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PRC-B2B-Payments-Ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If Edit View is active for a Proforma Invoice:
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

  // If Detail View is active for a Proforma Invoice:
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 animate-in fade-in duration-200">
      
      {/* ─── Top Header & Navigation Switcher ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272A] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#8B5CF6] bg-[#8B5CF6]/10 px-2.5 py-0.5 rounded-md border border-[#8B5CF6]/20">
              COMMERCIAL ACCOUNTS & RECEIVABLES LEDGER
            </span>
            <span className="text-xs text-zinc-400 font-mono">B2B Financial Intelligence</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2.5">
            <Landmark className="text-[#8B5CF6]" size={26} />
            B2B Payments & Commercial Receivables Hub
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Unified tracking for all B2B customer payments, Proforma Invoices, GST Tax Invoices, credit SLA overdues, bank UTR clearances, and client ledger exposures.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Switch to PI Page */}
          <button
            type="button"
            onClick={() => setCurrentView('proforma-invoices')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-300 text-xs font-bold border border-[#27272A] transition-all"
          >
            <FileText size={15} />
            <span>Proforma Invoices (PI)</span>
          </button>

          {/* Quick Switch to GST Invoices */}
          <button
            type="button"
            onClick={() => setCurrentView('invoice')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-300 text-xs font-bold border border-[#27272A] transition-all"
          >
            <Receipt size={15} />
            <span>GST Tax Invoices</span>
          </button>

          {/* Export CSV Ledger */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-all"
          >
            <Download size={15} />
            <span>Export CSV Ledger</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchAllCommercialData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── Executive Financial Matrix (5 KPI Cards) ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Total Invoiced Value */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total B2B Invoiced</span>
            <DollarSign size={16} className="text-zinc-500" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            ₹{executiveKpis.totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-zinc-400">
            Across <strong>{executiveKpis.totalDocuments}</strong> commercial documents
          </div>
        </div>

        {/* Card 2: Total Payments Collected */}
        <div className="bg-[#18181B] border border-purple-500/40 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-purple-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Payments Cleared</span>
            <CheckCheck size={16} className="text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-300 font-mono">
            ₹{executiveKpis.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-purple-400/80">
            {executiveKpis.collectionRatio.toFixed(1)}% overall collection rate
          </div>
        </div>

        {/* Card 3: Outstanding Receivables Pending */}
        <div className="bg-[#18181B] border border-amber-500/40 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Outstanding Receivables</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-300 font-mono">
            ₹{executiveKpis.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-amber-400/80">
            Across <strong>{executiveKpis.activeDebtorsCount}</strong> active enterprise buyers
          </div>
        </div>

        {/* Card 4: Customer UTR Proofs Awaiting Clearance */}
        <div className="bg-[#18181B] border border-cyan-500/40 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-cyan-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Customer UTR Proofs</span>
            <CheckCircle2 size={16} className="text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-300 font-mono">
            {executiveKpis.customerUtrCount} <span className="text-xs text-zinc-400 font-normal">Records</span>
          </div>
          <div className="text-[11px] text-cyan-400/80">
            ₹{executiveKpis.customerUtrValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} awaiting desk clearance
          </div>
        </div>

        {/* Card 5: Overdue / Expired Receivables Alert */}
        <div className="bg-[#18181B] border border-rose-500/40 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue (&gt;30 Days SLA)</span>
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-400 font-mono">
            {executiveKpis.overdueCount} <span className="text-xs text-zinc-400 font-normal">Overdue Dues</span>
          </div>
          <div className="text-[11px] text-rose-400/80">
            ₹{executiveKpis.overdueValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} payment SLA breached
          </div>
        </div>

      </div>

      {/* ─── Primary View Switcher: Documents vs Customer Accounts 360° ──── */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('DOCUMENTS_LEDGER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'DOCUMENTS_LEDGER'
                ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20'
                : 'bg-[#18181B] text-zinc-400 hover:text-white border border-[#27272A]'
            }`}
          >
            <Layers size={15} />
            <span>Commercial Documents & Receivables Ledger</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 font-mono">
              {filteredRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CUSTOMER_ACCOUNTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'CUSTOMER_ACCOUNTS'
                ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20'
                : 'bg-[#18181B] text-zinc-400 hover:text-white border border-[#27272A]'
            }`}
          >
            <Users size={15} />
            <span>B2B Customer Accounts Exposure (360° Ledger)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 font-mono">
              {customerAccounts.length}
            </span>
          </button>
        </div>

        {selectedCustomerIdFilter && (
          <div className="flex items-center gap-2 bg-purple-950/60 border border-purple-800 px-3 py-1.5 rounded-xl text-xs text-purple-200">
            <span>Filtered by Client: <strong>{selectedCustomerIdFilter}</strong></span>
            <button
              onClick={() => setSelectedCustomerIdFilter(null)}
              className="text-purple-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ─── TAB 1: ALL COMMERCIAL DOCUMENTS & RECEIVABLES LEDGER ─────────── */}
      {activeTab === 'DOCUMENTS_LEDGER' && (
        <div className="space-y-4">
          
          {/* Search, Filter Tabs & Sort Controls */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-3.5 shadow-xl">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[280px]">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by customer name, company, GSTIN, PI / Tax Invoice / Order #, Bank UTR..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Document Source Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-bold shrink-0">Document:</span>
                <select
                  value={sourceTypeFilter}
                  onChange={(e) => setSourceTypeFilter(e.target.value)}
                  className="px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="ALL">All Document Types</option>
                  <option value="PROFORMA_INVOICE">Proforma Invoices (PI)</option>
                  <option value="GST_TAX_INVOICE">GST Tax Invoices</option>
                  <option value="B2B_ORDER">B2B Sales Orders</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-bold shrink-0">Payment:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="ALL">All Payment Statuses</option>
                  <option value="AWAITING_ADVANCE">⏳ Awaiting Advance</option>
                  <option value="CUSTOMER_SUBMITTED">⚡ Customer Submitted UTR / Proof</option>
                  <option value="ADVANCE_CLEARED">✅ Advance Cleared</option>
                  <option value="FULLY_PAID">🏆 Fully Paid & Reconciled</option>
                  <option value="OVERDUE">🚨 Overdue (&gt; 30 Days SLA)</option>
                </select>
              </div>

              {/* Follow-up / Reminders Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-purple-400 font-bold shrink-0 flex items-center gap-1">
                  <PhoneForwarded size={12} /> Follow-up:
                </span>
                <select
                  value={followupFilter}
                  onChange={(e) => setFollowupFilter(e.target.value as any)}
                  className="px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-purple-300 focus:outline-none font-bold"
                >
                  <option value="ALL">All Follow-ups</option>
                  <option value="DUE_TODAY">📞 Due Today ({executiveKpis.followupDueTodayCount})</option>
                  <option value="OVERDUE">🚨 Follow-up Overdue ({executiveKpis.followupOverdueCount})</option>
                  <option value="PTP_PROMISED">🤝 Promise to Pay (PTP) ({executiveKpis.ptpPromisedCount})</option>
                  <option value="NO_FOLLOWUP">⚡ No Follow-up Logged</option>
                </select>
              </div>

              {/* Aging Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-bold shrink-0">Aging:</span>
                <select
                  value={agingFilter}
                  onChange={(e) => setAgingFilter(e.target.value)}
                  className="px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="ALL">All Aging Days</option>
                  <option value="UNDER_7">&lt; 7 Days (Fresh)</option>
                  <option value="7_TO_14">7 - 14 Days</option>
                  <option value="15_TO_30">15 - 30 Days</option>
                  <option value="31_TO_60">31 - 60 Days</option>
                  <option value="OVER_60">&gt; 60 Days (Critical)</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-bold shrink-0">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="aging">Aging (Most Overdue)</option>
                  <option value="balance">Outstanding Balance (Highest)</option>
                  <option value="total">Grand Total (Highest)</option>
                  <option value="date">Issue Date (Newest)</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-2 bg-[#09090B] border border-[#27272A] hover:border-zinc-500 rounded-xl text-zinc-300 text-xs"
                >
                  <ArrowUpDown size={14} />
                </button>
              </div>
            </div>

            {/* Quick Filter Pill Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#27272A]">
              {[
                { id: 'ALL', label: 'All Records', count: unifiedRecords.length },
                {
                  id: 'AWAITING_ADVANCE',
                  label: 'Awaiting Advance',
                  count: unifiedRecords.filter((r) => r.paymentStatus === 'AWAITING_ADVANCE').length,
                },
                {
                  id: 'CUSTOMER_SUBMITTED',
                  label: 'Customer UTR Submitted',
                  count: executiveKpis.customerUtrCount,
                },
                {
                  id: 'ADVANCE_CLEARED',
                  label: 'Advance Cleared',
                  count: unifiedRecords.filter((r) => r.paymentStatus === 'ADVANCE_RECEIVED').length,
                },
                {
                  id: 'FULLY_PAID',
                  label: 'Fully Paid',
                  count: unifiedRecords.filter((r) => r.paymentStatus === 'FULLY_PAID').length,
                },
                {
                  id: 'OVERDUE',
                  label: '🚨 Overdue Receivables',
                  count: executiveKpis.overdueCount,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setFollowupFilter('ALL');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === tab.id && followupFilter === 'ALL'
                      ? 'bg-[#8B5CF6] text-white shadow-md'
                      : 'bg-[#27272A]/40 hover:bg-[#27272A] text-zinc-400 hover:text-zinc-200 border border-[#27272A]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === tab.id && followupFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}

              {/* Follow-up Quick Pills */}
              <div className="h-4 w-px bg-zinc-700 mx-1 hidden sm:block" />

              <button
                type="button"
                onClick={() => {
                  setFollowupFilter(followupFilter === 'DUE_TODAY' ? 'ALL' : 'DUE_TODAY');
                  setStatusFilter('ALL');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  followupFilter === 'DUE_TODAY'
                    ? 'bg-amber-500 text-black shadow-md font-black'
                    : 'bg-amber-950/40 hover:bg-amber-950/70 text-amber-300 border border-amber-800/60'
                }`}
              >
                <PhoneForwarded size={12} />
                <span>Follow-up Due Today</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  followupFilter === 'DUE_TODAY' ? 'bg-black/30 text-black' : 'bg-amber-900/60 text-amber-200'
                }`}>
                  {executiveKpis.followupDueTodayCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFollowupFilter(followupFilter === 'PTP_PROMISED' ? 'ALL' : 'PTP_PROMISED');
                  setStatusFilter('ALL');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  followupFilter === 'PTP_PROMISED'
                    ? 'bg-emerald-500 text-black shadow-md font-black'
                    : 'bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                }`}
              >
                <span>🤝 PTP Promised</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  followupFilter === 'PTP_PROMISED' ? 'bg-black/30 text-black' : 'bg-emerald-900/60 text-emerald-200'
                }`}>
                  {executiveKpis.ptpPromisedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFollowupFilter(followupFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE');
                  setStatusFilter('ALL');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  followupFilter === 'OVERDUE'
                    ? 'bg-rose-600 text-white shadow-md font-black'
                    : 'bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-800/60'
                }`}
              >
                <AlertOctagon size={12} />
                <span>Overdue Follow-ups</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  followupFilter === 'OVERDUE' ? 'bg-black/30 text-white' : 'bg-rose-900/60 text-rose-200'
                }`}>
                  {executiveKpis.followupOverdueCount}
                </span>
              </button>
            </div>

          </div>

          {/* Interactive Ledger Table */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-[#27272A]/40 border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Commercial Documents & Receivables Ledger
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  ({filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw size={24} className="animate-spin text-[#8B5CF6] mx-auto" />
                <p className="text-xs text-zinc-400">Loading multi-source commercial receivables...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <AlertCircle size={28} className="text-zinc-600 mx-auto" />
                <div className="text-sm font-bold text-zinc-400">No commercial records found matching your filters</div>
                <p className="text-xs text-zinc-600">Try clearing your search query or adjusting filter parameters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#27272A] bg-[#27272A]/20 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Document # & Origin</th>
                      <th className="py-3 px-4">B2B Customer & Company</th>
                      <th className="py-3 px-4 text-right">Invoiced Total</th>
                      <th className="py-3 px-4 text-right">Advance / Paid</th>
                      <th className="py-3 px-4 text-right">Outstanding Due</th>
                      <th className="py-3 px-4">Payment / UTR Proof</th>
                      <th className="py-3 px-4 text-center">Aging & Follow-up Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A] text-zinc-300">
                    {filteredRecords.map((rec) => {
                      const isPi = rec.sourceType === 'PROFORMA_INVOICE';
                      const isGst = rec.sourceType === 'GST_TAX_INVOICE';
                      const isOrd = rec.sourceType === 'B2B_ORDER';

                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-[#27272A]/30 transition-colors group"
                        >
                          {/* Document Number & Origin */}
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 rounded font-mono ${
                                isPi
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                  : isGst
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}>
                                {isPi ? 'PI' : isGst ? 'GST TAX' : 'ORDER'}
                              </span>
                              <span
                                onClick={() => {
                                  if (isPi) setSelectedProforma(rec.rawDoc);
                                }}
                                className={`font-mono font-bold ${
                                  isPi ? 'text-[#8B5CF6] hover:underline cursor-pointer' : 'text-white'
                                }`}
                              >
                                {rec.documentNumber}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                              <Calendar size={11} className="text-zinc-500" />
                              <span>{new Date(rec.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {rec.daysElapsed}d elapsed
                            </div>
                          </td>

                          {/* Customer & Company */}
                          <td className="py-3.5 px-4 space-y-1 max-w-[220px]">
                            <div className="font-bold text-white truncate" title={rec.customerName}>
                              {rec.customerName}
                            </div>
                            {rec.companyName && (
                              <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1" title={rec.companyName}>
                                <Building2 size={11} className="text-zinc-500 shrink-0" />
                                <span className="truncate">{rec.companyName}</span>
                              </div>
                            )}
                            {rec.customerGstin && (
                              <div className="text-[10px] text-zinc-500 font-mono">
                                GST: {rec.customerGstin}
                              </div>
                            )}
                            {rec.customerPhone && (
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <Phone size={10} className="text-zinc-500" />
                                <span>{rec.customerPhone}</span>
                              </div>
                            )}
                          </td>

                          {/* Invoiced Total */}
                          <td className="py-3.5 px-4 text-right space-y-0.5">
                            <div className="font-mono font-bold text-white text-sm">
                              ₹{rec.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {isPi ? `${rec.rawDoc?.advancePercentage || 30}% Adv Terms` : 'Net 30 Credit'}
                            </div>
                          </td>

                          {/* Advance / Paid */}
                          <td className="py-3.5 px-4 text-right space-y-0.5">
                            <div className="font-mono font-bold text-purple-300 text-sm">
                              ₹{rec.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-purple-400/80 font-bold">
                              {rec.totalPaid >= rec.grandTotal ? '100% Cleared' : rec.advancePaid > 0 ? 'Advance Cleared' : 'Pending'}
                            </div>
                          </td>

                          {/* Outstanding Due */}
                          <td className="py-3.5 px-4 text-right space-y-0.5">
                            <div className={`font-mono font-black text-sm ${rec.balanceDue > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                              ₹{rec.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {rec.balanceDue === 0 ? 'Settled' : 'Balance Payable'}
                            </div>
                          </td>

                          {/* Payment / UTR Proof */}
                          <td className="py-3.5 px-4 space-y-1 max-w-[190px]">
                            {rec.transactionRef ? (
                              <div className="space-y-1">
                                <div className="font-mono font-bold text-purple-300 text-[11px] bg-purple-950/70 border border-purple-800/50 px-2 py-0.5 rounded truncate" title={rec.transactionRef}>
                                  UTR: {rec.transactionRef}
                                </div>
                                {rec.receiptUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewReceiptUrl(rec.receiptUrl!)}
                                    className="text-[10.5px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer"
                                  >
                                    <Eye size={11} />
                                    <span>View Proof Document</span>
                                  </button>
                                )}
                              </div>
                            ) : rec.totalPaid > 0 ? (
                              <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Payment Cleared
                              </span>
                            ) : (
                              <span className="text-[11px] text-zinc-500 italic">
                                Awaiting Client Remittance
                              </span>
                            )}
                          </td>

                          {/* Aging & Follow-up SLA */}
                          <td className="py-3.5 px-4 space-y-1 text-center">
                            {/* Primary SLA Chip */}
                            {rec.balanceDue === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                <CheckCircle2 size={11} />
                                <span>Fully Settled</span>
                              </span>
                            ) : rec.isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                                <AlertTriangle size={11} />
                                <span>Overdue {Math.abs(rec.daysRemaining)}d</span>
                              </span>
                            ) : rec.isExpiringSoon ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <Clock size={11} />
                                <span>Due in {rec.daysRemaining}d</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                                <Clock size={11} />
                                <span>{rec.daysRemaining}d SLA</span>
                              </span>
                            )}

                            {/* Follow-up Touchpoint Badges */}
                            {rec.ptpDate ? (
                              <div className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 block mx-auto max-w-[170px] truncate" title={`Promised to pay on ${rec.ptpDate}`}>
                                <span>🤝 PTP: {new Date(rec.ptpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              </div>
                            ) : rec.lastFollowUp ? (
                              <div className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700 block mx-auto max-w-[170px] truncate" title={`${rec.lastFollowUp.channel} - ${rec.lastFollowUp.stage}: ${rec.lastFollowUp.notes}`}>
                                <span>{rec.lastFollowUp.channel === 'WHATSAPP' ? '💬 WA' : rec.lastFollowUp.channel === 'EMAIL' ? '✉️ Mail' : '📞 Call'} ({rec.lastFollowUp.stage.slice(0, 8)})</span>
                              </div>
                            ) : rec.balanceDue > 0 ? (
                              <div className="text-[9.5px] text-zinc-500 italic block">
                                No follow-up logged
                              </div>
                            ) : null}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Record Payment Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(rec)}
                                className="px-2 py-1 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6] text-purple-300 hover:text-white border border-[#8B5CF6]/40 rounded-lg text-xs font-bold transition-all shrink-0"
                                title="Record & Reconcile Payment"
                              >
                                <Landmark size={12} className="inline mr-1" />
                                <span>Clear</span>
                              </button>

                              {/* Follow-up Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenFollowupModal(rec)}
                                className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                                title="Log Commercial Follow-up"
                              >
                                <PhoneForwarded size={12} />
                                <span>Follow-up</span>
                              </button>

                              {/* WhatsApp Reminder Button */}
                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(rec)}
                                className="p-1.5 bg-emerald-950/60 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-800/60 rounded-lg transition-colors shrink-0"
                                title="Send 1-Click WhatsApp Notice"
                              >
                                <MessageSquare size={13} />
                              </button>

                              {/* Timeline History */}
                              <button
                                type="button"
                                onClick={() => setHistoryModalRecord(rec)}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors shrink-0"
                                title="View Follow-up & Audit Timeline"
                              >
                                <History size={13} />
                              </button>

                              {/* View PI Details */}
                              {isPi && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedProforma(rec.rawDoc)}
                                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors shrink-0"
                                  title="View Proforma Invoice"
                                >
                                  <Eye size={13} />
                                </button>
                              )}

                              {/* Download PDF */}
                              {isPi && (
                                <button
                                  type="button"
                                  onClick={() => proformaService.downloadProformaPdf(rec.rawDoc.id, rec.rawDoc.piNumber)}
                                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors shrink-0"
                                  title="Download PDF"
                                >
                                  <Download size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: B2B CUSTOMER ACCOUNTS 360° EXPOSURE LEDGER ─────────────── */}
      {activeTab === 'CUSTOMER_ACCOUNTS' && (
        <div className="space-y-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              <Users className="text-[#8B5CF6]" size={20} />
              <h2 className="text-sm font-bold text-white">
                B2B Enterprise Client Exposure Matrix & Credit Risk Profiles
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              Showing <strong>{customerAccounts.length}</strong> enterprise buyer accounts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customerAccounts.map((account) => {
              const isOverdue = account.riskLevel === 'HIGH_RISK_OVERDUE';
              const isModerate = account.riskLevel === 'MODERATE';

              return (
                <div
                  key={account.customerId}
                  className={`bg-[#18181B] border rounded-2xl p-5 space-y-4 shadow-xl transition-all hover:border-zinc-500 ${
                    isOverdue
                      ? 'border-rose-500/50 bg-rose-950/10'
                      : isModerate
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-[#27272A]'
                  }`}
                >
                  {/* Company Header & Risk Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        <Building2 size={16} className="text-[#8B5CF6] shrink-0" />
                        <span className="truncate">{account.companyName}</span>
                      </h3>
                      <p className="text-xs text-zinc-400">{account.customerName}</p>
                      {account.gstin && (
                        <span className="inline-block text-[10px] font-mono text-zinc-400 bg-[#27272A] px-2 py-0.5 rounded">
                          GST: {account.gstin}
                        </span>
                      )}
                    </div>

                    {/* Risk Badge */}
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                      isOverdue
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : isModerate
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {isOverdue ? '🚨 High Risk Overdue' : isModerate ? '⚠️ Active Dues' : '🟢 Healthy Account'}
                    </span>
                  </div>

                  {/* Financial Overview Grid */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 bg-[#09090B] rounded-xl border border-[#27272A] text-xs">
                    <div>
                      <span className="text-zinc-500 block text-[10.5px]">Total Invoiced</span>
                      <span className="font-mono font-bold text-white text-sm">
                        ₹{account.totalInvoicedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10.5px]">Payments Cleared</span>
                      <span className="font-mono font-bold text-purple-300 text-sm">
                        ₹{account.totalPaymentsReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-[#27272A] flex items-center justify-between">
                      <span className="text-zinc-400 font-bold">Outstanding Balance:</span>
                      <span className={`font-mono font-black text-sm ${account.totalOutstandingDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        ₹{account.totalOutstandingDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Operational Metrics & Aging */}
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <div>
                      <span>Open Docs: </span>
                      <strong className="text-white font-mono">{account.totalDocumentsCount}</strong>
                      <span className="text-[10px] text-zinc-500"> ({account.openProformasCount} PI, {account.openGstInvoicesCount} GST)</span>
                    </div>
                    <div>
                      <span>Oldest: </span>
                      <strong className={account.oldestPendingDays > 30 ? 'text-rose-400' : 'text-zinc-300'}>
                        {account.oldestPendingDays}d
                      </strong>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-[#27272A] grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetDoc = unifiedRecords.find((r) => (r.companyName === account.companyName || r.customerName === account.customerName) && r.balanceDue > 0) || unifiedRecords.find((r) => r.companyName === account.companyName || r.customerName === account.customerName);
                        if (targetDoc) {
                          handleOpenFollowupModal(targetDoc);
                        } else {
                          setSelectedCustomerIdFilter(account.companyName);
                          setActiveTab('DOCUMENTS_LEDGER');
                        }
                      }}
                      className="py-2 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <PhoneForwarded size={13} />
                      <span>Log Follow-up</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerIdFilter(account.companyName);
                        setActiveTab('DOCUMENTS_LEDGER');
                      }}
                      className="py-2 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6] text-purple-300 hover:text-white border border-[#8B5CF6]/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Eye size={13} />
                      <span>Account Ledger</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── RECORD PAYMENT CLEARANCE MODAL ───────────────────────────────── */}
      {paymentModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Landmark size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Record & Reconcile B2B Payment</h3>
                  <p className="text-[11px] text-zinc-400">Doc: {paymentModalRecord.documentNumber} ({paymentModalRecord.sourceType})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalRecord(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {paymentSuccessMsg && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{paymentSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
              
              {/* Customer & Document Summary */}
              <div className="bg-[#09090B] p-3 rounded-xl border border-[#27272A] space-y-1">
                <div className="text-zinc-400">Buyer: <strong className="text-white">{paymentModalRecord.customerName}</strong> {paymentModalRecord.companyName ? `(${paymentModalRecord.companyName})` : ''}</div>
                <div className="text-zinc-400">Invoiced Total: <strong className="text-white font-mono">₹{paymentModalRecord.grandTotal.toLocaleString('en-IN')}</strong></div>
                <div className="text-zinc-400">Outstanding Balance Due: <strong className="text-amber-400 font-mono">₹{paymentModalRecord.balanceDue.toLocaleString('en-IN')}</strong></div>
              </div>

              {/* Amount Cleared */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Amount Received / Cleared (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white font-mono text-sm focus:outline-none"
                  required
                />
              </div>

              {/* Payment Type & Bank Account Credited */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Payment Type</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                  >
                    <option value="ADVANCE_DEPOSIT">Advance Booking Deposit</option>
                    <option value="BALANCE_PAYMENT">Balance Before Dispatch</option>
                    <option value="FULL_SETTLEMENT">Full Invoice Settlement</option>
                    <option value="PART_PAYMENT">Part / Installment Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Credited Account</label>
                  <select
                    value={bankAccountCredited}
                    onChange={(e) => setBankAccountCredited(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                  >
                    <option value="HDFC Bank - Current A/C (Mandoli Branch)">HDFC Bank - Current A/C</option>
                    <option value="ICICI Commercial Bank A/C">ICICI Commercial Bank A/C</option>
                    <option value="State Bank of India Corporate">SBI Corporate A/C</option>
                    <option value="Cash / Cheque Register">Cash / Cheque Register</option>
                  </select>
                </div>
              </div>

              {/* Payment Mode & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                  >
                    <option value="RTGS">RTGS Bank Transfer</option>
                    <option value="NEFT">NEFT Bank Transfer</option>
                    <option value="IMPS">IMPS Instant Transfer</option>
                    <option value="UPI">UPI / VPA Transfer</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="OTHER">Other Settlement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Transaction Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* UTR / Transaction Reference */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Bank UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={paymentUtr}
                  onChange={(e) => setPaymentUtr(e.target.value)}
                  placeholder="e.g. HDFC240902123456 or CMS/RTGS/987654"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white font-mono focus:outline-none"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Accounts Clearance Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Payment verified in HDFC current account. Document cleared for dispatch."
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white resize-none focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setPaymentModalRecord(null)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {savingPayment ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Confirm Payment Clearance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── COMMERCIAL PAYMENT FOLLOW-UP MODAL ──────────────────────────── */}
      {followupModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <PhoneForwarded size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Log Commercial Payment Follow-up</h3>
                  <p className="text-[11px] text-zinc-400">
                    Doc: <strong className="text-purple-300 font-mono">{followupModalRecord.documentNumber}</strong> • {followupModalRecord.companyName || followupModalRecord.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFollowupModalRecord(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick 1-Click Communications Strip */}
            <div className="p-3 bg-[#09090B] border border-[#27272A] rounded-xl flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-zinc-400">1-Click Instant Communication:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(followupModalRecord)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all"
                >
                  <MessageSquare size={13} />
                  <span>Send WhatsApp Alert</span>
                </button>

                {followupModalRecord.customerEmail && (
                  <a
                    href={generateEmailReminder(followupModalRecord)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all"
                  >
                    <Mail size={13} />
                    <span>Send Email Notice</span>
                  </a>
                )}

                {followupModalRecord.customerPhone && (
                  <a
                    href={`tel:${followupModalRecord.customerPhone}`}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-zinc-700 transition-all"
                  >
                    <Phone size={13} />
                    <span>Call Phone</span>
                  </a>
                )}
              </div>
            </div>

            {followupSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{followupSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitFollowup} className="space-y-3.5 text-xs">
              
              {/* Channel & Stage Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Follow-up Channel</label>
                  <select
                    value={followupChannel}
                    onChange={(e) => setFollowupChannel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                  >
                    <option value="PHONE">📞 Phone Call (Accounts / Procurement)</option>
                    <option value="WHATSAPP">💬 WhatsApp Commercial Notice</option>
                    <option value="EMAIL">✉️ Email Formal Reminder</option>
                    <option value="IN_PERSON">🏢 Site / In-Person Commercial Visit</option>
                    <option value="LEGAL_NOTICE">⚠️ Legal / Formal Demand Notice</option>
                    <option value="OTHER">Other Touchpoint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Follow-up Stage & Escalation</label>
                  <select
                    value={followupStage}
                    onChange={(e) => setFollowupStage(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                  >
                    <option value="COURTESY_REMINDER">🟢 Courtesy Commercial Reminder</option>
                    <option value="DUE_WARNING">🟡 Upcoming Due Date Warning</option>
                    <option value="OVERDUE_ALERT">🔴 Overdue Payment Notice (&gt;30 Days)</option>
                    <option value="PROMISE_TO_PAY">🤝 Promise to Pay (PTP Agreed)</option>
                    <option value="ESCALATED">🚨 Escalated to Head of Sales / Director</option>
                    <option value="DISPUTED">⚠️ Query / Rate Dispute Under Review</option>
                    <option value="OTHER">Other Stage</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Contacted Person</label>
                  <input
                    type="text"
                    value={followupContactPerson}
                    onChange={(e) => setFollowupContactPerson(e.target.value)}
                    placeholder="e.g. Accounts Officer / Mr. Sharma"
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={followupContactPhone}
                    onChange={(e) => setFollowupContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={followupContactEmail}
                    onChange={(e) => setFollowupContactEmail(e.target.value)}
                    placeholder="accounts@buyer.com"
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Promise to Pay (PTP) Section */}
              <div className="p-3 bg-[#09090B] border border-emerald-900/40 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 block flex items-center gap-1.5">
                  <Clock size={13} /> Promise to Pay (PTP) Commitment (Optional):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">Promised Payment Date</label>
                    <input
                      type="date"
                      value={followupPtpDate}
                      onChange={(e) => setFollowupPtpDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] focus:border-emerald-500 rounded-xl text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">Promised Amount (INR)</label>
                    <input
                      type="number"
                      value={followupPtpAmount || ''}
                      onChange={(e) => setFollowupPtpAmount(Number(e.target.value))}
                      placeholder="e.g. 50000"
                      className="w-full px-3 py-2 bg-[#18181B] border border-[#27272A] focus:border-emerald-500 rounded-xl text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Discussion & Call Remarks */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">
                  Follow-up Discussion Notes & Customer Response <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="e.g. Spoke with Mr. Rakesh (Finance). Cheque has been processed for RTGS clearance by Thursday. Promised full advance deposit of ₹75,000."
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white resize-none focus:outline-none"
                  required
                />
              </div>

              {/* Next Follow-up Reminder Date */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Next Scheduled Follow-up Due Date</label>
                <input
                  type="date"
                  value={followupNextDate}
                  onChange={(e) => setFollowupNextDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-white focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setFollowupModalRecord(null)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFollowup}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all"
                >
                  {savingFollowup ? <RefreshCw size={14} className="animate-spin" /> : <PhoneForwarded size={14} />}
                  <span>Save Follow-up Touchpoint</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── FOLLOW-UP & AUDIT TIMELINE MODAL ────────────────────────────── */}
      {historyModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Commercial Follow-up & Audit Timeline</h3>
                  <p className="text-[11px] text-zinc-400">
                    Doc: <strong className="text-purple-300 font-mono">{historyModalRecord.documentNumber}</strong> • {historyModalRecord.companyName || historyModalRecord.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalRecord(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick summary strip */}
            <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] grid grid-cols-3 gap-2 text-xs shrink-0">
              <div>
                <span className="text-[10px] text-zinc-500 block">Total Invoiced</span>
                <span className="font-mono font-bold text-white">₹{historyModalRecord.grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Balance Pending</span>
                <span className="font-mono font-bold text-amber-400">₹{historyModalRecord.balanceDue.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Aging / SLA</span>
                <span className={`font-bold ${historyModalRecord.isOverdue ? 'text-rose-400' : 'text-zinc-300'}`}>
                  {historyModalRecord.daysElapsed}d ({historyModalRecord.isOverdue ? 'Overdue' : 'Active'})
                </span>
              </div>
            </div>

            {/* Timeline Events Scroll Area */}
            <div className="overflow-y-auto space-y-3 pr-1 flex-1 text-xs">
              {historyModalRecord.history && historyModalRecord.history.length > 0 ? (
                historyModalRecord.history.map((h: any, idx: number) => {
                  const isFollowup = h.action === 'FOLLOW_UP_LOGGED' || (h.details && h.details.toLowerCase().includes('follow-up'));
                  const isPayment = h.action === 'PAYMENT_RECORDED' || h.action === 'PAYMENT_SUBMITTED';

                  return (
                    <div
                      key={h.id || idx}
                      className={`p-3.5 rounded-xl border space-y-1.5 ${
                        isFollowup
                          ? 'bg-amber-950/15 border-amber-800/40'
                          : isPayment
                          ? 'bg-purple-950/20 border-purple-800/40'
                          : 'bg-[#09090B] border-[#27272A]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                            isFollowup
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : isPayment
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}>
                            {isFollowup ? 'Follow-up' : isPayment ? 'Payment' : h.action}
                          </span>
                          <span className="font-bold text-white text-xs">{h.performedBy || 'Commercial Desk'}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(h.createdAt || Date.now()).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-zinc-300 text-xs leading-relaxed">{h.details}</p>

                      {h.metadata && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[10.5px] text-zinc-400 font-mono">
                          {h.metadata.channel && (
                            <span className="px-1.5 py-0.5 bg-black/40 rounded border border-zinc-800">
                              Channel: {h.metadata.channel}
                            </span>
                          )}
                          {h.metadata.stage && (
                            <span className="px-1.5 py-0.5 bg-black/40 rounded border border-zinc-800">
                              Stage: {h.metadata.stage}
                            </span>
                          )}
                          {h.metadata.ptpDate && (
                            <span className="px-1.5 py-0.5 bg-emerald-950/60 text-emerald-300 rounded border border-emerald-800">
                              PTP Date: {h.metadata.ptpDate}
                            </span>
                          )}
                          {h.metadata.nextFollowupDate && (
                            <span className="px-1.5 py-0.5 bg-amber-950/60 text-amber-300 rounded border border-amber-800">
                              Next Due: {h.metadata.nextFollowupDate}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center space-y-2 text-zinc-500">
                  <History size={28} className="mx-auto text-zinc-600" />
                  <div className="font-bold">No previous follow-up timeline events recorded</div>
                  <p className="text-[11px]">Log your first touchpoint using the Follow-up button.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#27272A] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setHistoryModalRecord(null);
                  handleOpenFollowupModal(historyModalRecord);
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <PhoneForwarded size={13} />
                <span>Log New Touchpoint</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryModalRecord(null)}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RECEIPT LIGHTBOX MODAL ──────────────────────────────────────── */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-4xl max-h-[90vh] bg-[#18181B] border border-[#27272A] rounded-2xl p-4 shadow-2xl flex flex-col items-center space-y-3">
            <div className="w-full flex items-center justify-between border-b border-[#27272A] pb-2 text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Landmark size={15} className="text-purple-400" /> Customer Payment Confirmation Proof
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded-lg border border-zinc-700 flex items-center gap-1 font-bold transition-colors"
                >
                  <ExternalLink size={12} /> Open Full Size
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewReceiptUrl(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[75vh] flex items-center justify-center">
              {previewReceiptUrl.toLowerCase().endsWith('.pdf') || previewReceiptUrl.includes('.pdf') ? (
                <div className="p-8 text-center space-y-3">
                  <FileText size={48} className="text-purple-400 mx-auto" />
                  <div className="text-sm font-bold text-white">Payment Receipt Document (PDF)</div>
                  <a
                    href={previewReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold rounded-xl text-xs"
                  >
                    <Download size={14} /> Download PDF Receipt
                  </a>
                </div>
              ) : (
                <img
                  src={previewReceiptUrl}
                  alt="Payment Receipt Preview"
                  className="max-w-full max-h-[72vh] object-contain rounded-lg border border-zinc-800"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
