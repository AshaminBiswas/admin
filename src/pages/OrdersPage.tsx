import React, { useState } from "react";
import { Eye, X } from "lucide-react";
import { INITIAL_ORDERS } from "../data/mockAdminData";
import { OrderItem } from "../types/admin";

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  const filteredOrders = orders.filter((o) => {
    return statusFilter === "ALL" || o.orderStatus === statusFilter;
  });

  const updateOrderStatus = (id: string, newStatus: OrderItem["orderStatus"]) => {
    setOrders(orders.map(o => o.id === id ? { ...o, orderStatus: newStatus } : o));
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, orderStatus: newStatus });
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
      </div>

      {/* Orders List */}
      <div className="p-6 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-lg">
        <div className="overflow-x-auto">
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
                  <td className="py-3 px-4 font-mono font-bold text-[#8B5CF6]">{ord.orderNumber}</td>
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
                  <td className="py-3 px-4 font-bold text-[#FAFAFA]">₹{ord.totalAmount.toLocaleString('en-IN')}</td>
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
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090B]/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-tr-3xl rounded-bl-3xl shadow-2xl p-6 text-[#FAFAFA] space-y-4">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-[#8B5CF6]"
            >
              <X size={20} />
            </button>
            <div className="border-b border-[#27272A] pb-3">
              <span className="text-[10px] font-bold uppercase text-[#A855F7]">Order Details</span>
              <h3 className="text-xl font-bold font-serif text-[#FAFAFA]">{selectedOrder.orderNumber}</h3>
              <p className="text-xs text-[#A1A1AA]">Placed on {selectedOrder.createdAt}</p>
            </div>

            <div className="space-y-2 text-xs">
              <p><span className="text-[#A855F7] font-bold">Customer:</span> {selectedOrder.customerName}</p>
              <p><span className="text-[#A855F7] font-bold">Email:</span> {selectedOrder.email}</p>
              <p><span className="text-[#A855F7] font-bold">Phone:</span> {selectedOrder.phone}</p>
              {selectedOrder.companyName && <p><span className="text-[#A855F7] font-bold">Firm:</span> {selectedOrder.companyName}</p>}
              {selectedOrder.gstin && <p><span className="text-[#A855F7] font-bold">GSTIN:</span> {selectedOrder.gstin}</p>}
              <p className="pt-2 text-base font-bold text-[#FAFAFA]">Total Paid: ₹{selectedOrder.totalAmount.toLocaleString('en-IN')}</p>
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
