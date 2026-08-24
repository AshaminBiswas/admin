import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRightLeft,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Boxes,
  Plus
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";
import { useDebounce } from "../../hooks/useDebounce";

interface TransferItem {
  id: string;
  transferNumber?: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: "PENDING" | "APPROVED" | "IN_TRANSIT" | "RECEIVED" | "REJECTED";
  notes?: string;
  createdAt: string;
  sourceWarehouse?: { name: string; code: string };
  destinationWarehouse?: { name: string; code: string };
  items?: Array<{
    id: string;
    quantity: number;
    inventoryProduct?: { sku: string; product?: { name: string } };
  }>;
}

export function InventoryTransfersPage() {
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminApi(`/inventory/transfers`);
      if (res?.success !== false) {
        setTransfers(res.data || []);
      } else {
        setError(res?.message || "Failed to load transfers.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetchAdminApi(`/inventory/transfers/${id}/approve`, { method: "POST" });
      if (res?.success !== false) {
        fetchTransfers();
      } else {
        alert(res?.message || "Failed to approve transfer.");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to approve transfer.");
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Warehouse Stock Transfers
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              Atomic warehouse-to-warehouse stock movements, transit logs & approval ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransfers}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-[#FAFAFA]">
            <thead className="bg-slate-50 dark:bg-[#18181B] text-slate-500 dark:text-[#A1A1AA] uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-[#27272A]">
              <tr>
                <th className="px-5 py-3.5">Transfer Ref</th>
                <th className="px-5 py-3.5">Source Warehouse</th>
                <th className="px-5 py-3.5">Destination Warehouse</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5">Date Created</th>
                <th className="px-5 py-3.5 text-right">Approval Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
                    Loading transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No warehouse transfers recorded yet.
                  </td>
                </tr>
              ) : (
                transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/60 dark:hover:bg-[#18181B]/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-semibold text-slate-900 dark:text-[#FAFAFA]">
                      {tr.transferNumber || tr.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-4">
                      {tr.sourceWarehouse?.name || "Hub 1"}
                    </td>
                    <td className="px-5 py-4">
                      {tr.destinationWarehouse?.name || "Hub 2"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        tr.status === "APPROVED" || tr.status === "RECEIVED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : tr.status === "PENDING"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-slate-100 text-slate-700 dark:bg-[#27272A] dark:text-[#A1A1AA]"
                      }`}>
                        {tr.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(tr.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {tr.status === "PENDING" && (
                        <button
                          onClick={() => handleApprove(tr.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors"
                        >
                          Approve Transfer
                        </button>
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
  );
}
