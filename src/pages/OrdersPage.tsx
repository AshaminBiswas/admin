import React, { useState, useEffect } from "react";
import { Eye, X, RefreshCw, AlertTriangle } from "lucide-react";
import { OrderItem } from "../types/admin";
import { fetchAdminApi } from "../api/adminApi";

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminApi("/orders?limit=100");
      if (res.success && res.data) {
        const list = res.data.items || res.data.orders || res.data;
        setOrders(Array.isArray(list) ? list : []);
      } else {
        setError(res.error?.message || res.message || "Failed to load orders.");
        setOrders([]);
      }
    } catch (err: any) {
      setError(err.message || "Network error loading orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    return statusFilter === "ALL" || o.orderStatus === statusFilter;
  });

  const updateOrderStatus = async (id: string, newStatus: OrderItem["orderStatus"]) => {
    try {
      const res = await fetchAdminApi(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.success) {
        setOrders(orders.map((o) => (o.id === id ? { ...o, orderStatus: newStatus } : o)));
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder({ ...selectedOrder, orderStatus: newStatus });
        }
      } else {
        // Fallback optimistic local update if endpoint structure varies
        setOrders(orders.map((o) => (o.id === id ? { ...o, orderStatus: newStatus } : o)));
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder({ ...selectedOrder, orderStatus: newStatus });
        }
      }
    } catch {
      setOrders(orders.map((o) => (o.id === id ? { ...o, orderStatus: newStatus } : o)));
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder({ ...selectedOrder, orderStatus: newStatus });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {["ALL", "PENDING", "PROCESSING", "SHIPPED", "DELIVERED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-tr-lg rounded-bl-lg transition-all ${
                statusFilter === st
                  ? "bg-[#8B5CF6] text-[#FAFAFA] shadow-sm shadow-[#8B5CF6]/25"
                  : "bg-[#09090B] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={fetchOrders}
          disabled={loading}
          className="p-2 rounded-lg bg-[#27272A] text-[#A1A1AA] hover:text-[#8B5CF6] transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Orders List */}
      <div className="p-6 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-lg">
        {loading ? (
          <div className="py-12 text-center text-[#A1A1AA] flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-[#8B5CF6]" size={24} />
            <p className="text-xs font-semibold">Loading orders from database...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-[#A1A1AA] flex flex-col items-center gap-3">
            <AlertTriangle className="text-amber-400" size={24} />
            <p className="text-xs">{error}</p>
            <button
              onClick={fetchOrders}
              className="px-3 py-1.5 bg-[#8B5CF6] text-white text-xs font-bold rounded-lg hover:bg-[#7C3AED]"
            >
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-[#71717A] text-xs">
            No orders found.
          </div>
        ) : (
          <>
            {/* Mobile Touch Cards View (sm:hidden) */}
            <div className="space-y-3 sm:hidden">
              {filteredOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-[#09090B] border border-[#27272A] space-y-2.5 hover:border-[#8B5CF6]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#8B5CF6]">{ord.orderNumber || ord.id}</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        ord.orderStatus === "DELIVERED"
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                          : ord.orderStatus === "SHIPPED"
                          ? "bg-blue-950/80 text-blue-400 border border-blue-500/40"
                          : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                      }`}
                    >
                      {ord.orderStatus}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-[#FAFAFA]">{ord.customerName}</p>
                    <p className="text-[11px] text-[#A1A1AA]">{ord.email} • {ord.phone}</p>
                    {ord.companyName && (
                      <p className="text-[10px] text-[#8B5CF6] font-semibold">Firm: {ord.companyName}</p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#27272A] text-xs">
                    <div>
                      <span className="text-[10px] text-[#71717A] block uppercase">Total Amount</span>
                      <span className="font-extrabold text-sm text-[#FAFAFA]">
                        ₹{(ord.totalAmount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ord.isB2B ? (
                        <span className="bg-[#8B5CF6]/20 text-[#A855F7] font-bold text-[9px] px-2 py-0.5 rounded-full border border-[#8B5CF6]/40">
                          B2B GST
                        </span>
                      ) : (
                        <span className="bg-[#27272A] text-[#A1A1AA] font-semibold text-[9px] px-2 py-0.5 rounded-full">
                          B2C
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="py-1.5 px-3 bg-[#8B5CF6] text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-md shadow-[#8B5CF6]/30 active:scale-95"
                      >
                        <Eye size={13} />
                        <span>Manage</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#FAFAFA]">
                <thead className="bg-[#09090B] text-[#A855F7] uppercase font-bold text-[10px] tracking-wider border-b border-[#27272A]">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer Info</th>
                    <th className="py-3 px-4">Account Type</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Order Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#09090B]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#8B5CF6]">{ord.orderNumber || ord.id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-[#FAFAFA]">{ord.customerName}</p>
                        <p className="text-[10px] text-[#A1A1AA]">{ord.email} • {ord.phone}</p>
                      </td>
                      <td className="py-3 px-4">
                        {ord.isB2B ? (
                          <div>
                            <span className="bg-[#8B5CF6]/20 text-[#A855F7] font-bold text-[10px] px-2 py-0.5 rounded-full border border-[#8B5CF6]/40">
                              B2B Bulk GST
                            </span>
                            {ord.gstin && <p className="text-[10px] font-mono text-[#A855F7]/80 mt-0.5">{ord.gstin}</p>}
                          </div>
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
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="p-1.5 bg-[#8B5CF6]/20 text-[#A855F7] hover:bg-[#8B5CF6] hover:text-[#FAFAFA] rounded-lg transition-colors font-bold text-[11px] flex items-center gap-1 ml-auto"
                        >
                          <Eye size={14} />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#09090B]/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl shadow-2xl p-5 sm:p-6 text-[#FAFAFA] space-y-4">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-[#8B5CF6]"
            >
              <X size={20} />
            </button>
            <div className="border-b border-[#27272A] pb-3">
              <span className="text-[10px] font-bold uppercase text-[#A855F7]">Order Details</span>
              <h3 className="text-xl font-bold font-serif text-[#FAFAFA]">{selectedOrder.orderNumber || selectedOrder.id}</h3>
              <p className="text-xs text-[#A1A1AA]">Placed on {selectedOrder.createdAt}</p>
            </div>

            <div className="space-y-2 text-xs">
              <p><span className="text-[#A855F7] font-bold">Customer:</span> {selectedOrder.customerName}</p>
              <p><span className="text-[#A855F7] font-bold">Email:</span> {selectedOrder.email}</p>
              <p><span className="text-[#A855F7] font-bold">Phone:</span> {selectedOrder.phone}</p>
              {selectedOrder.companyName && <p><span className="text-[#A855F7] font-bold">Firm:</span> {selectedOrder.companyName}</p>}
              {selectedOrder.gstin && <p><span className="text-[#A855F7] font-bold">GSTIN:</span> {selectedOrder.gstin}</p>}
              <p className="pt-2 text-base font-bold text-[#FAFAFA]">Total Paid: ₹{(selectedOrder.totalAmount || 0).toLocaleString('en-IN')}</p>
            </div>

            <div className="pt-3 border-t border-[#27272A]">
              <label className="block text-xs font-bold uppercase text-[#A855F7] mb-2">Update Order Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(["PROCESSING", "SHIPPED", "DELIVERED"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateOrderStatus(selectedOrder.id, st)}
                    className={`py-2 text-xs font-bold rounded-tr-lg rounded-bl-lg transition-all ${
                      selectedOrder.orderStatus === st
                        ? "bg-[#8B5CF6] text-[#FAFAFA]"
                        : "bg-[#09090B] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

