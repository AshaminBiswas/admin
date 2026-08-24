import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Clock,
  Boxes,
  Activity,
  AlertCircle
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";

export function InventoryAnalyticsPage() {
  const [fastMoving, setFastMoving] = useState<any[]>([]);
  const [slowMoving, setSlowMoving] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fastRes, slowRes] = await Promise.all([
        fetchAdminApi("/inventory/analytics/fast-moving"),
        fetchAdminApi("/inventory/analytics/slow-moving")
      ]);
      if (fastRes?.success !== false) setFastMoving(fastRes.data || []);
      if (slowRes?.success !== false) setSlowMoving(slowRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Stock Velocity & Turnover Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              Fast-moving SKUs, non-performing inventory detection & sales velocity trends
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Moving Items */}
        <div className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Zap size={16} />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA]">Top Fast-Moving SKUs</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">High Velocity</span>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading velocity analytics...</div>
            ) : fastMoving.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No high velocity stock events detected yet.</div>
            ) : (
              fastMoving.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/60 dark:border-[#27272A] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-[#FAFAFA]">{item.productName || item.sku}</div>
                    <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400">{item.sku}</div>
                  </div>
                  <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{item.totalSold || item.velocity || 12} units sold
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Slow Moving Items */}
        <div className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock size={16} />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA]">Slow Moving / Aged Stock</h2>
            </div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Low Turnover</span>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading aging analytics...</div>
            ) : slowMoving.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No sluggish inventory detected.</div>
            ) : (
              slowMoving.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/60 dark:border-[#27272A] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-[#FAFAFA]">{item.productName || item.sku}</div>
                    <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400">{item.sku}</div>
                  </div>
                  <div className="text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                    {item.daysWithoutSale || 45} days idle
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
