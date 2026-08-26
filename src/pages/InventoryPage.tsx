import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

type TabType = 'stock' | 'purchases' | 'transfers' | 'movements' | 'suppliers';

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
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

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
      const [branchesRes, suppliersRes, productsRes] = await Promise.all([
        inventoryApi.getBranches({ limit: 100 }),
        inventoryApi.getSuppliers({ limit: 200 }),
        fetchAdminApi<any>('/products?limit=300'),
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
          setInventoryList(res.data || []);
          setTotalPages(res.pagination?.totalPages || 1);
          setTotalItems(res.pagination?.totalItems || res.data?.length || 0);
        }
      } else if (activeTab === 'purchases') {
        const res = await inventoryApi.getPurchases({
          page,
          limit: 25,
          branchId: branchParam,
          search: debouncedSearch || undefined,
        });
        if (res.success) {
          setPurchasesList(res.data || []);
          setTotalPages(res.pagination?.totalPages || 1);
          setTotalItems(res.pagination?.totalItems || res.data?.length || 0);
        }
      } else if (activeTab === 'transfers') {
        const res = await inventoryApi.getStockTransfers({
          page,
          limit: 25,
          branchId: branchParam,
          status: transferStatusFilter !== 'ALL' ? transferStatusFilter : undefined,
        });
        if (res.success) {
          setTransfersList(res.data || []);
          setTotalPages(res.pagination?.totalPages || 1);
          setTotalItems(res.pagination?.totalItems || res.data?.length || 0);
        }
      } else if (activeTab === 'movements') {
        const res = await inventoryApi.getStockMovements({
          page,
          limit: 30,
          branchId: branchParam,
          type: movementTypeFilter !== 'ALL' ? movementTypeFilter : undefined,
        });
        if (res.success) {
          setMovementsList(res.data || []);
          setTotalPages(res.pagination?.totalPages || 1);
          setTotalItems(res.pagination?.totalItems || res.data?.length || 0);
        }
      } else if (activeTab === 'suppliers') {
        const res = await inventoryApi.getSuppliers({
          page,
          limit: 25,
          search: debouncedSearch || undefined,
        });
        if (res.success) {
          setSuppliers(res.data || []);
          setTotalPages(res.pagination?.totalPages || 1);
          setTotalItems(res.pagination?.totalItems || res.data?.length || 0);
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load inventory records', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedBranchId, page, debouncedSearch, lowStockOnly, transferStatusFilter, movementTypeFilter]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Reset page to 1 whenever filters or tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedBranchId, debouncedSearch, lowStockOnly, transferStatusFilter, movementTypeFilter]);

  // ─── Metrics Aggregation ────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const totalQty = inventoryList.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const lowStockCount = inventoryList.filter((item) => item.quantity <= (item.reorderLevel || 10)).length;
    const totalPurchasesVal = purchasesList.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
    const pendingTransfersCount = transfersList.filter((t) => t.status === 'PENDING' || t.status === 'IN_TRANSIT').length;

    return {
      totalQty,
      lowStockCount,
      totalPurchasesVal,
      pendingTransfersCount,
    };
  }, [inventoryList, purchasesList, transfersList]);

  // ─── Export Triggers ────────────────────────────────────────────────────────

  const handleExportStock = async (format: 'xlsx' | 'pdf') => {
    try {
      setExportLoading(true);
      await inventoryApi.downloadStockReport({
        branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
        lowStock: lowStockOnly || undefined,
        format,
      });
      showToast(`Stock report downloaded (${format.toUpperCase()})`, 'success');
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
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-500/20'
              : 'bg-slate-800 text-white border border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          {toastMessage.type === 'info' && <HelpCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Command Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 border border-amber-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Multi-Branch Inventory & Stock</h1>
              <p className="text-sm text-slate-500">
                Independent stock tracking across Delhi HQ & Kolkata branches with audit trails & procurement tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>+ Record Stock-In</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>⇄ Transfer Stock</span>
          </button>

          <button
            onClick={() => {
              setQuickActionProduct(null);
              setIsAdjustmentModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Adjust Stock</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => handleExportStock('xlsx')}
              disabled={exportLoading}
              title="Download Stock Excel (.xlsx)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-emerald-700 hover:bg-white rounded-md transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExportStock('pdf')}
              disabled={exportLoading}
              title="Download Stock PDF"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-rose-700 hover:bg-white rounded-md transition"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Branch Selector Bar & Live KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Branch Filter Banner */}
        <div className="md:col-span-4 bg-slate-900 text-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Warehouse className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Select Active Facility</span>
              <span className="text-sm font-medium text-white">
                {selectedBranchId === 'ALL' ? 'Aggregated Global View (Delhi HQ + Kolkata)' : branches.find((b) => b.id === selectedBranchId)?.name || 'Branch'}
              </span>
            </div>
          </div>

          {/* Branch Pill Switches */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedBranchId('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedBranchId === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🌐 All Branches
            </button>

            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  selectedBranchId === b.id
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <span>{b.name}</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-slate-950/40 rounded uppercase font-mono">{b.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* KPI 1: Total Units In Stock */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Units in Stock</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalQty.toLocaleString()}</h3>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Available for Dispatch</span>
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Active SKUs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tracked Product SKUs</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalItems.toLocaleString()}</h3>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
              <Package className="w-3.5 h-3.5" />
              <span>Independent Branch Allocations</span>
            </span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Low Stock Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Low Stock / Out of Stock</p>
            <h3 className={`text-2xl font-bold mt-1 ${metrics.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {metrics.lowStockCount}
            </h3>
            <span className={`text-xs font-medium flex items-center gap-1 mt-1 ${metrics.lowStockCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>At or below reorder threshold</span>
            </span>
          </div>
          <div className={`p-3 rounded-xl ${metrics.lowStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Pending Transfers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Transfers</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.pendingTransfersCount}</h3>
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-1">
              <Truck className="w-3.5 h-3.5" />
              <span>Pending or In-Transit</span>
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 5-Tab Navigation Bar */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'stock'
                ? 'border-amber-500 text-amber-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Stock Matrix</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {inventoryList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'purchases'
                ? 'border-amber-500 text-amber-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Procurement & Purchases (Stock-In)</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'transfers'
                ? 'border-amber-500 text-amber-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Inter-Branch Transfers</span>
            {metrics.pendingTransfersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-bold animate-pulse">
                {metrics.pendingTransfersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'movements'
                ? 'border-amber-500 text-amber-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Stock Ledger Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'suppliers'
                ? 'border-amber-500 text-amber-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Vendors & Suppliers</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {suppliers.length}
            </span>
          </button>
        </div>

        {/* Tab Controls / Quick Search */}
        <div className="flex items-center gap-2 pb-2 md:pb-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter products / SKUs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-48 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => fetchTabData()}
            title="Refresh Data"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── TAB 1: STOCK MATRIX ────────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Sub-toolbar */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="flex items-center gap-1 text-rose-600 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Show Low Stock Only</span>
                </span>
              </label>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{inventoryList.length}</strong> items of{' '}
              <strong className="text-slate-800">{totalItems}</strong>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Branch Facility</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Reserved Qty</th>
                  <th className="py-3 px-4 text-right">Reorder Level</th>
                  <th className="py-3 px-4 text-center">Stock Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/75 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      <span>Loading branch inventories...</span>
                    </td>
                  </tr>
                ) : inventoryList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium text-slate-600">No inventory records found</p>
                      <p className="text-xs text-slate-400 mt-1">Try clearing filters or recording stock-in purchases.</p>
                    </td>
                  </tr>
                ) : (
                  inventoryList.map((item) => {
                    const availableQty = Math.max(0, (item.quantity || 0) - (item.reservedQuantity || 0));
                    const stockInfo = getStockStatus(availableQty, item.reorderLevel || item.product?.reorderLevel);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {item.product?.thumbnail ? (
                              <img
                                src={item.product.thumbnail}
                                alt={item.product.name}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-slate-900 line-clamp-1 block hover:text-amber-600">
                                {item.product?.name || 'Unnamed Product'}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                                <span>SKU: {item.product?.sku || 'N/A'}</span>
                                {item.product?.category && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-600 font-sans">{item.product.category.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-900 text-white">
                              {item.branch?.code || 'DEL'}
                            </span>
                            <span className="font-medium text-slate-800">{item.branch?.name || 'Delhi HQ'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-sm font-bold ${
                              stockInfo.isOutOfStock ? 'text-rose-600' : stockInfo.isLowStock ? 'text-amber-600' : 'text-slate-900'
                            }`}
                          >
                            {item.quantity.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="text-xs text-slate-500 font-medium font-mono">
                            {item.reservedQuantity || 0}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="text-xs text-slate-600 font-mono">{item.reorderLevel || 10}</span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stockInfo.badgeClass}`}>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                stockInfo.isOutOfStock ? 'bg-rose-500' : stockInfo.isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            ></span>
                            {stockInfo.label.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
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
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                            >
                              ⚡ Adjust
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

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: PURCHASES (STOCK-IN) ────────────────────────────────────── */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record New Purchase</span>
              </button>
              <button
                onClick={handleExportPurchases}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Purchases (Excel)</span>
              </button>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total Purchases: <strong className="text-slate-800">{purchasesList.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4">Invoice / Ref #</th>
                  <th className="py-3 px-4">Vendor / Supplier (Source)</th>
                  <th className="py-3 px-4">Receiving Branch</th>
                  <th className="py-3 px-4 text-center">Items Count</th>
                  <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/75 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      <span>Loading purchase history...</span>
                    </td>
                  </tr>
                ) : purchasesList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium text-slate-600">No purchases recorded yet</p>
                      <p className="text-xs text-slate-400 mt-1">Click "+ Record New Purchase" to track your first stock-in.</p>
                    </td>
                  </tr>
                ) : (
                  purchasesList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {p.invoiceNumber || <span className="text-slate-400 italic">No Invoice #</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.supplier?.name || 'Unknown Vendor'}</div>
                        {p.supplier?.phone && (
                          <div className="text-[11px] text-slate-500 font-mono">{p.supplier.phone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-900 text-white">
                          {p.branch?.code || 'DEL'}
                        </span>
                        <span className="ml-2 font-medium text-slate-700">{p.branch?.name || 'Delhi HQ'}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800">
                        {p.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(p.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedPurchase(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
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

          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: TRANSFERS ────────────────────────────────────────────────── */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Transfer Request</span>
              </button>

              <select
                value={transferStatusFilter}
                onChange={(e) => setTransferStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending (Reserved)</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Total Transfers: <strong className="text-slate-800">{transfersList.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">From Origin Branch</th>
                  <th className="py-3 px-4">To Destination Branch</th>
                  <th className="py-3 px-4 text-center">Items / Quantity</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Notes / Purpose</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/75 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      <span>Loading transfers...</span>
                    </td>
                  </tr>
                ) : transfersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium text-slate-600">No stock transfers found</p>
                      <p className="text-xs text-slate-400 mt-1">Initiate a transfer between Delhi HQ and Kolkata.</p>
                    </td>
                  </tr>
                ) : (
                  transfersList.map((t) => {
                    const totalQty = t.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {new Date(t.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-white mr-1.5">
                            {t.fromBranch?.code}
                          </span>
                          {t.fromBranch?.name}
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-700 text-white mr-1.5">
                            {t.toBranch?.code}
                          </span>
                          {t.toBranch?.name}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-900">
                          {t.items?.length || 0} SKUs ({totalQty} units)
                        </td>

                        <td className="py-3 px-4 text-center">
                          {t.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              PENDING
                            </span>
                          )}
                          {t.status === 'IN_TRANSIT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                              <Truck className="w-3 h-3" />
                              IN TRANSIT
                            </span>
                          )}
                          {t.status === 'RECEIVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              RECEIVED
                            </span>
                          )}
                          {t.status === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3" />
                              CANCELLED
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600 line-clamp-1 max-w-xs">{t.notes || '—'}</td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleDispatchTransfer(t.id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition"
                                >
                                  🚀 Dispatch
                                </button>
                                <button
                                  onClick={() => handleCancelTransfer(t.id)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-medium transition"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {t.status === 'IN_TRANSIT' && (
                              <button
                                onClick={() => handleReceiveTransfer(t.id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark Received</span>
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedTransfer(t)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
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
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Movement Types</option>
                <option value="PURCHASE_IN">PURCHASE_IN (Stock-In)</option>
                <option value="TRANSFER_IN">TRANSFER_IN (Transfer Credit)</option>
                <option value="TRANSFER_OUT">TRANSFER_OUT (Transfer Debit)</option>
                <option value="ADJUSTMENT_IN">ADJUSTMENT_IN</option>
                <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT</option>
                <option value="DAMAGE">DAMAGE (Write-off)</option>
                <option value="RETURN_IN">RETURN_IN</option>
              </select>

              <button
                onClick={handleExportMovements}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Ledger (Excel)</span>
              </button>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Transactions: <strong className="text-slate-800">{movementsList.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Product SKU & Name</th>
                  <th className="py-3 px-4">Branch Facility</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4 text-right">Qty Changed</th>
                  <th className="py-3 px-4 text-center">Stock (Before → After)</th>
                  <th className="py-3 px-4">Notes / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/75 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      <span>Loading immutable ledger entries...</span>
                    </td>
                  </tr>
                ) : movementsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium text-slate-600">No stock movements recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  movementsList.map((m) => {
                    const isPositive = ['PURCHASE_IN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN'].includes(m.type);

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{m.product?.name || 'Product'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">SKU: {m.product?.sku}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-white mr-1.5">
                            {m.branch?.code || 'DEL'}
                          </span>
                          <span className="font-medium text-slate-700">{m.branch?.name}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              m.type === 'PURCHASE_IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.type.startsWith('TRANSFER')
                                ? 'bg-blue-100 text-blue-800'
                                : m.type === 'DAMAGE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                            {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-slate-600 font-medium">
                          {m.previousQty} → <strong className="text-slate-900">{m.newQty}</strong>
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-sm line-clamp-1">
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
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Vendor / Supplier</span>
            </button>
            <div className="text-xs text-slate-500 font-medium">
              Registered Vendors: <strong className="text-slate-800">{suppliers.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
            {suppliers.map((s) => (
              <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ACTIVE
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  {s.contactPerson && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Contact:</span>
                      <span className="text-slate-800 font-semibold">{s.contactPerson}</span>
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
                      <span>{s.email}</span>
                    </div>
                  )}
                  {s.gstNumber && (
                    <div className="flex items-center gap-2 font-mono text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded">
                      <span>GSTIN: {s.gstNumber}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Purchases: {s._count?.purchases || 0}</span>
                  <button
                    onClick={() => {
                      setIsPurchaseModalOpen(true);
                    }}
                    className="text-amber-600 hover:text-amber-700 font-semibold hover:underline"
                  >
                    + Record Purchase
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

      {/* ─── DRAWER: PURCHASE BREAKDOWN ──────────────────────────────────────── */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Purchase Order Breakdown</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Invoice #{selectedPurchase.invoiceNumber || 'N/A'} • {selectedPurchase.supplier?.name}
                </p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Receiving Branch</span>
                  <span className="font-bold text-slate-800">{selectedPurchase.branch?.name} ({selectedPurchase.branch?.code})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Purchase Date</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {new Date(selectedPurchase.purchaseDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>

              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2">Item / SKU</th>
                    <th className="py-2 text-right">Quantity</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPurchase.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5">
                        <div className="font-semibold text-slate-800">{item.product?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.product?.sku}</div>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold">{item.quantity}</td>
                      <td className="py-2.5 text-right font-mono">₹{Number(item.unitPurchasePrice).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                        ₹{Number(item.totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Grand Total Procurement Amount:</span>
                <span className="text-base font-bold text-amber-900 font-mono">
                  ₹{Number(selectedPurchase.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Breakdown
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

const PurchaseModal: React.FC<PurchaseModalProps> = ({ branches, suppliers, products, onClose, onSuccess }) => {
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || '');
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitPurchasePrice: number }>>([
    { productId: String(products[0]?.id || ''), quantity: 10, unitPurchasePrice: Number(products[0]?.price || 0) },
  ]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addItemRow = () => {
    setItems((prev) => [...prev, { productId: String(products[0]?.id || ''), quantity: 1, unitPurchasePrice: 0 }]);
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
          productId: i.productId,
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Record Purchase & Stock-In ("Kahan Se Kharida")</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Branch Facility *</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.gstNumber ? `(GST: ${s.gstNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Invoice / Reference #</label>
              <input
                type="text"
                placeholder="e.g. INV-2026-9812"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Item Row Builder */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Purchase Line Items</label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-[#18181B] p-3 rounded-xl border border-slate-200 dark:border-[#27272A] space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
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
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded mt-1 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-1 border-t border-slate-200/60 dark:border-[#27272A]">
                    <div className="w-32">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-mono text-right font-bold text-slate-800 dark:text-[#FAFAFA]"
                      />
                    </div>

                    <div className="w-40">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Unit Cost (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit Price ₹"
                        value={item.unitPurchasePrice}
                        onChange={(e) => updateItem(idx, 'unitPurchasePrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg text-xs font-mono text-right font-bold text-slate-800 dark:text-[#FAFAFA]"
                      />
                    </div>

                    <div className="flex-1 text-right">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Line Total</span>
                      <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        ₹{((item.quantity || 0) * (item.unitPurchasePrice || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Total Purchase Amount:</span>
              <span className="text-sm font-bold text-emerald-900 font-mono">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Procurement Notes / Batch Details</label>
            <textarea
              rows={2}
              placeholder="e.g. Received via GATI logistics, verified physical seal"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
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
      setError('Origin and Destination branch cannot be the same facility');
      return;
    }

    // Pre-submit validation: Check if requested transfer quantity exceeds source branch available stock
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Initiate Inter-Branch Transfer</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Source (From) Branch *</label>
              <select
                value={fromBranchId}
                onChange={(e) => setFromBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Destination (To) Branch *</label>
              <select
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA]"
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
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add SKU</span>
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-[#18181B] p-3 rounded-xl border border-slate-200 dark:border-[#27272A] space-y-2">
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
                      className="p-1 text-slate-400 hover:text-rose-600 rounded mt-1 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-[#27272A]">
                  <div className="w-44">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Transfer Quantity</label>
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
                      className={`w-full px-2.5 py-1.5 bg-white dark:bg-[#09090B] border rounded-lg text-xs font-mono text-right font-bold ${
                        item.availableAtSource !== undefined && item.quantity > item.availableAtSource
                          ? 'border-rose-500 text-rose-600 bg-rose-50/50'
                          : 'border-slate-200 dark:border-[#27272A] text-slate-800 dark:text-[#FAFAFA]'
                      }`}
                    />
                  </div>

                  {item.availableAtSource !== undefined && item.quantity > item.availableAtSource && (
                    <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Exceeds source stock ({item.availableAtSource} available)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Transfer Reason / Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Replenishing Kolkata depot for East region high demand"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA]"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 shadow-md shadow-blue-500/20"
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Adjust Stock & Log Ledger</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
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
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA]"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
              >
                <option value="ADJUSTMENT_IN">ADJUSTMENT_IN (+)</option>
                <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT (-)</option>
                <option value="DAMAGE">DAMAGE (Write-off) (-)</option>
                <option value="RETURN_IN">RETURN_IN (+)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Units *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Reason / Audit Justification *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Physical inventory cycle count reconciliation variance"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Register New Supplier / Vendor</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Vendor Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Hardware & Fasteners Pvt Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="e.g. Rajesh Sharma"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="vendor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                placeholder="e.g. 07AAAAA0000A1Z5"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Address / Depot</label>
            <textarea
              rows={2}
              placeholder="e.g. Plot 44, Naraina Industrial Area Phase 1, New Delhi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
