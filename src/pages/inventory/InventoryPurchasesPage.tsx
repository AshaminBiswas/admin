import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Package,
  Plus
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";
import { useDebounce } from "../../hooks/useDebounce";

interface PurchaseOrder {
  id: string;
  poNumber?: string;
  supplierId: string;
  warehouseId?: string;
  status: "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
  totalAmount: number;
  expectedDate?: string;
  createdAt: string;
  supplier?: { name: string; email: string };
  warehouse?: { name: string; code: string };
}

export function InventoryPurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminApi(`/inventory/purchases/orders`);
      if (res?.success !== false) {
        setOrders(res.data || []);
      } else {
        setError(res?.message || "Failed to load purchase orders.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Inbound Purchases & Vendor POs
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              Purchase orders, warehouse inbound intake & supplier fulfillment verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPurchases}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* POs Table */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-[#FAFAFA]">
            <thead className="bg-slate-50 dark:bg-[#18181B] text-slate-500 dark:text-[#A1A1AA] uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-[#27272A]">
              <tr>
                <th className="px-5 py-3.5">PO Number</th>
                <th className="px-5 py-3.5">Supplier</th>
                <th className="px-5 py-3.5">Destination Warehouse</th>
                <th className="px-5 py-3.5 text-right">Total PO Value</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 dark:hover:bg-[#18181B]/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-semibold text-slate-900 dark:text-[#FAFAFA]">
                      {po.poNumber || po.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800 dark:text-[#FAFAFA]">
                      {po.supplier?.name || "Global Vendor"}
                    </td>
                    <td className="px-5 py-4">
                      {po.warehouse?.name || "Central Warehouse"}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-slate-900 dark:text-[#FAFAFA]">
                      ₹{Number(po.totalAmount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        po.status === "RECEIVED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : po.status === "ORDERED"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(po.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
