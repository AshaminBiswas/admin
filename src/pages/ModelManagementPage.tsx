import React, { useState } from "react";
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { AdminView } from "../types/admin";

interface ModelManagementPageProps {
  modelKey: AdminView;
  title: string;
  subtitle: string;
  description: string;
  accentColor?: string;
}

export function ModelManagementPage({
  modelKey,
  title,
  subtitle,
  description,
}: ModelManagementPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Sample dynamic data generator based on model key
  const getModelStats = () => {
    switch (modelKey) {
      case "allocation":
        return [
          { label: "Total Allocated Stock", value: "14,850 Units", change: "+12%", color: "text-[#8B5CF6]" },
          { label: "Reserved Inventory", value: "3,210 Units", change: "+5%", color: "text-blue-500 dark:text-blue-400" },
          { label: "Pending Shipments", value: "48 Orders", change: "-2%", color: "text-amber-500 dark:text-amber-400" },
          { label: "Warehouses Active", value: "6 Locations", change: "100%", color: "text-emerald-500 dark:text-emerald-400" },
        ];
      case "banner":
        return [
          { label: "Active Hero Banners", value: "5 Active", change: "+1", color: "text-[#8B5CF6]" },
          { label: "Total Click-throughs", value: "34,210 Clicks", change: "+18.4%", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Scheduled Campaigns", value: "3 Upcoming", change: "Next: Aug 15", color: "text-amber-500 dark:text-amber-400" },
          { label: "Avg CTR Rate", value: "4.85%", change: "+0.6%", color: "text-blue-500 dark:text-blue-400" },
        ];
      case "cart":
        return [
          { label: "Active Shopping Carts", value: "142 Active", change: "Live", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Abandoned Carts (24h)", value: "28 Carts", change: "Value ₹1.4L", color: "text-rose-500 dark:text-rose-400" },
          { label: "Recovery Rate", value: "24.5%", change: "+3.2%", color: "text-[#8B5CF6]" },
          { label: "Avg Cart Value", value: "₹8,450", change: "+5.1%", color: "text-blue-500 dark:text-blue-400" },
        ];
      case "checkouts":
        return [
          { label: "Completed Checkouts", value: "428 Orders", change: "+12.2%", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Payment Drop-offs", value: "4.2%", change: "-0.8%", color: "text-rose-500 dark:text-rose-400" },
          { label: "Express Checkout Use", value: "68%", change: "+15%", color: "text-[#8B5CF6]" },
          { label: "Avg Completion Time", value: "1m 45s", change: "-10s", color: "text-blue-500 dark:text-blue-400" },
        ];
      case "homepage":
        return [
          { label: "Layout Version", value: "v2.4 Live", change: "Published", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Active Sections", value: "12 Modules", change: "Optimized", color: "text-[#8B5CF6]" },
          { label: "Daily Impressions", value: "48,500 Views", change: "+22%", color: "text-blue-500 dark:text-blue-400" },
          { label: "A/B Testing Variants", value: "2 Running", change: "50/50 Split", color: "text-amber-500 dark:text-amber-400" },
        ];
      case "invoice":
        return [
          { label: "Total Invoices Issued", value: "892 Invoices", change: "This Month", color: "text-[#8B5CF6]" },
          { label: "Total Revenue Billed", value: "₹34.8 Lakhs", change: "+18%", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Pending Payments", value: "₹2.4 Lakhs", change: "12 Invoices", color: "text-amber-500 dark:text-amber-400" },
          { label: "GST Tax Collected", value: "₹6.2 Lakhs", change: "Calculated", color: "text-blue-500 dark:text-blue-400" },
        ];
      case "logistics":
        return [
          { label: "Active Courier Partners", value: "4 Integrated", change: "Bluedart, Delhivery...", color: "text-[#8B5CF6]" },
          { label: "In-Transit Shipments", value: "84 Packages", change: "Tracking Live", color: "text-blue-500 dark:text-blue-400" },
          { label: "On-Time Delivery Rate", value: "96.4%", change: "+1.2%", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Avg Delivery SLA", value: "2.4 Days", change: "-0.5 Days", color: "text-amber-500 dark:text-amber-400" },
        ];
      case "notification":
        return [
          { label: "Dispatched Notifications", value: "12,450 Sent", change: "SMS + Email + Push", color: "text-blue-500 dark:text-blue-400" },
          { label: "Open / Read Rate", value: "42.8%", change: "+4.1%", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Pending System Alerts", value: "2 Unread", change: "High Priority", color: "text-rose-500 dark:text-rose-400" },
          { label: "Webhooks Active", value: "8 Endpoint", change: "Healthy", color: "text-[#8B5CF6]" },
        ];
      case "payment":
        return [
          { label: "Total Processed Volume", value: "₹48.9 Lakhs", change: "+16.8%", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Razorpay / Gateway Status", value: "100% Uptime", change: "Operational", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Refund Requests", value: "₹14,500", change: "2 Pending", color: "text-amber-500 dark:text-amber-400" },
          { label: "Settlement Status", value: "Auto-Settled T+1", change: "Completed", color: "text-[#8B5CF6]" },
        ];
      case "search":
        return [
          { label: "Search Queries (30d)", value: "18,420 Queries", change: "+24%", color: "text-[#8B5CF6]" },
          { label: "Top Query", value: "'Mortise Handle'", change: "2,410 Searches", color: "text-blue-500 dark:text-blue-400" },
          { label: "Zero-Result Queries", value: "1.2%", change: "Low", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Search to Cart Conversion", value: "14.2%", change: "+2.1%", color: "text-emerald-500 dark:text-emerald-400" },
        ];
      case "upload":
        return [
          { label: "Total Uploaded Assets", value: "4,820 Files", change: "Images & Documents", color: "text-[#8B5CF6]" },
          { label: "CDN Storage Used", value: "14.8 GB / 100 GB", change: "14.8%", color: "text-blue-500 dark:text-blue-400" },
          { label: "Image Optimization", value: "WebP Enabled", change: "92% Savings", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Orphaned Files", value: "0 Clean", change: "Automated", color: "text-amber-500 dark:text-amber-400" },
        ];
      case "varients":
        return [
          { label: "Total Variant Combinations", value: "450 Variants", change: "+28", color: "text-[#8B5CF6]" },
          { label: "Attribute Sets", value: "12 Specs", change: "Color, Size, Finish...", color: "text-blue-500 dark:text-blue-400" },
          { label: "Active Price Overrides", value: "34 SKUs", change: "Configured", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Out of Stock Variants", value: "4 Items", change: "Alerted", color: "text-rose-500 dark:text-rose-400" },
        ];
      case "wishlist":
        return [
          { label: "Total Saved Items", value: "1,890 Wishlists", change: "+14.2%", color: "text-[#8B5CF6]" },
          { label: "Most Saved Item", value: "Antique Brass Handle", change: "340 Saves", color: "text-rose-500 dark:text-rose-400" },
          { label: "Back in Stock Alerts", value: "128 Sent", change: "Auto-Triggered", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Conversion Rate", value: "18.5%", change: "+1.9%", color: "text-blue-500 dark:text-blue-400" },
        ];
      default:
        return [
          { label: `Total ${title}`, value: "128 Items", change: "+10%", color: "text-[#8B5CF6]" },
          { label: "Active Records", value: "115 Active", change: "90%", color: "text-emerald-500 dark:text-emerald-400" },
          { label: "Pending Processing", value: "13 Items", change: "Queued", color: "text-amber-500 dark:text-amber-400" },
          { label: "System Status", value: "Synced", change: "Real-time", color: "text-blue-500 dark:text-blue-400" },
        ];
    }
  };

  // Sample items table list based on model key
  const getModelTableData = () => {
    const list = [
      { id: `${modelKey.toUpperCase()}-101`, title: `${title} Standard Entry #101`, status: "ACTIVE", category: "Core Operations", code: `SKU-${modelKey}-01`, date: "2026-08-08", metric: "₹14,500 / 120 units" },
      { id: `${modelKey.toUpperCase()}-102`, title: `${title} Commercial Spec #102`, status: "ACTIVE", category: "High Velocity", code: `SKU-${modelKey}-02`, date: "2026-08-07", metric: "₹28,900 / 450 units" },
      { id: `${modelKey.toUpperCase()}-103`, title: `${title} Premium Custom #103`, status: "PENDING", category: "Custom Build", code: `SKU-${modelKey}-03`, date: "2026-08-06", metric: "₹8,490 / 15 units" },
      { id: `${modelKey.toUpperCase()}-104`, title: `${title} System Archive #104`, status: "COMPLETED", category: "System Sync", code: `SKU-${modelKey}-04`, date: "2026-08-05", metric: "₹92,000 / 89 units" },
      { id: `${modelKey.toUpperCase()}-105`, title: `${title} Emergency Batch #105`, status: "ACTIVE", category: "Priority SLA", code: `SKU-${modelKey}-05`, date: "2026-08-04", metric: "₹4,200 / 60 units" },
    ];

    if (!searchTerm) return list;
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const stats = getModelStats();
  const tableData = getModelTableData();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-white via-purple-50 to-white dark:from-[#18181B] dark:via-[#1F1929] dark:to-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-md dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#8B5CF6]/15 text-[#8B5CF6] dark:bg-[#8B5CF6]/20 dark:text-[#A855F7] border border-[#8B5CF6]/30">
              API Model View
            </span>
            <span className="text-xs text-slate-500 dark:text-[#A1A1AA] font-mono">/{modelKey}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight">{title}</h1>
          <p className="text-xs text-slate-600 dark:text-[#A1A1AA] max-w-xl">{description}</p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            type="button"
            onClick={handleRefresh}
            className={`p-2.5 rounded-xl bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-slate-700 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#FAFAFA] hover:bg-slate-200 dark:hover:bg-[#27272A] transition-all ${
              isRefreshing ? "animate-spin text-[#8B5CF6]" : ""
            }`}
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-slate-800 dark:text-[#FAFAFA] text-xs font-bold hover:bg-slate-200 dark:hover:bg-[#27272A] transition-all"
          >
            <Download size={16} />
            <span>Export Data</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] shadow-lg shadow-[#8B5CF6]/25 transition-all"
          >
            <Plus size={16} />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((st, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] flex flex-col justify-between hover:border-[#8B5CF6]/50 transition-colors shadow-sm dark:shadow-none group"
          >
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA] font-semibold">{st.label}</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className={`text-xl font-black ${st.color}`}>{st.value}</span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-[#A1A1AA] bg-slate-100 dark:bg-[#09090B] px-2 py-0.5 rounded-md border border-slate-200 dark:border-[#27272A]">
                {st.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm dark:shadow-none">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#A1A1AA]" />
          <input
            type="text"
            placeholder={`Search ${title} records...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 dark:placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs text-slate-700 dark:text-[#A1A1AA]">
            <Filter size={14} className="text-[#8B5CF6]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-[#FAFAFA] font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <button
            type="button"
            className="p-2 rounded-lg bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#FAFAFA] transition-colors"
            title="Custom View Options"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] overflow-hidden shadow-sm dark:shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-[#09090B] text-slate-500 dark:text-[#A1A1AA] border-b border-slate-200 dark:border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Record Identifier</th>
                <th className="py-3.5 px-4">Title / Label</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Code / SKU</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Value / Metric</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#27272A] text-slate-900 dark:text-[#FAFAFA] font-medium">
              {tableData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#27272A]/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[#8B5CF6] dark:text-[#A855F7] font-semibold">{item.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-[#FAFAFA]">{item.title}</td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-[#A1A1AA]">{item.category}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-[#A1A1AA]">{item.code}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : item.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-[#8B5CF6]/10 text-[#8B5CF6] dark:text-[#A855F7] border border-[#8B5CF6]/20"
                      }`}
                    >
                      {item.status === "ACTIVE" && <CheckCircle2 size={12} />}
                      {item.status === "PENDING" && <Clock size={12} />}
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-[#FAFAFA]">{item.metric}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 dark:text-[#A1A1AA] hover:text-[#8B5CF6] hover:bg-slate-100 dark:hover:bg-[#09090B] transition-colors"
                      title="View Details"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar */}
        <div className="p-4 bg-slate-50 dark:bg-[#09090B] border-t border-slate-200 dark:border-[#27272A] flex items-center justify-between text-xs text-slate-500 dark:text-[#A1A1AA]">
          <span>Showing {tableData.length} records</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] opacity-50 cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:text-slate-900 dark:hover:text-[#FAFAFA] hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
