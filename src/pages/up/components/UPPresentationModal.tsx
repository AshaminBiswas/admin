import React, { useRef } from "react";
import {
  Printer,
  Download,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Building2,
  Sparkles,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { UPDashboardData } from "../../../types/admin";

interface UPPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: UPDashboardData | null;
  periodLabel: string;
  adminName?: string;
  onExportExcel?: () => void;
}

const formatInr = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return "0";
  return Number(val).toLocaleString("en-IN");
};

export function UPPresentationModal({
  isOpen,
  onClose,
  dashboardData,
  periodLabel,
  adminName,
  onExportExcel,
}: UPPresentationModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !dashboardData) return null;

  const kpis = dashboardData.kpis || ({} as any);
  const totalSpend = Number(kpis.rangeTotal || 0);
  const verifiedTotal = Number(kpis.verifiedTotal || 0);
  const unverifiedTotal = Number(kpis.unverifiedTotal || 0);
  const verifiedPct = totalSpend > 0 ? ((verifiedTotal / totalSpend) * 100).toFixed(1) : "0";
  const peakAmount = Number(kpis.highestExpense || 0);
  const topCategory = kpis.topCategory || "General";
  const dailyAverage = Number(kpis.averageDailyExpense || 0);
  const totalTxCount = Number(kpis.transactionCount || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadStandaloneHtml = () => {
    const timestamp = new Date().toLocaleString("en-IN");
    const safeTitle = `UP_Factory_Expense_Presentation_${periodLabel.replace(/[^a-zA-Z0-9]/g, "_")}`;

    // Generate categories HTML
    const catRowsHtml = (dashboardData.categoryBreakdown || [])
      .map(
        (c) => `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
          <span>${c.name}</span>
          <span style="font-family: monospace;">₹${formatInr(c.total)} <span style="font-size: 11px; color: #64748b;">(${c.percentage}%)</span></span>
        </div>
        <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
          <div style="width: ${Math.min(100, c.percentage)}%; height: 100%; background: #4f46e5; border-radius: 9999px;"></div>
        </div>
      </div>
    `
      )
      .join("");

    // Generate top expenses HTML
    const topExpRowsHtml = (dashboardData.topExpenses || [])
      .map(
        (e) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
        <td style="padding: 8px 12px;">${e.expenseDate}</td>
        <td style="padding: 8px 12px; font-weight: 600;">${e.paidTo}</td>
        <td style="padding: 8px 12px;">${e.categoryName}</td>
        <td style="padding: 8px 12px; text-transform: uppercase;">${e.paymentMode}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; font-family: monospace;">₹${formatInr(e.amount)}</td>
        <td style="padding: 8px 12px; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; ${
            e.verified ? "background: #dcfce7; color: #166534;" : "background: #fef3c7; color: #92400e;"
          }">
            ${e.verified ? "VERIFIED" : "PENDING"}
          </span>
        </td>
      </tr>
    `
      )
      .join("");

    // SVG Points for Trend
    const trend = dashboardData.trend || [];
    const maxVal = Math.max(1, ...trend.map((t) => t.total));
    const svgWidth = 800;
    const svgHeight = 220;
    const padding = 30;
    const effectiveW = svgWidth - padding * 2;
    const effectiveH = svgHeight - padding * 2;

    const points = trend.map((t, idx) => {
      const x = padding + (idx / Math.max(1, trend.length - 1)) * effectiveW;
      const y = svgHeight - padding - (t.total / maxVal) * effectiveH;
      return `${x},${y}`;
    });

    const areaPoints = points.length > 0
      ? `${padding},${svgHeight - padding} ` + points.join(" ") + ` ${svgWidth - padding},${svgHeight - padding}`
      : "";

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
    .card { background: #ffffff; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #e2e8f0; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 20px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px; }
    .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: #f1f5f9; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .kpi-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; }
    .kpi-val { font-size: 24px; font-weight: 800; color: #0f172a; margin: 6px 0; }
    .kpi-sub { font-size: 11px; color: #64748b; }
    .split-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 20px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 40px; padding-top: 24px; border-top: 1px solid #cbd5e1; }
    .sig-box { border-top: 1px dashed #94a3b8; padding-top: 8px; text-align: center; font-size: 11px; color: #475569; }
    @media print { body { background: #fff; padding: 0; } .card { box-shadow: none; border: none; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="title">PACIFIC PRODUCTS & SOLUTIONS — UP FACTORY</div>
        <div class="subtitle">Executive Financial & Petty Cash Analytics Report • Generated ${timestamp}</div>
      </div>
      <div>
        <span class="badge">${periodLabel}</span>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Outflow</div>
        <div class="kpi-val" style="color: #4338ca;">₹${formatInr(totalSpend)}</div>
        <div class="kpi-sub">${totalTxCount} Transactions Recorded</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Peak Single Spend</div>
        <div class="kpi-val" style="color: #0f172a;">₹${formatInr(peakAmount)}</div>
        <div class="kpi-sub">${kpis.highestExpenseDate || "In Period"} • ${kpis.highestExpensePaidTo || ""}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Daily Run Rate</div>
        <div class="kpi-val" style="color: #059669;">₹${formatInr(dailyAverage)}</div>
        <div class="kpi-sub">Average Daily Expenditure</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Audit Clearance</div>
        <div class="kpi-val" style="color: #d97706;">${verifiedPct}%</div>
        <div class="kpi-sub">₹${formatInr(verifiedTotal)} Super Admin Verified</div>
      </div>
    </div>

    <div class="split-grid">
      <div>
        <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 12px;">Expense Velocity Trend</h3>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; height: auto;">
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            <polygon points="${areaPoints}" fill="url(#grad)" />
            <polyline points="${points.join(" ")}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            ${points.map((pt) => `<circle cx="${pt.split(",")[0]}" cy="${pt.split(",")[1]}" r="3" fill="#4338ca" />`).join("")}
          </svg>
        </div>
      </div>

      <div>
        <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 12px;">Category Distribution</h3>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
          ${catRowsHtml}
        </div>
      </div>
    </div>

    <div>
      <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 8px;">Top Individual Expenditures</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Vendor / Paid To</th>
            <th>Category</th>
            <th>Mode</th>
            <th style="text-align: right;">Amount (₹)</th>
            <th style="text-align: center;">Audit Status</th>
          </tr>
        </thead>
        <tbody>
          ${topExpRowsHtml}
        </tbody>
      </table>
    </div>

    <div class="signatures">
      <div class="sig-box">
        <strong>Prepared By</strong><br>
        <span>Accounts Officer (${adminName || "Authorized Staff"})</span>
      </div>
      <div class="sig-box">
        <strong>Factory Operations</strong><br>
        <span>UP Works Manager</span>
      </div>
      <div class="sig-box">
        <strong>Authorized Signatory</strong><br>
        <span>Managing Director / Super Admin</span>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}.html`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Printable / Presentation Container */}
      <div
        ref={printableRef}
        id="up-presentation-printable"
        className="w-full max-w-5xl bg-[#09090B] text-zinc-100 rounded-2xl sm:rounded-3xl border border-[#27272A] shadow-2xl overflow-hidden my-auto print:m-0 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black"
      >
        {/* Style block for clean printing */}
        <style>{`
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
            }
            body * {
              visibility: hidden;
            }
            #up-presentation-printable, #up-presentation-printable * {
              visibility: visible;
            }
            #up-presentation-printable {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: #ffffff !important;
              color: #000000 !important;
              border: none !important;
              box-shadow: none !important;
            }
            .no-print {
              display: none !important;
            }
            .print-text-dark {
              color: #0f172a !important;
            }
            .print-bg-light {
              background-color: #f8fafc !important;
              border-color: #cbd5e1 !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `}</style>

        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="p-4 sm:p-5 bg-[#18181B] border-b border-[#27272A] flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                Executive Presentation Report
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono">
                  {periodLabel}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Presentation-ready visual analytics with graphs, category shares, and audit clearance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <Printer size={14} /> Print / Save PDF
            </button>

            <button
              type="button"
              onClick={handleDownloadStandaloneHtml}
              className="px-3.5 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
              title="Download presentation as standalone HTML file"
            >
              <Download size={14} /> Standalone HTML
            </button>

            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="px-3 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                title="Download raw data Excel"
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-400 hover:text-white transition-all ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Report Canvas */}
        <div className="p-6 sm:p-8 space-y-6 print:p-2 print:space-y-4">
          {/* Executive Presentation Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#27272A] pb-5 print:border-slate-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-indigo-400 print:text-indigo-700" />
                <span className="text-xs font-extrabold text-indigo-400 print:text-indigo-700 tracking-wider uppercase">
                  PACIFIC PRODUCTS & SOLUTIONS
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white print:text-black tracking-tight">
                UP FACTORY — FINANCIAL ANALYTICS REPORT
              </h1>
              <p className="text-xs text-zinc-400 print:text-slate-600">
                Operational Outflow, Daily Burn Velocity & Financial Controls Deck
              </p>
            </div>

            <div className="text-right space-y-1 sm:self-center">
              <div className="inline-block px-3 py-1 rounded-xl bg-indigo-500/10 print:bg-indigo-50 border border-indigo-500/20 print:border-indigo-200 text-indigo-300 print:text-indigo-800 text-xs font-black font-mono">
                {periodLabel}
              </div>
              <div className="text-[10px] text-zinc-500 print:text-slate-500">
                Generated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* Primary 4-Deck Financial KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#18181B] print-bg-light border border-[#27272A] print:border-slate-300 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 print:text-slate-600 uppercase tracking-wider">
                Total Expenditure
              </span>
              <div className="text-2xl font-black text-indigo-400 print:text-indigo-700 font-mono">
                ₹{formatInr(totalSpend)}
              </div>
              <span className="text-[10px] text-zinc-500 print:text-slate-500 block">
                {totalTxCount} Vouchers Booked
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181B] print-bg-light border border-[#27272A] print:border-slate-300 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 print:text-slate-600 uppercase tracking-wider">
                Peak Single Spend
              </span>
              <div className="text-2xl font-black text-white print:text-black font-mono">
                ₹{formatInr(peakAmount)}
              </div>
              <span className="text-[10px] text-zinc-400 print:text-slate-600 truncate block">
                {kpis.highestExpenseDate || "None"} • {kpis.highestExpensePaidTo || "N/A"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181B] print-bg-light border border-[#27272A] print:border-slate-300 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 print:text-slate-600 uppercase tracking-wider">
                Daily Burn Rate
              </span>
              <div className="text-2xl font-black text-emerald-400 print:text-emerald-700 font-mono">
                ₹{formatInr(dailyAverage)}
              </div>
              <span className="text-[10px] text-zinc-500 print:text-slate-500 block">
                Average Spend / Day
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#18181B] print-bg-light border border-[#27272A] print:border-slate-300 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 print:text-slate-600 uppercase tracking-wider">
                Verified Clearance
              </span>
              <div className="text-2xl font-black text-amber-400 print:text-amber-700 font-mono">
                {verifiedPct}%
              </div>
              <span className="text-[10px] text-zinc-500 print:text-slate-500 block">
                ₹{formatInr(verifiedTotal)} Verified
              </span>
            </div>
          </div>

          {/* Visual Grid: Trend Velocity Area Chart + Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart Area */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-[#18181B] print-bg-light border border-[#27272A] print:border-slate-300 space-y-3">
              <div className="flex items-center justify-between border-b border-[#27272A] print:border-slate-300 pb-2">
                <h3 className="text-xs font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-400" /> Expense Velocity Trend
                </h3>
                <span className="text-[10px] text-zinc-400 print:text-slate-600 font-mono">
                  Peak: ₹{formatInr(peakAmount)}
                </span>
              </div>

              <div className="h-64 w-full">
                {dashboardData.trend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                    No velocity trend data available for this timeframe.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="presTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#71717A"
                        fontSize={9}
                        tickLine={false}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis
                        stroke="#71717A"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181B",
                          borderColor: "#3F3F46",
                          borderRadius: "12px",
                          fontSize: "11px",
                          color: "#fff",
                        }}
                        formatter={(v: any) => [`₹${formatInr(v)}`, "Spend"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#6366F1"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#presTrendGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Category Breakdown Progress Bars */}
            <div className="lg:col-span-1 p-5 rounded-2xl bg-[#18181B] print-bg-light border border-[#27272A] print:border-slate-300 space-y-3">
              <div className="flex items-center justify-between border-b border-[#27272A] print:border-slate-300 pb-2">
                <h3 className="text-xs font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
                  <Layers size={14} className="text-indigo-400" /> Category Breakdown
                </h3>
                <span className="text-[10px] text-zinc-400 print:text-slate-600 font-mono">
                  Top: {topCategory}
                </span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {(dashboardData.categoryBreakdown || []).map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-200 print:text-black truncate">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white print:text-black">₹{formatInr(cat.total)}</span>
                        <span className="text-[10px] text-zinc-400 print:text-slate-500">({cat.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-800 print:bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, cat.percentage || 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top 5 Expenditures Matrix */}
          {dashboardData.topExpenses && dashboardData.topExpenses.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#18181B] print-bg-light border border-[#27272A] print:border-slate-300 space-y-3">
              <div className="flex items-center justify-between border-b border-[#27272A] print:border-slate-300 pb-2">
                <h3 className="text-xs font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2">
                  <ArrowUpRight size={14} className="text-indigo-400" /> Top Individual Expenditures in Period
                </h3>
                <span className="text-[10px] text-zinc-500 print:text-slate-500">
                  Ranked by Outflow Magnitude
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 print:border-slate-300 text-[10px] uppercase font-bold text-zinc-400 print:text-slate-600">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Vendor / Beneficiary</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Payment Mode</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 print:divide-slate-200">
                    {dashboardData.topExpenses.map((exp) => (
                      <tr key={exp.id} className="text-zinc-200 print:text-slate-900">
                        <td className="py-2.5 px-3 font-mono text-[11px]">{exp.expenseDate}</td>
                        <td className="py-2.5 px-3 font-semibold">{exp.paidTo}</td>
                        <td className="py-2.5 px-3 text-zinc-400 print:text-slate-600">{exp.categoryName}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-mono text-zinc-400">{exp.paymentMode}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white print:text-black">
                          ₹{formatInr(exp.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              exp.verified
                                ? "bg-emerald-500/10 text-emerald-400 print:bg-emerald-100 print:text-emerald-800"
                                : "bg-amber-500/10 text-amber-400 print:bg-amber-100 print:text-amber-800"
                            }`}
                          >
                            {exp.verified ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                            {exp.verified ? "VERIFIED" : "PENDING"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Executive Observations & Sign-off Block */}
          <div className="pt-4 border-t border-[#27272A] print:border-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
              <div className="border-t border-dashed border-zinc-700 print:border-slate-400 pt-2 text-center text-xs text-zinc-400 print:text-slate-600">
                <div className="font-bold text-zinc-200 print:text-black">Prepared By</div>
                <div className="text-[10px] text-zinc-500 print:text-slate-500 mt-0.5">
                  Accounts & Float Officer ({adminName || "Authorized Admin"})
                </div>
              </div>

              <div className="border-t border-dashed border-zinc-700 print:border-slate-400 pt-2 text-center text-xs text-zinc-400 print:text-slate-600">
                <div className="font-bold text-zinc-200 print:text-black">Factory Operations Review</div>
                <div className="text-[10px] text-zinc-500 print:text-slate-500 mt-0.5">
                  UP Works & Plant Head
                </div>
              </div>

              <div className="border-t border-dashed border-zinc-700 print:border-slate-400 pt-2 text-center text-xs text-zinc-400 print:text-slate-600">
                <div className="font-bold text-zinc-200 print:text-black">Executive Approval</div>
                <div className="text-[10px] text-zinc-500 print:text-slate-500 mt-0.5">
                  Managing Director / Super Admin
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
