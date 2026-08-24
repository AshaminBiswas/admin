import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";
import { useDebounce } from "../../hooks/useDebounce";

interface AuditMovement {
  id: string;
  qtyChanged: number;
  qtyBefore: number;
  qtyAfter: number;
  movementType: string;
  channel: string;
  reason?: string;
  notes?: string;
  createdAt: string;
  inventoryProduct?: {
    sku: string;
    product?: { name: string };
  };
  warehouse?: { name: string; code: string };
}

export function InventoryAuditPage() {
  const [movements, setMovements] = useState<AuditMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter !== "ALL" && { type: typeFilter })
      });
      const res = await fetchAdminApi(`/inventory/audit/activity?${qs.toString()}`);
      if (res?.success !== false) {
        setMovements(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      } else {
        setError(res?.message || "Failed to load audit ledger.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, typeFilter]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Immutable Stock Movement Ledger & Audit
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              Complete chronological audit trail of all physical quantity changes across ventures
            </p>
          </div>
        </div>

        <button
          onClick={fetchAudit}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Audit Table */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-[#FAFAFA]">
            <thead className="bg-slate-50 dark:bg-[#18181B] text-slate-500 dark:text-[#A1A1AA] uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-[#27272A]">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Product & SKU</th>
                <th className="px-5 py-3.5">Warehouse</th>
                <th className="px-5 py-3.5 text-center">Movement Type</th>
                <th className="px-5 py-3.5 text-right">Qty Before</th>
                <th className="px-5 py-3.5 text-right">Qty Delta</th>
                <th className="px-5 py-3.5 text-right">Balance</th>
                <th className="px-5 py-3.5">Reason / Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
                    Loading immutable audit trail...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    No stock movement events recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((mov) => {
                  const isPositive = mov.qtyChanged > 0;
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/60 dark:hover:bg-[#18181B]/60 transition-colors">
                      <td className="px-5 py-4 font-mono text-slate-500 text-[11px]">
                        {new Date(mov.createdAt).toLocaleString("en-IN")}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-[#FAFAFA]">
                          {mov.inventoryProduct?.product?.name || "Stock Item"}
                        </div>
                        <div className="font-mono text-[11px] text-purple-600 dark:text-purple-400">
                          {mov.inventoryProduct?.sku || "SKU"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {mov.warehouse?.name || "Warehouse"}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#A1A1AA]">
                          {mov.movementType}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right font-mono text-slate-500">
                        {mov.qtyBefore}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className={`font-mono font-bold inline-flex items-center gap-0.5 ${
                          isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          {isPositive ? `+${mov.qtyChanged}` : mov.qtyChanged}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                        {mov.qtyAfter}
                      </td>

                      <td className="px-5 py-4 text-slate-500 text-[11px]">
                        {mov.reason || mov.notes || "System balance update"}
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
  );
}
