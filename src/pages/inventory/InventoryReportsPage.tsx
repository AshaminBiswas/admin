import React, { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet,
  Download,
  Search,
  RefreshCw,
  IndianRupee,
  AlertTriangle,
  Boxes,
  TrendingDown
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";

export function InventoryReportsPage() {
  const [reportType, setReportType] = useState<"current-stock" | "low-stock" | "valuation">("valuation");
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminApi(`/inventory/reports/${reportType}`);
      if (res?.success !== false) {
        setData(Array.isArray(res.data) ? res.data : res.data?.items || []);
      } else {
        setError(res?.message || "Failed to load report.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [reportType]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((obj) => Object.values(obj).map((v) => `"${v}"`).join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Inventory Reports & Valuation Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              Generate accounting exports, dead stock analysis & valuation statements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={data.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={fetchReport}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#27272A] pb-3">
        {[
          { id: "valuation", label: "Inventory Valuation", icon: <IndianRupee size={15} /> },
          { id: "current-stock", label: "Stock Snapshot", icon: <Boxes size={15} /> },
          { id: "low-stock", label: "Low Stock Alert", icon: <AlertTriangle size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              reportType === tab.id
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white dark:bg-[#121214] text-slate-600 dark:text-[#A1A1AA] border border-slate-200 dark:border-[#27272A] hover:border-purple-500/40"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Report Data Table */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-[#FAFAFA]">
            <thead className="bg-slate-50 dark:bg-[#18181B] text-slate-500 dark:text-[#A1A1AA] uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-[#27272A]">
              <tr>
                <th className="px-5 py-3.5">SKU & Item</th>
                <th className="px-5 py-3.5 text-center">Live Units</th>
                <th className="px-5 py-3.5 text-right">Cost Price</th>
                <th className="px-5 py-3.5 text-right">Valuation (Cost Basis)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
                    Generating {reportType} report...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    No data records found for this report criteria.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const qty = Number(row.currentStock || row.quantity || 0);
                  const price = Number(row.purchasePrice || row.price || 0);
                  const total = qty * price;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-[#18181B]/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-[#FAFAFA]">
                          {row.productName || row.product?.name || "Inventory Item"}
                        </div>
                        <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                          {row.sku || "SKU-AUTO"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold">
                        {qty}
                      </td>
                      <td className="px-5 py-4 text-right font-mono">
                        ₹{price.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-slate-900 dark:text-[#FAFAFA]">
                        ₹{total.toLocaleString("en-IN")}
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
