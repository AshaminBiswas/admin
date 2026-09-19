import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Boxes,
  Search,
  Plus,
  RefreshCw,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Eye,
  Sliders,
  Sparkles,
  Wrench,
  Camera,
  FileSpreadsheet,
  X,
  ChevronRight,
  Check,
  TrendingDown,
  TrendingUp,
  ClipboardList,
  Flame,
  Building2,
  Calendar,
} from 'lucide-react';
import { upApi } from '../../../api/upApi';
import type {
  UPInventoryDashboardData,
  UPSkuSearchResult,
  UPStockItem,
  UPBom,
  UPProductionOrder,
  UPPhysicalCount,
  UPInventoryReports,
} from '../../../api/upApi';
import { fetchAdminApi } from '../../../api/adminApi';

interface UPInventoryHubProps {
  isSuperAdmin: boolean;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

type InvSubTab =
  | 'overview'
  | 'stock'
  | 'raw-materials'
  | 'finished-goods'
  | 'movements'
  | 'bom'
  | 'production'
  | 'transfers'
  | 'damaged'
  | 'scrap'
  | 'physical-counts'
  | 'reports';

export function UPInventoryHub({ isSuperAdmin, onShowSuccess, onShowError }: UPInventoryHubProps) {
  // ─── Sub-Tab State ──────────────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<InvSubTab>('overview');

  // ─── Facility / Branch State ────────────────────────────────────────────────
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // ─── Dashboard KPIs ─────────────────────────────────────────────────────────
  const [dashboardData, setDashboardData] = useState<UPInventoryDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // ─── Instant SKU Search Dock (<100ms) ───────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UPSkuSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // ─── Stock Matrix State ─────────────────────────────────────────────────────
  const [stockItems, setStockItems] = useState<UPStockItem[]>([]);
  const [stockPage, setStockPage] = useState(1);
  const [stockTotalPages, setStockTotalPages] = useState(1);
  const [stockTotal, setStockTotal] = useState(0);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [stockSearch, setStockSearch] = useState('');

  // ─── BOM Master State ───────────────────────────────────────────────────────
  const [boms, setBoms] = useState<UPBom[]>([]);
  const [loadingBoms, setLoadingBoms] = useState(false);
  const [selectedBom, setSelectedBom] = useState<UPBom | null>(null);

  // ─── Production Orders State ────────────────────────────────────────────────
  const [productionOrders, setProductionOrders] = useState<UPProductionOrder[]>([]);
  const [loadingProduction, setLoadingProduction] = useState(false);
  const [prodStatusFilter, setProdStatusFilter] = useState('ALL');

  // ─── Physical Counts State ──────────────────────────────────────────────────
  const [physicalCounts, setPhysicalCounts] = useState<UPPhysicalCount[]>([]);
  const [loadingPhysical, setLoadingPhysical] = useState(false);

  // ─── Reports State ──────────────────────────────────────────────────────────
  const [reportsData, setReportsData] = useState<UPInventoryReports | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // ─── Modals State ───────────────────────────────────────────────────────────
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [isCreateBomModalOpen, setIsCreateBomModalOpen] = useState(false);
  const [isCreateProdOrderModalOpen, setIsCreateProdOrderModalOpen] = useState(false);
  const [completingOrder, setCompletingOrder] = useState<UPProductionOrder | null>(null);

  // Active item prefill for 1-tap floor actions
  const [activeActionProduct, setActiveActionProduct] = useState<{ id: string; name: string; sku: string } | null>(null);

  // ─── Form Inputs ────────────────────────────────────────────────────────────
  // Receive Form
  const [rcvProductId, setRcvProductId] = useState('');
  const [rcvQuantity, setRcvQuantity] = useState('');
  const [rcvUnitCost, setRcvUnitCost] = useState('');
  const [rcvSupplier, setRcvSupplier] = useState('');
  const [rcvInvoice, setRcvInvoice] = useState('');
  const [rcvNotes, setRcvNotes] = useState('');
  const [savingReceive, setSavingReceive] = useState(false);

  // Issue Form
  const [issueProductId, setIssueProductId] = useState('');
  const [issueQuantity, setIssueQuantity] = useState('');
  const [issueProdOrderId, setIssueProdOrderId] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [savingIssue, setSavingIssue] = useState(false);

  // Transfer Form
  const [transferProductId, setTransferProductId] = useState('');
  const [transferFromBranch, setTransferFromBranch] = useState('');
  const [transferToBranch, setTransferToBranch] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [savingTransfer, setSavingTransfer] = useState(false);

  // Damage Form
  const [dmgProductId, setDmgProductId] = useState('');
  const [dmgQuantity, setDmgQuantity] = useState('');
  const [dmgReason, setDmgReason] = useState('');
  const [dmgPhotoUrl, setDmgPhotoUrl] = useState('');
  const [savingDamage, setSavingDamage] = useState(false);

  // Scrap Form
  const [scrapMaterialName, setScrapMaterialName] = useState('');
  const [scrapProductId, setScrapProductId] = useState('');
  const [scrapQuantity, setScrapQuantity] = useState('');
  const [scrapUnit, setScrapUnit] = useState('kg');
  const [scrapReason, setScrapReason] = useState('');
  const [scrapLossRupees, setScrapLossRupees] = useState('');
  const [savingScrap, setSavingScrap] = useState(false);

  // BOM Form
  const [bomName, setBomName] = useState('');
  const [bomProductId, setBomProductId] = useState('');
  const [bomSku, setBomSku] = useState('');
  const [bomVersion, setBomVersion] = useState('1.0');
  const [bomNotes, setBomNotes] = useState('');
  const [bomItems, setBomItems] = useState<Array<{ rawMaterialId: string; rawMaterialSku: string; rawMaterialName: string; quantityRequired: number; unit: string; wastePercentage: number }>>([
    { rawMaterialId: '', rawMaterialSku: '', rawMaterialName: '', quantityRequired: 1, unit: 'pcs', wastePercentage: 0 },
  ]);
  const [savingBom, setSavingBom] = useState(false);

  // Production Order Form
  const [poProductId, setPoProductId] = useState('');
  const [poBomId, setPoBomId] = useState('');
  const [poPlannedQty, setPoPlannedQty] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [savingPo, setSavingPo] = useState(false);

  // Complete Order Form
  const [completeProducedQty, setCompleteProducedQty] = useState('');
  const [completeRejectedQty, setCompleteRejectedQty] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [savingComplete, setSavingComplete] = useState(false);

  // Physical Count Form
  const [countNotes, setCountNotes] = useState('');
  const [countRows, setCountRows] = useState<Array<{ productId: string; sku: string; name: string; systemQty: number; countedQty: number }>>([]);
  const [savingCount, setSavingCount] = useState(false);

  // Catalog Products list for dropdowns
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

  // ─── 1. Load Initial Branches & Catalog ─────────────────────────────────────
  useEffect(() => {
    const loadBranchesAndCatalog = async () => {
      try {
        const brRes = await fetchAdminApi<any>('/branches');
        const brList = Array.isArray(brRes) ? brRes : brRes?.data || brRes?.items || [];
        setBranches(brList);
        if (brList.length > 0) {
          setSelectedBranchId(brList[0].id);
          setTransferFromBranch(brList[0].id);
          if (brList.length > 1) {
            setTransferToBranch(brList[1].id);
          }
        }

        const prodRes = await fetchAdminApi<any>('/products?limit=250');
        const prodList = prodRes?.data?.products || prodRes?.data?.items || prodRes?.data || [];
        setCatalogProducts(Array.isArray(prodList) ? prodList : []);
      } catch (err: any) {
        console.warn('[UPInventoryHub] Failed to load initial resources:', err);
      }
    };
    loadBranchesAndCatalog();
  }, []);

  // ─── 2. Fetch Dashboard KPIs ────────────────────────────────────────────────
  const fetchDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await upApi.getInventoryDashboard(selectedBranchId || undefined);
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to load factory inventory dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (subTab === 'overview') {
      fetchDashboard();
    }
  }, [subTab, selectedBranchId]);

  // ─── 3. Instant SKU Search (<100ms) ─────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await upApi.searchSKU(searchQuery, selectedBranchId || undefined);
        if (res.success && res.data) {
          setSearchResults(res.data);
        }
      } catch (err: any) {
        console.warn('SKU search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 80); // ultra-low 80ms debounce for high-speed touch feedback

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, selectedBranchId]);

  // ─── 4. Fetch Stock Matrix ──────────────────────────────────────────────────
  const fetchStock = async () => {
    setLoadingStock(true);
    try {
      const itemType = subTab === 'raw-materials' ? 'RAW_MATERIAL' : subTab === 'finished-goods' ? 'FINISHED_GOOD' : 'ALL';
      const res = await upApi.listStock({
        page: stockPage,
        limit: 25,
        search: stockSearch || undefined,
        branchId: selectedBranchId || undefined,
        stockStatus: stockStatusFilter !== 'ALL' ? stockStatusFilter : undefined,
        itemType,
      });

      if (res.success && res.data) {
        setStockItems(res.data.data || []);
        setStockTotal(res.data.pagination?.total || 0);
        setStockTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to load stock matrix');
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    if (['stock', 'raw-materials', 'finished-goods', 'movements'].includes(subTab)) {
      fetchStock();
    }
  }, [subTab, stockPage, stockStatusFilter, selectedBranchId]);

  // ─── 5. Fetch BOMs ──────────────────────────────────────────────────────────
  const fetchBomsList = async () => {
    setLoadingBoms(true);
    try {
      const res = await upApi.listBoms();
      if (res.success && res.data) {
        setBoms(res.data);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to load BOMs');
    } finally {
      setLoadingBoms(false);
    }
  };

  useEffect(() => {
    if (subTab === 'bom') {
      fetchBomsList();
    }
  }, [subTab]);

  // ─── 6. Fetch Production Orders ─────────────────────────────────────────────
  const fetchProductionOrdersList = async () => {
    setLoadingProduction(true);
    try {
      const res = await upApi.listProductionOrders({
        branchId: selectedBranchId || undefined,
        status: prodStatusFilter !== 'ALL' ? prodStatusFilter : undefined,
      });
      if (res.success && res.data) {
        setProductionOrders(res.data);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to load production orders');
    } finally {
      setLoadingProduction(false);
    }
  };

  useEffect(() => {
    if (subTab === 'production') {
      fetchProductionOrdersList();
    }
  }, [subTab, prodStatusFilter, selectedBranchId]);

  // ─── 7. Fetch Physical Counts ───────────────────────────────────────────────
  const fetchPhysicalCountsList = async () => {
    setLoadingPhysical(true);
    try {
      const res = await upApi.listPhysicalCounts(selectedBranchId || undefined);
      if (res.success && res.data) {
        setPhysicalCounts(res.data);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to load physical counts');
    } finally {
      setLoadingPhysical(false);
    }
  };

  useEffect(() => {
    if (subTab === 'physical-counts') {
      fetchPhysicalCountsList();
    }
  }, [subTab, selectedBranchId]);

  // ─── 8. Fetch Reports ───────────────────────────────────────────────────────
  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await upApi.getInventoryReports({ branchId: selectedBranchId || undefined });
      if (res.success && res.data) {
        setReportsData(res.data);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to aggregate inventory reports');
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (subTab === 'reports') {
      fetchReports();
    }
  }, [subTab, selectedBranchId]);

  // ─── Modal Action Triggers ──────────────────────────────────────────────────
  const openReceiveModal = (prod?: { id: string; name: string; sku: string }) => {
    if (prod) {
      setRcvProductId(prod.id);
      setActiveActionProduct(prod);
    } else {
      setActiveActionProduct(null);
    }
    setRcvQuantity('');
    setRcvUnitCost('');
    setRcvSupplier('');
    setRcvInvoice('');
    setRcvNotes('');
    setIsReceiveModalOpen(true);
  };

  const openIssueModal = (prod?: { id: string; name: string; sku: string }) => {
    if (prod) {
      setIssueProductId(prod.id);
      setActiveActionProduct(prod);
    } else {
      setActiveActionProduct(null);
    }
    setIssueQuantity('');
    setIssueProdOrderId('');
    setIssueNotes('');
    setIsIssueModalOpen(true);
  };

  const openTransferModal = (prod?: { id: string; name: string; sku: string }) => {
    if (prod) {
      setTransferProductId(prod.id);
      setActiveActionProduct(prod);
    } else {
      setActiveActionProduct(null);
    }
    setTransferQuantity('');
    setTransferNotes('');
    setIsTransferModalOpen(true);
  };

  const openDamageModal = (prod?: { id: string; name: string; sku: string }) => {
    if (prod) {
      setDmgProductId(prod.id);
      setActiveActionProduct(prod);
    } else {
      setActiveActionProduct(null);
    }
    setDmgQuantity('');
    setDmgReason('');
    setDmgPhotoUrl('');
    setIsDamageModalOpen(true);
  };

  // ─── Form Submission Handlers ───────────────────────────────────────────────

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rcvProductId) return onShowError('Please select a product');
    const qty = parseInt(rcvQuantity, 10);
    if (isNaN(qty) || qty <= 0) return onShowError('Quantity must be greater than 0');

    setSavingReceive(true);
    try {
      const res = await upApi.receiveMaterial({
        productId: rcvProductId,
        branchId: selectedBranchId || branches[0]?.id,
        quantity: qty,
        unitCost: rcvUnitCost ? parseFloat(rcvUnitCost) : undefined,
        supplierName: rcvSupplier.trim() || undefined,
        invoiceNumber: rcvInvoice.trim() || undefined,
        notes: rcvNotes.trim() || undefined,
      });
      if (res.success) {
        onShowSuccess(`Received ${qty} units successfully onto factory floor ✓`);
        setIsReceiveModalOpen(false);
        fetchDashboard();
        if (subTab === 'stock' || subTab === 'raw-materials') fetchStock();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to receive material');
    } finally {
      setSavingReceive(false);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueProductId) return onShowError('Please select a product');
    const qty = parseInt(issueQuantity, 10);
    if (isNaN(qty) || qty <= 0) return onShowError('Quantity must be greater than 0');

    setSavingIssue(true);
    try {
      const res = await upApi.issueMaterial({
        productId: issueProductId,
        branchId: selectedBranchId || branches[0]?.id,
        quantity: qty,
        productionOrderId: issueProdOrderId.trim() || undefined,
        notes: issueNotes.trim() || undefined,
      });
      if (res.success) {
        onShowSuccess(`Issued ${qty} units to production floor ✓`);
        setIsIssueModalOpen(false);
        fetchDashboard();
        if (subTab === 'stock' || subTab === 'raw-materials') fetchStock();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to issue material');
    } finally {
      setSavingIssue(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProductId) return onShowError('Please select a product');
    if (transferFromBranch === transferToBranch) return onShowError('Source and destination cannot be identical');
    const qty = parseInt(transferQuantity, 10);
    if (isNaN(qty) || qty <= 0) return onShowError('Quantity must be greater than 0');

    setSavingTransfer(true);
    try {
      const res = await upApi.transferStock({
        productId: transferProductId,
        fromBranchId: transferFromBranch,
        toBranchId: transferToBranch,
        quantity: qty,
        notes: transferNotes.trim() || undefined,
      });
      if (res.success) {
        onShowSuccess(`Transferred ${qty} units between facilities ✓`);
        setIsTransferModalOpen(false);
        fetchDashboard();
        if (subTab === 'stock') fetchStock();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to transfer stock');
    } finally {
      setSavingTransfer(false);
    }
  };

  const handleDamageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmgProductId) return onShowError('Please select a product');
    const qty = parseInt(dmgQuantity, 10);
    if (isNaN(qty) || qty <= 0) return onShowError('Quantity must be greater than 0');
    if (!dmgReason.trim()) return onShowError('Reason for damage is required');

    setSavingDamage(true);
    try {
      const res = await upApi.recordDamage({
        productId: dmgProductId,
        branchId: selectedBranchId || branches[0]?.id,
        quantity: qty,
        reason: dmgReason.trim(),
        photoUrl: dmgPhotoUrl.trim() || undefined,
      });
      if (res.success) {
        onShowSuccess(`Recorded damage (${qty} units written off) [${res.data?.ticketNumber}] ✓`);
        setIsDamageModalOpen(false);
        fetchDashboard();
        if (subTab === 'stock') fetchStock();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to record damage');
    } finally {
      setSavingDamage(false);
    }
  };

  const handleScrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapMaterialName.trim()) return onShowError('Material name is required');
    const qty = parseFloat(scrapQuantity);
    if (isNaN(qty) || qty <= 0) return onShowError('Quantity must be greater than 0');
    if (!scrapReason.trim()) return onShowError('Scrap reason is required');

    setSavingScrap(true);
    try {
      const res = await upApi.recordScrap({
        materialName: scrapMaterialName.trim(),
        productId: scrapProductId || undefined,
        branchId: selectedBranchId || branches[0]?.id,
        quantity: qty,
        unit: scrapUnit,
        reason: scrapReason.trim(),
        estimatedLossPaise: scrapLossRupees ? Math.round(parseFloat(scrapLossRupees) * 100) : 0,
      });
      if (res.success) {
        onShowSuccess(`Scrap recorded: ${qty} ${scrapUnit} logged [${res.data?.scrapNumber}] ✓`);
        setIsScrapModalOpen(false);
        fetchDashboard();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to log scrap');
    } finally {
      setSavingScrap(false);
    }
  };

  const handleCreateBomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomName.trim()) return onShowError('BOM name is required');
    if (!bomProductId) return onShowError('Finished product is required');
    if (bomItems.some((item) => !item.rawMaterialId || item.quantityRequired <= 0)) {
      return onShowError('All BOM components must have a valid raw material and quantity');
    }

    setSavingBom(true);
    try {
      const res = await upApi.createBom({
        name: bomName.trim(),
        productId: bomProductId,
        sku: bomSku.trim() || undefined,
        version: bomVersion.trim() || '1.0',
        notes: bomNotes.trim() || undefined,
        items: bomItems.map((item) => ({
          rawMaterialId: item.rawMaterialId,
          rawMaterialSku: item.rawMaterialSku || undefined,
          rawMaterialName: item.rawMaterialName || undefined,
          quantityRequired: Number(item.quantityRequired),
          unit: item.unit || 'pcs',
          wastePercentage: Number(item.wastePercentage || 0),
        })),
      });
      if (res.success) {
        onShowSuccess('Bill of Materials (BOM) created successfully ✓');
        setIsCreateBomModalOpen(false);
        fetchBomsList();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to create BOM');
    } finally {
      setSavingBom(false);
    }
  };

  const handleCreateProdOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poProductId) return onShowError('Finished product is required');
    const planned = parseInt(poPlannedQty, 10);
    if (isNaN(planned) || planned <= 0) return onShowError('Planned quantity must be greater than 0');

    setSavingPo(true);
    try {
      const res = await upApi.createProductionOrder({
        productId: poProductId,
        bomId: poBomId || undefined,
        branchId: selectedBranchId || branches[0]?.id,
        plannedQuantity: planned,
        notes: poNotes.trim() || undefined,
      });
      if (res.success) {
        onShowSuccess(`Production order created [${res.data?.orderNumber}] ✓`);
        setIsCreateProdOrderModalOpen(false);
        fetchProductionOrdersList();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to create production order');
    } finally {
      setSavingPo(false);
    }
  };

  const handleStartProdOrder = async (orderId: string) => {
    try {
      const res = await upApi.startProductionOrder(orderId);
      if (res.success) {
        onShowSuccess('Production order started (Status: IN_PROGRESS) 🚀');
        fetchProductionOrdersList();
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to start order');
    }
  };

  const handleCompleteProdOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingOrder) return;
    const produced = parseInt(completeProducedQty, 10);
    if (isNaN(produced) || produced < 0) return onShowError('Please enter a valid produced quantity');
    const rejected = parseInt(completeRejectedQty || '0', 10);

    setSavingComplete(true);
    try {
      const res = await upApi.completeProductionOrder(completingOrder.id, {
        producedQuantity: produced,
        rejectedQuantity: rejected,
        notes: completeNotes.trim() || undefined,
      });
      if (res.success) {
        onShowSuccess(`Order ${completingOrder.orderNumber} completed! Added ${produced} finished units to stock ✓`);
        setCompletingOrder(null);
        fetchProductionOrdersList();
        fetchDashboard();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to complete production order');
    } finally {
      setSavingComplete(false);
    }
  };

  const handleOpenCountModal = () => {
    // Populate with currently loaded stock items or first 20 products
    const initialRows = stockItems.slice(0, 15).map((item) => ({
      productId: item.id,
      sku: item.sku,
      name: item.name,
      systemQty: item.onHand,
      countedQty: item.onHand,
    }));
    setCountRows(initialRows);
    setCountNotes('');
    setIsCountModalOpen(true);
  };

  const handlePhysicalCountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (countRows.length === 0) return onShowError('No items in count session');

    setSavingCount(true);
    try {
      const res = await upApi.createPhysicalCount({
        branchId: selectedBranchId || branches[0]?.id,
        notes: countNotes.trim() || undefined,
        items: countRows,
      });
      if (res.success) {
        onShowSuccess(`Physical count [${res.data?.countNumber}] reconciled (${res.data?.totalItemsCounted} items)! Variance: ${res.data?.totalVariance} ✓`);
        setIsCountModalOpen(false);
        fetchPhysicalCountsList();
        fetchDashboard();
      } else {
        throw new Error(res.error?.message);
      }
    } catch (err: any) {
      onShowError(err?.message || 'Failed to submit physical count');
    } finally {
      setSavingCount(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Facility Selector & Sub-Navigation Header ───────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 size={14} className="text-indigo-400" /> Facility:
          </span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-[#27272A] text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-zinc-700 focus:border-indigo-500 outline-none"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
          <span className="text-[10px] text-zinc-400">All movements are real-time & ledger verified</span>
        </div>

        {/* 1-Tap Mobile Floor Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          <button
            type="button"
            onClick={() => openReceiveModal()}
            className="flex-1 md:flex-initial px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="Receive Raw Materials or Stock"
          >
            <ArrowDownLeft size={14} /> Receive
          </button>

          <button
            type="button"
            onClick={() => openIssueModal()}
            className="flex-1 md:flex-initial px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="Issue to Shopfloor Assembly"
          >
            <ArrowUpRight size={14} /> Issue
          </button>

          <button
            type="button"
            onClick={() => openTransferModal()}
            className="flex-1 md:flex-initial px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="Transfer to Another Facility"
          >
            <ArrowRightLeft size={14} /> Transfer
          </button>

          <button
            type="button"
            onClick={() => openDamageModal()}
            className="flex-1 md:flex-initial px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="Report Defective / Damaged Item"
          >
            <AlertTriangle size={14} /> Damage
          </button>

          <button
            type="button"
            onClick={() => setIsScrapModalOpen(true)}
            className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs border border-zinc-700 flex items-center gap-1 active:scale-95 transition-all"
            title="Log Production Scrap"
          >
            <Flame size={14} className="text-orange-400" /> Scrap
          </button>

          <button
            type="button"
            onClick={() => handleOpenCountModal()}
            className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs border border-zinc-700 flex items-center gap-1 active:scale-95 transition-all"
            title="Perform Physical Inventory Audit"
          >
            <ClipboardList size={14} className="text-purple-400" /> Count
          </button>
        </div>
      </div>

      {/* ─── High-Speed SKU Search Dock (<100ms) ─────────────────────────────── */}
      <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-md space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            inputMode="text"
            placeholder="Scan Barcode or Type SKU / Product Name (<100ms Instant Floor Dock)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-[#09090B] rounded-xl border border-zinc-700 text-white placeholder-zinc-500 text-sm font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Live Fast Search Results Overlay */}
        {searchQuery.trim() && (
          <div className="pt-2 border-t border-[#27272A] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Found {searchResults.length} matches in facility</span>
              {isSearching && <span className="text-indigo-400 animate-pulse font-bold">Scanning stock...</span>}
            </div>

            {searchResults.length === 0 && !isSearching && (
              <div className="p-4 text-center text-xs text-zinc-500 bg-black/30 rounded-xl">
                No products found matching &quot;{searchQuery}&quot;
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#27272A]/70 hover:bg-[#27272A] p-3 rounded-xl border border-zinc-700 transition-all flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                          {item.sku}
                        </span>
                        {item.finish && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-950/50 px-1.5 py-0.2 rounded border border-amber-500/30">
                            {item.finish}
                          </span>
                        )}
                        {item.colour && (
                          <span className="text-[10px] text-zinc-300 bg-black/40 px-1.5 py-0.2 rounded">
                            {item.colour}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-zinc-400">{item.categoryName || 'General Hardware'}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        item.status === 'IN_STOCK'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                          : item.status === 'LOW_STOCK'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                          : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {item.status === 'IN_STOCK' ? '✓ In Stock' : item.status === 'LOW_STOCK' ? '⚠ Low' : '✕ Out'}
                    </span>
                  </div>

                  {/* Stock Metrics Row */}
                  <div className="grid grid-cols-3 gap-1.5 bg-black/30 p-2 rounded-lg text-center text-[10px]">
                    <div>
                      <div className="text-zinc-500">On-Hand</div>
                      <div className="font-mono font-bold text-white">{item.onHand}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Reserved</div>
                      <div className="font-mono font-bold text-amber-400">{item.reservedQuantity}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Available</div>
                      <div className="font-mono font-bold text-emerald-400 text-xs">{item.availableQuantity}</div>
                    </div>
                  </div>

                  {/* 1-Tap Quick Action Row */}
                  <div className="flex items-center gap-1 pt-1 border-t border-zinc-700/50">
                    <button
                      type="button"
                      onClick={() => openReceiveModal(item)}
                      className="flex-1 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold transition-all text-center"
                    >
                      + Receive
                    </button>
                    <button
                      type="button"
                      onClick={() => openIssueModal(item)}
                      className="flex-1 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white text-[10px] font-bold transition-all text-center"
                    >
                      - Issue
                    </button>
                    <button
                      type="button"
                      onClick={() => openTransferModal(item)}
                      className="flex-1 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-bold transition-all text-center"
                    >
                      ⇄ Move
                    </button>
                    <button
                      type="button"
                      onClick={() => openDamageModal(item)}
                      className="flex-1 py-1 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white text-[10px] font-bold transition-all text-center"
                    >
                      ! Damage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Sub-Tab Navigation Bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#27272A] scrollbar-hide">
        {[
          { id: 'overview', label: 'Dashboard', icon: Boxes },
          { id: 'stock', label: 'All Stock', icon: Package },
          { id: 'raw-materials', label: 'Raw Materials', icon: Layers },
          { id: 'finished-goods', label: 'Finished Goods', icon: Sparkles },
          { id: 'movements', label: 'Stock Movements', icon: ArrowRightLeft },
          { id: 'bom', label: 'BOM Master', icon: Wrench },
          { id: 'production', label: 'Production & WIP', icon: Clock },
          { id: 'physical-counts', label: 'Physical Counts', icon: ClipboardList },
          { id: 'reports', label: 'Reports & Valuation', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as InvSubTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-zinc-400 hover:text-white hover:bg-[#27272A]'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB CONTENT 1: OVERVIEW DASHBOARD ───────────────────────────────── */}
      {subTab === 'overview' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Executive KPI Deck */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Total SKUs</span>
              <div className="text-2xl font-black text-white font-mono">
                {dashboardData?.totalSku.toLocaleString() || '0'}
              </div>
              <span className="text-[10px] text-zinc-400">Master Catalog Hardware</span>
            </div>

            <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Floor Stock Units</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {dashboardData?.totalStockUnits.toLocaleString() || '0'}
              </div>
              <span className="text-[10px] text-emerald-400/80">Available Physical Units</span>
            </div>

            <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Inventory Valuation</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                ₹{dashboardData?.estimatedValuation ? Math.round(dashboardData.estimatedValuation).toLocaleString('en-IN') : '0'}
              </div>
              <span className="text-[10px] text-zinc-400">Catalog MRP Valuation</span>
            </div>

            <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Stock Alerts</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-amber-400 font-mono">
                  {dashboardData?.lowStockCount || 0} Low
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-lg font-black text-rose-400 font-mono">
                  {dashboardData?.outOfStockCount || 0} OOS
                </span>
              </div>
              <span className="text-[10px] text-zinc-400">Reorder thresholds triggered</span>
            </div>
          </div>

          {/* Floor Operations Metrics (Production & Wastage) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock size={15} className="text-indigo-400" /> Active Production (WIP)
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreateProdOrderModalOpen(true)}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                >
                  + New Order
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="p-2 bg-indigo-950/40 rounded-xl border border-indigo-500/20">
                  <div className="text-lg font-black text-indigo-400 font-mono">
                    {dashboardData?.productionOrders.inProgress || 0}
                  </div>
                  <div className="text-[9px] text-zinc-400">In Progress</div>
                </div>
                <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="text-lg font-black text-zinc-300 font-mono">
                    {dashboardData?.productionOrders.draft || 0}
                  </div>
                  <div className="text-[9px] text-zinc-400">Draft</div>
                </div>
                <div className="p-2 bg-emerald-950/40 rounded-xl border border-emerald-500/20">
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {dashboardData?.productionOrders.completed || 0}
                  </div>
                  <div className="text-[9px] text-zinc-400">Completed</div>
                </div>
              </div>
            </div>

            <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-rose-400" /> Today&apos;s Damaged Stock
                </span>
                <button
                  type="button"
                  onClick={() => openDamageModal()}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300"
                >
                  + Report
                </button>
              </div>
              <div className="p-3 bg-rose-950/20 rounded-xl border border-rose-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xl font-black text-rose-400 font-mono">
                    {dashboardData?.todayFloorMetrics.damagedUnits || 0} Units
                  </div>
                  <div className="text-[10px] text-zinc-400">Written off today</div>
                </div>
                <AlertTriangle size={24} className="text-rose-500/40" />
              </div>
            </div>

            <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Flame size={15} className="text-orange-400" /> Today&apos;s Industrial Scrap
                </span>
                <button
                  type="button"
                  onClick={() => setIsScrapModalOpen(true)}
                  className="text-[10px] font-bold text-orange-400 hover:text-orange-300"
                >
                  + Log Scrap
                </button>
              </div>
              <div className="p-3 bg-orange-950/20 rounded-xl border border-orange-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xl font-black text-orange-400 font-mono">
                    {dashboardData?.todayFloorMetrics.scrapQty || 0} kg
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Est. Loss: ₹{(dashboardData?.todayFloorMetrics.scrapLossRupees || 0).toLocaleString()}
                  </div>
                </div>
                <Flame size={24} className="text-orange-500/40" />
              </div>
            </div>
          </div>

          {/* Recent Stock Movements Stream */}
          <div className="bg-[#18181B] p-4 sm:p-5 rounded-2xl border border-[#27272A] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-indigo-400" /> Recent Factory Floor Movements
              </h3>
              <button
                type="button"
                onClick={() => setSubTab('movements')}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View Full Audit Ledger <ChevronRight size={13} />
              </button>
            </div>

            {(!dashboardData?.recentMovements || dashboardData.recentMovements.length === 0) ? (
              <div className="p-6 text-center text-xs text-zinc-500 bg-black/20 rounded-xl">
                No floor movements recorded yet. Receive or issue stock to generate audit trails.
              </div>
            ) : (
              <div className="space-y-2">
                {dashboardData.recentMovements.map((mov) => (
                  <div
                    key={mov.id}
                    className="p-3 rounded-xl bg-black/30 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-indigo-300">{mov.sku || 'SKU'}</span>
                        <span className="font-semibold text-white">{mov.productName || 'Product'}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {mov.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400">{mov.notes || 'No movement notes'}</div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div
                        className={`font-mono font-bold text-xs ${
                          mov.type.includes('IN')
                            ? 'text-emerald-400'
                            : mov.type.includes('OUT') || mov.type === 'DAMAGE'
                            ? 'text-rose-400'
                            : 'text-zinc-300'
                        }`}
                      >
                        {mov.type.includes('IN') ? `+${mov.quantity}` : `-${mov.quantity}`}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {new Date(mov.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 2: STOCK LISTING (ALL / RAW / FINISHED) ─────────────── */}
      {['stock', 'raw-materials', 'finished-goods'].includes(subTab) && (
        <div className="space-y-4 animate-fadeIn">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#18181B] p-3.5 rounded-2xl border border-[#27272A]">
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter current view..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchStock()}
                className="w-full pl-9 pr-3 py-1.5 bg-[#09090B] rounded-xl border border-zinc-700 text-white placeholder-zinc-500 text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="bg-[#27272A] text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-700 outline-none"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>

              <button
                type="button"
                onClick={() => fetchStock()}
                className="p-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300"
                title="Refresh Table"
              >
                <RefreshCw size={14} className={loadingStock ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-[#18181B] rounded-2xl border border-[#27272A] overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#27272A]/50 text-zinc-400 uppercase tracking-wider text-[10px] font-bold border-b border-[#27272A]">
                <tr>
                  <th className="py-3 px-4">SKU / Item</th>
                  <th className="py-3 px-3">Specs</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">On-Hand</th>
                  <th className="py-3 px-3 text-right">Reserved</th>
                  <th className="py-3 px-3 text-right">Available</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Floor Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {stockItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500">
                      {loadingStock ? 'Loading stock items...' : 'No inventory items match filter'}
                    </td>
                  </tr>
                ) : (
                  stockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-indigo-400">{item.sku}</div>
                        <div className="text-white font-semibold line-clamp-1">{item.name}</div>
                        <div className="text-[10px] text-zinc-400">{item.categoryName || 'General'}</div>
                      </td>
                      <td className="py-3 px-3 space-y-0.5">
                        {item.finish && (
                          <span className="inline-block text-[9px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded mr-1">
                            {item.finish}
                          </span>
                        )}
                        {item.colour && (
                          <span className="inline-block text-[9px] text-zinc-300 bg-black/40 px-1.5 py-0.2 rounded">
                            {item.colour}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                            item.itemType === 'FINISHED_GOOD'
                              ? 'bg-purple-950/60 text-purple-300 border border-purple-500/20'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {item.itemType === 'FINISHED_GOOD' ? 'Finished Good' : 'Raw / Part'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">{item.onHand}</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-400">{item.reservedQuantity}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {item.availableQuantity}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'IN_STOCK'
                              ? 'bg-emerald-950/60 text-emerald-400'
                              : item.status === 'LOW_STOCK'
                              ? 'bg-amber-950/60 text-amber-400'
                              : 'bg-rose-950/60 text-rose-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openReceiveModal(item)}
                            className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold transition-all"
                            title="Receive units"
                          >
                            + In
                          </button>
                          <button
                            type="button"
                            onClick={() => openIssueModal(item)}
                            className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white text-[10px] font-bold transition-all"
                            title="Issue units"
                          >
                            - Out
                          </button>
                          <button
                            type="button"
                            onClick={() => openDamageModal(item)}
                            className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white text-[10px] font-bold transition-all"
                            title="Report damaged"
                          >
                            ! Dmg
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch Cards View (360px+) */}
          <div className="sm:hidden space-y-2.5">
            {stockItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#18181B] p-3.5 rounded-xl border border-[#27272A] shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-black text-indigo-400">{item.sku}</span>
                      {item.finish && (
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 px-1.5 rounded">
                          {item.finish}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white mt-0.5">{item.name}</h4>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'IN_STOCK'
                        ? 'bg-emerald-950/60 text-emerald-400'
                        : item.status === 'LOW_STOCK'
                        ? 'bg-amber-950/60 text-amber-400'
                        : 'bg-rose-950/60 text-rose-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-2 rounded-lg text-center text-[10px]">
                  <div>
                    <div className="text-zinc-500">On-Hand</div>
                    <div className="font-mono font-bold text-white">{item.onHand}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Reserved</div>
                    <div className="font-mono font-bold text-amber-400">{item.reservedQuantity}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Available</div>
                    <div className="font-mono font-bold text-emerald-400">{item.availableQuantity}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => openReceiveModal(item)}
                    className="flex-1 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold"
                  >
                    Receive
                  </button>
                  <button
                    type="button"
                    onClick={() => openIssueModal(item)}
                    className="flex-1 py-1.5 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white text-[10px] font-bold"
                  >
                    Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => openTransferModal(item)}
                    className="flex-1 py-1.5 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-bold"
                  >
                    Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => openDamageModal(item)}
                    className="flex-1 py-1.5 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white text-[10px] font-bold"
                  >
                    Damage
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {stockTotalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
              <span>Page {stockPage} of {stockTotalPages} ({stockTotal} items)</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={stockPage <= 1}
                  onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#27272A] disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={stockPage >= stockTotalPages}
                  onClick={() => setStockPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#27272A] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT 3: BOM MASTER ───────────────────────────────────────── */}
      {subTab === 'bom' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between bg-[#18181B] p-4 rounded-2xl border border-[#27272A]">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Wrench size={16} className="text-indigo-400" /> Bill of Materials (BOM) Master
              </h3>
              <p className="text-[10px] text-zinc-400">
                Manufacturing recipes mapping finished goods to raw materials with auto-deduction logic
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBomName('');
                setBomProductId('');
                setBomSku('');
                setBomVersion('1.0');
                setBomNotes('');
                setBomItems([
                  { rawMaterialId: '', rawMaterialSku: '', rawMaterialName: '', quantityRequired: 1, unit: 'pcs', wastePercentage: 0 },
                ]);
                setIsCreateBomModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} /> Create BOM
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {boms.length === 0 ? (
              <div className="col-span-full p-8 text-center text-xs text-zinc-500 bg-[#18181B] rounded-2xl border border-[#27272A]">
                No Bills of Materials defined yet. Click &quot;Create BOM&quot; to build an assembly recipe.
              </div>
            ) : (
              boms.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-500/20 font-mono">
                        v{b.version}
                      </span>
                      <span className="text-[10px] text-zinc-400">{b.itemCount} Components</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{b.name}</h4>
                    <div className="text-xs text-zinc-300">
                      Product: <strong className="text-white">{b.productName}</strong>
                    </div>
                    {b.notes && <p className="text-[10px] text-zinc-400 line-clamp-2">{b.notes}</p>}
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await upApi.getBom(b.id);
                          if (res.success && res.data) setSelectedBom(res.data);
                        } catch (err: any) {
                          onShowError(err?.message || 'Failed to inspect BOM');
                        }
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Eye size={13} /> View Recipe
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPoProductId(b.productId);
                        setPoBomId(b.id);
                        setPoPlannedQty('');
                        setIsCreateProdOrderModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold transition-all"
                    >
                      + Work Order
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 4: PRODUCTION ORDERS & WIP ──────────────────────────── */}
      {subTab === 'production' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#18181B] p-4 rounded-2xl border border-[#27272A]">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-indigo-400" /> Factory Floor Work Orders & WIP
              </h3>
              <p className="text-[10px] text-zinc-400">
                Assembly tracking with automatic BOM deduction on completion
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={prodStatusFilter}
                onChange={(e) => setProdStatusFilter(e.target.value)}
                className="bg-[#27272A] text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-700 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setPoProductId('');
                  setPoBomId('');
                  setPoPlannedQty('');
                  setIsCreateProdOrderModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1"
              >
                <Plus size={14} /> New Order
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {productionOrders.length === 0 ? (
              <div className="col-span-full p-8 text-center text-xs text-zinc-500 bg-[#18181B] rounded-2xl border border-[#27272A]">
                No production work orders found. Click &quot;New Order&quot; to issue a production job.
              </div>
            ) : (
              productionOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-white">{ord.orderNumber}</span>
                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                          ord.status === 'COMPLETED'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                            : ord.status === 'IN_PROGRESS'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-500/20 animate-pulse'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">{ord.productName}</h4>
                    <div className="text-[10px] text-zinc-400">
                      Recipe: <strong className="text-zinc-300">{ord.bomName || 'Custom'}</strong>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-2 rounded-lg text-center text-[10px]">
                      <div>
                        <div className="text-zinc-500">Planned</div>
                        <div className="font-mono font-bold text-white">{ord.plannedQuantity}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Produced</div>
                        <div className="font-mono font-bold text-emerald-400">{ord.producedQuantity}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Rejected</div>
                        <div className="font-mono font-bold text-rose-400">{ord.rejectedQuantity}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-1.5">
                    {ord.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => handleStartProdOrder(ord.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all"
                      >
                        Start Order ▶
                      </button>
                    )}

                    {ord.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompletingOrder(ord);
                          setCompleteProducedQty(String(ord.plannedQuantity));
                          setCompleteRejectedQty('0');
                          setCompleteNotes('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1"
                      >
                        <Check size={14} /> Complete Order
                      </button>
                    )}

                    {ord.status === 'COMPLETED' && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Stock Deposited
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 5: PHYSICAL COUNTS ──────────────────────────────────── */}
      {subTab === 'physical-counts' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between bg-[#18181B] p-4 rounded-2xl border border-[#27272A]">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <ClipboardList size={16} className="text-purple-400" /> Physical Inventory Audit Sessions
              </h3>
              <p className="text-[10px] text-zinc-400">Reconcile counted physical stock against system ledger</p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenCountModal()}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus size={15} /> New Count Audit
            </button>
          </div>

          <div className="bg-[#18181B] rounded-2xl border border-[#27272A] overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#27272A]/50 text-zinc-400 uppercase tracking-wider text-[10px] font-bold border-b border-[#27272A]">
                <tr>
                  <th className="py-3 px-4">Audit #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Facility</th>
                  <th className="py-3 px-3 text-center">Items Counted</th>
                  <th className="py-3 px-3 text-center">Variance (Units)</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {physicalCounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No physical counts logged. Run a count session to audit facility stock.
                    </td>
                  </tr>
                ) : (
                  physicalCounts.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-purple-400">{c.countNumber}</td>
                      <td className="py-3 px-3 text-zinc-400">
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3 px-3 text-white font-semibold">{c.branchName || 'Delhi HQ'}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold">{c.totalItemsCounted}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                        {c.totalVarianceUnits}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 line-clamp-1">{c.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 6: REPORTS & VALUATION ───────────────────────────────── */}
      {subTab === 'reports' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-indigo-400" /> Factory Valuation & Operations Report
            </h3>
            <p className="text-[10px] text-zinc-400">Aggregate ledger breakdown for financial audits and stock movements</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Movement Types Breakdown */}
            <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <ArrowRightLeft size={15} className="text-indigo-400" /> Movements by Category
              </h4>
              <div className="space-y-2">
                {reportsData?.movementBreakdown.map((m) => (
                  <div key={m.type} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/30">
                    <span className="font-mono text-zinc-300 font-semibold">{m.type}</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white">{m.totalUnits.toLocaleString()} units</span>
                      <span className="text-[10px] text-zinc-500 ml-2">({m.count} txns)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrap Loss Summary */}
            <div className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Flame size={15} className="text-orange-400" /> Industrial Scrap Loss Breakdown
              </h4>
              <div className="space-y-2">
                {reportsData?.scrapSummary.map((s) => (
                  <div key={s.materialName} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/30">
                    <div>
                      <div className="font-bold text-white">{s.materialName}</div>
                      <div className="text-[10px] text-zinc-400">{s.totalQuantity} kg scrapped</div>
                    </div>
                    <div className="text-right font-mono font-bold text-orange-400">
                      ₹{s.totalLossRupees.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: RECEIVE MATERIAL ───────────────────────────────────────── */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181B] w-full max-w-md rounded-2xl border border-[#27272A] shadow-2xl p-5 space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowDownLeft size={16} className="text-emerald-400" /> Receive Material / Stock
              </h3>
              <button onClick={() => setIsReceiveModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-3">
              {activeActionProduct ? (
                <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-500/30">
                  <span className="font-mono text-xs font-black text-indigo-400">{activeActionProduct.sku}</span>
                  <div className="text-xs font-bold text-white">{activeActionProduct.name}</div>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Select Hardware Item</label>
                  <select
                    value={rcvProductId}
                    onChange={(e) => setRcvProductId(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {catalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Quantity to Receive</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  required
                  placeholder="e.g. 100"
                  value={rcvQuantity}
                  onChange={(e) => setRcvQuantity(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-sm font-mono p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Optional"
                    value={rcvUnitCost}
                    onChange={(e) => setRcvUnitCost(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Invoice #</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={rcvInvoice}
                    onChange={(e) => setRcvInvoice(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Supplier / Source</label>
                <input
                  type="text"
                  placeholder="e.g. Jindal Steel / Vendor X"
                  value={rcvSupplier}
                  onChange={(e) => setRcvSupplier(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReceive}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingReceive ? 'Depositing...' : 'Confirm Receipt ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ISSUE MATERIAL ─────────────────────────────────────────── */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181B] w-full max-w-md rounded-2xl border border-[#27272A] shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowUpRight size={16} className="text-amber-400" /> Issue to Production Floor
              </h3>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-3">
              {activeActionProduct ? (
                <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-500/30">
                  <span className="font-mono text-xs font-black text-amber-400">{activeActionProduct.sku}</span>
                  <div className="text-xs font-bold text-white">{activeActionProduct.name}</div>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Item to Issue</label>
                  <select
                    value={issueProductId}
                    onChange={(e) => setIssueProductId(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {catalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Quantity to Issue</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  required
                  placeholder="Units to deduct from stock"
                  value={issueQuantity}
                  onChange={(e) => setIssueQuantity(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-sm font-mono p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Production Work Order #</label>
                <input
                  type="text"
                  placeholder="e.g. UP-PO-2026-0001 (Optional)"
                  value={issueProdOrderId}
                  onChange={(e) => setIssueProdOrderId(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingIssue}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingIssue ? 'Issuing...' : 'Deduct & Issue ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: TRANSFER STOCK ─────────────────────────────────────────── */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181B] w-full max-w-md rounded-2xl border border-[#27272A] shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-blue-400" /> Inter-Facility Stock Transfer
              </h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Hardware Product</label>
                <select
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {catalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">From Facility</label>
                  <select
                    value={transferFromBranch}
                    onChange={(e) => setTransferFromBranch(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">To Facility</label>
                  <select
                    value={transferToBranch}
                    onChange={(e) => setTransferToBranch(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Transfer Units</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  required
                  placeholder="e.g. 50"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-sm font-mono p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTransfer}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingTransfer ? 'Moving...' : 'Transfer Units ⇄'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: REPORT DAMAGE ──────────────────────────────────────────── */}
      {isDamageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181B] w-full max-w-md rounded-2xl border border-[#27272A] shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400" /> Report Defective / Damaged Item
              </h3>
              <button onClick={() => setIsDamageModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDamageSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Damaged Product</label>
                <select
                  value={dmgProductId}
                  onChange={(e) => setDmgProductId(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {catalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Damaged Units</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  required
                  placeholder="Units to write off"
                  value={dmgQuantity}
                  onChange={(e) => setDmgQuantity(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-sm font-mono p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Damage Cause / Defect</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Scratched surface, bent flange, casting pore defect..."
                  value={dmgReason}
                  onChange={(e) => setDmgReason(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Photo Evidence URL</label>
                <input
                  type="url"
                  placeholder="Optional image link or cloud URL"
                  value={dmgPhotoUrl}
                  onChange={(e) => setDmgPhotoUrl(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsDamageModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDamage}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingDamage ? 'Writing off...' : 'Write-off Stock !'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: RECORD SCRAP ───────────────────────────────────────────── */}
      {isScrapModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181B] w-full max-w-md rounded-2xl border border-[#27272A] shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame size={16} className="text-orange-400" /> Record Industrial Scrap & Wastage
              </h3>
              <button onClick={() => setIsScrapModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleScrapSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Material / Scrap Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SS 304 Off-cuts / Aluminium Shavings"
                  value={scrapMaterialName}
                  onChange={(e) => setScrapMaterialName(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Quantity</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 12.5"
                    value={scrapQuantity}
                    onChange={(e) => setScrapQuantity(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Unit</label>
                  <select
                    value={scrapUnit}
                    onChange={(e) => setScrapUnit(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                  >
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                    <option value="meter">meter</option>
                    <option value="sheet">sheet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Scrap Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laser cutting edge trimming"
                  value={scrapReason}
                  onChange={(e) => setScrapReason(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Estimated Financial Loss (₹)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 1500"
                  value={scrapLossRupees}
                  onChange={(e) => setScrapLossRupees(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsScrapModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScrap}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingScrap ? 'Logging...' : 'Log Scrap 🔥'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: CREATE BOM ─────────────────────────────────────────────── */}
      {isCreateBomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181B] w-full max-w-xl rounded-2xl border border-[#27272A] shadow-2xl p-5 space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench size={16} className="text-indigo-400" /> Create Bill of Materials (BOM)
              </h3>
              <button onClick={() => setIsCreateBomModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBomSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">BOM Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard Lever Handle Assembly"
                    value={bomName}
                    onChange={(e) => setBomName(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Version</label>
                  <input
                    type="text"
                    value={bomVersion}
                    onChange={(e) => setBomVersion(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Target Finished Good</label>
                <select
                  value={bomProductId}
                  onChange={(e) => setBomProductId(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                  required
                >
                  <option value="">-- Select Finished Product --</option>
                  {catalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Components List */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Components & Raw Materials</span>
                  <button
                    type="button"
                    onClick={() =>
                      setBomItems([
                        ...bomItems,
                        { rawMaterialId: '', rawMaterialSku: '', rawMaterialName: '', quantityRequired: 1, unit: 'pcs', wastePercentage: 0 },
                      ])
                    }
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    + Add Component
                  </button>
                </div>

                {bomItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-black/40 rounded-xl border border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={item.rawMaterialId}
                        onChange={(e) => {
                          const chosen = catalogProducts.find((p) => p.id === e.target.value);
                          const updated = [...bomItems];
                          updated[idx].rawMaterialId = e.target.value;
                          updated[idx].rawMaterialSku = chosen?.sku || '';
                          updated[idx].rawMaterialName = chosen?.name || '';
                          setBomItems(updated);
                        }}
                        className="flex-1 bg-[#09090B] text-white text-[11px] p-2 rounded-lg border border-zinc-700 outline-none"
                        required
                      >
                        <option value="">-- Choose Raw Material / Part --</option>
                        {catalogProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={bomItems.length <= 1}
                        onClick={() => setBomItems(bomItems.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-300 p-1.5 disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-zinc-500">Qty Req</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0.01"
                          value={item.quantityRequired}
                          onChange={(e) => {
                            const updated = [...bomItems];
                            updated[idx].quantityRequired = parseFloat(e.target.value) || 1;
                            setBomItems(updated);
                          }}
                          className="w-full bg-[#09090B] text-white p-1.5 rounded border border-zinc-700 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-zinc-500">Unit</span>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => {
                            const updated = [...bomItems];
                            updated[idx].unit = e.target.value;
                            setBomItems(updated);
                          }}
                          className="w-full bg-[#09090B] text-white p-1.5 rounded border border-zinc-700"
                        />
                      </div>
                      <div>
                        <span className="text-zinc-500">Waste %</span>
                        <input
                          type="number"
                          value={item.wastePercentage}
                          onChange={(e) => {
                            const updated = [...bomItems];
                            updated[idx].wastePercentage = parseFloat(e.target.value) || 0;
                            setBomItems(updated);
                          }}
                          className="w-full bg-[#09090B] text-white p-1.5 rounded border border-zinc-700 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsCreateBomModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBom}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingBom ? 'Saving BOM...' : 'Save BOM Recipe ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 7: CREATE PRODUCTION ORDER ────────────────────────────────── */}
      {isCreateProdOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181B] w-full max-w-md rounded-2xl border border-[#27272A] shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-indigo-400" /> New Production Work Order
              </h3>
              <button onClick={() => setIsCreateProdOrderModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProdOrderSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Finished Product to Produce</label>
                <select
                  value={poProductId}
                  onChange={(e) => {
                    setPoProductId(e.target.value);
                    const matchedBom = boms.find((b) => b.productId === e.target.value);
                    if (matchedBom) setPoBomId(matchedBom.id);
                  }}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                  required
                >
                  <option value="">-- Choose Finished Product --</option>
                  {catalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Bill of Materials (BOM)</label>
                <select
                  value={poBomId}
                  onChange={(e) => setPoBomId(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                >
                  <option value="">-- None (Manual Assembly) --</option>
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (v{b.version})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Planned Production Units</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  required
                  placeholder="e.g. 200"
                  value={poPlannedQty}
                  onChange={(e) => setPoPlannedQty(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-sm font-mono p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsCreateProdOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPo}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingPo ? 'Scheduling...' : 'Issue Work Order 🔨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 8: COMPLETE PRODUCTION ORDER ──────────────────────────────── */}
      {completingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181B] w-full max-w-md rounded-2xl border border-[#27272A] shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" /> Complete Work Order ({completingOrder.orderNumber})
              </h3>
              <button onClick={() => setCompletingOrder(null)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/20 text-xs space-y-1">
              <div className="font-bold text-white">{completingOrder.productName}</div>
              <div className="text-[11px] text-zinc-400">
                Planned Units: <strong className="text-white font-mono">{completingOrder.plannedQuantity}</strong>
              </div>
              <div className="text-[10px] text-emerald-400/90">
                Completing will auto-consume raw materials via BOM and deposit finished goods into inventory.
              </div>
            </div>

            <form onSubmit={handleCompleteProdOrderSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Good Units Produced</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    required
                    value={completeProducedQty}
                    onChange={(e) => setCompleteProducedQty(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-sm font-mono p-2.5 rounded-xl border border-zinc-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Rejected / Defective</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={completeRejectedQty}
                    onChange={(e) => setCompleteRejectedQty(e.target.value)}
                    className="w-full bg-[#09090B] text-white text-sm font-mono p-2.5 rounded-xl border border-zinc-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Production Notes</label>
                <textarea
                  rows={2}
                  placeholder="Shift details, operator name, batch observations..."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setCompletingOrder(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingComplete}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingComplete ? 'Updating stock...' : 'Deposit Stock & Close Order ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 9: PHYSICAL COUNT AUDIT ───────────────────────────────────── */}
      {isCountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181B] w-full max-w-2xl rounded-2xl border border-[#27272A] shadow-2xl p-5 space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardList size={16} className="text-purple-400" /> Physical Inventory Count Session
              </h3>
              <button onClick={() => setIsCountModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePhysicalCountSubmit} className="space-y-4">
              <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
                {countRows.map((row, idx) => {
                  const diff = row.countedQty - row.systemQty;
                  return (
                    <div
                      key={row.productId}
                      className="p-3 bg-black/40 rounded-xl border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs font-bold text-indigo-400">{row.sku}</span>
                        <div className="font-semibold text-white line-clamp-1">{row.name}</div>
                        <div className="text-[10px] text-zinc-500">System Ledger: {row.systemQty} units</div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-0.5">Actual Count</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={row.countedQty}
                            onChange={(e) => {
                              const updated = [...countRows];
                              updated[idx].countedQty = parseInt(e.target.value, 10) || 0;
                              setCountRows(updated);
                            }}
                            className="w-20 bg-[#09090B] text-white font-mono font-bold text-xs p-1.5 rounded-lg border border-zinc-700 text-right outline-none"
                          />
                        </div>

                        <div className="text-right w-16">
                          <span className="text-[10px] text-zinc-500 block mb-0.5">Variance</span>
                          <span
                            className={`font-mono font-bold text-xs ${
                              diff === 0 ? 'text-zinc-400' : diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. End of Month Floor Reconciliation"
                  value={countNotes}
                  onChange={(e) => setCountNotes(e.target.value)}
                  className="w-full bg-[#09090B] text-white text-xs p-2.5 rounded-xl border border-zinc-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsCountModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCount}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingCount ? 'Reconciling...' : 'Commit Count & Reconcile Ledger ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 10: VIEW BOM RECIPE DETAILS ───────────────────────────────── */}
      {selectedBom && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#18181B] w-full max-w-lg rounded-2xl border border-[#27272A] shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench size={16} className="text-indigo-400" /> {selectedBom.name}
                </h3>
                <span className="text-[10px] text-zinc-400">Target Finished Good: {selectedBom.productName}</span>
              </div>
              <button onClick={() => setSelectedBom(null)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {selectedBom.items?.map((item) => (
                <div key={item.id} className="p-2.5 bg-black/40 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-indigo-400 text-[11px] font-bold mr-2">{item.rawMaterialSku}</span>
                    <span className="text-white font-semibold">{item.rawMaterialName}</span>
                  </div>
                  <div className="text-right font-mono font-bold text-white">
                    {item.quantityRequired} {item.unit}
                    {item.wastePercentage > 0 && (
                      <span className="text-[9px] text-zinc-400 block">+{item.wastePercentage}% waste</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setSelectedBom(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
              >
                Close Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
