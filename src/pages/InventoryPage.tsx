import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Boxes,
  Warehouse,
  ArrowRightLeft,
  ShoppingBag,
  History,
  Building2,
  Plus,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  RefreshCw,
  X,
  Loader2,
  ChevronRight,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Package,
  Layers,
  IndianRupee,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  Send,
  Ban,
  ShieldCheck,
  HelpCircle,
  Home,
  ChevronRight as BreadArrow,
} from 'lucide-react';
import { inventoryApi, fetchAdminApi } from '../api/adminApi';
import type {
  Branch,
  Supplier,
  InventoryItem,
  Purchase,
  StockTransfer,
  StockMovement,
  ProductItem,
} from '../types/admin';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { ProductPicker, SelectedProductSummary } from '../components/common/ProductPicker';
import { getStockStatus } from '../utils/stockStatus';

type TabType = 'stock' | 'purchases' | 'transfers' | 'movements' | 'suppliers' | 'branches';

export const InventoryPage: React.FC = () => {
  const { adminUser } = useAdminAuth();

  // Active view state
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Core Data State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [purchasesList, setPurchasesList] = useState<Purchase[]>([]);
  const [transfersList, setTransfersList] = useState<StockTransfer[]>([]);
  const [movementsList, setMovementsList] = useState<StockMovement[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<ProductItem[]>([]);

  // Pagination & Loading
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  // Filters
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [transferStatusFilter, setTransferStatusFilter] = useState<string>('ALL');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState<boolean>(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [isQuickStockModalOpen, setIsQuickStockModalOpen] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  // Quick Action Target Item
  const [quickActionProduct, setQuickActionProduct] = useState<{ id: string; name: string; sku: string; branchId: string; currentQty: number } | null>(null);

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // ─── Initial Reference Data Loading ──────────────────────────────────────────

  const loadReferenceData = useCallback(async () => {
    try {
      const [branchesRes, suppliersRes, productsRes, categoriesRes] = await Promise.all([
        inventoryApi.getBranches({ limit: 100 }),
        inventoryApi.getSuppliers({ limit: 200 }),
        fetchAdminApi<any>('/products?limit=300'),
        fetchAdminApi<any>('/categories'),
      ]);

      if (branchesRes.success && branchesRes.data) {
        setBranches(branchesRes.data);
      }
      if (suppliersRes.success && suppliersRes.data) {
        setSuppliers(suppliersRes.data);
      }
      if (productsRes && productsRes.data) {
        setProductsCatalog(productsRes.data);
      }
      if (categoriesRes && (categoriesRes.data || categoriesRes.categories || Array.isArray(categoriesRes))) {
        const catList = Array.isArray(categoriesRes.data) ? categoriesRes.data : Array.isArray(categoriesRes.categories) ? categoriesRes.categories : Array.isArray(categoriesRes) ? categoriesRes : [];
        setCategories(catList);
      }
    } catch (err: any) {
      console.warn('[Inventory] Reference loading warning:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // ─── Tab-Specific Data Fetching ─────────────────────────────────────────────

  const fetchTabData = useCallback(async () => {
    setLoading(true);
    try {
      const branchParam = selectedBranchId !== 'ALL' ? selectedBranchId : undefined;

      if (activeTab === 'stock') {
        const res = await inventoryApi.getInventory({
          page,
          limit: 25,
          branchId: branchParam,
          search: debouncedSearch || undefined,
          lowStock: lowStockOnly || undefined,
        });
        if (res.success) {
          const list = Array.isArray(res.data) ? res.data : (res as any).items || [];
          setInventoryList(list);
          setTotalPages((res as any).totalPages || 1);
          setTotalItems((res as any).total || list.length);
        }
      } else if (activeTab === 'purchases') {
        const res = await inventoryApi.getPurchases({
          page,
          limit: 20,
          branchId: branchParam,
          search: debouncedSearch || undefined,
        });
        if (res.success) {
          const list = Array.isArray(res.data) ? res.data : (res as any).items || [];
          setPurchasesList(list);
          setTotalPages((res as any).totalPages || 1);
          setTotalItems((res as any).total || list.length);
        }
      } else if (activeTab === 'transfers') {
        const res = await inventoryApi.getStockTransfers({
          page,
          limit: 20,
          branchId: branchParam,
          status: transferStatusFilter !== 'ALL' ? transferStatusFilter : undefined,
        });
        if (res.success) {
          const list = Array.isArray(res.data) ? res.data : (res as any).items || [];
          setTransfersList(list);
          setTotalPages((res as any).totalPages || 1);
          setTotalItems((res as any).total || list.length);
        }
      } else if (activeTab === 'movements') {
        const res = await inventoryApi.getStockMovements({
          page,
          limit: 30,
          branchId: branchParam,
          type: movementTypeFilter !== 'ALL' ? movementTypeFilter : undefined,
        });
        if (res.success) {
          const list = Array.isArray(res.data) ? res.data : (res as any).items || [];
          setMovementsList(list);
          setTotalPages((res as any).totalPages || 1);
          setTotalItems((res as any).total || list.length);
        }
      } else if (activeTab === 'suppliers') {
        const res = await inventoryApi.getSuppliers({
          search: debouncedSearch || undefined,
        });
        if (res.success) {
          const list = Array.isArray(res.data) ? res.data : (res as any).items || [];
          setSuppliers(list);
          setTotalPages(1);
          setTotalItems(list.length);
        }
      } else if (activeTab === 'branches') {
        const res = await inventoryApi.getBranches({
          search: debouncedSearch || undefined,
        });
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res as any).items || [];
          setBranches(list);
          setTotalPages(1);
          setTotalItems(list.length);
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to fetch inventory records', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedBranchId, page, debouncedSearch, lowStockOnly, transferStatusFilter, movementTypeFilter]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedBranchId, debouncedSearch, lowStockOnly, transferStatusFilter, movementTypeFilter]);

  // ─── Metrics Computation ──────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const totalQty = inventoryList.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const lowStockCount = inventoryList.filter(
      (item) => item.quantity <= (item.reorderLevel || item.product?.reorderLevel || 10)
    ).length;
    const pendingTransfersCount = transfersList.filter(
      (t) => t.status === 'PENDING' || t.status === 'IN_TRANSIT'
    ).length;

    return {
      totalQty,
      lowStockCount,
      pendingTransfersCount,
    };
  }, [inventoryList, transfersList]);

  // Product-Wise Consolidated Total Stock Sum Map
  const productWiseStockMap = useMemo(() => {
    const map = new Map<string, { totalStock: number; totalReserved: number; branchCount: number }>();
    inventoryList.forEach((item) => {
      const pid = item.productId || item.product?.id;
      if (!pid) return;
      const existing = map.get(pid) || { totalStock: 0, totalReserved: 0, branchCount: 0 };
      existing.totalStock += (item.quantity || 0);
      existing.totalReserved += (item.reservedQuantity || 0);
      existing.branchCount += 1;
      map.set(pid, existing);
    });
    return map;
  }, [inventoryList]);

  // ─── Export Handlers ────────────────────────────────────────────────────────

  const handleExportStock = async (format: 'xlsx' | 'pdf') => {
    try {
      setExportLoading(true);
      await inventoryApi.downloadStockReport({
        branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
        lowStock: lowStockOnly || undefined,
        format,
      });
      showToast(
        format === 'xlsx' ? 'Stock matrix exported to Excel (XLSX)' : 'Stock report PDF downloaded',
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Export failed', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPurchases = async () => {
    try {
      setExportLoading(true);
      await inventoryApi.downloadPurchasesReport({
        branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
      });
      showToast('Purchases ledger exported (XLSX)', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Export failed', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportMovements = async () => {
    try {
      setExportLoading(true);
      await inventoryApi.downloadMovementsReport({
        branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
      });
      showToast('Movement ledger exported (XLSX)', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Export failed', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // ─── Transfer Actions Handlers ──────────────────────────────────────────────

  const handleDispatchTransfer = async (transferId: string) => {
    if (!window.confirm('Are you sure you want to dispatch this stock transfer? Stock will be deducted from the origin branch.')) return;
    try {
      setActionLoading(true);
      const res = await inventoryApi.dispatchStockTransfer(transferId);
      if (res.success) {
        showToast('Transfer dispatched successfully (In Transit)', 'success');
        fetchTabData();
      }
    } catch (err: any) {
      showToast(err?.message || 'Dispatch failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiveTransfer = async (transferId: string) => {
    if (!window.confirm('Confirm receipt of transfer? Stock will be added to the destination branch inventory.')) return;
    try {
      setActionLoading(true);
      const res = await inventoryApi.receiveStockTransfer(transferId);
      if (res.success) {
        showToast('Stock transfer received and credited to destination branch', 'success');
        fetchTabData();
      }
    } catch (err: any) {
      showToast(err?.message || 'Receipt confirmation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    const reason = window.prompt('Enter reason for cancelling this transfer:');
    if (reason === null) return;
    try {
      setActionLoading(true);
      const res = await inventoryApi.cancelStockTransfer(transferId, { notes: reason });
      if (res.success) {
        showToast('Transfer cancelled and reserved stock returned to available', 'info');
        fetchTabData();
      }
    } catch (err: any) {
      showToast(err?.message || 'Cancellation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold transition-all animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/25'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-500/25'
              : 'bg-slate-900 dark:bg-[#18181B] text-white border border-slate-700 dark:border-[#27272A]'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {toastMessage.type === 'info' && <HelpCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Command Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
            Inventory & Multi-Branch Stock
          </h3>
          <nav className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-[#71717A]">
            <Home size={11} className="text-slate-400 dark:text-[#52525B]" />
            <BreadArrow size={11} className="text-slate-300 dark:text-[#52525B]" />
            <span className="text-[#8B5CF6] font-semibold">Inventory Management</span>
          </nav>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsQuickStockModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add SKU & Stock</span>
          </button>

          <button
            onClick={() => {
              setEditingBranch(null);
              setIsBranchModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-slate-700 dark:text-[#FAFAFA] hover:text-[#8B5CF6] text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <Warehouse className="w-4 h-4 text-[#8B5CF6]" />
            <span>+ Add Facility</span>
          </button>

          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-slate-700 dark:text-[#FAFAFA] hover:text-[#8B5CF6] text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 text-[#8B5CF6]" />
            <span>+ Record Stock-In</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-slate-700 dark:text-[#FAFAFA] hover:text-[#8B5CF6] text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>⇄ Transfer Stock</span>
          </button>

          <button
            onClick={() => {
              setQuickActionProduct(null);
              setIsAdjustmentModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-slate-700 dark:text-[#FAFAFA] hover:text-[#8B5CF6] text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Adjust Stock</span>
          </button>

          {/* Export Group */}
          <div className="flex items-center bg-slate-100 dark:bg-[#09090B] p-1 rounded-xl border border-slate-200 dark:border-[#27272A]">
            <button
              onClick={() => handleExportStock('xlsx')}
              disabled={exportLoading}
              title="Download Stock Excel (.xlsx)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] hover:text-[#8B5CF6] hover:bg-white dark:hover:bg-[#18181B] rounded-lg transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExportStock('pdf')}
              disabled={exportLoading}
              title="Download Stock PDF"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] hover:text-[#8B5CF6] hover:bg-white dark:hover:bg-[#18181B] rounded-lg transition"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Branch Selector Bar & Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Facility Selector Card */}
        <div className="sm:col-span-2 lg:col-span-4 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 flex items-center justify-center text-[#8B5CF6] border border-[#8B5CF6]/20">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-[#71717A] font-bold block">
                Active Fulfillment Facility
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                {selectedBranchId === 'ALL' ? 'Aggregated Global Network (All Branches)' : branches.find((b) => b.id === selectedBranchId)?.name || 'Branch'}
              </span>
            </div>
          </div>

          {/* Facility Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedBranchId('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedBranchId === 'ALL'
                  ? 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/25 font-bold'
                  : 'bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]'
              }`}
            >
              🌐 All Facilities
            </button>

            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedBranchId === b.id
                    ? 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/25 font-bold'
                    : 'bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedBranchId === b.id ? 'bg-white' : b.isActive ? 'bg-emerald-500' : 'bg-slate-400'} inline-block`}></span>
                <span>{b.name}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded uppercase font-mono ${selectedBranchId === b.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#27272A] text-slate-700 dark:text-[#A1A1AA]'}`}>
                  {b.code}
                </span>
              </button>
            ))}

            <button
              onClick={() => {
                setEditingBranch(null);
                setIsBranchModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#8B5CF6] dark:text-[#A855F7] bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Facility</span>
            </button>
          </div>
        </div>

        {/* KPI 1: Total Units in Stock */}
        <div className="bg-white dark:bg-[#18181B] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
              Total Available Units
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-[#FAFAFA] mt-1">
              {metrics.totalQty.toLocaleString()}
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready for Dispatch</span>
            </span>
          </div>
          <div className="p-3 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Active SKUs */}
        <div className="bg-white dark:bg-[#18181B] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
              Tracked SKUs
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-[#FAFAFA] mt-1">
              {totalItems.toLocaleString()}
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-[#71717A] font-semibold flex items-center gap-1 mt-1">
              <Package className="w-3.5 h-3.5" />
              <span>Catalog Allocations</span>
            </span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Low Stock Alerts */}
        <div className="bg-white dark:bg-[#18181B] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
              Low Stock Alerts
            </p>
            <h3 className={`text-2xl font-extrabold mt-1 ${metrics.lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-[#FAFAFA]'}`}>
              {metrics.lowStockCount}
            </h3>
            <span className={`text-[11px] font-semibold flex items-center gap-1 mt-1 ${metrics.lowStockCount > 0 ? 'text-rose-500' : 'text-slate-400 dark:text-[#71717A]'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>At reorder threshold</span>
            </span>
          </div>
          <div className={`p-3 rounded-xl border ${metrics.lowStockCount > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-slate-100 dark:bg-[#27272A] text-slate-400 border-slate-200 dark:border-[#3F3F46]'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Pending Transfers */}
        <div className="bg-white dark:bg-[#18181B] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
              Active Transfers
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-[#FAFAFA] mt-1">
              {metrics.pendingTransfersCount}
            </h3>
            <span className="text-[11px] text-[#8B5CF6] dark:text-[#A855F7] font-semibold flex items-center gap-1 mt-1">
              <Truck className="w-3.5 h-3.5" />
              <span>In-Transit Shipments</span>
            </span>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-500 border border-sky-500/20 rounded-xl">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 6-Tab Navigation Bar */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl p-2 sm:p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          {[
            { id: 'stock', label: 'Stock Matrix', icon: Boxes, badge: inventoryList.length },
            { id: 'purchases', label: 'Procurement (Stock-In)', icon: ShoppingBag },
            { id: 'transfers', label: 'Inter-Branch Transfers', icon: ArrowRightLeft, pulse: metrics.pendingTransfersCount },
            { id: 'movements', label: 'Stock Ledger Audit', icon: History },
            { id: 'suppliers', label: 'Vendors & Suppliers', icon: Building2, badge: suppliers.length },
            { id: 'branches', label: 'Fulfillment Facilities', icon: Warehouse, badge: branches.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/25 font-bold'
                    : 'bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#27272A] text-slate-700 dark:text-[#A1A1AA]'}`}>
                    {tab.badge}
                  </span>
                )}
                {tab.pulse !== undefined && tab.pulse > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500 text-white font-bold animate-pulse">
                    {tab.pulse}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Controls / Search Bar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#52525B]" />
            <input
              type="text"
              placeholder="Search SKUs / items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-52 pl-9 pr-7 py-1.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 dark:placeholder-[#52525B] focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/20 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => fetchTabData()}
            title="Refresh Data"
            className="p-2 border bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6] rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── TAB 1: STOCK MATRIX ────────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          {/* Sub-toolbar */}
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsQuickStockModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add New SKU & Stock</span>
              </button>

              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-[#A1A1AA] cursor-pointer select-none ml-1">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="rounded border-slate-300 dark:border-[#27272A] text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Show Low Stock Only</span>
                </span>
              </label>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">
              Showing <strong className="text-slate-800 dark:text-[#FAFAFA] font-bold">{inventoryList.length}</strong> items of{' '}
              <strong className="text-slate-800 dark:text-[#FAFAFA] font-bold">{totalItems}</strong>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Product Details</th>
                  <th className="py-3.5 px-4">Branch Facility</th>
                  <th className="py-3.5 px-4 text-right">Facility Qty</th>
                  <th className="py-3.5 px-4 text-center">Total Product Stock Sum</th>
                  <th className="py-3.5 px-4 text-right">Reserved Qty</th>
                  <th className="py-3.5 px-4 text-right">Reorder Level</th>
                  <th className="py-3.5 px-4 text-center">Stock Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B5CF6]" />
                      <span className="text-xs font-medium">Loading branch inventories...</span>
                    </td>
                  </tr>
                ) : inventoryList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-[#71717A]">
                      <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#52525B]" />
                      <p className="font-semibold text-slate-600 dark:text-[#A1A1AA] text-xs">No inventory records found</p>
                      <p className="text-[11px] text-slate-400 mt-1">Try clearing filters or recording stock-in purchases.</p>
                    </td>
                  </tr>
                ) : (
                  inventoryList.map((item) => {
                    const availableQty = Math.max(0, (item.quantity || 0) - (item.reservedQuantity || 0));
                    const stockInfo = getStockStatus(availableQty, item.reorderLevel || item.product?.reorderLevel);
                    const productTotalSum = productWiseStockMap.get(item.productId || item.product?.id)?.totalStock ?? item.product?.stock ?? item.quantity;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors group">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {item.product?.thumbnail ? (
                              <img
                                src={item.product.thumbnail}
                                alt={item.product.name}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-[#27272A] flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-slate-900 dark:text-[#FAFAFA] line-clamp-1 block hover:text-[#8B5CF6]">
                                {item.product?.name || 'Unnamed Product'}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-[#71717A] font-mono">
                                <span>SKU: {item.product?.sku || 'N/A'}</span>
                                {item.product?.category && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-600 dark:text-[#A1A1AA] font-sans">{item.product.category.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] border border-slate-200 dark:border-[#3F3F46]">
                              {item.branch?.code || 'DEL'}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-[#FAFAFA]">{item.branch?.name || 'Delhi HQ'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`text-sm font-extrabold ${
                              stockInfo.isOutOfStock ? 'text-rose-600 dark:text-rose-400' : stockInfo.isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-[#FAFAFA]'
                            }`}
                          >
                            {item.quantity.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-extrabold bg-[#8B5CF6]/10 text-[#8B5CF6] dark:text-[#A855F7] border border-[#8B5CF6]/20">
                              {productTotalSum.toLocaleString()} Units
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-[#71717A] mt-0.5 font-medium">
                              All Facilities Sum
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="text-xs text-slate-500 dark:text-[#71717A] font-semibold font-mono">
                            {item.reservedQuantity || 0}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="text-xs text-slate-600 dark:text-[#A1A1AA] font-mono font-semibold">{item.reorderLevel || 10}</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stockInfo.badgeClass}`}>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                stockInfo.isOutOfStock ? 'bg-rose-500' : stockInfo.isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            ></span>
                            {stockInfo.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setQuickActionProduct({
                                id: item.productId,
                                name: item.product?.name || 'Product',
                                sku: item.product?.sku || 'SKU',
                                branchId: item.branchId,
                                currentQty: item.quantity,
                              });
                              setIsAdjustmentModalOpen(true);
                            }}
                            title="Quick Adjust Stock"
                            className="px-2.5 py-1 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6] text-[#8B5CF6] hover:text-white rounded-lg text-[11px] font-bold transition-all"
                          >
                            ⚡ Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-[#09090B] border-t border-slate-200 dark:border-[#27272A] flex items-center justify-between text-xs text-slate-500 dark:text-[#71717A]">
            <span>
              Page <strong className="text-slate-700 dark:text-[#FAFAFA] font-bold">{page}</strong> of <strong className="text-slate-700 dark:text-[#FAFAFA] font-bold">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] text-slate-700 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] rounded-lg font-semibold disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] text-slate-700 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] rounded-lg font-semibold disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: PURCHASES (STOCK-IN) ────────────────────────────────────── */}
      {activeTab === 'purchases' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record New Purchase</span>
              </button>
              <button
                onClick={handleExportPurchases}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Export Purchases (Excel)</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">
              Total Purchases: <strong className="text-slate-800 dark:text-[#FAFAFA] font-bold">{purchasesList.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Purchase Date</th>
                  <th className="py-3.5 px-4">Invoice / Ref #</th>
                  <th className="py-3.5 px-4">Vendor / Supplier</th>
                  <th className="py-3.5 px-4">Receiving Branch</th>
                  <th className="py-3.5 px-4 text-center">Items Count</th>
                  <th className="py-3.5 px-4 text-right">Total Amount (₹)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B5CF6]" />
                      <span className="text-xs font-medium">Loading purchase history...</span>
                    </td>
                  </tr>
                ) : purchasesList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-[#71717A]">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#52525B]" />
                      <p className="font-semibold text-slate-600 dark:text-[#A1A1AA] text-xs">No purchases recorded yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">Click "+ Record New Purchase" to track your first stock-in.</p>
                    </td>
                  </tr>
                ) : (
                  purchasesList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-[#A1A1AA]">
                        {new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                        {p.invoiceNumber || <span className="text-slate-400 italic">No Invoice #</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-[#FAFAFA]">{p.supplier?.name || 'Unknown Vendor'}</div>
                        {p.supplier?.phone && (
                          <div className="text-[10px] text-slate-500 dark:text-[#71717A] font-mono">{p.supplier.phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] border border-slate-200 dark:border-[#3F3F46]">
                          {p.branch?.code || 'DEL'}
                        </span>
                        <span className="ml-2 font-semibold text-slate-700 dark:text-[#FAFAFA]">{p.branch?.name || 'Delhi HQ'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-[#FAFAFA]">
                        {p.items?.length || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                        ₹{Number(p.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedPurchase(p)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white text-slate-700 dark:text-[#FAFAFA] rounded-lg text-[11px] font-semibold transition-all"
                        >
                          View Breakdown
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-slate-50 dark:bg-[#09090B] border-t border-slate-200 dark:border-[#27272A] flex items-center justify-between text-xs text-slate-500 dark:text-[#71717A]">
            <span>
              Page <strong className="text-slate-700 dark:text-[#FAFAFA] font-bold">{page}</strong> of <strong className="text-slate-700 dark:text-[#FAFAFA] font-bold">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] text-slate-700 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] rounded-lg font-semibold disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] text-slate-700 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] rounded-lg font-semibold disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: TRANSFERS ────────────────────────────────────────────────── */}
      {activeTab === 'transfers' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Transfer Request</span>
              </button>

              <select
                value={transferStatusFilter}
                onChange={(e) => setTransferStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-700 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending (Reserved)</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">
              Total Transfers: <strong className="text-slate-800 dark:text-[#FAFAFA] font-bold">{transfersList.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4">From Origin</th>
                  <th className="py-3.5 px-4">To Destination</th>
                  <th className="py-3.5 px-4 text-center">Items / Qty</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B5CF6]" />
                      <span className="text-xs font-medium">Loading transfers...</span>
                    </td>
                  </tr>
                ) : transfersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-[#71717A]">
                      <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#52525B]" />
                      <p className="font-semibold text-slate-600 dark:text-[#A1A1AA] text-xs">No stock transfers found</p>
                      <p className="text-[11px] text-slate-400 mt-1">Initiate a transfer between Delhi HQ and Kolkata.</p>
                    </td>
                  </tr>
                ) : (
                  transfersList.map((t) => {
                    const totalQty = t.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-[#A1A1AA]">
                          {new Date(t.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-[#FAFAFA]">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] border border-slate-200 dark:border-[#3F3F46] mr-1.5">
                            {t.fromBranch?.code}
                          </span>
                          {t.fromBranch?.name}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-[#FAFAFA]">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/20 mr-1.5">
                            {t.toBranch?.code}
                          </span>
                          {t.toBranch?.name}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                          {t.items?.length || 0} SKUs ({totalQty} units)
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {t.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                              <Clock className="w-3 h-3" />
                              PENDING
                            </span>
                          )}
                          {t.status === 'IN_TRANSIT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 animate-pulse">
                              <Truck className="w-3 h-3" />
                              IN TRANSIT
                            </span>
                          )}
                          {t.status === 'RECEIVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              RECEIVED
                            </span>
                          )}
                          {t.status === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                              <Ban className="w-3 h-3" />
                              CANCELLED
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-[#A1A1AA] line-clamp-1 max-w-xs">{t.notes || '—'}</td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleDispatchTransfer(t.id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold transition"
                                >
                                  🚀 Dispatch
                                </button>
                                <button
                                  onClick={() => handleCancelTransfer(t.id)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-semibold transition"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {t.status === 'IN_TRANSIT' && (
                              <button
                                onClick={() => handleReceiveTransfer(t.id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark Received</span>
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedTransfer(t)}
                              className="px-2 py-1 bg-slate-100 dark:bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white text-slate-700 dark:text-[#FAFAFA] rounded-lg text-[11px] font-medium transition-all"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: MOVEMENT AUDIT LEDGER ────────────────────────────────────── */}
      {activeTab === 'movements' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-700 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL">All Movement Types</option>
                <option value="PURCHASE_IN">PURCHASE_IN (Stock-In)</option>
                <option value="TRANSFER_IN">TRANSFER_IN (Transfer Credit)</option>
                <option value="TRANSFER_OUT">TRANSFER_OUT (Transfer Debit)</option>
                <option value="SALE_OUT">SALE_OUT (Order Purchase)</option>
                <option value="ADJUSTMENT_IN">ADJUSTMENT_IN</option>
                <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT</option>
                <option value="DAMAGE">DAMAGE (Write-off)</option>
                <option value="RETURN_IN">RETURN_IN</option>
              </select>

              <button
                onClick={handleExportMovements}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Export Ledger (Excel)</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">
              Transactions: <strong className="text-slate-800 dark:text-[#FAFAFA] font-bold">{movementsList.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Product Details</th>
                  <th className="py-3.5 px-4">Facility</th>
                  <th className="py-3.5 px-4">Transaction Type</th>
                  <th className="py-3.5 px-4 text-right">Qty Changed</th>
                  <th className="py-3.5 px-4 text-center">Stock Audit</th>
                  <th className="py-3.5 px-4">Notes / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B5CF6]" />
                      <span className="text-xs font-medium">Loading immutable ledger entries...</span>
                    </td>
                  </tr>
                ) : movementsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-[#71717A]">
                      <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#52525B]" />
                      <p className="font-semibold text-slate-600 dark:text-[#A1A1AA] text-xs">No stock movements recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  movementsList.map((m) => {
                    const isPositive = ['PURCHASE_IN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN'].includes(m.type);

                    return (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-[#A1A1AA] whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-[#FAFAFA]">{m.product?.name || 'Product'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-[#71717A] font-mono">SKU: {m.product?.sku}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] border border-slate-200 dark:border-[#3F3F46] mr-1.5">
                            {m.branch?.code || 'DEL'}
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-[#FAFAFA]">{m.branch?.name}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              m.type === 'PURCHASE_IN'
                                ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : m.type.startsWith('TRANSFER')
                                ? 'bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20'
                                : m.type === 'SALE_OUT'
                                ? 'bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/20 text-[#8B5CF6] dark:text-[#A855F7] border border-[#8B5CF6]/20'
                                : m.type === 'DAMAGE'
                                ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                                : 'bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA] border border-slate-200 dark:border-[#3F3F46]'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-extrabold">
                          <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-[#A1A1AA] font-medium">
                          {m.previousQty} → <strong className="text-slate-900 dark:text-[#FAFAFA] font-bold">{m.newQty}</strong>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-[#A1A1AA] max-w-sm line-clamp-1">
                          {m.notes || m.referenceType || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: VENDORS & SUPPLIERS ──────────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Vendor / Supplier</span>
            </button>
            <div className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">
              Registered Vendors: <strong className="text-slate-800 dark:text-[#FAFAFA] font-bold">{suppliers.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 sm:p-5">
            {suppliers.map((s) => (
              <div key={s.id} className="p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm line-clamp-1">{s.name}</h4>
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      ACTIVE
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-[#A1A1AA]">
                    {s.contactPerson && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium">Contact:</span>
                        <span className="text-slate-800 dark:text-[#FAFAFA] font-semibold">{s.contactPerson}</span>
                      </div>
                    )}
                    {s.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{s.phone}</span>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{s.email}</span>
                      </div>
                    )}
                    {s.gstNumber && (
                      <div className="flex items-center gap-2 font-mono text-[10px] text-[#8B5CF6] dark:text-[#A855F7] bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 px-2 py-1 rounded-lg">
                        <span>GSTIN: {s.gstNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#27272A] flex items-center justify-between text-xs text-slate-500 dark:text-[#71717A]">
                  <span>Purchases: {s._count?.purchases || 0}</span>
                  <button
                    onClick={() => {
                      setIsPurchaseModalOpen(true);
                    }}
                    className="text-[#8B5CF6] hover:text-[#7C3AED] font-bold"
                  >
                    + Record Purchase
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 6: FULFILLMENT FACILITIES & BRANCHES ────────────────────────── */}
      {activeTab === 'branches' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
            <button
              onClick={() => {
                setEditingBranch(null);
                setIsBranchModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Register New Facility / Branch</span>
            </button>
            <div className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">
              Active Fulfillment Facilities: <strong className="text-slate-800 dark:text-[#FAFAFA] font-bold">{branches.filter((b) => b.isActive).length} / {branches.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-5">
            {branches.map((b) => (
              <div
                key={b.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center font-mono font-bold text-xs">
                        {b.code}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm leading-snug">{b.name}</h4>
                        <span className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">
                          {b.city ? `${b.city}${b.state ? `, ${b.state}` : ''}` : 'Location Unassigned'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${
                        b.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-[#A1A1AA]">
                    {b.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{b.address}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] mt-2">
                      <span className="text-[11px] text-slate-500 dark:text-[#71717A] font-medium">Tracked Product SKUs</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">{b._count?.inventories ?? 'Live'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-[#27272A] flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setSelectedBranchId(b.id);
                      setActiveTab('stock');
                    }}
                    className="text-[#8B5CF6] hover:text-[#7C3AED] font-bold flex items-center gap-1"
                  >
                    <span>View Stock Matrix</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingBranch(b);
                      setIsBranchModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#27272A] text-slate-700 dark:text-[#A1A1AA] hover:border-[#8B5CF6] hover:text-[#8B5CF6] font-semibold text-[11px] transition"
                  >
                    Edit Facility
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: RECORD PURCHASE (STOCK-IN) ─────────────────────────────── */}
      {isPurchaseModalOpen && (
        <PurchaseModal
          branches={branches}
          suppliers={suppliers}
          products={productsCatalog}
          onClose={() => setIsPurchaseModalOpen(false)}
          onSuccess={() => {
            setIsPurchaseModalOpen(false);
            showToast('Stock-In purchase recorded successfully', 'success');
            fetchTabData();
            loadReferenceData();
          }}
        />
      )}

      {/* ─── MODAL 2: INTER-BRANCH TRANSFER ─────────────────────────────────── */}
      {isTransferModalOpen && (
        <TransferModal
          branches={branches}
          products={productsCatalog}
          onClose={() => setIsTransferModalOpen(false)}
          onSuccess={() => {
            setIsTransferModalOpen(false);
            showToast('Transfer request initiated in PENDING status', 'success');
            fetchTabData();
          }}
        />
      )}

      {/* ─── MODAL 3: STOCK ADJUSTMENT ──────────────────────────────────────── */}
      {isAdjustmentModalOpen && (
        <AdjustmentModal
          branches={branches}
          products={productsCatalog}
          targetProduct={quickActionProduct}
          onClose={() => {
            setIsAdjustmentModalOpen(false);
            setQuickActionProduct(null);
          }}
          onSuccess={() => {
            setIsAdjustmentModalOpen(false);
            setQuickActionProduct(null);
            showToast('Stock adjusted and recorded in immutable ledger', 'success');
            fetchTabData();
          }}
        />
      )}

      {/* ─── MODAL 4: ADD VENDOR / SUPPLIER ──────────────────────────────────── */}
      {isSupplierModalOpen && (
        <SupplierModal
          onClose={() => setIsSupplierModalOpen(false)}
          onSuccess={() => {
            setIsSupplierModalOpen(false);
            showToast('Supplier registered successfully', 'success');
            loadReferenceData();
            fetchTabData();
          }}
        />
      )}

      {/* ─── MODAL 5: CREATE / EDIT BRANCH FACILITY ──────────────────────────── */}
      {isBranchModalOpen && (
        <BranchModal
          branch={editingBranch}
          onClose={() => {
            setIsBranchModalOpen(false);
            setEditingBranch(null);
          }}
          onSuccess={() => {
            setIsBranchModalOpen(false);
            setEditingBranch(null);
            showToast(editingBranch ? 'Branch facility updated successfully' : 'New branch facility registered successfully', 'success');
            loadReferenceData();
            fetchTabData();
          }}
        />
      )}

      {/* ─── MODAL 6: QUICK ADD SKU & INITIAL STOCK ─────────────────────────── */}
      {isQuickStockModalOpen && (
        <QuickStockModal
          branches={branches}
          categories={categories}
          onClose={() => setIsQuickStockModalOpen(false)}
          onSuccess={() => {
            setIsQuickStockModalOpen(false);
            showToast('New SKU registered and warehouse stock initialized', 'success');
            loadReferenceData();
            fetchTabData();
          }}
        />
      )}

      {/* ─── DRAWER: PURCHASE BREAKDOWN ──────────────────────────────────────── */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-[#FAFAFA]">Purchase Order Breakdown</h3>
                <p className="text-xs text-slate-500 dark:text-[#71717A] mt-0.5">
                  Invoice #{selectedPurchase.invoiceNumber || 'N/A'} • {selectedPurchase.supplier?.name}
                </p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-[#09090B] p-3.5 rounded-xl border border-slate-200 dark:border-[#27272A]">
                <div>
                  <span className="text-slate-400 dark:text-[#71717A] block text-[10px] uppercase font-bold">Receiving Facility</span>
                  <span className="font-bold text-slate-900 dark:text-[#FAFAFA] mt-0.5 block">{selectedPurchase.branch?.name} ({selectedPurchase.branch?.code})</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-[#71717A] block text-[10px] uppercase font-bold">Purchase Date</span>
                  <span className="font-bold text-slate-900 dark:text-[#FAFAFA] font-mono mt-0.5 block">
                    {new Date(selectedPurchase.purchaseDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>

              <table className="w-full text-xs text-left min-w-[500px]">
                <thead className="border-b border-slate-200 dark:border-[#27272A] text-slate-500 dark:text-[#71717A] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5">Item / SKU</th>
                    <th className="py-2.5 text-right">Quantity</th>
                    <th className="py-2.5 text-right">Unit Price</th>
                    <th className="py-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                  {selectedPurchase.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5">
                        <div className="font-bold text-slate-900 dark:text-[#FAFAFA]">{item.product?.name}</div>
                        <div className="text-[10px] text-[#8B5CF6] dark:text-[#A855F7] font-mono">{item.product?.sku}</div>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold">{item.quantity}</td>
                      <td className="py-2.5 text-right font-mono">₹{Number(item.unitPurchasePrice).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                        ₹{Number(item.totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3.5 bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA]">Grand Total Procurement Amount:</span>
                <span className="text-base font-extrabold text-[#8B5CF6] dark:text-[#A855F7] font-mono">
                  ₹{Number(selectedPurchase.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-[#27272A] bg-slate-50/50 dark:bg-[#09090B]/50 flex justify-end">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-bold hover:border-[#8B5CF6]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MODAL COMPONENT 1: PURCHASE (STOCK-IN) ──────────────────────────────────

interface PurchaseModalProps {
  branches: Branch[];
  suppliers: Supplier[];
  products: ProductItem[];
  onClose: () => void;
  onSuccess: () => void;
}

interface PurchaseItemRowState {
  mode: 'catalog' | 'custom';
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPurchasePrice: number;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ branches, suppliers, products, onClose, onSuccess }) => {
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || '');
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  const [items, setItems] = useState<PurchaseItemRowState[]>([
    {
      mode: 'catalog',
      productId: String(products[0]?.id || ''),
      sku: '',
      name: '',
      quantity: 10,
      unitPurchasePrice: Number(products[0]?.price || 0),
    },
  ]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addItemRow = (mode: 'catalog' | 'custom' = 'catalog') => {
    setItems((prev) => [
      ...prev,
      {
        mode,
        productId: mode === 'catalog' ? String(products[0]?.id || '') : '',
        sku: '',
        name: '',
        quantity: 1,
        unitPurchasePrice: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        return { ...it, [field]: value };
      })
    );
  };

  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPurchasePrice) || 0), 0);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !supplierId) {
      setError('Please select branch and supplier');
      return;
    }
    if (items.length === 0) {
      setError('At least one item is required');
      return;
    }

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      if (it.mode === 'catalog' && !it.productId) {
        setError(`Row #${idx + 1}: Please select a product from catalog or switch to New SKU mode.`);
        return;
      }
      if (it.mode === 'custom' && (!it.sku.trim() || !it.name.trim())) {
        setError(`Row #${idx + 1}: SKU and Product Name are required for new incoming stock.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await inventoryApi.createPurchase({
        branchId,
        supplierId,
        invoiceNumber: invoiceNumber || undefined,
        purchaseDate,
        notes: notes || undefined,
        items: items.map((i) => ({
          ...(i.mode === 'catalog' && i.productId
            ? { productId: i.productId }
            : { sku: i.sku.trim().toUpperCase(), name: i.name.trim() }),
          quantity: Number(i.quantity),
          unitPurchasePrice: Number(i.unitPurchasePrice),
        })),
      });

      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to record purchase stock-in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
              Record Purchase & Stock-In ("Kahan Se Kharida")
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Destination Facility *</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Vendor / Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.gstNumber ? `(GST: ${s.gstNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Vendor Invoice / Reference #</label>
              <input
                type="text"
                placeholder="e.g. INV-2026-9812"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#27272A]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA] uppercase tracking-wider">Purchase Line Items</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addItemRow('catalog')}
                  className="text-xs text-[#8B5CF6] hover:text-[#7C3AED] font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-[#8B5CF6]/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Catalog Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => addItemRow('custom')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New SKU / Item</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-[#09090B] p-3 rounded-xl border border-slate-200 dark:border-[#27272A] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/50 dark:border-[#27272A]">
                    <div className="flex items-center gap-1 text-[11px] font-semibold">
                      <span className="text-slate-400 font-mono">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => updateItem(idx, 'mode', item.mode === 'catalog' ? 'custom' : 'catalog')}
                        className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                          item.mode === 'catalog'
                            ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30'
                            : 'bg-indigo-500/15 text-indigo-500 border border-indigo-500/30'
                        }`}
                      >
                        {item.mode === 'catalog' ? '🔍 Existing Catalog Product' : '✨ New SKU Registration'}
                      </button>
                      <span className="text-[10px] text-slate-400 ml-1">
                        (click pill to switch)
                      </span>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {item.mode === 'catalog' ? (
                    <div>
                      <ProductPicker
                        value={item.productId}
                        onChange={(p) => {
                          updateItem(idx, 'productId', p.id);
                          if (p.price && (!item.unitPurchasePrice || item.unitPurchasePrice === 0)) {
                            updateItem(idx, 'unitPurchasePrice', p.price);
                          }
                        }}
                        showBranchMetrics={false}
                        placeholder="Search product to restock..."
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Product Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Heavy Duty Brass Bolt 12mm"
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs text-slate-800 dark:text-[#FAFAFA] font-medium focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">SKU *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. HEX-12-SS"
                          value={item.sku}
                          onChange={(e) => updateItem(idx, 'sku', e.target.value.toUpperCase())}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-mono uppercase font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1 border-t border-slate-200/60 dark:border-[#27272A]">
                    <div className="w-32">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-mono text-right font-bold text-slate-800 dark:text-[#FAFAFA]"
                      />
                    </div>

                    <div className="w-40">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Unit Cost (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit Price ₹"
                        value={item.unitPurchasePrice}
                        onChange={(e) => updateItem(idx, 'unitPurchasePrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-mono text-right font-bold text-slate-800 dark:text-[#FAFAFA]"
                      />
                    </div>

                    <div className="flex-1 text-right">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Line Total</span>
                      <span className="font-mono font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                        ₹{((item.quantity || 0) * (item.unitPurchasePrice || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 p-3.5 bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA]">Total Purchase Amount:</span>
              <span className="text-base font-extrabold text-[#8B5CF6] dark:text-[#A855F7] font-mono">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Procurement Notes / Batch Details</label>
            <textarea
              rows={2}
              placeholder="e.g. Received via logistics depot, physical count verified"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-md shadow-[#8B5CF6]/25 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Recording Stock-In...' : 'Confirm & Stock-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── MODAL COMPONENT 2: INTER-BRANCH TRANSFER ─────────────────────────────────

interface TransferModalProps {
  branches: Branch[];
  products: ProductItem[];
  onClose: () => void;
  onSuccess: () => void;
}

interface TransferItemState {
  productId: string;
  quantity: number;
  availableAtSource?: number;
  name?: string;
  sku?: string;
}

const TransferModal: React.FC<TransferModalProps> = ({ branches, products, onClose, onSuccess }) => {
  const [fromBranchId, setFromBranchId] = useState<string>(branches[0]?.id || '');
  const [toBranchId, setToBranchId] = useState<string>(branches[1]?.id || branches[0]?.id || '');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<TransferItemState[]>([
    { productId: String(products[0]?.id || ''), quantity: 5 },
  ]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addItemRow = () => {
    setItems((prev) => [...prev, { productId: String(products[0]?.id || ''), quantity: 1 }]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromBranchId === toBranchId) {
      setError('Origin and Destination facility cannot be the same branch');
      return;
    }

    for (const item of items) {
      if (item.availableAtSource !== undefined && item.quantity > item.availableAtSource) {
        setError(
          `Cannot transfer ${item.quantity} units of "${item.name || item.sku || 'Product'}". Only ${item.availableAtSource} units available at source branch.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await inventoryApi.createStockTransfer({
        fromBranchId,
        toBranchId,
        notes: notes || undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      });
      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Transfer request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
              Initiate Inter-Branch Transfer
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Source (From) Facility *</label>
              <select
                value={fromBranchId}
                onChange={(e) => setFromBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Destination (To) Facility *</label>
              <select
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 dark:text-[#FAFAFA] uppercase tracking-wider">Transfer Items</label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs text-[#8B5CF6] hover:text-[#7C3AED] font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add SKU</span>
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-[#09090B] p-3 rounded-xl border border-slate-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <ProductPicker
                      branchId={fromBranchId}
                      value={item.productId}
                      onChange={(p) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? {
                                  ...it,
                                  productId: p.id,
                                  availableAtSource: p.branchAvailable,
                                  name: p.name,
                                  sku: p.sku,
                                }
                              : it
                          )
                        )
                      }
                      placeholder="Search SKU to transfer..."
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded mt-1 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-[#27272A]">
                  <div className="w-44">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Transfer Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, quantity: Math.max(1, parseInt(e.target.value) || 1) } : it
                          )
                        )
                      }
                      className={`w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border rounded-lg text-xs font-mono text-right font-bold ${
                        item.availableAtSource !== undefined && item.quantity > item.availableAtSource
                          ? 'border-rose-500 text-rose-600 bg-rose-50/50'
                          : 'border-slate-200 dark:border-[#27272A] text-slate-800 dark:text-[#FAFAFA]'
                      }`}
                    />
                  </div>

                  {item.availableAtSource !== undefined && item.quantity > item.availableAtSource && (
                    <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Exceeds source stock ({item.availableAtSource} available)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Transfer Reason / Purpose</label>
            <textarea
              rows={2}
              placeholder="e.g. Replenishing Kolkata depot for East region demand surge"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-md shadow-[#8B5CF6]/25 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Requesting...' : 'Request Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── MODAL COMPONENT 3: STOCK ADJUSTMENT ─────────────────────────────────────

interface AdjustmentModalProps {
  branches: Branch[];
  products: ProductItem[];
  targetProduct: { id: string; name: string; sku: string; branchId: string; currentQty: number } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const AdjustmentModal: React.FC<AdjustmentModalProps> = ({ branches, products, targetProduct, onClose, onSuccess }) => {
  const [branchId, setBranchId] = useState<string>(targetProduct?.branchId || branches[0]?.id || '');
  const [productId, setProductId] = useState<string>(targetProduct?.id || String(products[0]?.id || ''));
  const [type, setType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'RETURN_IN'>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 3) {
      setError('A valid explanatory reason is required for all stock adjustments');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await inventoryApi.adjustStock({
        branchId,
        productId,
        type,
        quantity: Number(quantity),
        reason,
      });

      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Stock adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
              Adjust Stock & Log Ledger
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Branch Facility *</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <ProductPicker
              branchId={branchId}
              value={productId}
              onChange={(p) => setProductId(p.id)}
              label="Product SKU"
              required
              placeholder="Search product SKU to adjust..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Adjustment Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ADJUSTMENT_IN">ADJUSTMENT_IN (+)</option>
                <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT (-)</option>
                <option value="DAMAGE">DAMAGE (Write-off) (-)</option>
                <option value="RETURN_IN">RETURN_IN (+)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Units *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">
              Mandatory Reason / Audit Justification *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Physical inventory cycle count reconciliation variance"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-md shadow-[#8B5CF6]/25 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Applying...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── MODAL COMPONENT 4: SUPPLIER ─────────────────────────────────────────────

interface SupplierModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const SupplierModal: React.FC<SupplierModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [gstNumber, setGstNumber] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Supplier name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await inventoryApi.createSupplier({
        name,
        contactPerson: contactPerson || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        gstNumber: gstNumber || undefined,
      });

      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create supplier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
              Register New Supplier / Vendor
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Company / Vendor Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Hardware & Fasteners Pvt Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="e.g. Rajesh Sharma"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Email Address</label>
              <input
                type="email"
                placeholder="vendor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">GSTIN Number</label>
              <input
                type="text"
                placeholder="e.g. 07AAAAA0000A1Z5"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono uppercase text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Registered Address / Depot</label>
            <textarea
              rows={2}
              placeholder="e.g. Plot 44, Naraina Industrial Area Phase 1, New Delhi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-md shadow-[#8B5CF6]/25 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Registering...' : 'Register Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── MODAL COMPONENT 5: BRANCH / FACILITY ────────────────────────────────────

interface BranchModalProps {
  branch: Branch | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BranchModal: React.FC<BranchModalProps> = ({ branch, onClose, onSuccess }) => {
  const isEditing = !!branch;
  const [name, setName] = useState<string>(branch?.name || '');
  const [code, setCode] = useState<string>(branch?.code || '');
  const [city, setCity] = useState<string>(branch?.city || '');
  const [state, setState] = useState<string>(branch?.state || '');
  const [address, setAddress] = useState<string>(branch?.address || '');
  const [isActive, setIsActive] = useState<boolean>(branch ? branch.isActive : true);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Facility name and code are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      if (isEditing && branch) {
        const res = await inventoryApi.updateBranch(branch.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          address: address.trim() || undefined,
          isActive,
        });
        if (res.success) {
          onSuccess();
        }
      } else {
        const res = await inventoryApi.createBranch({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          address: address.trim() || undefined,
          isActive,
        });
        if (res.success) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save branch facility');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
              {isEditing ? 'Edit Fulfillment Facility' : 'Register New Branch Facility'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Facility Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mumbai Central Depot"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Code (2-6 chars) *</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. MUM"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono uppercase font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">City</label>
              <input
                type="text"
                placeholder="e.g. Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">State</label>
              <input
                type="text"
                placeholder="e.g. Maharashtra"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Full Physical Address / Depot Location</label>
            <textarea
              rows={2}
              placeholder="e.g. Plot 14, MIDC Industrial Area, Andheri East, Mumbai - 400093"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA] block">Active Status</span>
              <span className="text-[11px] text-slate-500 dark:text-[#71717A]">Enable this branch to accept inventory & fulfill customer orders</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#27272A] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8B5CF6]"></div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-md shadow-[#8B5CF6]/25 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Facility'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── MODAL COMPONENT 6: QUICK STOCK (ADD SKU & STOCK DIRECTLY) ──────────────

interface QuickStockModalProps {
  branches: Branch[];
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const QuickStockModal: React.FC<QuickStockModalProps> = ({ branches, categories, onClose, onSuccess }) => {
  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('PRC_STOCK');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [categoryId, setCategoryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [existingProductInfo, setExistingProductInfo] = useState<{ id: string; name: string; stock: number; price?: number; reorderLevel?: number } | null>(null);
  const [checkingSku, setCheckingSku] = useState<boolean>(false);
  const skuCheckTimeoutRef = useRef<any>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSkuChange = (val: string) => {
    const formattedSku = val.toUpperCase();
    setSku(formattedSku);

    if (skuCheckTimeoutRef.current) {
      clearTimeout(skuCheckTimeoutRef.current);
    }

    if (!formattedSku.trim() || formattedSku.trim().length < 2) {
      setExistingProductInfo(null);
      return;
    }

    skuCheckTimeoutRef.current = setTimeout(async () => {
      try {
        setCheckingSku(true);
        const res = await fetchAdminApi<any>(`/products?search=${encodeURIComponent(formattedSku.trim())}&limit=5`);
        if (res?.success !== false) {
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.products) ? res.products : Array.isArray(res) ? res : [];
          const matched = list.find((p: any) => p.sku?.toUpperCase() === formattedSku.trim());
          if (matched) {
            setExistingProductInfo({
              id: matched.id,
              name: matched.name,
              stock: Number(matched.stock) || 0,
              price: matched.price,
              reorderLevel: matched.reorderLevel,
            });
            if (!name) setName(matched.name);
            if (!sellingPrice && matched.price) setSellingPrice(String(matched.price));
            if (matched.reorderLevel) setReorderLevel(matched.reorderLevel);
            if (matched.categoryId) setCategoryId(String(matched.categoryId));
          } else {
            setExistingProductInfo(null);
          }
        }
      } catch (err) {
        console.warn('SKU check warning:', err);
      } finally {
        setCheckingSku(false);
      }
    }, 280);
  };

  const totalProductStockSum = (existingProductInfo?.stock || 0) + (Number(quantity) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      setError('SKU and Product Name are required');
      return;
    }
    if (!branchId) {
      setError('Please select a destination facility (e.g. PRC STOCK)');
      return;
    }
    if (!quantity || quantity < 1) {
      setError('Initial stock quantity must be at least 1');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await inventoryApi.quickStock({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        branchId,
        quantity: Number(quantity),
        unitCost: unitCost ? parseFloat(unitCost) : 0,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
        reorderLevel: Number(reorderLevel) || 10,
        categoryId: categoryId || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to add SKU and stock entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
                Add New SKU & Initial Stock
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#71717A]">
                Register a product item with immediate warehouse stock allocation
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dynamic Total Stock Sum Calculation Card */}
          <div className="p-3.5 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-purple-500/10 dark:from-violet-500/15 dark:to-indigo-500/15 border border-violet-500/20 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-[#FAFAFA] flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-[#8B5CF6]" />
                <span>Total Product Stock Sum:</span>
              </span>
              <span className="text-base font-extrabold text-[#8B5CF6] dark:text-[#A855F7] font-mono">
                {totalProductStockSum} Units
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#71717A] mt-1.5 pt-1.5 border-t border-violet-200/50 dark:border-violet-500/20">
              {existingProductInfo ? (
                <span>
                  Existing PRC Stock ({existingProductInfo.stock} units) + New Entry (+{Number(quantity) || 0} units) = <strong className="text-slate-800 dark:text-[#FAFAFA] font-bold">{totalProductStockSum} Units Total</strong>
                </span>
              ) : (
                <span>
                  New Product Registration: <strong className="text-slate-800 dark:text-[#FAFAFA] font-bold">Initial {Number(quantity) || 0} Units Total</strong>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. 12mm High Tensile Steel Bolt"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">SKU *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. BLT-12-HT"
                  value={sku}
                  onChange={(e) => handleSkuChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono uppercase font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
                {checkingSku && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B5CF6]" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Destination Facility *</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="PRC_STOCK">🏢 PRC STOCK (Central Allocation)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Initial Quantity *</label>
              <input
                type="number"
                required
                min={1}
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Unit Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="₹0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Selling Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="₹0.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Reorder Level</label>
              <input
                type="number"
                min={0}
                placeholder="10"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Product Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="">-- Optional / General Category --</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Notes / Reason for Entry</label>
            <input
              type="text"
              placeholder="e.g. Initial inventory count from floor stock"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/25 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {submitting ? 'Adding Stock...' : 'Add SKU & Initialize Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
