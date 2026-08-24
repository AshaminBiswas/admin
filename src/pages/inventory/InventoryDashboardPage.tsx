import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Warehouse,
  Truck,
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  Search,
  ShoppingCart
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

interface DashboardMetrics {
  totalProducts?: number;
  allProducts?: Array<{
    currentStock: number;
    reorderLevel: number;
    purchasePrice: number;
    sellingPrice: number;
    product?: { name: string; sku: string };
  }>;
  warehousesCount?: number;
  suppliersCount?: number;
  todayDispatches?: number;
  todayPurchases?: number;
  todayPosSales?: { _sum?: { grandTotal?: number } };
  pendingDispatches?: number;
  pendingPurchases?: number;
  pendingOrders?: number;
  recentMovements?: Array<{
    id: string;
    qtyChanged: number;
    qtyBefore: number;
    qtyAfter: number;
    movementType: string;
    channel: string;
    createdAt: string;
    inventoryProduct?: { product?: { name: string } };
    warehouse?: { name: string; code: string };
  }>;
}

export function InventoryDashboardPage() {
  const { setCurrentView } = useAdminAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminApi("/inventory/dashboard");
      if (res?.success !== false && res?.data) {
        setMetrics(res.data);
      } else {
        setError(res?.message || "Failed to load inventory dashboard data.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Derived metrics calculations
  const totalProducts = metrics?.totalProducts || metrics?.allProducts?.length || 0;
  const productsList = metrics?.allProducts || [];

  const totalValuation = productsList.reduce((acc, p) => {
    return acc + (Number(p.currentStock || 0) * Number(p.purchasePrice || 0));
  }, 0);

  const lowStockCount = productsList.filter(
    (p) => p.currentStock > 0 && p.currentStock <= (p.reorderLevel || 10)
  ).length;

  const outOfStockCount = productsList.filter((p) => p.currentStock === 0).length;
  const inStockCount = totalProducts - outOfStockCount - lowStockCount;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Boxes size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
                Inventory Operations Dashboard
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
                Live enterprise stock visibility, multi-warehouse valuation & order fulfillment status
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentView("inventory-stock")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Package size={15} />
            Adjust Stock
          </button>
          <button
            onClick={() => setCurrentView("inventory-transfers")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all"
          >
            <ArrowRightLeft size={15} />
            Stock Transfer
          </button>
          <button
            onClick={fetchMetrics}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={fetchMetrics} className="underline hover:no-underline font-medium">Retry</button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Valuation */}
        <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#A1A1AA]">Inventory Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-[#FAFAFA]">
            ₹{totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#A1A1AA]/70 mt-1 flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-500" />
            Total cost of live physical stock
          </p>
        </div>

        {/* Total Active SKUs */}
        <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#A1A1AA]">Cataloged SKUs</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Package size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-[#FAFAFA]">
            {totalProducts.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#A1A1AA]/70 mt-1">
            Across {metrics?.warehousesCount || 1} active warehouse(s)
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => setCurrentView("inventory-stock")}
          className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm relative overflow-hidden cursor-pointer hover:border-amber-400/60 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#A1A1AA]">Low Stock Warnings</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {lowStockCount}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#A1A1AA]/70 mt-1">
            Units below configured reorder threshold
          </p>
        </div>

        {/* Out of Stock */}
        <div 
          onClick={() => setCurrentView("inventory-stock")}
          className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm relative overflow-hidden cursor-pointer hover:border-rose-400/60 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#A1A1AA]">Out of Stock</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {outOfStockCount}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#A1A1AA]/70 mt-1">
            Zero units remaining in inventory
          </p>
        </div>
      </div>

      {/* Main Grid: Health Distribution + Operations Pipelines + Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pipeline Cards & Health Distribution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Operations Fulfillment Summary */}
          <div className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA] mb-4 flex items-center justify-between">
              <span>Operational Pipelines</span>
              <span className="text-xs font-normal text-slate-400">Real-time status</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div 
                onClick={() => setCurrentView("inventory-dispatches")}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/60 dark:border-[#27272A] cursor-pointer hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-[#A1A1AA] text-xs font-medium mb-1">
                  <span>Pending Dispatches</span>
                  <Truck size={15} />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA]">
                  {metrics?.pendingDispatches || 0}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Ready for packing & shipping</p>
              </div>

              <div 
                onClick={() => setCurrentView("inventory-purchases")}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/60 dark:border-[#27272A] cursor-pointer hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-[#A1A1AA] text-xs font-medium mb-1">
                  <span>Pending Inbound POs</span>
                  <Package size={15} />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA]">
                  {metrics?.pendingPurchases || 0}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Awaiting warehouse receipt</p>
              </div>

              <div 
                onClick={() => setCurrentView("orders")}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/60 dark:border-[#27272A] cursor-pointer hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-[#A1A1AA] text-xs font-medium mb-1">
                  <span>Pending Orders</span>
                  <ShoppingCart size={15} />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA]">
                  {metrics?.pendingOrders || 0}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Customer orders to fulfill</p>
              </div>
            </div>

            {/* Visual Health Breakdown Bar */}
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-[#27272A]">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-[#A1A1AA] mb-2">
                <span>Stock Health Distribution</span>
                <span>{totalProducts} Total SKUs</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-[#27272A] rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${totalProducts > 0 ? (inStockCount / totalProducts) * 100 : 100}%` }} 
                  className="bg-emerald-500 h-full transition-all"
                  title={`Healthy Stock: ${inStockCount}`}
                />
                <div 
                  style={{ width: `${totalProducts > 0 ? (lowStockCount / totalProducts) * 100 : 0}%` }} 
                  className="bg-amber-500 h-full transition-all"
                  title={`Low Stock: ${lowStockCount}`}
                />
                <div 
                  style={{ width: `${totalProducts > 0 ? (outOfStockCount / totalProducts) * 100 : 0}%` }} 
                  className="bg-rose-500 h-full transition-all"
                  title={`Out of Stock: ${outOfStockCount}`}
                />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-[#A1A1AA] mt-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Healthy ({inStockCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Low Stock ({lowStockCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Out of Stock ({outOfStockCount})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts to Inventory Sub-modules */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Warehouse Directory", view: "inventory-warehouses", icon: <Warehouse size={16} /> },
              { label: "Stock Transfers", view: "inventory-transfers", icon: <ArrowRightLeft size={16} /> },
              { label: "Audit Ledger", view: "inventory-audit", icon: <Clock size={16} /> },
              { label: "Reports & Valuation", view: "inventory-reports", icon: <FileSpreadsheet size={16} /> },
            ].map((btn, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentView(btn.view as any)}
                className="p-3.5 rounded-xl bg-white dark:bg-[#121214] border border-slate-200 dark:border-[#27272A] hover:border-purple-500/40 text-left transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-[#FAFAFA]">
                  <span className="text-purple-600 dark:text-purple-400">{btn.icon}</span>
                  <span>{btn.label}</span>
                </div>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-purple-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Col: Recent Stock Movement Ledger Feed */}
        <div className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#27272A] mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-purple-600 dark:text-purple-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA]">Recent Stock Movements</h2>
            </div>
            <button
              onClick={() => setCurrentView("inventory-audit")}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              View Full Audit
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1">
            {!metrics?.recentMovements || metrics.recentMovements.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-[#A1A1AA] text-xs">
                No recent movements recorded yet.
              </div>
            ) : (
              metrics.recentMovements.map((mov) => {
                const isPositive = mov.qtyChanged > 0;
                return (
                  <div
                    key={mov.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/60 dark:border-[#27272A] text-xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-[#FAFAFA] truncate">
                        {mov.inventoryProduct?.product?.name || "Stock Item"}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-[#A1A1AA]/80 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{mov.movementType}</span>
                        <span>•</span>
                        <span>{mov.warehouse?.name || "Default Warehouse"}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div
                        className={`font-mono font-bold flex items-center justify-end gap-0.5 ${
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {isPositive ? `+${mov.qtyChanged}` : mov.qtyChanged}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Bal: {mov.qtyAfter}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
