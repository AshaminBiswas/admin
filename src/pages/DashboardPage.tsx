import React, { useState, useEffect } from "react";
import { IndianRupee, ShoppingBag, FileText, AlertTriangle, TrendingUp, Clock, RefreshCw, WifiOff } from "lucide-react";
import { fetchAdminApi } from "../api/adminApi";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeQuotes: number;
  lowStockCount: number;
  revenueGrowth?: number;
  ordersGrowth?: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  isB2B: boolean;
  gstin?: string;
  totalAmount: number;
  orderStatus: string;
  createdAt: string;
}

interface MonthlyData {
  month: string;
  revenue: number;
  orders: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [salesData, setSalesData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch stats, recent orders, and analytics in parallel
      const [statsRes, ordersRes, analyticsRes] = await Promise.all([
        fetchAdminApi("/dashboard/stats"),
        fetchAdminApi("/orders?limit=5&sortBy=createdAt&sortOrder=desc"),
        fetchAdminApi("/analytics/revenue?period=monthly"),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else {
        // Derive stats from orders if no dedicated endpoint
        const ordData = ordersRes.data;
        setStats({
          totalRevenue: ordData?.totalRevenue || 0,
          totalOrders: ordData?.total || ordData?.totalCount || 0,
          activeQuotes: 0,
          lowStockCount: 0,
          revenueGrowth: undefined,
          ordersGrowth: undefined,
        });
      }

      const ordList = ordersRes.data?.items || ordersRes.data?.orders || ordersRes.data || [];
      setRecentOrders(Array.isArray(ordList) ? ordList.slice(0, 5) : []);

      const monthlyList = analyticsRes.data?.monthly || analyticsRes.data || [];
      setSalesData(Array.isArray(monthlyList) ? monthlyList : []);
    } catch (err: any) {
      setError("Failed to load dashboard data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const StatCardSkeleton = () => (
    <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-md animate-pulse">
      <div className="h-3 w-24 bg-[#27272A] rounded mb-3" />
      <div className="h-7 w-32 bg-[#27272A] rounded mb-2" />
      <div className="h-3 w-40 bg-[#27272A] rounded" />
    </div>
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <WifiOff size={40} className="text-red-400" />
        <p className="text-[#A1A1AA] text-sm text-center max-w-sm">{error}</p>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] text-white text-xs font-bold rounded-lg hover:bg-[#7C3AED] transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Message */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#8B5CF6] text-[#FAFAFA] px-2.5 py-0.5 rounded-full shadow-sm shadow-[#8B5CF6]/25">
            Executive Summary
          </span>
          <h3 className="text-lg font-bold text-[#FAFAFA] mt-1 font-serif">
            PRC Hardware Enterprise Control Center
          </h3>
          <p className="text-xs text-[#A1A1AA]">
            Real-time sales revenue, inventory alerts &amp; B2B quotation pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Live Revenue (MTD)</p>
            {loading ? (
              <div className="h-7 w-32 bg-[#27272A] rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-extrabold text-[#8B5CF6]">
                ₹{stats ? (stats.totalRevenue / 100000).toFixed(2) : "0.00"}L
              </p>
            )}
          </div>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="p-2 rounded-lg bg-[#27272A] text-[#A1A1AA] hover:text-[#8B5CF6] transition-colors disabled:opacity-50"
            title="Refresh dashboard"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            {/* Metric 1 */}
            <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-md flex items-center justify-between hover:border-[#8B5CF6]/60 transition-all">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1">Total Revenue</p>
                <h4 className="text-2xl font-extrabold text-[#FAFAFA]">₹{((stats?.totalRevenue || 0) / 100000).toFixed(2)}L</h4>
                {stats?.revenueGrowth != null && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6] mt-2">
                    <TrendingUp size={14} />
                    <span>+{stats.revenueGrowth}% vs last month</span>
                  </div>
                )}
              </div>
              <div className="w-12 h-12 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
                <IndianRupee size={22} />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-md flex items-center justify-between hover:border-[#8B5CF6]/60 transition-all">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1">Total Orders</p>
                <h4 className="text-2xl font-extrabold text-[#FAFAFA]">{stats?.totalOrders || 0}</h4>
                {stats?.ordersGrowth != null && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6] mt-2">
                    <TrendingUp size={14} />
                    <span>+{stats.ordersGrowth}% fulfillment rate</span>
                  </div>
                )}
              </div>
              <div className="w-12 h-12 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
                <ShoppingBag size={22} />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-md flex items-center justify-between hover:border-[#8B5CF6]/60 transition-all">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1">Active B2B Quotes</p>
                <h4 className="text-2xl font-extrabold text-[#FAFAFA]">{stats?.activeQuotes || 0}</h4>
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6] mt-2">
                  <Clock size={14} />
                  <span>Requires approval</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
                <FileText size={22} />
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-md flex items-center justify-between hover:border-amber-500/60 transition-all">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1">Low Stock Alerts</p>
                <h4 className="text-2xl font-extrabold text-amber-400">{stats?.lowStockCount || 0}</h4>
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 mt-2">
                  <AlertTriangle size={14} />
                  <span>SKUs under min threshold</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-tr-xl rounded-bl-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertTriangle size={22} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Revenue Chart Section */}
      {salesData.length > 0 && (
        <div className="p-6 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-base font-bold text-[#FAFAFA] font-serif">Revenue &amp; Sales Performance</h4>
              <p className="text-xs text-[#A1A1AA]">Monthly revenue trend across B2C &amp; B2B orders</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#A1A1AA" strokeOpacity={0.5} tick={{ fontSize: 12 }} />
                <YAxis stroke="#A1A1AA" strokeOpacity={0.5} tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090B", borderColor: "#8B5CF6", borderRadius: "8px", color: "#FAFAFA" }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Orders Stream */}
      <div className="p-6 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-bold text-[#FAFAFA] font-serif">Recent Live Orders</h4>
          <span className="text-xs text-[#8B5CF6] font-bold">Showing latest 5 orders</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-[#27272A] rounded animate-pulse" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="text-center text-[#71717A] text-sm py-8">No orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#FAFAFA]">
              <thead className="bg-[#09090B] text-[#A855F7] uppercase font-bold text-[10px] tracking-wider border-b border-[#27272A]">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer / Firm</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#09090B]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#8B5CF6]">{ord.orderNumber || ord.id}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#FAFAFA]">{ord.customerName}</p>
                      <p className="text-[10px] text-[#A1A1AA]">{ord.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      {ord.isB2B ? (
                        <span className="bg-[#8B5CF6]/20 text-[#A855F7] font-bold text-[10px] px-2 py-0.5 rounded-full border border-[#8B5CF6]/40">
                          B2B Bulk GST
                        </span>
                      ) : (
                        <span className="bg-[#27272A] text-[#A1A1AA] font-semibold text-[10px] px-2 py-0.5 rounded-full">
                          B2C Retail
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#FAFAFA]">₹{(ord.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          ord.orderStatus === "DELIVERED"
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                            : ord.orderStatus === "SHIPPED"
                            ? "bg-blue-950/80 text-blue-400 border border-blue-500/40"
                            : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                        }`}
                      >
                        {ord.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA] text-[11px]">{ord.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
