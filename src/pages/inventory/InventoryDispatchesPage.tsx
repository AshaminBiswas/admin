import React, { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Package,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Boxes
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";
import { useDebounce } from "../../hooks/useDebounce";

interface DispatchItem {
  id: string;
  dispatchNumber?: string;
  orderId?: string;
  warehouseId?: string;
  status: "PENDING" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
  items?: Array<{
    id: string;
    quantity: number;
    inventoryProduct?: { sku: string; product?: { name: string } };
  }>;
  warehouse?: { name: string; code: string };
}

export function InventoryDispatchesPage() {
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchDispatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== "ALL" && { status: statusFilter })
      });
      const res = await fetchAdminApi(`/inventory/dispatches?${qs.toString()}`);
      if (res?.success !== false) {
        setDispatches(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      } else {
        setError(res?.message || "Failed to load dispatches.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchDispatches();
  }, [fetchDispatches]);

  const handleUpdateStatus = async (id: string, action: "pack" | "ship" | "deliver") => {
    try {
      const res = await fetchAdminApi(`/inventory/dispatches/${id}/${action}`, { method: "POST" });
      if (res?.success !== false) {
        fetchDispatches();
      } else {
        alert(res?.message || `Failed to ${action} dispatch`);
      }
    } catch (err: any) {
      alert(err?.message || `Failed to ${action} dispatch`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
      case "SHIPPED":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
      case "PACKED":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400";
      case "PENDING":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-[#27272A] dark:text-[#A1A1AA]";
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Outbound Dispatches & Fulfillment
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              Pick, pack, carrier tracking and delivery handoffs for B2B & customer shipments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDispatches}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dispatch ID, tracking #..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#121214] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white dark:bg-[#121214] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-700 dark:text-[#FAFAFA] focus:outline-none focus:border-purple-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PACKED">Packed</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </div>

      {/* Dispatches Table */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-[#FAFAFA]">
            <thead className="bg-slate-50 dark:bg-[#18181B] text-slate-500 dark:text-[#A1A1AA] uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-[#27272A]">
              <tr>
                <th className="px-5 py-3.5">Dispatch Ref</th>
                <th className="px-5 py-3.5">Warehouse</th>
                <th className="px-5 py-3.5">Carrier & Tracking</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5">Created Date</th>
                <th className="px-5 py-3.5 text-right">Fulfillment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
                    Loading dispatch queue...
                  </td>
                </tr>
              ) : dispatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No active dispatches found. Dispatches are automatically generated from placed orders.
                  </td>
                </tr>
              ) : (
                dispatches.map((disp) => (
                  <tr key={disp.id} className="hover:bg-slate-50/60 dark:hover:bg-[#18181B]/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-semibold text-slate-900 dark:text-[#FAFAFA]">
                      {disp.dispatchNumber || disp.id.substring(0, 8).toUpperCase()}
                    </td>

                    <td className="px-5 py-4">
                      {disp.warehouse?.name || "Main Warehouse"}
                    </td>

                    <td className="px-5 py-4">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-[#FAFAFA]">
                          {disp.carrier || "Standard Logistics"}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {disp.trackingNumber || "No tracking assigned"}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full font-bold text-[10px] tracking-wide ${getStatusBadge(disp.status)}`}>
                        {disp.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {new Date(disp.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {disp.status === "PENDING" && (
                          <button
                            onClick={() => handleUpdateStatus(disp.id, "pack")}
                            className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 rounded-lg font-semibold text-[11px] hover:bg-purple-100 transition-colors"
                          >
                            Pack
                          </button>
                        )}
                        {disp.status === "PACKED" && (
                          <button
                            onClick={() => handleUpdateStatus(disp.id, "ship")}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 rounded-lg font-semibold text-[11px] hover:bg-blue-100 transition-colors"
                          >
                            Ship
                          </button>
                        )}
                        {disp.status === "SHIPPED" && (
                          <button
                            onClick={() => handleUpdateStatus(disp.id, "deliver")}
                            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 rounded-lg font-semibold text-[11px] hover:bg-emerald-100 transition-colors"
                          >
                            Mark Delivered
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
    </div>
  );
}
