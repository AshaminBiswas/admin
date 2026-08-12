import { fetchAdminApi } from "./adminApi";

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentStatus: "PAID" | "UNPAID" | "REFUNDED";
  carrier?: string;
  trackingNumber?: string;
  createdAt: string;
}

export const ordersService = {
  async listOrders(page = 1, limit = 20) {
    return await fetchAdminApi<OrderItem[]>(`/orders?page=${page}&limit=${limit}`);
  },

  async getOrderById(id: string) {
    return await fetchAdminApi<OrderItem>(`/orders/${id}`);
  },

  async getOrderInvoice(id: string) {
    return await fetchAdminApi(`/orders/${id}/invoice`);
  },

  async cancelOrder(id: string, reason: string) {
    return await fetchAdminApi(`/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async updateOrderStatus(id: string, payload: { status: string; carrier?: string; trackingNumber?: string; comment?: string }) {
    return await fetchAdminApi(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async getOrderTracking(id: string) {
    return await fetchAdminApi(`/orders/${id}/tracking`);
  },
};
