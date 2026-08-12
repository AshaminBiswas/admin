import { fetchAdminApi } from "./adminApi";

export interface QuoteItem {
  id: string;
  quoteNumber: string;
  customerName: string;
  companyName?: string;
  grandTotal: number;
  discountTotal?: number;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CONVERTED";
  notes?: string;
  adminNotes?: string;
  createdAt: string;
}

export const quotesService = {
  async listQuotes(page = 1, limit = 20) {
    return await fetchAdminApi<QuoteItem[]>(`/quotes?page=${page}&limit=${limit}`);
  },

  async getQuoteById(id: string) {
    return await fetchAdminApi<QuoteItem>(`/quotes/${id}`);
  },

  async updateQuoteStatus(id: string, payload: { status: string; adminNotes?: string }) {
    return await fetchAdminApi(`/quotes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async updateQuotePricing(id: string, payload: { grandTotal: number; discountTotal?: number; notes?: string }) {
    return await fetchAdminApi(`/quotes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async convertQuoteToOrder(id: string, payload: { paymentMethod: string; notes?: string }) {
    return await fetchAdminApi(`/quotes/${id}/convert`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
