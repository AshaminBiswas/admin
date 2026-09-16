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
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  SlidersHorizontal,
  RefreshCw,
  X,
  ChevronRight,
  ArrowUpRight,
  Package,
  Layers,
  IndianRupee,
  Phone,
  Mail,
  MapPin,
  Home,
  Tag,
  ChevronRight as BreadArrow,
  Pencil,
  Trash2,
  Sparkles,
  ExternalLink,
  Calendar,
  CalendarDays,
  Download,
  ShoppingCart,
  UserCheck,
  BarChart3,
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
import { getStockStatus } from '../utils/stockStatus';
import { syncProductUpdate } from '../utils/productSync';
import { getCachedCategories } from '../utils/referenceDataCache';
import { ProductDossierModal } from '../components/inventory/ProductDossierModal';
import { StockEditModal } from '../components/inventory/StockEditModal';
import { MovementEditModal } from '../components/inventory/MovementEditModal';
import { SupplierModal } from '../components/inventory/SupplierModal';
import { PurchaseModal } from '../components/inventory/PurchaseModal';
import { TransferModal } from '../components/inventory/TransferModal';
import { AdjustmentModal } from '../components/inventory/AdjustmentModal';
import { BranchModal } from '../components/inventory/BranchModal';
import { QuickStockModal } from '../components/inventory/QuickStockModal';

type TabType = 'stock' | 'purchases' | 'transfers' | 'movements' | 'suppliers' | 'branches' | 'reports';
type ReportHorizon = 'day' | 'week' | 'month' | 'year' | 'range';

interface TabCacheItem<T> {
  data: T[];
  total: number;
  totalPages: number;
  timestamp: number;
}

const getWeekSpanDisplay = (dateStr: string) => {
  const target = dateStr ? new Date(dateStr) : new Date();
  const day = target.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(target);
  monday.setDate(target.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} – ${sunday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

function getColourSwatch(c?: string): string {
  if (!c) return "#71717A";
  const lower = c.toLowerCase();
  if (lower.includes("gold")) return "#D4AF37";
  if (lower.includes("black")) return "#18181B";
  if (lower.includes("na") || lower.includes("alum")) return "#CBD5E1";
  if (lower.includes("ss") || lower.includes("steel") || lower.includes("silver")) return "#94A3B8";
  return "#8B5CF6";
}

export const InventoryPage: React.FC = () => {
  const { setCurrentView } = useAdminAuth();

  // Active view state
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 350);

  // Filters
  const [nameFilter, setNameFilter] = useState<string>('');
  const [skuFilter, setSkuFilter] = useState<string>('');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [transferStatusFilter, setTransferStatusFilter] = useState<string>('ALL');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('ALL');
  const [purchaseSupplierFilter, setPurchaseSupplierFilter] = useState<string>('ALL');

  // Production Reports & Analytics State
  const [reportHorizon, setReportHorizon] = useState<ReportHorizon>('month');
  const [reportDate, setReportDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState<number>(() => new Date().getFullYear());
  const [reportRangeFrom, setReportRangeFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [reportRangeTo, setReportRangeTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reportChannel, setReportChannel] = useState<'all' | 'b2c' | 'b2b'>('all');
  const [reportDownloading, setReportDownloading] = useState<string | null>(null);

  // SWR Instant Boot States from LocalStorage / Session Cache
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const cached = localStorage.getItem('prc_cached_branches');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const cached = localStorage.getItem('prc_cached_suppliers');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('prc_admin_categories_list');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(() => {
    try {
      const cached = localStorage.getItem('prc_cached_inventory_snapshot');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [purchasesList, setPurchasesList] = useState<Purchase[]>([]);
  const [transfersList, setTransfersList] = useState<StockTransfer[]>([]);
  const [movementsList, setMovementsList] = useState<StockMovement[]>([]);

  // Pagination & Loading
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(() => inventoryList.length);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // In-Memory SWR Tab Cache to make tab switching 0ms instant
  const tabCacheRef = useRef<Record<string, TabCacheItem<any>>>({});

  // Active Modals State
  const [isQuickStockModalOpen, setIsQuickStockModalOpen] = useState<boolean>(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState<boolean>(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);

  // Selection & Edit Modals State
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [editingStockItem, setEditingStockItem] = useState<InventoryItem | null>(null);
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [quickActionProduct, setQuickActionProduct] = useState<{
    id: string;
    name: string;
    sku: string;
    branchId: string;
    currentQty: number;
  } | null>(null);

  // Product Dossier Modal
  const [isDossierModalOpen, setIsDossierModalOpen] = useState<boolean>(false);
  const [selectedDossierProductId, setSelectedDossierProductId] = useState<string | null>(null);
  const [selectedDossierProductName, setSelectedDossierProductName] = useState<string | undefined>();
  const [selectedDossierSku, setSelectedDossierSku] = useState<string | undefined>();

  // Delete Confirmation Dialog
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'inventory' | 'purchase' | 'transfer' | 'supplier' | 'branch';
    id: string;
    name: string;
    productId?: string;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // ─── 1. Instant Reference Data Loading ───────────────────────────────────────
  const loadReferenceData = useCallback(async () => {
    try {
      const [branchesRes, suppliersRes, catList] = await Promise.all([
        inventoryApi.getBranches({ limit: 100 }),
        inventoryApi.getSuppliers({ limit: 200 }),
        getCachedCategories(),
      ]);

      if (branchesRes.success && branchesRes.data) {
        setBranches(branchesRes.data);
        localStorage.setItem('prc_cached_branches', JSON.stringify(branchesRes.data));
      }
      if (suppliersRes.success && suppliersRes.data) {
        setSuppliers(suppliersRes.data);
        localStorage.setItem('prc_cached_suppliers', JSON.stringify(suppliersRes.data));
      }
      if (catList && catList.length > 0) {
        setCategories(catList);
      }
    } catch (err: any) {
      console.warn('[Inventory] Reference data background fetch warning:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // ─── 2. Tab-Specific Data Fetching with 0ms SWR Cache ───────────────────────
  const fetchTabData = useCallback(
    async (forceRefresh = false) => {
      const branchParam = selectedBranchId !== 'ALL' ? selectedBranchId : undefined;
      const cacheKey = `${activeTab}_${selectedBranchId}_${page}_${debouncedSearch}_${lowStockOnly}_${transferStatusFilter}_${movementTypeFilter}_${purchaseSupplierFilter}`;

      // 0ms Cache Hit Check
      if (!forceRefresh && tabCacheRef.current[cacheKey]) {
        const cached = tabCacheRef.current[cacheKey];
        if (Date.now() - cached.timestamp < 30000) {
          // Serve immediately from memory
          if (activeTab === 'stock') setInventoryList(cached.data);
          else if (activeTab === 'purchases') setPurchasesList(cached.data);
          else if (activeTab === 'transfers') setTransfersList(cached.data);
          else if (activeTab === 'movements') setMovementsList(cached.data);
          else if (activeTab === 'suppliers') setSuppliers(cached.data);
          else if (activeTab === 'branches') setBranches(cached.data);

          setTotalPages(cached.totalPages);
          setTotalItems(cached.total);
          return;
        }
      }

      setLoading(true);
      try {
        if (activeTab === 'stock') {
          const res = await inventoryApi.getInventory({
            page,
            limit: 30,
            branchId: branchParam,
            search: debouncedSearch || undefined,
            lowStock: lowStockOnly || undefined,
          });

          if (res.success) {
            const list = Array.isArray(res.data) ? res.data : (res as any).items || [];
            setInventoryList(list);
            const tPages = (res as any).totalPages || 1;
            const tCount = (res as any).total || list.length;
            setTotalPages(tPages);
            setTotalItems(tCount);

            tabCacheRef.current[cacheKey] = {
              data: list,
              total: tCount,
              totalPages: tPages,
              timestamp: Date.now(),
            };

            // Persist page 1 initial snapshot for instant 0ms mount next time
            if (page === 1 && !debouncedSearch && selectedBranchId === 'ALL') {
              localStorage.setItem('prc_cached_inventory_snapshot', JSON.stringify(list.slice(0, 25)));
            }
          }
        } else if (activeTab === 'purchases') {
          const res = await inventoryApi.getPurchases({
            page,
            limit: 20,
            branchId: branchParam,
            supplierId: purchaseSupplierFilter !== 'ALL' ? purchaseSupplierFilter : undefined,
            search: debouncedSearch || undefined,
          });

          if (res.success) {
            const list = Array.isArray(res.data) ? res.data : (res as any).items || [];
            setPurchasesList(list);
            const tPages = (res as any).totalPages || 1;
            const tCount = (res as any).total || list.length;
            setTotalPages(tPages);
            setTotalItems(tCount);

            tabCacheRef.current[cacheKey] = {
              data: list,
              total: tCount,
              totalPages: tPages,
              timestamp: Date.now(),
            };
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
            const tPages = (res as any).totalPages || 1;
            const tCount = (res as any).total || list.length;
            setTotalPages(tPages);
            setTotalItems(tCount);

            tabCacheRef.current[cacheKey] = {
              data: list,
              total: tCount,
              totalPages: tPages,
              timestamp: Date.now(),
            };
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
            const tPages = (res as any).totalPages || 1;
            const tCount = (res as any).total || list.length;
            setTotalPages(tPages);
            setTotalItems(tCount);

            tabCacheRef.current[cacheKey] = {
              data: list,
              total: tCount,
              totalPages: tPages,
              timestamp: Date.now(),
            };
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
    },
    [
      activeTab,
      selectedBranchId,
      page,
      debouncedSearch,
      lowStockOnly,
      transferStatusFilter,
      movementTypeFilter,
      purchaseSupplierFilter,
    ]
  );

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Reset page when tab or branch changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedBranchId, debouncedSearch]);

  // ─── 3. Consolidated Multi-Branch Metrics & Filtering ────────────────────────
  const metrics = useMemo(() => {
    const totalQty = inventoryList.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const lowStockCount = inventoryList.filter(
      (item) => (item.quantity || 0) <= (item.reorderLevel || item.product?.reorderLevel || 10)
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

  // Map of Consolidated Stock Sum Across All Fulfillment Facilities
  const productWiseStockMap = useMemo(() => {
    const map = new Map<string, { totalStock: number; totalReserved: number; branchCount: number }>();
    inventoryList.forEach((item) => {
      const pid = item.productId || item.product?.id;
      if (!pid) return;
      const existing = map.get(pid) || { totalStock: 0, totalReserved: 0, branchCount: 0 };
      existing.totalStock += item.quantity || 0;
      existing.totalReserved += item.reservedQuantity || 0;
      existing.branchCount += 1;
      map.set(pid, existing);
    });
    return map;
  }, [inventoryList]);

  // Fast Client-Side Refinements for Stock Matrix
  const filteredInventoryList = useMemo(() => {
    return inventoryList.filter((item) => {
      if (nameFilter.trim()) {
        const pName = (item.product?.name || '').toLowerCase();
        if (!pName.includes(nameFilter.trim().toLowerCase())) return false;
      }
      if (skuFilter.trim()) {
        const pSku = (item.product?.sku || '').toLowerCase();
        if (!pSku.includes(skuFilter.trim().toLowerCase())) return false;
      }
      if (selectedBranchId !== 'ALL') {
        const bId = item.branchId || item.branch?.id;
        const bCode = (item.branch?.code || '').toUpperCase();
        if (selectedBranchId !== 'PRC_STOCK' && bId !== selectedBranchId && bCode !== selectedBranchId) {
          return false;
        }
      }
      if (stockStatusFilter !== 'ALL') {
        const availableQty = Math.max(0, (item.quantity || 0) - (item.reservedQuantity || 0));
        const reorder = item.reorderLevel || item.product?.reorderLevel || 10;
        if (stockStatusFilter === 'OUT_OF_STOCK' && availableQty > 0) return false;
        if (stockStatusFilter === 'LOW_STOCK' && (availableQty === 0 || availableQty > reorder)) return false;
        if (stockStatusFilter === 'IN_STOCK' && availableQty <= reorder) return false;
      }
      if (categoryFilter !== 'ALL') {
        const catId = item.product?.category?.id || (item.product as any)?.categoryId;
        if (catId !== categoryFilter) return false;
      }
      return true;
    });
  }, [inventoryList, nameFilter, skuFilter, selectedBranchId, stockStatusFilter, categoryFilter]);

  const isAnyStockFilterActive =
    nameFilter.trim() !== '' ||
    skuFilter.trim() !== '' ||
    stockStatusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    lowStockOnly;

  const clearAllStockFilters = () => {
    setNameFilter('');
    setSkuFilter('');
    setStockStatusFilter('ALL');
    setCategoryFilter('ALL');
    setLowStockOnly(false);
    setSearchQuery('');
  };

  // ─── 4. Deletion Cascade & Auto-Delete from Product Listing ─────────────────
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    const { type, id, name, productId } = deleteConfirmation;

    try {
      if (type === 'inventory') {
        const effectiveProdId = productId || (id.startsWith('inv-') ? id.slice(4) : id);

        // 1. Optimistically remove from stock matrix list immediately
        setInventoryList((prev) =>
          prev.filter(
            (item) =>
              item.id !== id &&
              item.productId !== id &&
              item.productId !== effectiveProdId &&
              `inv-${item.productId}` !== id &&
              item.id !== `inv-${id}`
          )
        );
        setTotalItems((prev) => Math.max(0, prev - 1));

        // 2. Close any open dossiers or modal edits
        if (selectedDossierProductId === id || selectedDossierProductId === effectiveProdId) {
          setSelectedDossierProductId(null);
          setIsDossierModalOpen(false);
        }
        if (quickActionProduct?.id === id || quickActionProduct?.id === effectiveProdId) {
          setQuickActionProduct(null);
        }
        if (editingStockItem?.id === id || editingStockItem?.productId === effectiveProdId) {
          setEditingStockItem(null);
        }

        // 3. Trigger backend delete: writes off inventory and soft-deletes product from catalog
        await inventoryApi.deleteInventoryItem(id);

        // 4. Broadcast deletion to Admin Products Page and Storefront tabs
        syncProductUpdate({ id: effectiveProdId, sku: name }, 'DELETE');

        showToast(`SKU '${name}' removed from stock list and auto-deleted from product catalog`, 'success');
      } else if (type === 'purchase') {
        setPurchasesList((prev) => prev.filter((p) => p.id !== id));
        setTotalItems((prev) => Math.max(0, prev - 1));
        if (selectedPurchase?.id === id) setSelectedPurchase(null);
        await inventoryApi.deletePurchase(id, true);
        showToast(`Purchase order '${name}' voided and inventory rolled back`, 'success');
      } else if (type === 'transfer') {
        setTransfersList((prev) => prev.filter((t) => t.id !== id));
        setTotalItems((prev) => Math.max(0, prev - 1));
        if (selectedTransfer?.id === id) setSelectedTransfer(null);
        await inventoryApi.deleteStockTransfer(id);
        showToast(`Transfer '${name}' deleted successfully`, 'success');
      } else if (type === 'supplier') {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        if (editingSupplier?.id === id) setEditingSupplier(null);
        await inventoryApi.deleteSupplier(id);
        showToast(`Supplier '${name}' deactivated successfully`, 'success');
        loadReferenceData();
      } else if (type === 'branch') {
        setBranches((prev) => prev.filter((b) => b.id !== id));
        await inventoryApi.deleteBranch(id);
        showToast(`Facility '${name}' deactivated successfully`, 'success');
        loadReferenceData();
      }

      setDeleteConfirmation(null);
      fetchTabData(true);
    } catch (err: any) {
      showToast(err?.message || `Failed to delete ${type}`, 'error');
      fetchTabData(true);
    }
  };

  // ─── 5. Export Handlers ─────────────────────────────────────────────────────
  const handleExportStock = async (format: 'xlsx' | 'pdf') => {
    try {
      setExportLoading(true);
      const branchParam = selectedBranchId !== 'ALL' ? selectedBranchId : undefined;
      await inventoryApi.downloadStockReport({ branchId: branchParam, format });
      showToast(`Stock report downloaded (${format.toUpperCase()})`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to download export', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadProductionReport = async (
    reportType: 'stock' | 'audit' | 'purchases' | 'orders',
    format: 'xlsx' | 'pdf' = 'xlsx'
  ) => {
    try {
      setReportDownloading(`${reportType}-${format}`);
      const branchParam = selectedBranchId !== 'ALL' ? selectedBranchId : undefined;
      const baseParams: any = {
        branchId: branchParam,
        period: reportHorizon,
        date: reportDate,
        month: reportMonth,
        year: reportYear,
        from: reportHorizon === 'range' ? reportRangeFrom : undefined,
        to: reportHorizon === 'range' ? reportRangeTo : undefined,
      };

      if (reportType === 'stock') {
        await inventoryApi.downloadStockReport({ ...baseParams, format });
        showToast(`Stock matrix & valuation report downloaded (${format.toUpperCase()})`, 'success');
      } else if (reportType === 'audit') {
        await inventoryApi.downloadMovementsReport(baseParams);
        showToast('Stock movements audit ledger downloaded (Excel)', 'success');
      } else if (reportType === 'purchases') {
        await inventoryApi.downloadPurchasesReport(baseParams);
        showToast('Itemized purchases & procurement report downloaded (Excel)', 'success');
      } else if (reportType === 'orders') {
        await inventoryApi.downloadOrdersConsumptionReport({ ...baseParams, channel: reportChannel });
        showToast('Customer orders & consumption report downloaded (Excel)', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to download report', 'error');
    } finally {
      setReportDownloading(null);
    }
  };

  // ─── 6. Transfer Actions ────────────────────────────────────────────────────
  const handleTransferDispatch = async (id: string) => {
    try {
      setActionLoading(true);
      await inventoryApi.dispatchStockTransfer(id);
      showToast('Stock transfer dispatched', 'success');
      fetchTabData(true);
    } catch (err: any) {
      showToast(err?.message || 'Failed to dispatch transfer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferReceive = async (id: string) => {
    try {
      setActionLoading(true);
      await inventoryApi.receiveStockTransfer(id);
      showToast('Stock transfer received into destination inventory', 'success');
      fetchTabData(true);
    } catch (err: any) {
      showToast(err?.message || 'Failed to receive transfer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferCancel = async (id: string) => {
    try {
      setActionLoading(true);
      await inventoryApi.cancelStockTransfer(id, { notes: 'Cancelled by admin' });
      showToast('Stock transfer cancelled', 'success');
      fetchTabData(true);
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel transfer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-16 sm:pb-12 animate-in fade-in">
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
          {toastMessage.type === 'info' && <Package className="w-4 h-4 flex-shrink-0" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Command Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Multi-Branch Inventory & Stock
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <nav className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-[#71717A]">
            <Home size={11} className="text-slate-400 dark:text-[#52525B]" />
            <BreadArrow size={11} className="text-slate-300 dark:text-[#52525B]" />
            <span>Catalog & Operations</span>
            <BreadArrow size={11} className="text-slate-300 dark:text-[#52525B]" />
            <span className="text-[#8B5CF6] font-semibold">Warehouse Allocations</span>
          </nav>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          <button
            onClick={() => setCurrentView('inventory-add-sku')}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/25 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Add SKU & Stock</span>
          </button>

          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-slate-700 dark:text-[#FAFAFA] hover:text-[#8B5CF6] text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Record Stock-In</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-slate-700 dark:text-[#FAFAFA] hover:text-[#8B5CF6] text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-500" />
            <span>Transfer</span>
          </button>

          <button
            onClick={() => {
              setQuickActionProduct(null);
              setIsAdjustmentModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-slate-700 dark:text-[#FAFAFA] hover:text-[#8B5CF6] text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
            <span>Adjust</span>
          </button>

          {/* Export Group */}
          <div className="flex items-center bg-slate-100 dark:bg-[#09090B] p-0.5 rounded-xl border border-slate-200 dark:border-[#27272A]">
            <button
              onClick={() => handleExportStock('xlsx')}
              disabled={exportLoading}
              title="Download Stock Excel (.xlsx)"
              className="p-1.5 text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] hover:text-[#8B5CF6] hover:bg-white dark:hover:bg-[#18181B] rounded-lg transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            </button>
            <button
              onClick={() => handleExportStock('pdf')}
              disabled={exportLoading}
              title="Download Stock PDF"
              className="p-1.5 text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] hover:text-[#8B5CF6] hover:bg-white dark:hover:bg-[#18181B] rounded-lg transition"
            >
              <FileText className="w-4 h-4 text-rose-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Facility Switcher & KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Facility Selector Card */}
        <div className="col-span-2 lg:col-span-4 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] p-3 sm:p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center border border-[#8B5CF6]/20">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-[#71717A] font-bold block">
                Selected Fulfillment Facility
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                {selectedBranchId === 'ALL'
                  ? '🌐 Aggregated Global Network (All Facilities)'
                  : branches.find((b) => b.id === selectedBranchId)?.name || 'Fulfillment Facility'}
              </span>
            </div>
          </div>

          {/* Facility Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedBranchId('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedBranchId === 'ALL'
                  ? 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/25 font-bold'
                  : 'bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]'
              }`}
            >
              All Facilities
            </button>

            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedBranchId === b.id
                    ? 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/25 font-bold'
                    : 'bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedBranchId === b.id ? 'bg-white' : b.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                ></span>
                <span>{b.name}</span>
                <span
                  className={`px-1 py-0.2 text-[9px] rounded font-mono ${
                    selectedBranchId === b.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#27272A]'
                  }`}
                >
                  {b.code}
                </span>
              </button>
            ))}

            <button
              onClick={() => {
                setEditingBranch(null);
                setIsBranchModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center gap-1 transition"
            >
              <Plus className="w-3 h-3" />
              <span>Facility</span>
            </button>
          </div>
        </div>

        {/* KPI 1: Total Units */}
        <div className="bg-white dark:bg-[#18181B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
              Total Units On Hand
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#FAFAFA] mt-0.5">
              {metrics.totalQty.toLocaleString()}
            </h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" />
              <span>Available for dispatch</span>
            </span>
          </div>
          <div className="p-2.5 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 rounded-xl">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* KPI 2: Tracked SKUs */}
        <div className="bg-white dark:bg-[#18181B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
              Active SKUs
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#FAFAFA] mt-0.5">
              {totalItems.toLocaleString()}
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-[#71717A] font-semibold flex items-center gap-1 mt-0.5">
              <Package className="w-3 h-3" />
              <span>Catalog items tracked</span>
            </span>
          </div>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-xl">
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* KPI 3: Low Stock Alerts */}
        <div className="bg-white dark:bg-[#18181B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
              Low Stock Alerts
            </p>
            <h3
              className={`text-xl sm:text-2xl font-extrabold mt-0.5 ${
                metrics.lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-[#FAFAFA]'
              }`}
            >
              {metrics.lowStockCount}
            </h3>
            <span
              className={`text-[10px] font-semibold flex items-center gap-1 mt-0.5 ${
                metrics.lowStockCount > 0 ? 'text-rose-500' : 'text-slate-400 dark:text-[#71717A]'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>At reorder threshold</span>
            </span>
          </div>
          <div
            className={`p-2.5 rounded-xl border ${
              metrics.lowStockCount > 0
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                : 'bg-slate-100 dark:bg-[#27272A] text-slate-400 border-slate-200 dark:border-[#3F3F46]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* KPI 4: Pending Transfers */}
        <div className="bg-white dark:bg-[#18181B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#71717A]">
              In-Transit Shipments
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#FAFAFA] mt-0.5">
              {metrics.pendingTransfersCount}
            </h3>
            <span className="text-[10px] text-[#8B5CF6] dark:text-[#A855F7] font-semibold flex items-center gap-1 mt-0.5">
              <Truck className="w-3 h-3" />
              <span>Inter-facility routing</span>
            </span>
          </div>
          <div className="p-2.5 bg-sky-500/10 text-sky-500 border border-sky-500/20 rounded-xl">
            <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* 7-Tab Navigation Bar */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl p-2 sm:p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          {[
            { id: 'stock', label: 'Stock Matrix', icon: Boxes, badge: inventoryList.length },
            { id: 'purchases', label: 'Procurement (Stock-In)', icon: ShoppingBag },
            { id: 'transfers', label: 'Inter-Branch Transfers', icon: ArrowRightLeft, pulse: metrics.pendingTransfersCount },
            { id: 'movements', label: 'Stock Ledger Audit', icon: History },
            { id: 'suppliers', label: 'Vendors & Suppliers', icon: Building2, badge: suppliers.length },
            { id: 'branches', label: 'Facilities', icon: Warehouse, badge: branches.length },
            { id: 'reports', label: 'Reports & Analytics', icon: FileSpreadsheet, badge: 'PROD' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all text-xs ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/25 font-bold'
                    : 'bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#27272A] text-slate-700 dark:text-[#A1A1AA]'
                    }`}
                  >
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

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#52525B]" />
            <input
              type="text"
              placeholder="Search SKU or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6] transition"
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
            onClick={() => fetchTabData(true)}
            title="Refresh Live Data"
            className="p-1.5 border bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] hover:text-[#8B5CF6] rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#8B5CF6]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── TAB 1: STOCK MATRIX ────────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          {/* Multi-Field Filter Bar */}
          <div className="p-3 bg-slate-50/70 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
            {/* Filter 1: Product Name */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Product Name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="w-full pl-8 pr-6 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6]"
              />
              {nameFilter && (
                <button onClick={() => setNameFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter 2: SKU */}
            <div className="relative">
              <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by SKU..."
                value={skuFilter}
                onChange={(e) => setSkuFilter(e.target.value)}
                className="w-full pl-8 pr-6 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono uppercase text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 placeholder:normal-case focus:outline-none focus:border-[#8B5CF6]"
              />
              {skuFilter && (
                <button onClick={() => setSkuFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter 3: Stock Status */}
            <div>
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL">📊 All Stock Statuses</option>
                <option value="IN_STOCK">🟢 In Stock (Healthy)</option>
                <option value="LOW_STOCK">🟡 Low Stock (≤ Reorder)</option>
                <option value="OUT_OF_STOCK">🔴 Out of Stock (0 Qty)</option>
              </select>
            </div>

            {/* Filter 4: Category */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL">📂 All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 5: Clear & Summary */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-[#71717A] truncate">
                Showing <strong>{filteredInventoryList.length}</strong> items
              </span>
              {isAnyStockFilterActive && (
                <button
                  onClick={clearAllStockFilters}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition flex items-center gap-1 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* DUAL MODE 1: MOBILE TOUCH CARDS (sm:hidden) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-[#27272A]">
            {loading && filteredInventoryList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B5CF6]" />
                <span className="text-xs font-medium">Loading stock matrix...</span>
              </div>
            ) : filteredInventoryList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#52525B]" />
                <p className="font-semibold text-xs text-slate-600 dark:text-[#A1A1AA]">No inventory records found</p>
                <button
                  onClick={() => setCurrentView('inventory-add-sku')}
                  className="mt-3 px-3 py-1.5 bg-[#8B5CF6] text-white rounded-xl text-xs font-bold"
                >
                  + Add SKU & Stock
                </button>
              </div>
            ) : (
              filteredInventoryList.map((item) => {
                const availableQty = Math.max(0, (item.quantity || 0) - (item.reservedQuantity || 0));
                const stockInfo = getStockStatus(availableQty, item.reorderLevel || item.product?.reorderLevel);
                const productTotalSum =
                  productWiseStockMap.get(item.productId || item.product?.id)?.totalStock ??
                  (item.product as any)?.stock ??
                  item.quantity;
                const prodId = item.productId || item.product?.id || item.id;

                return (
                  <div key={item.id} className="p-3.5 space-y-2.5 hover:bg-slate-50 dark:hover:bg-[#27272A]/30 transition">
                    <div className="flex items-start gap-3">
                      {item.product?.thumbnail ? (
                        <img
                          src={item.product.thumbnail}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-[#27272A] flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-[#FAFAFA] truncate">
                            {item.product?.name || 'Product'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              stockInfo.isOutOfStock
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : stockInfo.isLowStock
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {stockInfo.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-500 dark:text-[#71717A]">
                          <span className="bg-slate-100 dark:bg-[#27272A] px-1.5 py-0.5 rounded font-bold">
                            {item.product?.sku || 'SKU'}
                          </span>
                          <span>•</span>
                          <span className="text-slate-700 dark:text-[#A1A1AA]">
                            [{item.branch?.code || 'DEL'}] {item.branch?.name || 'Facility'}
                          </span>
                        </div>

                        {(((item.product as any)?.finish || (item.product?.attributes as any)?.finish) ||
                          ((item.product as any)?.colour || (item.product?.attributes as any)?.colour || (item.product?.attributes as any)?.color || (item.product?.colours && item.product?.colours[0])) ||
                          ((item.product as any)?.dimensions?.height || (item.product as any)?.dimensions?.width || (item.product as any)?.dimensions?.length || (item.product?.attributes as any)?.height || (item.product?.attributes as any)?.width || (item.product?.attributes as any)?.length)) && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {((item.product as any)?.finish || (item.product?.attributes as any)?.finish) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#8B5CF6]/15 text-[#8B5CF6] dark:text-[#A855F7] border border-[#8B5CF6]/25">
                                {(item.product as any)?.finish || (item.product?.attributes as any)?.finish}
                              </span>
                            )}
                            {((item.product as any)?.colour || (item.product?.attributes as any)?.colour || (item.product?.attributes as any)?.color || (item.product?.colours && item.product?.colours[0])) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200/80 dark:bg-[#27272A] text-slate-700 dark:text-[#D4D4D8] border border-slate-300 dark:border-[#3F3F46]">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getColourSwatch((item.product as any)?.colour || (item.product?.attributes as any)?.colour || (item.product?.attributes as any)?.color || (item.product?.colours && item.product?.colours[0])) }} />
                                {(item.product as any)?.colour || (item.product?.attributes as any)?.colour || (item.product?.attributes as any)?.color || (item.product?.colours && item.product?.colours[0])}
                              </span>
                            )}
                            {((item.product as any)?.dimensions?.height || (item.product as any)?.dimensions?.width || (item.product as any)?.dimensions?.length || (item.product?.attributes as any)?.height || (item.product?.attributes as any)?.width || (item.product?.attributes as any)?.length) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-600 dark:text-[#A1A1AA] bg-slate-100 dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A]">
                                {[
                                  ((item.product as any)?.dimensions?.height || (item.product?.attributes as any)?.height) ? `${(item.product as any)?.dimensions?.height || (item.product?.attributes as any)?.height}H` : '',
                                  ((item.product as any)?.dimensions?.width || (item.product?.attributes as any)?.width) ? `${(item.product as any)?.dimensions?.width || (item.product?.attributes as any)?.width}W` : '',
                                  ((item.product as any)?.dimensions?.length || (item.product?.attributes as any)?.length) ? `${(item.product as any)?.dimensions?.length || (item.product?.attributes as any)?.length}L` : '',
                                ].filter(Boolean).join(' × ')} {((item.product as any)?.dimensions?.unit || (item.product?.attributes as any)?.unit || 'mm')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stock Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-[#09090B] rounded-xl border border-slate-200/60 dark:border-[#27272A] text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Facility Qty</span>
                        <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-[#FAFAFA]">
                          {item.quantity.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Network</span>
                        <span className="font-mono font-extrabold text-xs text-[#8B5CF6] dark:text-[#A855F7]">
                          {productTotalSum.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Reorder Lvl</span>
                        <span className="font-mono text-xs text-slate-500 dark:text-[#71717A]">
                          {item.reorderLevel || 10}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
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
                        className="flex-1 py-1.5 bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                      >
                        ⚡ Adjust
                      </button>

                      <button
                        onClick={() => setEditingStockItem(item)}
                        className="flex-1 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          localStorage.setItem('prc_admin_selected_product_id', prodId);
                          setCurrentView('product-dossier');
                        }}
                        className="flex-1 py-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Audit</span>
                      </button>

                      <button
                        onClick={() => {
                          setDeleteConfirmation({
                            type: 'inventory',
                            id: item.id,
                            name: item.product?.sku || item.product?.name || 'SKU',
                            productId: item.productId,
                          });
                        }}
                        title="Delete SKU from Stock & Product Catalog"
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DUAL MODE 2: DESKTOP HIGH-DENSITY TABLE (hidden md:table) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Product Details & SKU</th>
                  <th className="py-3 px-4">Branch Facility</th>
                  <th className="py-3 px-4 text-right">Facility Qty</th>
                  <th className="py-3 px-4 text-center">Consolidated Network Stock</th>
                  <th className="py-3 px-4 text-right">Reserved</th>
                  <th className="py-3 px-4 text-right">Reorder Level</th>
                  <th className="py-3 px-4 text-center">Health Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {loading && filteredInventoryList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B5CF6]" />
                      <span className="text-xs font-medium">Loading branch inventories...</span>
                    </td>
                  </tr>
                ) : filteredInventoryList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-[#71717A]">
                      <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#52525B]" />
                      <p className="font-semibold text-xs text-slate-600 dark:text-[#A1A1AA]">
                        {isAnyStockFilterActive ? 'No items match the selected filter criteria' : 'No inventory records found'}
                      </p>
                      {isAnyStockFilterActive ? (
                        <button
                          onClick={clearAllStockFilters}
                          className="mt-3 px-3 py-1 bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white rounded-lg text-xs font-bold transition"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentView('inventory-add-sku')}
                          className="mt-3 px-3 py-1 bg-[#8B5CF6] text-white hover:bg-[#7C3AED] rounded-lg text-xs font-bold transition"
                        >
                          + Add New SKU & Stock
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredInventoryList.map((item) => {
                    const availableQty = Math.max(0, (item.quantity || 0) - (item.reservedQuantity || 0));
                    const stockInfo = getStockStatus(availableQty, item.reorderLevel || item.product?.reorderLevel);
                    const productTotalSum =
                      productWiseStockMap.get(item.productId || item.product?.id)?.totalStock ??
                      (item.product as any)?.stock ??
                      item.quantity;
                    const prodId = item.productId || item.product?.id || item.id;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition group">
                        <td
                          className="py-3 px-4 cursor-pointer"
                          onClick={() => {
                            localStorage.setItem('prc_admin_selected_product_id', prodId);
                            setCurrentView('product-dossier');
                          }}
                          title="Open Product Audit & Traceability Hub"
                        >
                          <div className="flex items-center gap-3">
                            {item.product?.thumbnail ? (
                              <img
                                src={item.product.thumbnail}
                                alt={item.product.name}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-[#27272A] flex-shrink-0 group-hover:border-[#8B5CF6] transition-colors"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-[#FAFAFA] line-clamp-1 block group-hover:text-[#8B5CF6] transition-colors">
                                  {item.product?.name || 'Unnamed Product'}
                                </span>
                                <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-[#8B5CF6] transition-opacity" />
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-[#71717A] font-mono">
                                <span>SKU: {item.product?.sku || 'N/A'}</span>
                                {item.product?.category && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-600 dark:text-[#A1A1AA] font-sans">
                                      {item.product.category.name}
                                    </span>
                                  </>
                                )}
                              </div>
                              {(((item.product as any)?.finish || (item.product?.attributes as any)?.finish) ||
                                ((item.product as any)?.colour || (item.product?.attributes as any)?.colour || (item.product?.attributes as any)?.color || (item.product?.colours && item.product?.colours[0])) ||
                                ((item.product as any)?.dimensions?.height || (item.product as any)?.dimensions?.width || (item.product as any)?.dimensions?.length || (item.product?.attributes as any)?.height || (item.product?.attributes as any)?.width || (item.product?.attributes as any)?.length)) && (
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                  {((item.product as any)?.finish || (item.product?.attributes as any)?.finish) && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#8B5CF6]/15 text-[#8B5CF6] dark:text-[#A855F7] border border-[#8B5CF6]/25">
                                      {(item.product as any)?.finish || (item.product?.attributes as any)?.finish}
                                    </span>
                                  )}
                                  {((item.product as any)?.colour || (item.product?.attributes as any)?.colour || (item.product?.attributes as any)?.color || (item.product?.colours && item.product?.colours[0])) && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#D4D4D8] border border-slate-200 dark:border-[#3F3F46]">
                                      <span className="w-1.5 h-1.5 rounded-full border border-black/20 dark:border-white/20" style={{ backgroundColor: getColourSwatch((item.product as any)?.colour || (item.product?.attributes as any)?.colour || (item.product?.attributes as any)?.color || (item.product?.colours && item.product?.colours[0])) }} />
                                      {(item.product as any)?.colour || (item.product?.attributes as any)?.colour || (item.product?.attributes as any)?.color || (item.product?.colours && item.product?.colours[0])}
                                    </span>
                                  )}
                                  {((item.product as any)?.dimensions?.height || (item.product as any)?.dimensions?.width || (item.product as any)?.dimensions?.length || (item.product?.attributes as any)?.height || (item.product?.attributes as any)?.width || (item.product?.attributes as any)?.length) && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-600 dark:text-[#A1A1AA] bg-slate-100/80 dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A]">
                                      {[
                                        ((item.product as any)?.dimensions?.height || (item.product?.attributes as any)?.height) ? `${(item.product as any)?.dimensions?.height || (item.product?.attributes as any)?.height}H` : '',
                                        ((item.product as any)?.dimensions?.width || (item.product?.attributes as any)?.width) ? `${(item.product as any)?.dimensions?.width || (item.product?.attributes as any)?.width}W` : '',
                                        ((item.product as any)?.dimensions?.length || (item.product?.attributes as any)?.length) ? `${(item.product as any)?.dimensions?.length || (item.product?.attributes as any)?.length}L` : '',
                                      ].filter(Boolean).join(' × ')} {((item.product as any)?.dimensions?.unit || (item.product?.attributes as any)?.unit || 'mm')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#FAFAFA]">
                              {item.branch?.code || 'DEL'}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-[#FAFAFA] truncate max-w-[130px]">
                              {item.branch?.name || 'Delhi HQ'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-sm font-extrabold font-mono ${
                              stockInfo.isOutOfStock
                                ? 'text-rose-600 dark:text-rose-400'
                                : stockInfo.isLowStock
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-900 dark:text-[#FAFAFA]'
                            }`}
                          >
                            {item.quantity.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-extrabold bg-[#8B5CF6]/10 text-[#8B5CF6] dark:text-[#A855F7] border border-[#8B5CF6]/20">
                            {productTotalSum.toLocaleString()} Units
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="text-xs text-slate-500 dark:text-[#71717A] font-semibold font-mono">
                            {item.reservedQuantity || 0}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="text-xs text-slate-500 dark:text-[#71717A] font-semibold font-mono">
                            {item.reorderLevel || 10}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              stockInfo.isOutOfStock
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                                : stockInfo.isLowStock
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {stockInfo.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                localStorage.setItem('prc_admin_selected_product_id', prodId);
                                setCurrentView('product-dossier');
                              }}
                              title="Audit Hub"
                              className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500 text-sky-600 dark:text-sky-400 hover:text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Audit</span>
                            </button>

                            <button
                              onClick={() => setEditingStockItem(item)}
                              title="Edit Stock Thresholds"
                              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

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
                              title="Quick Stock Adjustment"
                              className="px-2 py-1 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6] text-[#8B5CF6] hover:text-white rounded-lg text-[11px] font-bold transition"
                            >
                              ⚡ Adjust
                            </button>

                            <button
                              onClick={() => {
                                setDeleteConfirmation({
                                  type: 'inventory',
                                  id: item.id,
                                  name: item.product?.sku || item.product?.name || 'SKU Allocation',
                                  productId: item.productId,
                                });
                              }}
                              title="Delete SKU from Stock List & Auto-Delete from Product Catalog"
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
          <div className="px-4 py-3 bg-slate-50 dark:bg-[#09090B] border-t border-slate-200 dark:border-[#27272A] flex items-center justify-between text-xs text-slate-500 dark:text-[#71717A]">
            <span>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} total records)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg disabled:opacity-40 font-semibold"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg disabled:opacity-40 font-semibold"
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
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Record Stock-In Purchase</span>
              </button>
              <button
                onClick={() => handleDownloadProductionReport('purchases', 'xlsx')}
                disabled={reportDownloading === 'purchases-xlsx'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#3F3F46] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-[#3F3F46]"
                title="Download Itemized Procurement Report"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>{reportDownloading === 'purchases-xlsx' ? 'Exporting...' : 'Export Purchases'}</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-500">
              Showing <strong>{purchasesList.length}</strong> purchase orders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">PO / Invoice #</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Destination Facility</th>
                  <th className="py-3 px-4 text-center">Items Received</th>
                  <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {loading && purchasesList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B5CF6]" />
                      Loading purchase records...
                    </td>
                  </tr>
                ) : purchasesList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#52525B]" />
                      <p className="font-semibold text-xs">No purchase orders recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  purchasesList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#8B5CF6]">
                        {p.invoiceNumber || `PO-${p.id.slice(0, 8).toUpperCase()}`}
                      </td>
                      <td className="py-3 px-4 font-semibold">{p.supplier?.name || 'Direct Vendor'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-[#27272A] font-bold">
                          {p.branch?.code || 'DEL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {p.items?.length || 0} line items
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(p.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setDeleteConfirmation({
                              type: 'purchase',
                              id: p.id,
                              name: p.invoiceNumber || `PO-${p.id.slice(0, 8)}`,
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: TRANSFERS ──────────────────────────────────────────────── */}
      {activeTab === 'transfers' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between gap-3 text-xs">
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Initiate Stock Transfer</span>
            </button>
            <span className="text-[11px] text-slate-500">
              Showing <strong>{transfersList.length}</strong> transfers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Transfer Ref</th>
                  <th className="py-3 px-4">Route (From ➔ To)</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Requested Date</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {loading && transfersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B5CF6]" />
                      Loading transfer requests...
                    </td>
                  </tr>
                ) : transfersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#52525B]" />
                      <p className="font-semibold text-xs">No stock transfers found</p>
                    </td>
                  </tr>
                ) : (
                  transfersList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#8B5CF6]">
                        {`TRF-${t.id.slice(0, 8).toUpperCase()}`}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        <span className="text-slate-900 dark:text-[#FAFAFA]">{t.fromBranch?.code || 'DEL'}</span>
                        <span className="mx-2 text-[#8B5CF6]">➔</span>
                        <span className="text-slate-900 dark:text-[#FAFAFA]">{t.toBranch?.code || 'KOL'}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {t.items?.length || 0} SKUs
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'RECEIVED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : t.status === 'IN_TRANSIT'
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              : t.status === 'CANCELLED'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleTransferDispatch(t.id)}
                                disabled={actionLoading}
                                className="px-2 py-0.5 bg-sky-500/10 text-sky-600 hover:bg-sky-500 hover:text-white rounded text-[11px] font-bold transition"
                              >
                                Dispatch
                              </button>
                              <button
                                onClick={() => handleTransferCancel(t.id)}
                                disabled={actionLoading}
                                className="px-2 py-0.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white rounded text-[11px] font-bold transition"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {t.status === 'IN_TRANSIT' && (
                            <button
                              onClick={() => handleTransferReceive(t.id)}
                              disabled={actionLoading}
                              className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded text-[11px] font-bold transition"
                            >
                              Receive In
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: MOVEMENTS (LEDGER) ──────────────────────────────────────── */}
      {activeTab === 'movements' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800 dark:text-[#FAFAFA]">Chronological Stock Movement Audit Ledger</span>
              <button
                onClick={() => handleDownloadProductionReport('audit', 'xlsx')}
                disabled={reportDownloading === 'audit-xlsx'}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#3F3F46] text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold transition border border-slate-200 dark:border-[#3F3F46]"
                title="Download Stock Movement Audit Ledger"
              >
                <Download className="w-3 h-3 text-sky-500" />
                <span>{reportDownloading === 'audit-xlsx' ? 'Exporting...' : 'Export Audit Ledger'}</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-500">Showing {movementsList.length} movements</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Facility</th>
                  <th className="py-3 px-4 text-center">Movement Type</th>
                  <th className="py-3 px-4 text-right">Quantity Delta</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {loading && movementsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B5CF6]" />
                      Loading stock audit movements...
                    </td>
                  </tr>
                ) : movementsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#52525B]" />
                      <p className="font-semibold text-xs">No stock movements recorded</p>
                    </td>
                  </tr>
                ) : (
                  movementsList.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString('en-IN') : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold block">{m.product?.name || 'Product'}</span>
                        <span className="text-[10px] font-mono text-slate-400">{m.product?.sku}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-[#A1A1AA]">
                        {m.branch?.code || 'DEL'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.type.includes('IN') || m.type.includes('PURCHASE')
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-extrabold ${
                          m.type.includes('IN') || m.type.includes('PURCHASE')
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {m.type.includes('IN') || m.type.includes('PURCHASE') ? `+${m.quantity}` : `-${m.quantity}`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                        {m.newQty ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[200px]">
                        {m.notes || m.referenceType || 'Normal stock transaction'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: SUPPLIERS ──────────────────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between text-xs">
            <button
              onClick={() => {
                setEditingSupplier(null);
                setIsSupplierModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Register New Supplier / Vendor</span>
            </button>
            <span className="text-[11px] text-slate-500">Showing {suppliers.length} vendors</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Vendor / Firm Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone & Email</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No suppliers registered yet.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-[#FAFAFA]">{s.name}</td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-[#A1A1AA]">{s.contactPerson || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {s.phone && <div>{s.phone}</div>}
                        {s.email && <div className="text-[10px]">{s.email}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">{s.gstNumber || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-200 dark:bg-[#27272A] text-slate-500'
                          }`}
                        >
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingSupplier(s);
                              setIsSupplierModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-[#8B5CF6] rounded transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmation({
                                type: 'supplier',
                                id: s.id,
                                name: s.name,
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 6: BRANCH FACILITIES ──────────────────────────────────────── */}
      {activeTab === 'branches' && (
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/60 dark:bg-[#09090B]/60 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between text-xs">
            <button
              onClick={() => {
                setEditingBranch(null);
                setIsBranchModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Register New Facility</span>
            </button>
            <span className="text-[11px] text-slate-500">Showing {branches.length} facilities</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Facility Code</th>
                  <th className="py-3 px-4">Facility Name</th>
                  <th className="py-3 px-4">City / Region</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#27272A] text-slate-800 dark:text-[#FAFAFA]">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/40 transition">
                    <td className="py-3 px-4 font-mono font-extrabold text-[#8B5CF6]">{b.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-[#FAFAFA]">{b.name}</td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-[#A1A1AA]">
                      {b.city || 'N/A'}, {b.state || ''}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[200px]">
                      {b.address || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-[#27272A] text-slate-500'
                        }`}
                      >
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingBranch(b);
                            setIsBranchModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-[#8B5CF6] rounded transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirmation({
                              type: 'branch',
                              id: b.id,
                              name: b.name,
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 7: REPORTS & ANALYTICS ────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Time Horizon & Parameters Control Dock */}
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#27272A] pb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#8B5CF6]" />
                  <span>Production Report Generator & Audit Center</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#71717A] mt-0.5">
                  Download itemized, auditor-grade spreadsheets with live balance verification and user attribution
                </p>
              </div>

              {/* Time Horizon Selector Chips */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#09090B] p-1.5 rounded-xl border border-slate-200 dark:border-[#27272A]">
                {(
                  [
                    { id: 'day', label: 'Day-Wise' },
                    { id: 'week', label: 'Week-Wise' },
                    { id: 'month', label: 'Month-Wise' },
                    { id: 'year', label: 'Year-Wise' },
                    { id: 'range', label: 'Custom Range' },
                  ] as const
                ).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setReportHorizon(h.id)}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                      reportHorizon === h.id
                        ? 'bg-[#8B5CF6] text-white shadow-sm font-bold'
                        : 'text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#FAFAFA]'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Controls based on Horizon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
              {reportHorizon === 'day' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    Select Specific Date
                  </label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              )}

              {reportHorizon === 'week' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    Select Any Date Within Week
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    <span className="text-xs font-semibold px-2.5 py-1.5 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 rounded-xl">
                      Week: {getWeekSpanDisplay(reportDate)}
                    </span>
                  </div>
                </div>
              )}

              {reportHorizon === 'month' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">Select Month</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    >
                      {[
                        { val: 1, name: 'January' },
                        { val: 2, name: 'February' },
                        { val: 3, name: 'March' },
                        { val: 4, name: 'April' },
                        { val: 5, name: 'May' },
                        { val: 6, name: 'June' },
                        { val: 7, name: 'July' },
                        { val: 8, name: 'August' },
                        { val: 9, name: 'September' },
                        { val: 10, name: 'October' },
                        { val: 11, name: 'November' },
                        { val: 12, name: 'December' },
                      ].map((m) => (
                        <option key={m.val} value={m.val}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">Select Year</label>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {reportHorizon === 'year' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">Select Calendar Year</label>
                  <select
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {reportHorizon === 'range' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">From Date</label>
                    <input
                      type="date"
                      value={reportRangeFrom}
                      onChange={(e) => setReportRangeFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">To Date</label>
                    <input
                      type="date"
                      value={reportRangeTo}
                      onChange={(e) => setReportRangeTo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </>
              )}

              {/* Facility Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Facility / Depot Scope</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="ALL">All Depots / Facilities ({branches.length})</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.code ? `(${b.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel Scope (for Orders) */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Sales Channel Scope</label>
                <select
                  value={reportChannel}
                  onChange={(e) => setReportChannel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="all">All Channels (B2C + B2B Wholesale)</option>
                  <option value="b2c">B2C Retail Storefront</option>
                  <option value="b2b">B2B Wholesale Portal</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4 Dedicated Production Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Report 1: Stock Matrix & Valuation */}
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#8B5CF6]/50 transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-[#8B5CF6] flex items-center justify-center">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-[#8B5CF6] border border-violet-200 dark:border-violet-800/40 uppercase tracking-wide">
                    Live Balance & Value
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm">
                    Stock Matrix & Valuation Report
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#71717A] mt-1 leading-relaxed">
                    Complete multi-depot stock position breakdown detailing on-hand units, reserved balances, available quantities, reorder thresholds, and unit valuation in INR.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-[#09090B] p-2.5 rounded-xl border border-slate-200/60 dark:border-[#27272A] text-[11px] text-slate-600 dark:text-[#A1A1AA] flex items-center justify-between">
                  <span>Tracked SKUs: <strong className="text-slate-900 dark:text-[#FAFAFA]">{inventoryList.length}</strong></span>
                  <span>Low Stock: <strong className="text-amber-500">{metrics.lowStockCount}</strong></span>
                  <span>Depots: <strong className="text-[#8B5CF6]">{branches.length}</strong></span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadProductionReport('stock', 'xlsx')}
                  disabled={reportDownloading === 'stock-xlsx'}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-[#8B5CF6]/20 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{reportDownloading === 'stock-xlsx' ? 'Generating Excel...' : 'Download Excel (.xlsx)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadProductionReport('stock', 'pdf')}
                  disabled={reportDownloading === 'stock-pdf'}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#3F3F46] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-[#3F3F46]"
                  title="Download PDF"
                >
                  <FileText className="w-4 h-4 text-rose-500" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Report 2: Stock Movements Audit Ledger */}
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-500/50 transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-500 border border-sky-200 dark:border-sky-800/40 uppercase tracking-wide">
                    Immutable Audit
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm">
                    Stock Movements Audit Ledger
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#71717A] mt-1 leading-relaxed">
                    Granular chronological audit trail tracking quantity delta (+/-), staff actor attribution (full name & email), before/after progression, reference IDs, and audit notes.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-[#09090B] p-2.5 rounded-xl border border-slate-200/60 dark:border-[#27272A] text-[11px] text-slate-600 dark:text-[#A1A1AA] flex items-center justify-between">
                  <span>Action Types: <strong className="text-slate-900 dark:text-[#FAFAFA]">In / Out / Transfer / Adj</strong></span>
                  <span>Attribution: <strong className="text-sky-500">Staff & Email</strong></span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleDownloadProductionReport('audit', 'xlsx')}
                  disabled={reportDownloading === 'audit-xlsx'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{reportDownloading === 'audit-xlsx' ? 'Generating Audit Ledger...' : 'Download Audit Ledger (.xlsx)'}</span>
                </button>
              </div>
            </div>

            {/* Report 3: Itemized Purchases & Procurement Report */}
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 border border-emerald-200 dark:border-emerald-800/40 uppercase tracking-wide">
                    Procurement Trail
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm">
                    Itemized Purchases & Procurement Report
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#71717A] mt-1 leading-relaxed">
                    Answers specifically <strong>who purchased, in which date, how much quantity</strong>, unit purchase price, line total, vendor/supplier, buyer staff member, and destination branch.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-[#09090B] p-2.5 rounded-xl border border-slate-200/60 dark:border-[#27272A] text-[11px] text-slate-600 dark:text-[#A1A1AA] flex items-center justify-between">
                  <span>Breakdown: <strong className="text-slate-900 dark:text-[#FAFAFA]">Line-by-Line</strong></span>
                  <span>Suppliers: <strong className="text-emerald-500">{suppliers.length} Active</strong></span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleDownloadProductionReport('purchases', 'xlsx')}
                  disabled={reportDownloading === 'purchases-xlsx'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{reportDownloading === 'purchases-xlsx' ? 'Generating Purchases...' : 'Download Purchases Report (.xlsx)'}</span>
                </button>
              </div>
            </div>

            {/* Report 4: Customer Orders & Stock Consumption Report */}
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-500/50 transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200 dark:border-amber-800/40 uppercase tracking-wide">
                    Sales & Outward Stock
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm">
                    Customer Orders & Stock Consumption Report
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#71717A] mt-1 leading-relaxed">
                    Answers specifically <strong>who placed the order, in which date, how much quantity</strong>, customer name, email, phone, company, SKU, selling price, line total, and warehouse.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-[#09090B] p-2.5 rounded-xl border border-slate-200/60 dark:border-[#27272A] text-[11px] text-slate-600 dark:text-[#A1A1AA] flex items-center justify-between">
                  <span>Channels: <strong className="text-slate-900 dark:text-[#FAFAFA]">B2C + B2B</strong></span>
                  <span>Attribution: <strong className="text-amber-500">Customer & Company</strong></span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleDownloadProductionReport('orders', 'xlsx')}
                  disabled={reportDownloading === 'orders-xlsx'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{reportDownloading === 'orders-xlsx' ? 'Generating Consumption...' : 'Download Consumption Report (.xlsx)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE CONFIRMATION ───────────────────────────────────────── */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-[#27272A] p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-[#FAFAFA]">
                  Confirm SKU / Item Deletion
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#71717A]">
                  This action triggers catalog & warehouse synchronization
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#A1A1AA] leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 dark:text-[#FAFAFA] font-bold">"{deleteConfirmation.name}"</strong>?
              {deleteConfirmation.type === 'inventory' &&
                ' Deleting this SKU will write off all warehouse stocks across facilities and automatically delete this product from the product listing page and storefront catalog.'}
              {deleteConfirmation.type === 'purchase' &&
                ' Voiding this purchase will automatically roll back received inventory units and log audit adjustments.'}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/25 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: QUICK STOCK ─────────────────────────────────────────────── */}
      {isQuickStockModalOpen && (
        <QuickStockModal
          branches={branches}
          categories={categories}
          onClose={() => setIsQuickStockModalOpen(false)}
          onSuccess={() => {
            setIsQuickStockModalOpen(false);
            showToast('New SKU and stock allocation successfully registered', 'success');
            fetchTabData(true);
          }}
        />
      )}

      {/* ─── MODAL: PURCHASE STOCK-IN ───────────────────────────────────────── */}
      {isPurchaseModalOpen && (
        <PurchaseModal
          branches={branches}
          suppliers={suppliers}
          onClose={() => setIsPurchaseModalOpen(false)}
          onSuccess={() => {
            setIsPurchaseModalOpen(false);
            showToast('Purchase stock-in successfully recorded', 'success');
            fetchTabData(true);
          }}
        />
      )}

      {/* ─── MODAL: STOCK TRANSFER ──────────────────────────────────────────── */}
      {isTransferModalOpen && (
        <TransferModal
          branches={branches}
          onClose={() => setIsTransferModalOpen(false)}
          onSuccess={() => {
            setIsTransferModalOpen(false);
            showToast('Inter-branch stock transfer successfully requested', 'success');
            fetchTabData(true);
          }}
        />
      )}

      {/* ─── MODAL: ADJUSTMENT ──────────────────────────────────────────────── */}
      {isAdjustmentModalOpen && (
        <AdjustmentModal
          branches={branches}
          targetProduct={quickActionProduct}
          onClose={() => {
            setIsAdjustmentModalOpen(false);
            setQuickActionProduct(null);
          }}
          onSuccess={() => {
            setIsAdjustmentModalOpen(false);
            setQuickActionProduct(null);
            showToast('Stock adjustment recorded in audit ledger', 'success');
            fetchTabData(true);
          }}
        />
      )}

      {/* ─── MODAL: EDIT STOCK MATRIX ITEM ──────────────────────────────────── */}
      {editingStockItem && (
        <StockEditModal
          item={editingStockItem}
          branches={branches}
          onClose={() => setEditingStockItem(null)}
          onSuccess={() => {
            setEditingStockItem(null);
            showToast('Stock thresholds updated successfully', 'success');
            fetchTabData(true);
          }}
        />
      )}

      {/* ─── MODAL: EDIT STOCK MOVEMENT ─────────────────────────────────────── */}
      {editingMovement && (
        <MovementEditModal
          movement={editingMovement}
          mode="edit_notes"
          onClose={() => setEditingMovement(null)}
          onSuccess={(msg) => {
            setEditingMovement(null);
            showToast(msg || 'Movement audit record updated', 'success');
            fetchTabData(true);
          }}
        />
      )}

      {/* ─── MODAL: SUPPLIER ────────────────────────────────────────────────── */}
      {isSupplierModalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setIsSupplierModalOpen(false);
            setEditingSupplier(null);
          }}
          onSuccess={() => {
            setIsSupplierModalOpen(false);
            setEditingSupplier(null);
            showToast('Supplier record saved', 'success');
            loadReferenceData();
            fetchTabData(true);
          }}
        />
      )}

      {/* ─── MODAL: BRANCH FACILITY ─────────────────────────────────────────── */}
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
            showToast('Fulfillment facility saved', 'success');
            loadReferenceData();
            fetchTabData(true);
          }}
        />
      )}

      {/* ─── MODAL: PRODUCT DOSSIER ─────────────────────────────────────────── */}
      {isDossierModalOpen && selectedDossierProductId && (
        <ProductDossierModal
          isOpen={isDossierModalOpen}
          productId={selectedDossierProductId}
          onClose={() => {
            setIsDossierModalOpen(false);
            setSelectedDossierProductId(null);
          }}
          productName={selectedDossierProductName}
          sku={selectedDossierSku}
          branches={branches}
          suppliers={suppliers}
        />
      )}
    </div>
  );
};
