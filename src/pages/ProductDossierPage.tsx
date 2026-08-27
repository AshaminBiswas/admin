import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Building2,
  Calendar,
  IndianRupee,
  TrendingUp,
  ShoppingBag,
  Truck,
  ArrowRightLeft,
  History,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ShieldCheck,
  Tag,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  User,
  Users,
  MapPin,
  Phone,
  Mail,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Boxes,
  Pencil,
  ArrowLeft,
  Home,
  Check,
  Copy,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { inventoryApi } from '../api/adminApi';
import type { ProductDossier, Branch, Supplier } from '../types/admin';
import { getStockStatus } from '../utils/stockStatus';
import { SupplierModal } from '../components/inventory/SupplierModal';
import { useAdminAuth } from '../context/AdminAuthContext';

interface ProductDossierPageProps {
  productId?: string | null;
  onBack?: () => void;
  branches?: Branch[];
  suppliers?: Supplier[];
}

type DossierTab = 'overview' | 'purchases' | 'sales' | 'movements' | 'timeline' | 'customers';

export function ProductDossierPage({
  productId: propProductId,
  onBack,
  branches = [],
  suppliers = [],
}: ProductDossierPageProps) {
  const { setCurrentView } = useAdminAuth();

  // Resolve Product ID from prop or localStorage
  const activeProductId =
    propProductId ||
    (typeof window !== 'undefined' ? localStorage.getItem('prc_admin_selected_product_id') : null);

  const [activeTab, setActiveTab] = useState<DossierTab>('overview');
  const [dossier, setDossier] = useState<ProductDossier | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Filters inside page
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterVendor, setFilterVendor] = useState<string>('ALL');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [filterTxType, setFilterTxType] = useState<string>('ALL');

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setCurrentView('inventory');
    }
  };

  const handleEditVendor = (vendorName?: string, vendorId?: string) => {
    const matched = suppliers.find(
      (s) =>
        (vendorId && s.id === vendorId) ||
        (vendorName && s.name.toLowerCase() === vendorName.toLowerCase())
    );
    if (matched) {
      setEditingSupplier(matched);
    } else if (vendorName) {
      setEditingSupplier({
        id: vendorId || 'temp-vendor',
        name: vendorName,
        isActive: true,
      } as Supplier);
    }
  };

  // Load Dossier
  const fetchDossier = useCallback(async () => {
    if (!activeProductId) {
      setLoading(false);
      setError('No product selected for Audit Hub.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryApi.getProductDossier(activeProductId);
      if (res && res.success !== false && (res.data || (res as any).product)) {
        const d = (res.data || res) as ProductDossier;
        setDossier(d);
      } else {
        throw new Error(res?.message || 'Failed to load complete traceability dossier');
      }
    } catch (err: any) {
      console.warn('[ProductDossierPage] Error loading dossier:', err?.message || err);
      setError(err?.message || 'Could not load complete product traceability history.');
    } finally {
      setLoading(false);
    }
  }, [activeProductId]);

  useEffect(() => {
    fetchDossier();
  }, [fetchDossier]);

  // Export handlers
  const handleExportExcel = async () => {
    if (!activeProductId) return;
    setExportLoading(true);
    try {
      const safeSku = dossier?.product?.sku || 'SKU';
      await inventoryApi.downloadProductDossierExcel(
        activeProductId,
        `Traceability-Dossier-${safeSku}-${Date.now()}.xlsx`
      );
    } catch (e: any) {
      alert('Failed to download Excel export: ' + (e?.message || 'Unknown error'));
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!activeProductId) return;
    setExportLoading(true);
    try {
      const safeSku = dossier?.product?.sku || 'SKU';
      await inventoryApi.downloadProductDossierPdf(
        activeProductId,
        `Traceability-Dossier-${safeSku}-${Date.now()}.pdf`
      );
    } catch (e: any) {
      alert('Failed to download PDF report: ' + (e?.message || 'Unknown error'));
    } finally {
      setExportLoading(false);
    }
  };

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    if (!dossier?.purchases) return [];
    return dossier.purchases.filter((p) => {
      if (filterVendor !== 'ALL' && p.vendorName !== filterVendor && p.vendorId !== filterVendor)
        return false;
      if (filterBranch !== 'ALL' && p.branchId !== filterBranch && p.branchCode !== filterBranch)
        return false;
      if (filterStartDate && new Date(p.purchaseDate) < new Date(filterStartDate)) return false;
      if (filterEndDate && new Date(p.purchaseDate) > new Date(filterEndDate + 'T23:59:59'))
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.invoiceNumber?.toLowerCase().includes(q) ||
          p.vendorName?.toLowerCase().includes(q) ||
          p.branchName?.toLowerCase().includes(q) ||
          p.createdByName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dossier?.purchases, filterVendor, filterBranch, filterStartDate, filterEndDate, searchQuery]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    if (!dossier?.sales) return [];
    return dossier.sales.filter((s) => {
      if (filterStartDate && new Date(s.orderDate) < new Date(filterStartDate)) return false;
      if (filterEndDate && new Date(s.orderDate) > new Date(filterEndDate + 'T23:59:59'))
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.orderNumber?.toLowerCase().includes(q) ||
          s.customerName?.toLowerCase().includes(q) ||
          s.customerEmail?.toLowerCase().includes(q) ||
          s.customerPhone?.toLowerCase().includes(q) ||
          s.companyName?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q) ||
          s.orderStatus?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dossier?.sales, filterStartDate, filterEndDate, searchQuery]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    if (!dossier?.stockMovements) return [];
    return dossier.stockMovements.filter((m) => {
      if (filterTxType !== 'ALL' && m.type !== filterTxType) return false;
      if (filterBranch !== 'ALL' && m.branchId !== filterBranch && m.branchCode !== filterBranch)
        return false;
      if (filterStartDate && new Date(m.createdAt) < new Date(filterStartDate)) return false;
      if (filterEndDate && new Date(m.createdAt) > new Date(filterEndDate + 'T23:59:59'))
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.type?.toLowerCase().includes(q) ||
          m.notes?.toLowerCase().includes(q) ||
          m.referenceId?.toLowerCase().includes(q) ||
          m.branchName?.toLowerCase().includes(q) ||
          m.performedByName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dossier?.stockMovements, filterTxType, filterBranch, filterStartDate, filterEndDate, searchQuery]);

  // Filtered Timeline
  const filteredTimeline = useMemo(() => {
    if (!dossier?.timeline) return [];
    return dossier.timeline.filter((t) => {
      if (filterStartDate && new Date(t.timestamp) < new Date(filterStartDate)) return false;
      if (filterEndDate && new Date(t.timestamp) > new Date(filterEndDate + 'T23:59:59'))
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.actor?.toLowerCase().includes(q) ||
          t.reference?.toLowerCase().includes(q) ||
          t.stage?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dossier?.timeline, filterStartDate, filterEndDate, searchQuery]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    if (!dossier?.customerDirectory) return [];
    return dossier.customerDirectory.filter((c) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.customerName?.toLowerCase().includes(q) ||
          c.companyName?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dossier?.customerDirectory, searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterVendor('ALL');
    setFilterBranch('ALL');
    setFilterTxType('ALL');
  };

  const isFiltered = Boolean(
    searchQuery ||
      filterStartDate ||
      filterEndDate ||
      filterVendor !== 'ALL' ||
      filterBranch !== 'ALL' ||
      filterTxType !== 'ALL'
  );

  const prod = dossier?.product;
  const metrics = dossier?.summaryMetrics;
  const stockInfo = getStockStatus(prod?.stock || 0, prod?.reorderLevel || 10);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 animate-in fade-in duration-200">
      {/* ─── 1. TOP BREADCRUMB & ACTION HEADER BAR ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#27272A]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#A1A1AA] mb-1.5 flex-wrap">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <button
              onClick={handleBack}
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Inventory Management
            </button>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-slate-800 dark:text-[#E4E4E7]">
              Product Audit Hub
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleBack}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#18181B] dark:hover:bg-[#27272A] border border-slate-200 dark:border-[#27272A] rounded-xl text-slate-700 dark:text-[#FAFAFA] transition"
              title="Return to Inventory Stock Matrix"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {prod?.thumbnail ? (
              <img
                src={prod.thumbnail}
                alt={prod.name}
                className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Package className="w-5 h-5" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#FAFAFA] tracking-tight">
                  {prod?.name || 'Product Audit & Traceability Hub'}
                </h1>
                {prod?.sku && (
                  <button
                    onClick={() => handleCopy(prod.sku, 'sku')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-[#27272A] text-slate-800 dark:text-[#FAFAFA] border border-slate-200 dark:border-[#3F3F46] hover:border-[#8B5CF6] transition"
                    title="Click to Copy SKU"
                  >
                    <span>SKU: {prod.sku}</span>
                    {copiedField === 'sku' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${stockInfo.badgeClass}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      stockInfo.isOutOfStock
                        ? 'bg-rose-500'
                        : stockInfo.isLowStock
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  ></span>
                  {stockInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#A1A1AA] mt-1 flex items-center gap-2 flex-wrap">
                <span>
                  Category:{' '}
                  <strong className="text-slate-700 dark:text-[#E4E4E7]">
                    {prod?.categoryName || 'Architectural Hardware'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Brand:{' '}
                  <strong className="text-slate-700 dark:text-[#E4E4E7]">
                    {prod?.brand || 'Pacific Hardware (PRC)'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Total Facility Stock:{' '}
                  <strong className="text-[#8B5CF6]">{prod?.stock ?? 0} Units</strong>
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            disabled={exportLoading || loading || !dossier}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition disabled:opacity-50"
            title="Download Comprehensive Traceability Excel Workbook"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportLoading || loading || !dossier}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-rose-600/20 transition disabled:opacity-50"
            title="Download Printable PDF Audit Dossier"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF Dossier</span>
          </button>

          <button
            onClick={fetchDossier}
            disabled={loading}
            className="p-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-slate-600 dark:text-[#A1A1AA] hover:text-[#8B5CF6] rounded-xl transition"
            title="Refresh Audit Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 2. KPI SUMMARY METRIC CARDS ───────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A] flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-sky-500" /> Current Stock Asset
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-[#FAFAFA] mt-1">
              {metrics.currentStockTotal} <span className="text-xs font-medium text-slate-500">Units</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#A1A1AA] mt-1">
              Cost: ₹{metrics.inventoryValueAtCost.toLocaleString('en-IN')} | Retail: ₹
              {metrics.inventoryValueAtRetail.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-500" /> Total Procured (Stock-In)
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.totalPurchasedQty} <span className="text-xs font-medium text-slate-500">Units</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#A1A1AA] mt-1">
              Spend: ₹{metrics.totalPurchaseExpenditure.toLocaleString('en-IN')} (Avg: ₹
              {metrics.avgPurchaseCost}/u)
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A] flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-indigo-500" /> Total Sold (Dispatched)
            </span>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {metrics.totalSoldQty} <span className="text-xs font-medium text-slate-500">Units</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#A1A1AA] mt-1">
              Revenue: ₹{metrics.totalSalesRevenue.toLocaleString('en-IN')} (Avg: ₹
              {metrics.avgSellingPrice}/u)
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-violet-500" /> Estimated Gross Margin
            </span>
            <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
              {metrics.estimatedProfitMarginPercent}%
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#A1A1AA] mt-1">
              Spread: +₹{(metrics.avgSellingPrice - metrics.avgPurchaseCost).toFixed(2)}/unit
            </p>
          </div>
        </div>
      )}

      {/* ─── 3. NAVIGATION TABS & SEARCH BAR ───────────────────────────────── */}
      <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { key: 'overview', label: '1. Product & Listing Profile', icon: Package },
            {
              key: 'purchases',
              label: `2. Purchases & Vendors (${dossier?.purchases?.length || 0})`,
              icon: Building2,
            },
            {
              key: 'sales',
              label: `3. Sales & Orders (${dossier?.sales?.length || 0})`,
              icon: ShoppingBag,
            },
            {
              key: 'movements',
              label: `4. Stock Ledger (${dossier?.stockMovements?.length || 0})`,
              icon: History,
            },
            {
              key: 'timeline',
              label: `5. Audit Timeline (${dossier?.timeline?.length || 0})`,
              icon: Clock,
            },
            {
              key: 'customers',
              label: `6. Buyer Directory (${dossier?.customerDirectory?.length || 0})`,
              icon: Users,
            },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as DossierTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/20'
                    : 'text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Clear */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search across audit history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isFiltered && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 4. MAIN WORKSPACE VIEW ────────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#8B5CF6]" />
          <p className="text-base font-bold text-slate-800 dark:text-[#FAFAFA]">
            Compiling Complete Product Traceability Dossier...
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Aggregating vendor invoices, branch stock ledger, customer orders, and tracking events.
          </p>
        </div>
      ) : error && !dossier ? (
        <div className="p-10 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">{error}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Please make sure the product exists and has an active SKU record.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={fetchDossier}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition"
            >
              Try Again
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-slate-200 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-bold transition"
            >
              Back to Inventory
            </button>
          </div>
        </div>
      ) : dossier ? (
        <div className="space-y-6">
          {/* ─── TAB 1: PRODUCT PROFILE & MULTI-BRANCH STOCK ────────────────── */}
          {activeTab === 'overview' && prod && (
            <div className="space-y-6">
              {/* Product Specifications & Listing Provenance Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card 1: Master Specification */}
                <div className="p-6 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#71717A] mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#8B5CF6]" /> Master Product Specification
                  </h3>
                  <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-[#27272A]">
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Official Product Name:</span>
                      <span className="font-bold text-slate-900 dark:text-[#FAFAFA] text-right">
                        {prod.name}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">SKU / Product Code:</span>
                      <span className="font-mono font-bold text-[#8B5CF6]">{prod.sku}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Category / Taxonomy:</span>
                      <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">
                        {prod.categoryName}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Brand / Line:</span>
                      <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">
                        {prod.brand}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Standard MRP / Retail Rate:</span>
                      <span className="font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                        ₹{prod.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Contractor / Sale Rate:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {prod.salePrice
                          ? `₹${prod.salePrice.toLocaleString('en-IN')}`
                          : 'Standard MRP Applied'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Commercial Warranty:</span>
                      <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">
                        {prod.warranty}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Product Weight:</span>
                      <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">
                        {prod.weight ? (Number(prod.weight) < 10 ? `${Math.round(Number(prod.weight) * 1000)} g` : `${prod.weight} g`) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Listing Provenance & Primary Vendor */}
                <div className="p-6 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#71717A] mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Listing Provenance &
                    Governance
                  </h3>
                  <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-[#27272A]">
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Listed By (Administrator):</span>
                      <span className="font-bold text-slate-900 dark:text-[#FAFAFA]">
                        {prod.listedByName}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Creation Timestamp:</span>
                      <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">
                        {new Date(prod.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Last Modified:</span>
                      <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">
                        {new Date(prod.updatedAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Catalog Visibility:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {prod.isVisible ? 'Publicly Visible' : 'Hidden / Unlisted'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 items-center">
                      <span className="text-slate-500">Primary Linked Supplier:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-[#FAFAFA]">
                          {dossier.purchases?.[0]?.vendorName || 'Primary Hardware Supplier'}
                        </span>
                        {dossier.purchases?.[0]?.vendorName && (
                          <button
                            type="button"
                            onClick={() =>
                              handleEditVendor(
                                dossier.purchases?.[0]?.vendorName,
                                dossier.purchases?.[0]?.vendorId
                              )
                            }
                            className="p-1.5 text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-lg transition"
                            title="Edit Vendor Profile"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Safety Reorder Level:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {prod.reorderLevel} Units
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Total Lifetime Procured:</span>
                      <span className="font-bold text-slate-900 dark:text-[#FAFAFA]">
                        {metrics?.totalPurchasedQty || 0} Units
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Total Lifetime Dispatched:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {metrics?.totalSoldQty || 0} Units
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Branch Warehouse Inventory Distribution */}
              <div className="p-6 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#71717A] mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-500" /> Multi-Branch Warehouse Inventory
                  Distribution
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-[#27272A]">
                      <tr>
                        <th className="py-3 px-4">Branch Facility</th>
                        <th className="py-3 px-4">Location / City</th>
                        <th className="py-3 px-4 text-right">Available Qty</th>
                        <th className="py-3 px-4 text-right">Reserved Qty</th>
                        <th className="py-3 px-4 text-right">Reorder Threshold</th>
                        <th className="py-3 px-4 text-center">Facility Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                      {dossier.branchInventories?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No branch inventory records found.
                          </td>
                        </tr>
                      ) : (
                        dossier.branchInventories.map((b) => {
                          const bStatus = getStockStatus(b.availableQuantity, b.reorderLevel);
                          return (
                            <tr
                              key={b.id}
                              className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#27272A] border">
                                    {b.branchCode}
                                  </span>
                                  <span className="font-bold text-slate-900 dark:text-[#FAFAFA]">
                                    {b.branchName}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-[#A1A1AA]">
                                {b.city}, {b.state}
                              </td>
                              <td className="py-3 px-4 text-right font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                                {b.availableQuantity.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-500">
                                {b.reservedQuantity}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-500">
                                {b.reorderLevel}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${bStatus.badgeClass}`}
                                >
                                  {bStatus.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: PURCHASES & VENDOR PROCUREMENT HISTORY ─────────────── */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  Showing{' '}
                  <strong className="text-slate-900 dark:text-[#FAFAFA]">
                    {filteredPurchases.length}
                  </strong>{' '}
                  purchase transactions
                </span>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <select
                    value={filterVendor}
                    onChange={(e) => setFilterVendor(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold"
                  >
                    <option value="ALL">🏭 All Suppliers</option>
                    {Array.from(new Set(dossier.purchases.map((p) => p.vendorName))).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold"
                  >
                    <option value="ALL">🏢 All Facilities</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.code}] {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[850px]">
                    <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-[#27272A]">
                      <tr>
                        <th className="py-3.5 px-4">Purchase Date</th>
                        <th className="py-3.5 px-4">Invoice / PO #</th>
                        <th className="py-3.5 px-4">Vendor / Supplier</th>
                        <th className="py-3.5 px-4">Receiving Branch</th>
                        <th className="py-3.5 px-4 text-right">Qty Received</th>
                        <th className="py-3.5 px-4 text-right">Unit Rate (₹)</th>
                        <th className="py-3.5 px-4 text-right">Total Value (₹)</th>
                        <th className="py-3.5 px-4">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                      {filteredPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center text-slate-400">
                            <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            No purchase transactions found matching the filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredPurchases.map((p) => (
                          <tr
                            key={p.id}
                            className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-[#FAFAFA]">
                              {new Date(p.purchaseDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-[#8B5CF6]">
                                {p.invoiceNumber}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-[#FAFAFA]">
                                    {p.vendorName}
                                  </div>
                                  {(p.vendorPhone || p.vendorEmail) && (
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {p.vendorPhone || p.vendorEmail}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleEditVendor(p.vendorName, p.vendorId)}
                                  className="p-1 text-slate-400 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-lg transition"
                                  title="Edit Vendor Profile"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#27272A] border mr-1.5">
                                {p.branchCode}
                              </span>
                              <span className="font-semibold text-slate-700 dark:text-[#FAFAFA]">
                                {p.branchName}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                              +{p.quantity.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-[#FAFAFA]">
                              ₹{p.unitPurchasePrice.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                              ₹{p.totalPurchaseValue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                              {p.createdByName}
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

          {/* ─── TAB 3: CUSTOMER SALES & ORDERS ───────────────────────────── */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  Showing{' '}
                  <strong className="text-slate-900 dark:text-[#FAFAFA]">
                    {filteredSales.length}
                  </strong>{' '}
                  customer order line items
                </span>
              </div>

              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[900px]">
                    <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-[#27272A]">
                      <tr>
                        <th className="py-3.5 px-4">Order Date</th>
                        <th className="py-3.5 px-4">Order #</th>
                        <th className="py-3.5 px-4">Customer / Company</th>
                        <th className="py-3.5 px-4">Destination</th>
                        <th className="py-3.5 px-4 text-right">Qty</th>
                        <th className="py-3.5 px-4 text-right">Sale Price (₹)</th>
                        <th className="py-3.5 px-4 text-right">Line Total (₹)</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4">Fulfillment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                      {filteredSales.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center text-slate-400">
                            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            No customer orders recorded for this product yet.
                          </td>
                        </tr>
                      ) : (
                        filteredSales.map((s) => (
                          <tr
                            key={s.id}
                            className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-[#FAFAFA]">
                              {new Date(s.orderDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {s.orderNumber}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-[#FAFAFA]">
                                {s.customerName}
                              </div>
                              {s.companyName && (
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  {s.companyName}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-[#A1A1AA]">
                              {s.city}, {s.state}
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                              {s.quantity}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-[#FAFAFA]">
                              ₹{s.salePricePerUnit.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                              ₹{s.totalSaleValue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                {s.orderStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-[11px] font-semibold text-slate-800 dark:text-[#FAFAFA]">
                                {s.fulfillmentStatus}
                              </div>
                              {s.trackingNumber && (
                                <div className="text-[9px] font-mono text-slate-400">
                                  Track: {s.trackingNumber}
                                </div>
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

          {/* ─── TAB 4: IMMUTABLE STOCK MOVEMENT LEDGER ───────────────────── */}
          {activeTab === 'movements' && (
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  Showing{' '}
                  <strong className="text-slate-900 dark:text-[#FAFAFA]">
                    {filteredMovements.length}
                  </strong>{' '}
                  stock ledger movements
                </span>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <select
                    value={filterTxType}
                    onChange={(e) => setFilterTxType(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold"
                  >
                    <option value="ALL">📊 All Transaction Types</option>
                    <option value="PURCHASE_IN">📥 Purchase Stock-In</option>
                    <option value="SALE_OUT">📤 Sales Dispatch</option>
                    <option value="TRANSFER_IN">🚚 Transfer Inbound</option>
                    <option value="TRANSFER_OUT">🚛 Transfer Outbound</option>
                    <option value="ADJUSTMENT_IN">➕ Adjustment In</option>
                    <option value="ADJUSTMENT_OUT">➖ Adjustment Out</option>
                    <option value="DAMAGE">⚠️ Damaged / Lost</option>
                    <option value="RETURN_IN">🔄 Return Restocked</option>
                  </select>
                </div>
              </div>

              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[850px]">
                    <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-[#27272A]">
                      <tr>
                        <th className="py-3.5 px-4">Timestamp</th>
                        <th className="py-3.5 px-4">Branch Facility</th>
                        <th className="py-3.5 px-4">Movement Type</th>
                        <th className="py-3.5 px-4 text-right">Qty Delta</th>
                        <th className="py-3.5 px-4 text-center">Stock Progression</th>
                        <th className="py-3.5 px-4">Actor / User</th>
                        <th className="py-3.5 px-4">Audit Reason / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                      {filteredMovements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400">
                            <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            No stock movements recorded matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredMovements.map((m) => {
                          const isPos = [
                            'PURCHASE_IN',
                            'TRANSFER_IN',
                            'ADJUSTMENT_IN',
                            'RETURN_IN',
                          ].includes(m.type);
                          return (
                            <tr
                              key={m.id}
                              className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-[#A1A1AA] text-[11px]">
                                {new Date(m.createdAt).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#27272A] border mr-1.5">
                                  {m.branchCode}
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">
                                  {m.branchName}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isPos
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {m.type}
                                </span>
                              </td>
                              <td
                                className={`py-3.5 px-4 text-right font-extrabold text-sm ${
                                  isPos
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isPos ? `+${m.quantity}` : `-${m.quantity}`}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600 dark:text-[#A1A1AA]">
                                {m.previousQty} →{' '}
                                <strong className="text-slate-900 dark:text-[#FAFAFA]">
                                  {m.newQty}
                                </strong>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-[#A1A1AA] font-medium">
                                {m.performedByName}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 dark:text-[#71717A] text-[11px]">
                                {m.notes}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 5: UNIFIED CHRONOLOGICAL AUDIT TIMELINE ──────────────── */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm text-xs text-slate-500 flex items-center justify-between">
                <span>
                  Complete product lifecycle chronological audit trail (
                  <strong>{filteredTimeline.length}</strong> events recorded)
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-[#27272A]">
                {filteredTimeline.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No timeline events match the filter.
                  </div>
                ) : (
                  filteredTimeline.map((t, idx) => (
                    <div key={t.id} className="relative group">
                      {/* Timeline node icon */}
                      <div
                        className="absolute -left-6 top-1 w-6 h-6 rounded-full border-2 border-white dark:border-[#18181B] flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: t.badgeColor }}
                      >
                        <span className="text-[9px] font-bold">
                          {filteredTimeline.length - idx}
                        </span>
                      </div>

                      {/* Event Card */}
                      <div className="p-5 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm hover:border-[#8B5CF6] transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase text-white"
                              style={{ backgroundColor: t.badgeColor }}
                            >
                              {t.stage.replace(/_/g, ' ')}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA]">
                              {t.title}
                            </h4>
                          </div>

                          <span className="text-xs font-mono text-slate-400">
                            {new Date(t.timestamp).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-[#A1A1AA] mt-2 leading-relaxed">
                          {t.description}
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:divide-[#27272A] flex flex-wrap items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-3">
                            <span>
                              Actor:{' '}
                              <strong className="text-slate-700 dark:text-[#FAFAFA]">
                                {t.actor}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Ref:{' '}
                              <strong className="font-mono text-slate-700 dark:text-[#FAFAFA]">
                                {t.reference}
                              </strong>
                            </span>
                          </div>

                          {t.quantityChange && (
                            <span
                              className={`font-mono font-bold ${
                                t.quantityChange.startsWith('+')
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              Quantity: {t.quantityChange}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 6: BUYER & CUSTOMER DIRECTORY ───────────────────────── */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm text-xs text-slate-500">
                <span>
                  Unique buyers & contractor clients who have purchased this SKU (
                  <strong>{filteredCustomers.length}</strong> accounts)
                </span>
              </div>

              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[850px]">
                    <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-[#27272A]">
                      <tr>
                        <th className="py-3.5 px-4">Customer / Company Name</th>
                        <th className="py-3.5 px-4">Contact Details</th>
                        <th className="py-3.5 px-4">Location</th>
                        <th className="py-3.5 px-4 text-right">Total Units Bought</th>
                        <th className="py-3.5 px-4 text-right">Lifetime SKU Spend (₹)</th>
                        <th className="py-3.5 px-4 text-center">Orders Count</th>
                        <th className="py-3.5 px-4">Last Order Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400">
                            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            No client accounts associated with this product yet.
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((c, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-[#FAFAFA]">
                              {c.customerName}
                              {c.companyName && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {c.companyName}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-[#A1A1AA] font-mono text-[11px]">
                              {c.email || c.phone || 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-[#A1A1AA]">
                              {c.city ? `${c.city}, ${c.state}` : 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                              {c.totalUnitsPurchased.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                              ₹{c.totalSpendOnSku.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-[#FAFAFA]">
                              {c.ordersCount}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-[#A1A1AA]">
                              {new Date(c.lastOrderDate).toLocaleDateString('en-IN')}
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
        </div>
      ) : null}

      {/* Embedded Supplier Edit Modal */}
      {editingSupplier && (
        <SupplierModal
          key={editingSupplier.id || 'edit-vendor'}
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSuccess={() => {
            setEditingSupplier(null);
            fetchDossier();
          }}
        />
      )}
    </div>
  );
}
