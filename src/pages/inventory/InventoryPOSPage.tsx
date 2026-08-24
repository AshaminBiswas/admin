import React, { useState, useEffect, useCallback } from "react";
import {
  Store,
  Laptop,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  Receipt,
  IndianRupee,
  Plus
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";

interface POSStore {
  id: string;
  name: string;
  code: string;
  address?: string;
  status: string;
  warehouse?: { name: string };
  terminals?: Array<{ id: string; name: string; terminalCode: string; status: string }>;
}

export function InventoryPOSPage() {
  const [stores, setStores] = useState<POSStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminApi(`/inventory/pos/stores`);
      if (res?.success !== false) {
        setStores(res.data || []);
      } else {
        setError(res?.message || "Failed to load POS stores.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Store size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Point of Sale (POS) & Retail Terminals
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              In-store checkout counters, cashier register sessions & live inventory sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStores}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* POS Stores Grid */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-12 text-center text-slate-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
          Loading POS terminal network...
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-12 text-center text-slate-400">
          No POS retail outlets registered yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stores.map((store) => (
            <div
              key={store.id}
              className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-6 shadow-sm flex flex-col justify-between hover:border-purple-500/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                      <Store size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm leading-tight">
                        {store.name}
                      </h3>
                      <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                        {store.code}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {store.status || "OPEN"}
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-[#A1A1AA] pt-2 border-t border-slate-100 dark:border-[#27272A]">
                  <span>Fulfillment Hub: {store.warehouse?.name || "Main Warehouse"}</span>
                </div>

                {/* Terminals list */}
                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-[#FAFAFA] uppercase tracking-wider">
                    Terminals ({store.terminals?.length || 0})
                  </span>
                  {store.terminals && store.terminals.length > 0 ? (
                    store.terminals.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/60 dark:border-[#27272A] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Laptop size={14} className="text-purple-500" />
                          <span className="font-medium text-slate-800 dark:text-[#FAFAFA]">{t.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">{t.terminalCode}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No checkout registers assigned</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
