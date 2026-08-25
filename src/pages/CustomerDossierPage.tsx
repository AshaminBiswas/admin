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
} from "lucide-react";
import { usersApi } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";

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
    "overview" | "addresses" | "orders" | "quotes" | "financials" | "b2b_rates" | "activity_logs"
  >("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
              { id: "b2b_rates", label: `B2B Rates (${data.b2bPrices?.length || 0})`, icon: <Coins size={13} /> },
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

          </div>

        </div>
      )}

    </div>
  );
}
