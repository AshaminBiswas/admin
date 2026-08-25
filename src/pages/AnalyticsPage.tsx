import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Building2,
  PieChart,
  Download,
  Calendar,
  Filter,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  ArrowUpRight,
  Zap,
} from "lucide-react";

export function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "quarter" | "ytd">("30d");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExport = (reportName: string) => {
    setExportNotice(`Exporting '${reportName}' in CSV format...`);
    setTimeout(() => {
      setExportNotice(null);
    }, 3000);
  };

  const MONTHLY_REVENUE = [
    { month: "Jan", revenue: 840000, orders: 190, b2bShare: 65 },
    { month: "Feb", revenue: 920000, orders: 210, b2bShare: 68 },
    { month: "Mar", revenue: 1100000, orders: 260, b2bShare: 72 },
    { month: "Apr", revenue: 1050000, orders: 245, b2bShare: 70 },
    { month: "May", revenue: 1180000, orders: 285, b2bShare: 74 },
    { month: "Jun", revenue: 1248500, orders: 342, b2bShare: 78 },
  ];

  const maxRevenue = Math.max(...MONTHLY_REVENUE.map((m) => m.revenue));

  const CATEGORY_BREAKDOWN = [
    { name: "Heavy Duty Power Tools", percentage: 38, revenue: "₹474,430", color: "bg-[#8B5CF6]" },
    { name: "Fasteners & Industrial Anchors", percentage: 27, revenue: "₹337,095", color: "bg-[#3B82F6]" },
    { name: "Plumbing & Commercial Fittings", percentage: 20, revenue: "₹249,700", color: "bg-[#10B981]" },
    { name: "Safety & Personal Protective Equipment", percentage: 15, revenue: "₹187,275", color: "bg-[#F59E0B]" },
  ];

  return (
    <div className="space-y-3 sm:space-y-5 md:space-y-6 pb-8">
      {/* Export Toast Notification */}
      {exportNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18181B] border border-[#8B5CF6] text-[#FAFAFA] px-3.5 py-2 rounded-tr-xl rounded-bl-xl shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 size={16} className="text-[#8B5CF6]" />
          <span className="text-xs font-bold">{exportNotice}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#18181B] p-3.5 sm:p-5 rounded-tr-3xl rounded-bl-3xl border border-[#27272A]">
        <div>
          <h1 className="text-base sm:text-xl font-bold font-serif text-[#FAFAFA]">Executive Analytics & Performance</h1>
          <p className="text-[11px] sm:text-xs text-[#A1A1AA] mt-0.5">
            Real-time commercial revenue metrics, B2B quote conversion rates & financial reports.
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-[#09090B] p-1 rounded-tr-xl rounded-bl-xl border border-[#27272A] overflow-x-auto">
          <Filter size={12} className="text-[#8B5CF6] ml-1 flex-shrink-0" />
          <button
            type="button"
            onClick={() => setTimeframe("7d")}
            className={`px-2.5 py-1 rounded-tr-lg rounded-bl-lg text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${
              timeframe === "7d" ? "bg-[#8B5CF6] text-[#FAFAFA]" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeframe("30d")}
            className={`px-2.5 py-1 rounded-tr-lg rounded-bl-lg text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${
              timeframe === "30d" ? "bg-[#8B5CF6] text-[#FAFAFA]" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
            }`}
          >
            30 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeframe("quarter")}
            className={`px-2.5 py-1 rounded-tr-lg rounded-bl-lg text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${
              timeframe === "quarter" ? "bg-[#8B5CF6] text-[#FAFAFA]" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
            }`}
          >
            Quarter
          </button>
          <button
            type="button"
            onClick={() => setTimeframe("ytd")}
            className={`px-2.5 py-1 rounded-tr-lg rounded-bl-lg text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${
              timeframe === "ytd" ? "bg-[#8B5CF6] text-[#FAFAFA]" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
            }`}
          >
            YTD
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-[#18181B] p-3 sm:p-5 rounded-tr-2xl rounded-bl-2xl border border-[#27272A] relative overflow-hidden group hover:border-[#8B5CF6]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">Gross Sales Revenue</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6]/15 text-[#A855F7] flex items-center justify-center flex-shrink-0">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-base sm:text-2xl font-extrabold text-[#FAFAFA] font-serif mt-1.5 sm:mt-2">₹1,248,500</p>
          <div className="flex items-center gap-1 mt-1 sm:mt-2 text-[10px] sm:text-xs font-semibold text-[#10B981]">
            <TrendingUp size={12} />
            <span>+24.8%</span>
          </div>
        </div>

        {/* B2B Orders Count */}
        <div className="bg-[#18181B] p-3 sm:p-5 rounded-tr-2xl rounded-bl-2xl border border-[#27272A] relative overflow-hidden group hover:border-[#8B5CF6]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">Total B2B Orders</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-tr-xl rounded-bl-xl bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center flex-shrink-0">
              <ShoppingCart size={16} />
            </div>
          </div>
          <p className="text-base sm:text-2xl font-extrabold text-[#FAFAFA] font-serif mt-1.5 sm:mt-2">342</p>
          <div className="flex items-center gap-1 mt-1 sm:mt-2 text-[10px] sm:text-xs font-semibold text-[#10B981]">
            <TrendingUp size={12} />
            <span>+18.2%</span>
          </div>
        </div>

        {/* B2B Quote Conversion */}
        <div className="bg-[#18181B] p-6 rounded-tr-2xl rounded-bl-2xl border border-[#27272A] relative overflow-hidden group hover:border-[#8B5CF6]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">Quote Conversion</span>
            <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
              <Zap size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#FAFAFA] font-serif mt-3">78.4%</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-[#10B981]">
            <ArrowUpRight size={16} />
            <span>High B2B deal closing rate</span>
          </div>
        </div>

        {/* Active Corporate Accounts */}
        <div className="bg-[#18181B] p-6 rounded-tr-2xl rounded-bl-2xl border border-[#27272A] relative overflow-hidden group hover:border-[#8B5CF6]/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">Active Client Accounts</span>
            <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center">
              <Building2 size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#FAFAFA] font-serif mt-3">68</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-[#A1A1AA]">
            <span>+12 new accounts this month</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Growth Bar Visualizer */}
        <div className="lg:col-span-2 bg-[#18181B] p-6 rounded-tr-3xl rounded-bl-3xl border border-[#27272A] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#FAFAFA] font-serif">Monthly Revenue Breakdown</h3>
              <p className="text-xs text-[#A1A1AA]">Gross revenue & order volumes over the past 6 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                <span className="text-[#A1A1AA]">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                <span className="text-[#A1A1AA]">B2B Share (%)</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualizer */}
          <div className="space-y-4 pt-4">
            {MONTHLY_REVENUE.map((item) => {
              const widthPct = (item.revenue / maxRevenue) * 100;
              return (
                <div key={item.month} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#FAFAFA] font-bold w-12">{item.month} 2026</span>
                    <div className="flex items-center gap-4">
                      <span className="text-[#A1A1AA]">{item.orders} Orders</span>
                      <span className="text-[#8B5CF6] font-bold">₹{item.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full h-3.5 bg-[#09090B] rounded-full overflow-hidden flex border border-[#27272A]">
                    <div
                      className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Revenue Distribution */}
        <div className="bg-[#18181B] p-6 rounded-tr-3xl rounded-bl-3xl border border-[#27272A] space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#FAFAFA] font-serif">Category Performance</h3>
              <PieChart size={20} className="text-[#8B5CF6]" />
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1">Revenue distribution by hardware catalog sector</p>

            <div className="space-y-4 mt-6">
              {CATEGORY_BREAKDOWN.map((cat) => (
                <div key={cat.name} className="p-3 bg-[#09090B] rounded-tr-xl rounded-bl-xl border border-[#27272A] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                      <span className="font-bold text-[#FAFAFA]">{cat.name}</span>
                    </div>
                    <span className="font-extrabold text-[#FAFAFA]">{cat.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#18181B] rounded-full overflow-hidden">
                    <div className={`h-full ${cat.color}`} style={{ width: `${cat.percentage}%` }} />
                  </div>
                  <p className="text-[10px] text-right text-[#A1A1AA] font-mono">{cat.revenue}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#27272A] flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>Top Performing Sector:</span>
            <span className="font-bold text-[#8B5CF6]">Heavy Duty Power Tools</span>
          </div>
        </div>
      </div>

      {/* Exportable Reports Section */}
      <div className="bg-[#18181B] p-6 rounded-tr-3xl rounded-bl-3xl border border-[#27272A] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#FAFAFA] font-serif">Download Financial & Sales Reports</h3>
            <p className="text-xs text-[#A1A1AA]">Generate instant CSV audit reports for accounting and executive review</p>
          </div>
          <FileSpreadsheet size={22} className="text-[#8B5CF6]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => handleExport("Monthly Sales Audit Report")}
            className="p-4 bg-[#09090B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#8B5CF6] rounded-tr-xl rounded-bl-xl text-left transition-all group"
          >
            <div className="flex items-center justify-between text-[#8B5CF6] mb-2">
              <BarChart3 size={18} />
              <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-[#FAFAFA]">Monthly Sales Audit</h4>
            <p className="text-[10px] text-[#A1A1AA] mt-1">Full transaction breakdown & payment statuses</p>
          </button>

          <button
            type="button"
            onClick={() => handleExport("B2B Quotation Conversion Report")}
            className="p-4 bg-[#09090B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#8B5CF6] rounded-tr-xl rounded-bl-xl text-left transition-all group"
          >
            <div className="flex items-center justify-between text-[#3B82F6] mb-2">
              <Zap size={18} />
              <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-[#FAFAFA]">B2B Quote Conversion</h4>
            <p className="text-[10px] text-[#A1A1AA] mt-1">Bulk deals, discounts & approval metrics</p>
          </button>

          <button
            type="button"
            onClick={() => handleExport("Inventory Valuation Audit")}
            className="p-4 bg-[#09090B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#8B5CF6] rounded-tr-xl rounded-bl-xl text-left transition-all group"
          >
            <div className="flex items-center justify-between text-[#10B981] mb-2">
              <DollarSign size={18} />
              <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-[#FAFAFA]">Inventory Valuation</h4>
            <p className="text-[10px] text-[#A1A1AA] mt-1">Stock asset value & reorder levels</p>
          </button>

          <button
            type="button"
            onClick={() => handleExport("GST & Tax Summary Report")}
            className="p-4 bg-[#09090B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#8B5CF6] rounded-tr-xl rounded-bl-xl text-left transition-all group"
          >
            <div className="flex items-center justify-between text-[#F59E0B] mb-2">
              <Calendar size={18} />
              <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-[#FAFAFA]">GST & Tax Summary</h4>
            <p className="text-[10px] text-[#A1A1AA] mt-1">Tax liabilities & invoice summaries</p>
          </button>
        </div>
      </div>
    </div>
  );
}
