import React, { useState, useEffect } from "react";
import {
  Users,
  Building2,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  ShoppingBag,
  FileText,
  Receipt,
  Coins,
  Activity,
  KeyRound,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
  Edit2,
  ArrowUpRight,
  FileSpreadsheet,
  Check,
  Copy,
  ArrowLeft,
  Home,
  ChevronRight,
  CreditCard,
  Printer,
  Send,
  History,
  IndianRupee,
  FileCheck2,
  Ban,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { usersApi } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import { paymentFollowupApi } from "../api/paymentFollowupApi";
import { printStatementOfAccount } from "../utils/customerLedgerPdfGenerator";
import type { CustomerDuesDetail } from "../types/paymentFollowup";
import {
  RecordPaymentAllocationModal,
  LogFollowupModal,
  SendLedgerModal,
  SendSmsReminderModal,
  DeclineDisputeModal,
} from "../components/payment-followup";

interface CustomerDossierPageProps {
  userId?: string | null;
  onBack?: () => void;
  onNavigateB2BPricing?: (userId: string) => void;
  onOpenEdit?: (user: any) => void;
}

export function CustomerDossierPage({
  userId: propUserId,
  onBack,
  onNavigateB2BPricing,
  onOpenEdit,
}: CustomerDossierPageProps) {
  const { setCurrentView } = useAdminAuth();
  
  // Resolve User ID from prop or localStorage
  const activeUserId = propUserId || (typeof window !== "undefined" ? localStorage.getItem("prc_admin_selected_customer_id") : null);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "addresses" | "orders" | "quotes" | "financials" | "b2b_rates" | "activity_logs" | "dues_recovery"
  >("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Dues Recovery State
  const [duesDetail, setDuesDetail] = useState<CustomerDuesDetail | null>(null);
  const [loadingDuesDetail, setLoadingDuesDetail] = useState(false);
  const [isAllocationOpen, setIsAllocationOpen] = useState(false);
  const [isLogFollowupOpen, setIsLogFollowupOpen] = useState(false);
  const [isSendLedgerOpen, setIsSendLedgerOpen] = useState(false);
  const [isSendSmsOpen, setIsSendSmsOpen] = useState(false);
  const [isDeclineDisputeOpen, setIsDeclineDisputeOpen] = useState(false);

  const fetchDossier = async (id: string, isRetry = false) => {
    setLoading(true);
    setError(null);
    try {
      let res = await usersApi.getCustomer360(id);

      // Auto-retry once on failure (for cold-starts, Render sleep wakeups, or initial network latency)
      if (!res.success && !isRetry) {
        await new Promise((r) => setTimeout(r, 600));
        res = await usersApi.getCustomer360(id);
      }

      if (res.success && res.data) {
        setData(res.data);
      } else {
        // Fallback to basic user endpoint if 360 endpoint had a temporary timeout
        const fallbackRes = await usersApi.getById(id);
        if (fallbackRes.success && fallbackRes.data) {
          const u = fallbackRes.data;
          setData({
            user: u,
            addresses: u.addresses || [],
            orders: u.orders || [],
            quotes: u.quotes || [],
            financials: { invoices: [], proformaInvoices: [], purchaseOrders: [] },
            b2bRates: u.b2bCustomerPrices || [],
            activityLogs: u.activityLogs || [],
            passwordResetLogs: [],
            summary: {
              seniority: {
                label: "Active Member",
                years: 0,
                months: 0,
                days: 0,
                totalDays: 0,
              },
              totalSpend: (u.orders || []).reduce((acc: number, curr: any) => acc + Number(curr.grandTotal || 0), 0),
              totalOrdersCount: (u.orders || []).length,
              totalQuotesCount: (u.quotes || []).length,
              activeQuotesCount: 0,
              invoicesCount: 0,
              customPricesCount: (u.b2bCustomerPrices || []).length,
            },
          });
        } else {
          const errMsg =
            res.error?.message ||
            res.message ||
            fallbackRes.error?.message ||
            fallbackRes.message ||
            "Failed to load customer profile";
          setError(errMsg);
        }
      }
    } catch (err: any) {
      if (!isRetry) {
        return fetchDossier(id, true);
      }
      setError(err?.message || "Failed to load customer profile dossier");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeUserId) {
      fetchDossier(activeUserId);
      setActiveTab("overview");
    } else {
      setData(null);
      setLoading(false);
    }
  }, [activeUserId]);

  const fetchCustomerDues = async (customerId: string) => {
    setLoadingDuesDetail(true);
    try {
      const res = await paymentFollowupApi.getCustomerDuesDetail(customerId);
      if (res.success && res.data) {
        setDuesDetail(res.data);
      }
    } catch (e) {
      console.error("Failed to load customer dues detail:", e);
    } finally {
      setLoadingDuesDetail(false);
    }
  };

  useEffect(() => {
    if (activeUserId && activeTab === "dues_recovery") {
      fetchCustomerDues(activeUserId);
    }
  }, [activeUserId, activeTab]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setCurrentView("users");
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const user = data?.user;
  const isB2B = Boolean(user?.companyName || user?.gstin || user?.role?.slug === "b2b_buyer");
  const summary = data?.summary || {};

  if (!activeUserId) {
    return (
      <div className="space-y-4 font-sans text-[#FAFAFA]">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
        >
          <ArrowLeft size={14} /> Back to Customers
        </button>
        <div className="p-12 text-center text-xs text-[#71717A] bg-[#18181B] rounded-2xl border border-[#27272A]">
          <AlertTriangle size={32} className="mx-auto mb-2 text-amber-400" />
          No customer account was selected. Please choose a customer from the directory.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-5 md:space-y-6 font-sans text-[#FAFAFA]">
      
      {/* ─── Top Breadcrumb Navigation & Action Toolbar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272A] pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-xl font-extrabold text-[#FAFAFA] tracking-tight flex items-center gap-2">
              <span>Customer 360° Profile Dossier</span>
            </h1>
            {activeUserId && (
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#8B5CF6]/10 text-[#A855F7] border border-[#8B5CF6]/20">
                #{String(activeUserId).slice(0, 10)}
              </span>
            )}
          </div>
          <nav className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-[#71717A]">
            <Home size={10} className="text-[#52525B]" />
            <ChevronRight size={10} className="text-[#52525B]" />
            <button
              type="button"
              onClick={handleBack}
              className="hover:text-[#8B5CF6] transition-colors font-medium"
            >
              Customers &amp; Accounts
            </button>
            <ChevronRight size={10} className="text-[#52525B]" />
            <span className="text-[#8B5CF6] font-semibold">
              {user ? `${user.firstName} ${user.lastName}` : "Customer Dossier"}
            </span>
          </nav>
        </div>

        {/* Back Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold border border-[#27272A] text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] bg-[#18181B] transition-all"
          >
            <ArrowLeft size={13} />
            <span>Back to Customers</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      {loading ? (
        <div className="p-16 rounded-2xl bg-[#18181B] border border-[#27272A] flex flex-col items-center justify-center text-center space-y-3 shadow-lg">
          <RefreshCw size={32} className="animate-spin text-[#8B5CF6]" />
          <p className="text-xs text-[#A1A1AA]">Aggregating 360° Customer Profile, Invoices, Quotes &amp; History...</p>
        </div>
      ) : error || !user ? (
        <div className="p-12 rounded-2xl bg-[#18181B] border border-rose-500/30 flex flex-col items-center justify-center text-center space-y-3 shadow-lg">
          <AlertTriangle size={36} className="text-rose-500" />
          <p className="text-sm font-bold text-[#FAFAFA]">{error || "Customer profile could not be loaded."}</p>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => fetchDossier(activeUserId)}
              className="px-4 py-2 bg-[#8B5CF6] text-white text-xs font-bold rounded-xl shadow"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 bg-[#27272A] text-[#A1A1AA] hover:text-white text-xs font-bold rounded-xl"
            >
              Back to Directory
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-5">
          
          {/* ─── 1. Top Customer Master Banner ─── */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1F1929] via-[#18181B] to-[#18181B] border border-[#27272A] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#A855F7] font-black text-lg sm:text-xl shadow-inner flex-shrink-0">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.firstName} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-bold text-[#FAFAFA] font-serif truncate">
                    {user.firstName} {user.lastName}
                  </h2>
                  {isB2B ? (
                    <span className="bg-[#8B5CF6]/20 text-[#A855F7] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#8B5CF6]/40 flex items-center gap-1">
                      <Building2 size={11} />
                      B2B Enterprise
                    </span>
                  ) : (
                    <span className="bg-[#27272A] text-[#A1A1AA] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#3F3F46]">
                      Retail Customer
                    </span>
                  )}
                  {user.status === "ACTIVE" ? (
                    <span className="bg-emerald-950/80 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="bg-rose-950/80 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/40">
                      {user.status || "PENDING"}
                    </span>
                  )}
                </div>

                {user.companyName && (
                  <p className="text-xs text-[#A855F7] font-medium truncate mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 size={12} className="flex-shrink-0" />
                      <strong>{user.companyName}</strong>
                    </span>
                    {user.gstin && (
                      <span className="font-mono text-[#A1A1AA] text-[11px] bg-[#09090B] px-2 py-0.5 rounded border border-[#27272A]">
                        GSTIN: {user.gstin}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto border-t md:border-t-0 pt-2 md:pt-0 border-[#27272A]">
              {user.phone && (
                <a
                  href={`https://wa.me/91${user.phone.replace(/\D/g, "").slice(-10)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/30"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </a>
              )}

              <a
                href={`mailto:${user.email}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-xl text-xs font-bold transition-all"
              >
                <Mail size={13} />
                <span>Email</span>
              </a>

              {isB2B && (
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateB2BPricing) {
                      onNavigateB2BPricing(user.id);
                    } else {
                      setCurrentView("b2b-pricing");
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Coins size={13} />
                  <span>B2B Rates Matrix</span>
                </button>
              )}

              {onOpenEdit && (
                <button
                  type="button"
                  onClick={() => onOpenEdit(user)}
                  className="p-2 bg-[#27272A] hover:bg-[#3F3F46] text-amber-400 rounded-xl transition-all"
                  title="Edit Customer Details"
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ─── 2. Customer Seniority & KPI Statistics Grid ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* Longevity Banner */}
            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-gradient-to-br from-purple-950/40 to-[#18181B] border border-purple-500/30 flex items-center gap-2.5 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#A855F7] flex-shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-bold text-[#A855F7] uppercase tracking-wider block">Customer Age</span>
                <h5 className="text-xs font-bold text-[#FAFAFA] truncate">
                  {user.seniority?.label || "Joined Recently"}
                </h5>
                <span className="text-[9px] text-[#71717A]">
                  Since {new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Total Spend */}
            <div className="p-3 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-sm">
              <span className="text-[9px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Total Spend</span>
              <p className="text-sm sm:text-base font-extrabold text-[#FAFAFA] mt-0.5">
                ₹{(summary.totalSpend || 0).toLocaleString("en-IN")}
              </p>
              <span className="text-[9px] text-[#71717A]">{summary.totalOrdersCount || 0} Orders placed</span>
            </div>

            {/* RFQ Quotes */}
            <div className="p-3 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-sm">
              <span className="text-[9px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">B2B Quotes</span>
              <p className="text-sm sm:text-base font-extrabold text-[#A855F7] mt-0.5">
                {summary.totalQuotesCount || 0}
              </p>
              <span className="text-[9px] text-[#71717A]">{summary.activeQuotesCount || 0} active / pending</span>
            </div>

            {/* Tax Invoices */}
            <div className="p-3 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-sm">
              <span className="text-[9px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Tax Invoices</span>
              <p className="text-sm sm:text-base font-extrabold text-[#FAFAFA] mt-0.5">
                {summary.invoicesCount || 0}
              </p>
              <span className="text-[9px] text-[#71717A]">GST B2B &amp; B2C register</span>
            </div>

            {/* Custom Rates */}
            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-sm">
              <span className="text-[9px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Custom Rates</span>
              <p className="text-sm sm:text-base font-extrabold text-[#A855F7] mt-0.5">
                {summary.customPricesCount || 0} SKUs
              </p>
              <span className="text-[9px] text-[#71717A]">Wholesale rate overrides</span>
            </div>
          </div>

          {/* ─── 3. Multi-Tab Navigation Bar ─── */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#18181B] border border-[#27272A] rounded-2xl overflow-x-auto no-scrollbar shadow-sm">
            {[
              { id: "overview", label: "Contact & Identity", icon: <Users size={13} /> },
              { id: "addresses", label: `Addresses (${data.addresses?.length || 0})`, icon: <MapPin size={13} /> },
              { id: "orders", label: `Orders (${data.orders?.length || 0})`, icon: <ShoppingBag size={13} /> },
              { id: "quotes", label: `RFQ Quotes (${data.quotes?.length || 0})`, icon: <FileText size={13} /> },
              { id: "financials", label: `Invoices & PO/PI (${data.invoices?.length || 0})`, icon: <Receipt size={13} /> },
              { id: "dues_recovery", label: "Dues & Recovery", icon: <CreditCard size={13} /> },
              // Only show B2B Rates tab for verified B2B enterprise customers (those with company name or GSTIN)
              ...(user.companyName || user.gstin
                ? [{ id: "b2b_rates", label: `B2B Rates (${data.b2bPrices?.length || 0})`, icon: <Coins size={13} /> }]
                : []),
              { id: "activity_logs", label: `Audit & Security (${(data.activityLogs?.length || 0) + (data.passwordResets?.length || 0)})`, icon: <Activity size={13} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/25"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ─── 4. Active Tab Panel Body ─── */}
          <div className="p-3.5 sm:p-6 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg">
            
            {/* ──────── TAB 1: OVERVIEW & IDENTITY ──────── */}
            {activeTab === "overview" && (
              <div className="space-y-4 sm:space-y-6">
                {/* Contact Quick Row */}
                <div className="p-3 sm:p-4 rounded-xl bg-[#09090B] border border-[#27272A] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-6 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-[#8B5CF6]" />
                      <span className="text-[#FAFAFA] font-semibold">{user.email}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(user.email, "email")}
                        className="text-[#71717A] hover:text-white ml-0.5"
                        title="Copy Email"
                      >
                        {copiedField === "email" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>

                    {user.phone && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone size={13} className="text-[#8B5CF6]" />
                        <span className="text-[#FAFAFA]">{user.phone}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(user.phone, "phone")}
                          className="text-[#71717A] hover:text-white ml-0.5"
                          title="Copy Phone"
                        >
                          {copiedField === "phone" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal & Account Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Column 1: Identity & Credentials */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3 text-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A855F7] flex items-center gap-1.5">
                      <Users size={13} />
                      <span>Identity &amp; Credentials</span>
                    </h4>

                    <div className="space-y-2 divide-y divide-[#27272A]">
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">Full Legal Name</span>
                        <span className="font-bold text-[#FAFAFA]">{user.firstName} {user.lastName}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">User ID</span>
                        <span className="font-mono text-[10px] text-[#A1A1AA]">{user.id}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">Account Status</span>
                        <span className="font-bold text-emerald-400">{user.status}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">Role / Access Tier</span>
                        <span className="font-bold text-[#FAFAFA]">{user.role?.name || "Standard Customer"}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">Two-Factor Auth</span>
                        <span className={user.twoFactorEnabled ? "text-emerald-400 font-bold" : "text-[#71717A]"}>
                          {user.twoFactorEnabled ? "Enabled (TOTP)" : "Disabled"}
                        </span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">Registration Date</span>
                        <span className="text-[#A1A1AA]">{new Date(user.createdAt).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">Last Active Login</span>
                        <span className="text-[#A1A1AA]">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-IN") : "Never logged in"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Enterprise & GST Profile */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3 text-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A855F7] flex items-center gap-1.5">
                      <Building2 size={13} />
                      <span>Enterprise &amp; GSTIN Master</span>
                    </h4>

                    <div className="space-y-2 divide-y divide-[#27272A]">
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">Company / Firm Name</span>
                        <span className="font-bold text-[#FAFAFA]">{user.companyName || "Not Provided (Retail)"}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">GSTIN Number</span>
                        {user.gstin ? (
                          <span className="font-mono font-bold text-[#A855F7] bg-[#18181B] px-2 py-0.5 rounded border border-[#27272A]">
                            {user.gstin}
                          </span>
                        ) : (
                          <span className="text-[#71717A]">No GSTIN linked</span>
                        )}
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">B2B Advance Payment Req.</span>
                        <span className="font-bold text-[#FAFAFA]">
                          {user.b2bAdvancePercentage != null ? `${user.b2bAdvancePercentage}%` : "Default (30%)"}
                        </span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">Account Category</span>
                        <span className="font-bold text-[#FAFAFA]">{isB2B ? "B2B Wholesaler / Contractor" : "B2C Consumer"}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#71717A]">Seniority Duration</span>
                        <span className="font-bold text-purple-300">{user.seniority?.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────── TAB 2: ADDRESSES & LOCATIONS ──────── */}
            {activeTab === "addresses" && (
              <div className="space-y-4">
                {data.addresses.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#71717A] bg-[#09090B] rounded-xl border border-[#27272A]">
                    <MapPin size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                    No registered delivery or billing addresses found for this customer.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.addresses.map((addr: any, i: number) => (
                      <div
                        key={addr.id || i}
                        className="p-3.5 sm:p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3 relative hover:border-[#8B5CF6]/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#A855F7] uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin size={12} />
                            <span>{addr.label || (addr.type === "BILLING" ? "Billing Address" : "Shipping Destination")}</span>
                          </span>
                          {addr.isDefault && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="text-xs space-y-1 text-[#A1A1AA]">
                          <p className="text-[#FAFAFA] font-bold">{addr.addressLine1}</p>
                          {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                          <p className="font-semibold">
                            {addr.city}, {addr.state} — <span className="font-mono font-bold text-[#FAFAFA]">{addr.postalCode}</span>
                          </p>
                          <p className="text-[11px] text-[#71717A]">{addr.country}</p>
                        </div>

                        <div className="pt-2 border-t border-[#27272A] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="space-y-0.5">
                            {addr.phone && (
                              <p className="text-[11px] font-mono text-[#FAFAFA] flex items-center gap-1">
                                <Phone size={11} className="text-[#71717A]" />
                                <span>{addr.phone}</span>
                                {addr.hasWhatsapp && (
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-1 rounded">
                                    WA
                                  </span>
                                )}
                              </p>
                            )}
                            {addr.altPhone && (
                              <p className="text-[10px] font-mono text-[#71717A]">Alt: {addr.altPhone}</p>
                            )}
                          </div>

                          {addr.latitude && addr.longitude ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${addr.latitude},${addr.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6] hover:underline"
                            >
                              <span>Google Maps</span>
                              <ExternalLink size={11} />
                            </a>
                          ) : (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                `${addr.addressLine1}, ${addr.city}, ${addr.state} ${addr.postalCode}`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6] hover:underline"
                            >
                              <span>Search Map</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──────── TAB 3: ORDERS HISTORY ──────── */}
            {activeTab === "orders" && (
              <div className="space-y-3">
                {data.orders.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#71717A] bg-[#09090B] rounded-xl border border-[#27272A]">
                    <ShoppingBag size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                    No order transactions found for this customer.
                  </div>
                ) : (
                  data.orders.map((ord: any) => (
                    <div
                      key={ord.id}
                      className="p-3.5 sm:p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3 hover:border-[#8B5CF6]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#8B5CF6]">{ord.orderNumber || ord.id}</span>
                          <span className="text-[11px] text-[#71717A]">
                            {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              ord.orderStatus === "DELIVERED"
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                                : ord.orderStatus === "SHIPPED"
                                ? "bg-blue-950/80 text-blue-400 border border-blue-500/40"
                                : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                            }`}
                          >
                            {ord.orderStatus}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
                            {ord.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {/* Order Items */}
                      {ord.items && ord.items.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-[#18181B] border border-[#27272A] space-y-1.5 text-xs">
                          {ord.items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-[#FAFAFA] truncate">{item.productName}</span>
                                <span className="text-[10px] font-mono text-[#71717A]">x{item.quantity}</span>
                              </div>
                              <span className="font-mono font-bold text-[#FAFAFA]">
                                ₹{(item.total || item.price * item.quantity).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between border-t border-[#27272A] text-xs">
                        <span className="text-[#71717A]">Payment Method: <strong className="text-[#FAFAFA]">{ord.paymentMethod}</strong></span>
                        <div className="text-right">
                          <span className="text-[10px] text-[#71717A] block">Grand Total</span>
                          <span className="font-extrabold text-sm text-[#FAFAFA]">
                            ₹{(ord.totalAmount || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ──────── TAB 4: QUOTATION PIPELINE ──────── */}
            {activeTab === "quotes" && (
              <div className="space-y-3">
                {data.quotes.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#71717A] bg-[#09090B] rounded-xl border border-[#27272A]">
                    <FileText size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                    No B2B RFQ quotations generated for this customer.
                  </div>
                ) : (
                  data.quotes.map((q: any) => (
                    <div
                      key={q.id}
                      className="p-3.5 sm:p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3 hover:border-[#8B5CF6]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-xs text-[#A855F7] block">
                            {q.referenceNo || q.quoteNumber}
                          </span>
                          <span className="text-[10px] text-[#71717A]">
                            Generated on {new Date(q.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                              q.status === "APPROVED"
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                                : q.status === "UNDER_REVIEW"
                                ? "bg-blue-950/80 text-blue-400 border border-blue-500/40"
                                : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                            }`}
                          >
                            {q.status}
                          </span>
                          {q.digitalSignature && (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 size={11} /> Signed
                            </span>
                          )}
                        </div>
                      </div>

                      {q.projectName && (
                        <p className="text-xs text-[#FAFAFA] font-medium">Project Scope: {q.projectName}</p>
                      )}

                      <div className="pt-2 flex items-center justify-between border-t border-[#27272A] text-xs">
                        <span className="text-[#71717A]">Items: <strong className="text-[#FAFAFA]">{q.itemsCount}</strong></span>
                        <div className="text-right">
                          <span className="text-[10px] text-[#71717A] block">Quote Total</span>
                          <span className="font-extrabold text-sm text-[#FAFAFA]">
                            ₹{(q.grandTotal || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ──────── TAB 5: FINANCIALS & INVOICES / PO / PI ──────── */}
            {activeTab === "financials" && (
              <div className="space-y-6">
                {/* Tax Invoices Register */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#A855F7] flex items-center gap-1.5">
                    <Receipt size={13} />
                    <span>GST Tax Invoices Register</span>
                  </h4>

                  {data.invoices.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#71717A] bg-[#09090B] rounded-xl border border-[#27272A]">
                      No tax invoices recorded for this account.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.invoices.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-[#8B5CF6] block">{inv.invoiceNumber}</span>
                            <span className="text-[10px] text-[#71717A]">
                              {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-extrabold text-sm text-[#FAFAFA] block">
                              ₹{(inv.grandTotal || 0).toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold">{inv.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PO / PI Integration Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 sm:p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2 text-xs">
                    <h5 className="font-bold text-[#FAFAFA] flex items-center gap-1.5">
                      <FileSpreadsheet size={13} className="text-[#8B5CF6]" />
                      <span>Proforma Invoices (PI)</span>
                    </h5>
                    <p className="text-[11px] text-[#71717A]">
                      Proforma invoices generated directly from quotation approvals or advance payment milestones.
                    </p>
                    <span className="inline-block text-[10px] font-bold text-[#A855F7] bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded">
                      PI Engine Active
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2 text-xs">
                    <h5 className="font-bold text-[#FAFAFA] flex items-center gap-1.5">
                      <FileText size={13} className="text-[#8B5CF6]" />
                      <span>Customer Purchase Orders (PO)</span>
                    </h5>
                    <p className="text-[11px] text-[#71717A]">
                      Inbound client purchase orders, contract PO numbers, and uploaded PDF document records.
                    </p>
                    <span className="inline-block text-[10px] font-bold text-blue-400 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded">
                      PO Tracking Linked
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ──────── TAB 6: B2B CUSTOM RATES MATRIX ──────── */}
            {activeTab === "b2b_rates" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A855F7]">Special B2B Pricing Matrix</h4>
                    <p className="text-[11px] text-[#A1A1AA]">Active contract rate overrides configured specifically for this account.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateB2BPricing) {
                        onNavigateB2BPricing(user.id);
                      } else {
                        setCurrentView("b2b-pricing");
                      }
                    }}
                    className="px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Coins size={13} />
                    <span>Configure Pricing Matrix</span>
                  </button>
                </div>

                {data.b2bPrices.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#71717A] bg-[#09090B] rounded-xl border border-[#27272A]">
                    <Coins size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                    No special pricing overrides set for this customer. Standard retail catalog MRP applies.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.b2bPrices.map((bp: any) => (
                      <div
                        key={bp.id}
                        className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-[#FAFAFA] line-clamp-1">{bp.productName}</h5>
                            <span className="font-mono text-[10px] text-[#A855F7]">{bp.sku}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                            {bp.discountPercentage}% OFF
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#27272A]">
                          <div>
                            <span className="text-[10px] text-[#71717A] line-through block">
                              MRP: ₹{(bp.standardPrice || 0).toLocaleString("en-IN")}
                            </span>
                            <span className="font-extrabold text-sm text-purple-300">
                              B2B: ₹{(bp.customPrice || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[#71717A] block">Min Order Qty (MOQ)</span>
                            <span className="font-bold text-[#FAFAFA]">{bp.minQuantity} units</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──────── TAB 7: ACTIVITY & SECURITY LOGS ──────── */}
            {activeTab === "activity_logs" && (
              <div className="space-y-6">
                {/* Account Activity Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#A855F7] flex items-center gap-1.5">
                    <Activity size={13} />
                    <span>Profile Updates &amp; Account Activity</span>
                  </h4>

                  {data.activityLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#71717A] bg-[#09090B] rounded-xl border border-[#27272A]">
                      No activity records logged.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {data.activityLogs.map((log: any) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex items-start justify-between gap-3 text-xs"
                        >
                          <div>
                            <p className="font-bold text-[#FAFAFA]">{log.action}</p>
                            {log.description && <p className="text-[11px] text-[#A1A1AA] mt-0.5">{log.description}</p>}
                            {log.ipAddress && (
                              <p className="text-[10px] font-mono text-[#71717A] mt-0.5">IP: {log.ipAddress}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-[#71717A] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Password & Security History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <KeyRound size={13} />
                    <span>Password Reset &amp; Recovery History</span>
                  </h4>

                  {data.passwordResets.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#71717A] bg-[#09090B] rounded-xl border border-[#27272A]">
                      No password recovery events recorded for this account.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.passwordResets.map((pr: any) => (
                        <div
                          key={pr.id}
                          className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <KeyRound size={13} className="text-amber-400" />
                            <div>
                              <span className="font-bold text-[#FAFAFA]">Password Reset Request (OTP)</span>
                              <span className="text-[10px] text-[#71717A] block">
                                {pr.usedAt ? `Verified & Completed on ${new Date(pr.usedAt).toLocaleString("en-IN")}` : "Requested / Expired"}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#71717A]">
                            {new Date(pr.createdAt).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ──────── TAB: DUES & RECOVERY ──────── */}
            {activeTab === "dues_recovery" && (
              <div className="space-y-5">
                {/* Header & Quick Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <CreditCard size={18} className="text-purple-400" />
                      <span>Receivables, Aging &amp; Recovery Dues</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Delivered goods, open tax invoices, opening balances, and chronological payment allocations.
                    </p>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAllocationOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <IndianRupee size={13} />
                      <span>Record Payment</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLogFollowupOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Phone size={13} />
                      <span>Log Touchpoint</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSendLedgerOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-200 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Mail size={13} />
                      <span>Send Statement</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSendSmsOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-200 text-xs font-bold flex items-center gap-1.5"
                    >
                      <MessageSquare size={13} />
                      <span>Send SMS</span>
                    </button>
                    {duesDetail && (
                      <button
                        type="button"
                        onClick={() => printStatementOfAccount(duesDetail)}
                        className="px-3 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-200 text-xs font-bold flex items-center gap-1.5"
                        title="Print B&W Statement of Account"
                      >
                        <Printer size={13} />
                        <span>Print Ledger</span>
                      </button>
                    )}
                    {duesDetail && (duesDetail.summary.followupStatus === 'DISPUTED' || duesDetail.summary.followupStatus === 'DECLINED') ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await paymentFollowupApi.resumeFollowup(duesDetail.customer.id);
                          fetchCustomerDues(duesDetail.customer.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <RotateCcw size={13} />
                        <span>Resume Recovery</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeclineDisputeOpen(true)}
                        className="p-1.5 rounded-xl bg-[#27272A] hover:bg-rose-950/40 text-rose-400 border border-transparent hover:border-rose-900/50"
                        title="Mark Disputed or Declined"
                      >
                        <Ban size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {loadingDuesDetail ? (
                  <div className="py-12 flex flex-col items-center justify-center text-xs text-zinc-400 gap-2">
                    <RefreshCw size={20} className="animate-spin text-purple-400" />
                    <span>Loading customer dues statement...</span>
                  </div>
                ) : !duesDetail ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    No outstanding balance records found for this account.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Disputed Warning Banner */}
                    {(duesDetail.summary.followupStatus === 'DISPUTED' || duesDetail.summary.followupStatus === 'DECLINED') && (
                      <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-300 flex items-start gap-2.5">
                        <Ban size={16} className="text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold uppercase tracking-wider block text-[11px]">
                            Account is currently {duesDetail.summary.followupStatus}
                          </span>
                          <p className="text-zinc-300 mt-0.5">
                            {duesDetail.summary.declineReason || 'Account collection is suspended. Automated notifications are disabled.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Summary Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A]">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Total Outstanding</span>
                        <span className="text-lg font-black font-mono text-rose-400">
                          ₹{Math.round(duesDetail.summary.totalOutstanding).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A]">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Overdue Amount</span>
                        <span className="text-lg font-black font-mono text-amber-400">
                          ₹{Math.round(duesDetail.summary.overdueAmount).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A]">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Aging Bracket</span>
                        <span className="text-sm font-bold text-white block mt-1">
                          {duesDetail.summary.agingBucket.replace('_', '-')} Days ({duesDetail.summary.maxDaysOverdue}d overdue)
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A]">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Follow-up Status</span>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {duesDetail.summary.followupStatus.replace('_', ' ')}
                        </span>
                        {duesDetail.summary.ptpDate && (
                          <div className="text-[10px] text-purple-300 mt-0.5">
                            PTP: {new Date(duesDetail.summary.ptpDate).toLocaleDateString('en-IN')} {duesDetail.summary.ptpAmount ? `(₹${duesDetail.summary.ptpAmount.toLocaleString('en-IN')})` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Aging Buckets Breakdown */}
                    <div className="p-3.5 rounded-2xl bg-[#09090B] border border-[#27272A] space-y-2">
                      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Dynamic Aging Breakdown</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                          <span className="text-[10px] text-zinc-500 block">0-30 Days</span>
                          <span className="font-mono font-bold text-zinc-200">
                            ₹{Math.round(duesDetail.agingBreakdown.bucket0_30).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                          <span className="text-[10px] text-amber-500/80 block">31-60 Days</span>
                          <span className="font-mono font-bold text-amber-300">
                            ₹{Math.round(duesDetail.agingBreakdown.bucket31_60).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                          <span className="text-[10px] text-orange-500/80 block">61-90 Days</span>
                          <span className="font-mono font-bold text-orange-300">
                            ₹{Math.round(duesDetail.agingBreakdown.bucket61_90).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                          <span className="text-[10px] text-rose-500/80 block">90+ Days</span>
                          <span className="font-mono font-bold text-rose-400">
                            ₹{Math.round(duesDetail.agingBreakdown.bucket90_plus).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Traceable Dues Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        <span>Open Receivables ({duesDetail.dues.length})</span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-[#27272A]">
                        <table className="w-full text-left text-xs text-zinc-300 divide-y divide-[#27272A]">
                          <thead className="bg-[#09090B] text-zinc-400 font-extrabold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Document #</th>
                              <th className="py-2.5 px-3">Source</th>
                              <th className="py-2.5 px-3">Due Date</th>
                              <th className="py-2.5 px-3 text-right">Total</th>
                              <th className="py-2.5 px-3 text-right">Paid</th>
                              <th className="py-2.5 px-3 text-right">Balance Due</th>
                              <th className="py-2.5 px-3 text-center">Overdue</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#27272A] bg-[#121214]">
                            {duesDetail.dues.map((due) => (
                              <tr key={due.id} className="hover:bg-[#18181B]">
                                <td className="py-2 px-3 font-mono font-bold text-white">{due.documentNumber}</td>
                                <td className="py-2 px-3 text-[11px] text-zinc-400">{due.sourceType.replace('_', ' ')}</td>
                                <td className="py-2 px-3 text-zinc-300">{new Date(due.dueDate).toLocaleDateString('en-IN')}</td>
                                <td className="py-2 px-3 text-right font-mono">₹{Math.round(due.totalAmount).toLocaleString('en-IN')}</td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-400">₹{Math.round(due.paidAmount).toLocaleString('en-IN')}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-rose-400">₹{Math.round(due.balanceDue).toLocaleString('en-IN')}</td>
                                <td className="py-2 px-3 text-center">
                                  {due.daysOverdue > 0 ? (
                                    <span className="text-amber-400 font-bold">{due.daysOverdue}d</span>
                                  ) : (
                                    <span className="text-emerald-400">Current</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAllocationOpen(true);
                                    }}
                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                                  >
                                    Pay
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Payment Allocations History */}
                    {duesDetail.paymentAllocations.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Payment Allocations History ({duesDetail.paymentAllocations.length})
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-[#27272A]">
                          <table className="w-full text-left text-xs text-zinc-300 divide-y divide-[#27272A]">
                            <thead className="bg-[#09090B] text-zinc-400 font-extrabold uppercase text-[10px]">
                              <tr>
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Mode</th>
                                <th className="py-2.5 px-3">Target Doc</th>
                                <th className="py-2.5 px-3 text-right">Allocated Amount</th>
                                <th className="py-2.5 px-3">Reference</th>
                                <th className="py-2.5 px-3">Recorded By</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#27272A] bg-[#121214]">
                              {duesDetail.paymentAllocations.map((pa) => (
                                <tr key={pa.id} className="hover:bg-[#18181B]">
                                  <td className="py-2 px-3">{new Date(pa.paymentDate).toLocaleDateString('en-IN')}</td>
                                  <td className="py-2 px-3 font-bold">{pa.paymentMode}</td>
                                  <td className="py-2 px-3 font-mono text-purple-300">{pa.targetDocumentNumber || pa.targetId}</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                                    ₹{Math.round(pa.allocatedAmount).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-[11px] text-zinc-400">{pa.transactionRef || '-'}</td>
                                  <td className="py-2 px-3 text-zinc-400 text-[11px]">{pa.recordedByName || 'Admin'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Follow-up Touchpoints History */}
                    {duesDetail.followupHistory.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Follow-up &amp; Contact History ({duesDetail.followupHistory.length})
                        </div>
                        <div className="space-y-2">
                          {duesDetail.followupHistory.map((h) => (
                            <div key={h.id} className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex items-start justify-between gap-3 text-xs">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase">
                                    {h.followupType}
                                  </span>
                                  <span className="font-bold text-white">{h.outcome.replace('_', ' ')}</span>
                                </div>
                                <p className="text-zinc-300">{h.notes}</p>
                                {h.ptpDate && (
                                  <div className="text-[11px] text-purple-300 font-bold mt-1">
                                    PTP: {new Date(h.ptpDate).toLocaleDateString('en-IN')} {h.ptpAmount ? `(₹${h.ptpAmount.toLocaleString('en-IN')})` : ''}
                                  </div>
                                )}
                              </div>
                              <div className="text-right text-[10px] text-zinc-500 shrink-0">
                                <div>{new Date(h.createdAt).toLocaleDateString('en-IN')}</div>
                                <div>{h.performedByName || 'Officer'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      )}

      {/* Dues Recovery Modals */}
      {duesDetail && (
        <>
          <RecordPaymentAllocationModal
            isOpen={isAllocationOpen}
            customerId={duesDetail.customer.id}
            customerName={duesDetail.customer.name}
            companyName={duesDetail.customer.companyName}
            totalOutstanding={duesDetail.summary.totalOutstanding}
            onClose={() => setIsAllocationOpen(false)}
            onSuccess={() => {
              setIsAllocationOpen(false);
              fetchCustomerDues(duesDetail.customer.id);
            }}
          />

          <LogFollowupModal
            isOpen={isLogFollowupOpen}
            customerId={duesDetail.customer.id}
            customerName={duesDetail.customer.name}
            companyName={duesDetail.customer.companyName}
            phone={duesDetail.customer.phone}
            email={duesDetail.customer.email}
            outstandingAmount={duesDetail.summary.totalOutstanding}
            onClose={() => setIsLogFollowupOpen(false)}
            onSuccess={() => {
              setIsLogFollowupOpen(false);
              fetchCustomerDues(duesDetail.customer.id);
            }}
          />

          <SendLedgerModal
            isOpen={isSendLedgerOpen}
            customerId={duesDetail.customer.id}
            customerName={duesDetail.customer.name}
            companyName={duesDetail.customer.companyName}
            email={duesDetail.customer.email}
            totalOutstanding={duesDetail.summary.totalOutstanding}
            onClose={() => setIsSendLedgerOpen(false)}
            onSuccess={() => {
              setIsSendLedgerOpen(false);
              fetchCustomerDues(duesDetail.customer.id);
            }}
          />

          <SendSmsReminderModal
            isOpen={isSendSmsOpen}
            customerId={duesDetail.customer.id}
            customerName={duesDetail.customer.name}
            companyName={duesDetail.customer.companyName}
            phone={duesDetail.customer.phone}
            totalOutstanding={duesDetail.summary.totalOutstanding}
            onClose={() => setIsSendSmsOpen(false)}
            onSuccess={() => {
              setIsSendSmsOpen(false);
              fetchCustomerDues(duesDetail.customer.id);
            }}
          />

          <DeclineDisputeModal
            isOpen={isDeclineDisputeOpen}
            customerId={duesDetail.customer.id}
            customerName={duesDetail.customer.name}
            companyName={duesDetail.customer.companyName}
            totalOutstanding={duesDetail.summary.totalOutstanding}
            onClose={() => setIsDeclineDisputeOpen(false)}
            onSuccess={() => {
              setIsDeclineDisputeOpen(false);
              fetchCustomerDues(duesDetail.customer.id);
            }}
          />
        </>
      )}

    </div>
  );
}
