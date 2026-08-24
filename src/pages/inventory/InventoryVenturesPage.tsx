import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  Warehouse,
  Plus
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";

interface VentureItem {
  id: string;
  name: string;
  code: string;
  currency: string;
  status: string;
  description?: string;
  createdAt: string;
  _count?: {
    warehouses: number;
    inventoryProducts: number;
  };
}

export function InventoryVenturesPage() {
  const [ventures, setVentures] = useState<VentureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVentures = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminApi(`/inventory/ventures`);
      if (res?.success !== false) {
        setVentures(res.data || []);
      } else {
        setError(res?.message || "Failed to load ventures.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVentures();
  }, [fetchVentures]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Globe size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Multi-Entity & Venture Configuration
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              Business division management, multi-tenant inventory boundaries & fiscal currencies
            </p>
          </div>
        </div>

        <button
          onClick={fetchVentures}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Ventures Grid */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-12 text-center text-slate-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
          Loading business ventures...
        </div>
      ) : ventures.length === 0 ? (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-12 text-center text-slate-400">
          No secondary business entities registered. Operating under default primary venture.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ventures.map((v) => (
            <div
              key={v.id}
              className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-6 shadow-sm flex flex-col justify-between hover:border-purple-500/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm leading-tight">
                        {v.name}
                      </h3>
                      <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                        {v.code}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {v.status || "ACTIVE"}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-[#A1A1AA] pt-2 border-t border-slate-100 dark:border-[#27272A]">
                  {v.description || "Primary trading & manufacturing business division."}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-[#A1A1AA] pt-3">
                  <span>Currency: <strong className="font-mono text-slate-900 dark:text-[#FAFAFA]">{v.currency || "INR (₹)"}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
