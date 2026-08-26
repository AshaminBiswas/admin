import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
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
} from 'lucide-react';
import { inventoryApi } from '../../api/adminApi';
import type { ProductDossier, Branch, Supplier } from '../../types/admin';
import { getStockStatus } from '../../utils/stockStatus';

interface ProductDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName?: string;
  sku?: string;
  branches?: Branch[];
  suppliers?: Supplier[];
}

type DossierTab = 'overview' | 'purchases' | 'sales' | 'movements' | 'timeline' | 'customers';

export const ProductDossierModal: React.FC<ProductDossierModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName: initialProductName,
  sku: initialSku,
  branches = [],
  suppliers = [],
}) => {
  const [activeTab, setActiveTab] = useState<DossierTab>('overview');
  const [dossier, setDossier] = useState<ProductDossier | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  // Filters inside modal
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterVendor, setFilterVendor] = useState<string>('ALL');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [filterTxType, setFilterTxType] = useState<string>('ALL');

  // Load Dossier
  const fetchDossier = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryApi.getProductDossier(productId);
      if (res && res.success !== false && (res.data || (res as any).product)) {
        const d = (res.data || res) as ProductDossier;
        setDossier(d);
      } else {
        throw new Error(res?.message || 'Failed to load complete traceability dossier');
      }
    } catch (err: any) {
      console.warn('[ProductDossierModal] Error loading dossier:', err?.message || err);
      setError(err?.message || 'Could not load complete product traceability history.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isOpen && productId) {
      fetchDossier();
    }
  }, [isOpen, productId, fetchDossier]);

  // Export handlers
  const handleExportExcel = async () => {
    if (!productId) return;
    setExportLoading(true);
    try {
      const safeSku = dossier?.product?.sku || initialSku || 'SKU';
      await inventoryApi.downloadProductDossierExcel(productId, `Traceability-Dossier-${safeSku}-${Date.now()}.xlsx`);
    } catch (e: any) {
      alert('Failed to download Excel export: ' + (e?.message || 'Unknown error'));
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!productId) return;
    setExportLoading(true);
    try {
      const safeSku = dossier?.product?.sku || initialSku || 'SKU';
      await inventoryApi.downloadProductDossierPdf(productId, `Traceability-Dossier-${safeSku}-${Date.now()}.pdf`);
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
      if (filterVendor !== 'ALL' && p.vendorName !== filterVendor && p.vendorId !== filterVendor) return false;
      if (filterBranch !== 'ALL' && p.branchId !== filterBranch && p.branchCode !== filterBranch) return false;
      if (filterStartDate && new Date(p.purchaseDate) < new Date(filterStartDate)) return false;
      if (filterEndDate && new Date(p.purchaseDate) > new Date(filterEndDate + 'T23:59:59')) return false;
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
      if (filterEndDate && new Date(s.orderDate) > new Date(filterEndDate + 'T23:59:59')) return false;
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
      if (filterBranch !== 'ALL' && m.branchId !== filterBranch && m.branchCode !== filterBranch) return false;
      if (filterStartDate && new Date(m.createdAt) < new Date(filterStartDate)) return false;
      if (filterEndDate && new Date(m.createdAt) > new Date(filterEndDate + 'T23:59:59')) return false;
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
      if (filterEndDate && new Date(t.timestamp) > new Date(filterEndDate + 'T23:59:59')) return false;
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
    searchQuery || filterStartDate || filterEndDate || filterVendor !== 'ALL' || filterBranch !== 'ALL' || filterTxType !== 'ALL'
  );

  if (!isOpen) return null;

  const prod = dossier?.product;
  const metrics = dossier?.summaryMetrics;
  const stockInfo = getStockStatus(prod?.stock || 0, prod?.reorderLevel || 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-[#27272A] rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ─── MODAL HEADER ──────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-[#18181B]/80 border-b border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {prod?.thumbnail ? (
              <img
                src={prod.thumbnail}
                alt={prod.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Package className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#FAFAFA] leading-tight">
                  {prod?.name || initialProductName || 'Product Traceability Dossier'}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-slate-200/80 dark:bg-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                  SKU: {prod?.sku || initialSku || 'SKU'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stockInfo.badgeClass}`}>
                  {stockInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#A1A1AA] mt-0.5 flex items-center gap-2">
                <span>Category: <strong className="text-slate-700 dark:text-[#E4E4E7]">{prod?.categoryName || 'Hardware'}</strong></span>
                <span>•</span>
                <span>Brand: <strong className="text-slate-700 dark:text-[#E4E4E7]">{prod?.brand || 'PRC Architectural'}</strong></span>
                <span>•</span>
                <span>Total Stock: <strong className="text-[#8B5CF6]">{prod?.stock ?? 0} Units</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={exportLoading || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
              title="Download Comprehensive 6-Sheet Excel Workbook"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exportLoading || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 transition disabled:opacity-50"
              title="Download Printable PDF Audit Dossier"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>

            <button
              onClick={fetchDossier}
              disabled={loading}
              className="p-2 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] hover:border-[#8B5CF6] text-slate-600 dark:text-[#A1A1AA] hover:text-[#8B5CF6] rounded-xl transition"
              title="Refresh Dossier"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-slate-100 dark:bg-[#27272A] text-slate-500 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-white rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── KPI SUMMARY ROW ───────────────────────────────────────────── */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-100/50 dark:bg-[#18181B]/40 border-b border-slate-200 dark:border-[#27272A] text-xs">
            <div className="p-2.5 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A] flex items-center gap-1">
                <Boxes className="w-3 h-3 text-sky-500" /> Current Stock Asset
              </span>
              <p className="text-base font-extrabold text-slate-900 dark:text-[#FAFAFA] mt-0.5">
                {metrics.currentStockTotal} <span className="text-xs font-medium text-slate-500">Units</span>
              </p>
              <p className="text-[10px] text-slate-500 dark:text-[#A1A1AA] mt-0.5">
                Cost: ₹{metrics.inventoryValueAtCost.toLocaleString('en-IN')} | Retail: ₹{metrics.inventoryValueAtRetail.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="p-2.5 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A] flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-500" /> Total Procured
              </span>
              <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {metrics.totalPurchasedQty} <span className="text-xs font-medium text-slate-500">Units</span>
              </p>
              <p className="text-[10px] text-slate-500 dark:text-[#A1A1AA] mt-0.5">
                Spend: ₹{metrics.totalPurchaseExpenditure.toLocaleString('en-IN')} (Avg: ₹{metrics.avgPurchaseCost}/u)
              </p>
            </div>

            <div className="p-2.5 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A] flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-indigo-500" /> Total Sold
              </span>
              <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {metrics.totalSoldQty} <span className="text-xs font-medium text-slate-500">Units</span>
              </p>
              <p className="text-[10px] text-slate-500 dark:text-[#A1A1AA] mt-0.5">
                Revenue: ₹{metrics.totalSalesRevenue.toLocaleString('en-IN')} (Avg: ₹{metrics.avgSellingPrice}/u)
              </p>
            </div>

            <div className="p-2.5 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A] flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-violet-500" /> Estimated Margin
              </span>
              <p className="text-base font-extrabold text-violet-600 dark:text-violet-400 mt-0.5">
                {metrics.estimatedProfitMarginPercent}%
              </p>
              <p className="text-[10px] text-slate-500 dark:text-[#A1A1AA] mt-0.5">
                Spread: +₹{(metrics.avgSellingPrice - metrics.avgPurchaseCost).toFixed(2)}/unit
              </p>
            </div>
          </div>
        )}

        {/* ─── NAVIGATION TABS & FILTER BAR ──────────────────────────────── */}
        <div className="p-3 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { key: 'overview', label: '1. Product & Listing Profile', icon: Package },
              { key: 'purchases', label: `2. Purchases & Vendors (${dossier?.purchases?.length || 0})`, icon: Building2 },
              { key: 'sales', label: `3. Sales & Orders (${dossier?.sales?.length || 0})`, icon: ShoppingBag },
              { key: 'movements', label: `4. Stock Ledger (${dossier?.stockMovements?.length || 0})`, icon: History },
              { key: 'timeline', label: `5. Audit Timeline (${dossier?.timeline?.length || 0})`, icon: Clock },
              { key: 'customers', label: `6. Buyer Directory (${dossier?.customerDirectory?.length || 0})`, icon: Users },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as DossierTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#8B5CF6] text-white shadow-sm'
                      : 'text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search & Clear */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search within dossier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-6 py-1 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6] transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {isFiltered && (
              <button
                onClick={clearFilters}
                className="px-2 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 whitespace-nowrap"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── TAB CONTENT CONTAINER ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-[#09090B]/50">
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#8B5CF6]" />
              <p className="text-sm font-bold text-slate-700 dark:text-[#FAFAFA]">Compiling Full Product Lifecycle & Ledger...</p>
              <p className="text-xs text-slate-400 mt-1">Aggregating vendor invoices, branch stock ledger, customer orders, and tracking events.</p>
            </div>
          ) : error && !dossier ? (
            <div className="p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{error}</p>
              <button
                onClick={fetchDossier}
                className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Try Again
              </button>
            </div>
          ) : dossier ? (
            <>
              {/* ─── TAB 1: OVERVIEW & PRODUCT / LISTING INFO ────────────────── */}
              {activeTab === 'overview' && prod && (
                <div className="space-y-4">
                  {/* Master Info & Listing Metadata Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Product Master Specification */}
                    <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#71717A] mb-3 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#8B5CF6]" /> Master Product Profile
                      </h3>
                      <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-[#27272A]">
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Official Product Name:</span>
                          <span className="font-bold text-slate-900 dark:text-[#FAFAFA] text-right">{prod.name}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">SKU / Product Code:</span>
                          <span className="font-mono font-bold text-[#8B5CF6]">{prod.sku}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Category / Hierarchy:</span>
                          <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">{prod.categoryName}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Brand / Line:</span>
                          <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">{prod.brand}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Standard MRP / Retail Rate:</span>
                          <span className="font-extrabold text-slate-900 dark:text-[#FAFAFA]">₹{prod.price.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Contractor / Sale Rate:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {prod.salePrice ? `₹${prod.salePrice.toLocaleString('en-IN')}` : 'Standard MRP Applied'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Commercial Warranty:</span>
                          <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">{prod.warranty}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Product Weight:</span>
                          <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">{prod.weight ? `${prod.weight} kg` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Listing & Creator Provenance */}
                    <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#71717A] mb-3 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Listing Provenance & Governance
                      </h3>
                      <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-[#27272A]">
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Listed By (Creator):</span>
                          <span className="font-bold text-slate-900 dark:text-[#FAFAFA]">{prod.listedByName}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Original Listing Date:</span>
                          <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">{new Date(prod.createdAt).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Last Catalog Update:</span>
                          <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">{new Date(prod.updatedAt).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Catalog Visibility:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{prod.isVisible ? 'Publicly Visible' : 'Hidden / Unlisted'}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Primary Associated Vendor:</span>
                          <span className="font-bold text-slate-900 dark:text-[#FAFAFA]">
                            {dossier.purchases?.[0]?.vendorName || 'Primary Hardware Supplier'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Reorder Level Threshold:</span>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{prod.reorderLevel} Units</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Total Procured Volume:</span>
                          <span className="font-bold text-slate-900 dark:text-[#FAFAFA]">{metrics?.totalPurchasedQty || 0} Units</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Total Fulfilled Orders:</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{metrics?.totalSoldQty || 0} Units</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Branch Stock Allocation Matrix */}
                  <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#71717A] mb-3 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-sky-500" /> Multi-Branch Warehouse Inventory Distribution
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[550px]">
                        <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-[#27272A]">
                          <tr>
                            <th className="py-2.5 px-3">Branch Facility</th>
                            <th className="py-2.5 px-3">Location / City</th>
                            <th className="py-2.5 px-3 text-right">Available Qty</th>
                            <th className="py-2.5 px-3 text-right">Reserved Qty</th>
                            <th className="py-2.5 px-3 text-right">Reorder Threshold</th>
                            <th className="py-2.5 px-3 text-center">Facility Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                          {dossier.branchInventories?.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400">
                                No branch inventory records found.
                              </td>
                            </tr>
                          ) : (
                            dossier.branchInventories.map((b) => {
                              const bStatus = getStockStatus(b.availableQuantity, b.reorderLevel);
                              return (
                                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40">
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#27272A] border">
                                        {b.branchCode}
                                      </span>
                                      <span className="font-bold text-slate-900 dark:text-[#FAFAFA]">{b.branchName}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-[#A1A1AA]">{b.city}, {b.state}</td>
                                  <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                                    {b.availableQuantity.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">{b.reservedQuantity}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">{b.reorderLevel}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${bStatus.badgeClass}`}>
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

              {/* ─── TAB 2: PURCHASES & VENDOR PROCUREMENT HISTORY ───────────── */}
              {activeTab === 'purchases' && (
                <div className="space-y-3">
                  <div className="p-3 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500">
                      Showing <strong className="text-slate-900 dark:text-[#FAFAFA]">{filteredPurchases.length}</strong> purchase transactions
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={filterVendor}
                        onChange={(e) => setFilterVendor(e.target.value)}
                        className="px-2.5 py-1 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-semibold"
                      >
                        <option value="ALL">🏭 All Suppliers</option>
                        {Array.from(new Set(dossier.purchases.map((p) => p.vendorName))).map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>

                      <select
                        value={filterBranch}
                        onChange={(e) => setFilterBranch(e.target.value)}
                        className="px-2.5 py-1 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-semibold"
                      >
                        <option value="ALL">🏢 All Facilities</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>[{b.code}] {b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[750px]">
                        <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-[#27272A]">
                          <tr>
                            <th className="py-3 px-3.5">Purchase Date</th>
                            <th className="py-3 px-3.5">Invoice / PO #</th>
                            <th className="py-3 px-3.5">Vendor / Supplier</th>
                            <th className="py-3 px-3.5">Receiving Branch</th>
                            <th className="py-3 px-3.5 text-right">Qty Received</th>
                            <th className="py-3 px-3.5 text-right">Unit Rate (₹)</th>
                            <th className="py-3 px-3.5 text-right">Total Value (₹)</th>
                            <th className="py-3 px-3.5">Recorded By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                          {filteredPurchases.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400">
                                <Building2 className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                No purchase transactions found matching the filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredPurchases.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                                <td className="py-3 px-3.5 font-semibold text-slate-700 dark:text-[#FAFAFA]">
                                  {new Date(p.purchaseDate).toLocaleDateString('en-IN')}
                                </td>
                                <td className="py-3 px-3.5">
                                  <span className="font-mono font-bold text-[#8B5CF6]">{p.invoiceNumber}</span>
                                </td>
                                <td className="py-3 px-3.5">
                                  <div className="font-bold text-slate-900 dark:text-[#FAFAFA]">{p.vendorName}</div>
                                  {(p.vendorPhone || p.vendorEmail) && (
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {p.vendorPhone || p.vendorEmail}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3.5">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#27272A] border mr-1">
                                    {p.branchCode}
                                  </span>
                                  <span className="font-semibold text-slate-700 dark:text-[#FAFAFA]">{p.branchName}</span>
                                </td>
                                <td className="py-3 px-3.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                                  +{p.quantity.toLocaleString()}
                                </td>
                                <td className="py-3 px-3.5 text-right font-mono text-slate-700 dark:text-[#FAFAFA]">
                                  ₹{p.unitPurchasePrice.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                                  ₹{p.totalPurchaseValue.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-3.5 text-slate-500 text-[11px]">{p.createdByName}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 3: CUSTOMER SALES & ORDERS ─────────────────────────── */}
              {activeTab === 'sales' && (
                <div className="space-y-3">
                  <div className="p-3 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500">
                      Showing <strong className="text-slate-900 dark:text-[#FAFAFA]">{filteredSales.length}</strong> customer order line items
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[850px]">
                        <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-[#27272A]">
                          <tr>
                            <th className="py-3 px-3.5">Order Date</th>
                            <th className="py-3 px-3.5">Order #</th>
                            <th className="py-3 px-3.5">Customer / Company</th>
                            <th className="py-3 px-3.5">Destination</th>
                            <th className="py-3 px-3.5 text-right">Qty</th>
                            <th className="py-3 px-3.5 text-right">Sale Price (₹)</th>
                            <th className="py-3 px-3.5 text-right">Line Total (₹)</th>
                            <th className="py-3 px-3.5 text-center">Status</th>
                            <th className="py-3 px-3.5">Fulfillment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                          {filteredSales.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-12 text-center text-slate-400">
                                <ShoppingBag className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                No customer orders recorded for this product yet.
                              </td>
                            </tr>
                          ) : (
                            filteredSales.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                                <td className="py-3 px-3.5 font-semibold text-slate-700 dark:text-[#FAFAFA]">
                                  {new Date(s.orderDate).toLocaleDateString('en-IN')}
                                </td>
                                <td className="py-3 px-3.5">
                                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.orderNumber}</span>
                                </td>
                                <td className="py-3 px-3.5">
                                  <div className="font-bold text-slate-900 dark:text-[#FAFAFA]">{s.customerName}</div>
                                  {s.companyName && <div className="text-[10px] text-slate-400 font-semibold">{s.companyName}</div>}
                                </td>
                                <td className="py-3 px-3.5 text-slate-600 dark:text-[#A1A1AA]">
                                  {s.city}, {s.state}
                                </td>
                                <td className="py-3 px-3.5 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                                  {s.quantity}
                                </td>
                                <td className="py-3 px-3.5 text-right font-mono text-slate-700 dark:text-[#FAFAFA]">
                                  ₹{s.salePricePerUnit.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                                  ₹{s.totalSaleValue.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-3.5 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    {s.orderStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-3.5">
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

              {/* ─── TAB 4: IMMUTABLE STOCK MOVEMENT LEDGER ─────────────────── */}
              {activeTab === 'movements' && (
                <div className="space-y-3">
                  <div className="p-3 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500">
                      Showing <strong className="text-slate-900 dark:text-[#FAFAFA]">{filteredMovements.length}</strong> stock ledger movements
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={filterTxType}
                        onChange={(e) => setFilterTxType(e.target.value)}
                        className="px-2.5 py-1 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-semibold"
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
                      <table className="w-full text-left text-xs min-w-[750px]">
                        <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-[#27272A]">
                          <tr>
                            <th className="py-3 px-3.5">Timestamp</th>
                            <th className="py-3 px-3.5">Branch Facility</th>
                            <th className="py-3 px-3.5">Movement Type</th>
                            <th className="py-3 px-3.5 text-right">Qty Delta</th>
                            <th className="py-3 px-3.5 text-center">Stock Progression</th>
                            <th className="py-3 px-3.5">Actor / User</th>
                            <th className="py-3 px-3.5">Audit Reason / Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                          {filteredMovements.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-400">
                                <History className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                No stock movements recorded matching filters.
                              </td>
                            </tr>
                          ) : (
                            filteredMovements.map((m) => {
                              const isPos = ['PURCHASE_IN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN'].includes(m.type);
                              return (
                                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                                  <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-[#A1A1AA] text-[11px]">
                                    {new Date(m.createdAt).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-3 px-3.5">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#27272A] border mr-1">
                                      {m.branchCode}
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-[#FAFAFA]">{m.branchName}</span>
                                  </td>
                                  <td className="py-3 px-3.5">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isPos ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    }`}>
                                      {m.type}
                                    </span>
                                  </td>
                                  <td className={`py-3 px-3.5 text-right font-extrabold text-sm ${
                                    isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                  }`}>
                                    {isPos ? `+${m.quantity}` : `-${m.quantity}`}
                                  </td>
                                  <td className="py-3 px-3.5 text-center font-mono font-semibold text-slate-600 dark:text-[#A1A1AA]">
                                    {m.previousQty} → <strong className="text-slate-900 dark:text-[#FAFAFA]">{m.newQty}</strong>
                                  </td>
                                  <td className="py-3 px-3.5 text-slate-600 dark:text-[#A1A1AA] font-medium">{m.performedByName}</td>
                                  <td className="py-3 px-3.5 text-slate-500 dark:text-[#71717A] text-[11px]">{m.notes}</td>
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

              {/* ─── TAB 5: UNIFIED CHRONOLOGICAL AUDIT TIMELINE ────────────── */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  <div className="p-3 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] text-xs text-slate-500 flex items-center justify-between">
                    <span>
                      Complete product lifecycle chronological audit trail (<strong>{filteredTimeline.length}</strong> events recorded)
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-[#27272A]">
                    {filteredTimeline.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <Clock className="w-6 h-6 mx-auto mb-1 text-slate-300" />
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
                            <span className="text-[9px] font-bold">{filteredTimeline.length - idx}</span>
                          </div>

                          {/* Event Card */}
                          <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm hover:border-[#8B5CF6] transition-colors">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase text-white"
                                  style={{ backgroundColor: t.badgeColor }}
                                >
                                  {t.stage.replace(/_/g, ' ')}
                                </span>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-[#FAFAFA]">{t.title}</h4>
                              </div>

                              <span className="text-[11px] font-mono text-slate-400">
                                {new Date(t.timestamp).toLocaleString('en-IN')}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-[#A1A1AA] mt-1.5 leading-relaxed">
                              {t.description}
                            </p>

                            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#27272A] flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                              <div className="flex items-center gap-3">
                                <span>Actor: <strong className="text-slate-700 dark:text-[#FAFAFA]">{t.actor}</strong></span>
                                <span>•</span>
                                <span>Ref: <strong className="font-mono text-slate-700 dark:text-[#FAFAFA]">{t.reference}</strong></span>
                              </div>

                              {t.quantityChange && (
                                <span className={`font-mono font-bold ${
                                  t.quantityChange.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}>
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

              {/* ─── TAB 6: BUYER & CUSTOMER DIRECTORY ─────────────────────── */}
              {activeTab === 'customers' && (
                <div className="space-y-3">
                  <div className="p-3 bg-white dark:bg-[#18181B] rounded-xl border border-slate-200 dark:border-[#27272A] text-xs text-slate-500">
                    <span>
                      Unique buyers & contractor clients who have purchased this SKU (<strong>{filteredCustomers.length}</strong> accounts)
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[750px]">
                        <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-[#27272A]">
                          <tr>
                            <th className="py-3 px-3.5">Customer / Company Name</th>
                            <th className="py-3 px-3.5">Contact Details</th>
                            <th className="py-3 px-3.5">Location</th>
                            <th className="py-3 px-3.5 text-right">Total Units Bought</th>
                            <th className="py-3 px-3.5 text-right">Lifetime SKU Spend (₹)</th>
                            <th className="py-3 px-3.5 text-center">Orders Count</th>
                            <th className="py-3 px-3.5">Last Order Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
                          {filteredCustomers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-400">
                                <Users className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                No client accounts associated with this product yet.
                              </td>
                            </tr>
                          ) : (
                            filteredCustomers.map((c, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                                <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-[#FAFAFA]">
                                  {c.customerName}
                                  {c.companyName && <div className="text-[10px] text-slate-400 font-normal">{c.companyName}</div>}
                                </td>
                                <td className="py-3 px-3.5 text-slate-600 dark:text-[#A1A1AA] font-mono text-[11px]">
                                  {c.email || c.phone || 'N/A'}
                                </td>
                                <td className="py-3 px-3.5 text-slate-600 dark:text-[#A1A1AA]">
                                  {c.city ? `${c.city}, ${c.state}` : 'N/A'}
                                </td>
                                <td className="py-3 px-3.5 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                                  {c.totalUnitsPurchased.toLocaleString()}
                                </td>
                                <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                                  ₹{c.totalSpendOnSku.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-3.5 text-center font-bold text-slate-700 dark:text-[#FAFAFA]">
                                  {c.ordersCount}
                                </td>
                                <td className="py-3 px-3.5 font-semibold text-slate-600 dark:text-[#A1A1AA]">
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
            </>
          ) : null}
        </div>

        {/* ─── MODAL FOOTER ──────────────────────────────────────────────── */}
        <div className="p-3.5 bg-white dark:bg-[#18181B] border-t border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Audit Trail Synchronized with Central PostgreSQL Ledger</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#3F3F46] text-slate-700 dark:text-[#FAFAFA] rounded-xl font-bold transition"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
