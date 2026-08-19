import { fetchAdminApi } from "./adminApi";

export interface EnquiryItem {
  id: string;
  trackingId?: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  subject: string;
  message: string;
  status: "OPEN" | "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminNotes?: string;
  notes?: string;
  createdAt: string;
}

export const enquiriesService = {
  async listEnquiries(query?: { page?: number; limit?: number; status?: string; search?: string; startDate?: string; endDate?: string } | number, limit = 20) {
    if (typeof query === "number") {
      return await fetchAdminApi<EnquiryItem[]>(`/enquiries?page=${query}&limit=${limit}`);
    }
    const params = new URLSearchParams();
    if (query?.page) params.append("page", String(query.page));
    if (query?.limit) params.append("limit", String(query.limit));
    if (query?.status && query.status !== "ALL") params.append("status", query.status);
    if (query?.search) params.append("search", query.search);
    if (query?.startDate) params.append("startDate", query.startDate);
    if (query?.endDate) params.append("endDate", query.endDate);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    return await fetchAdminApi<EnquiryItem[]>(`/enquiries${queryString}`);
  },

  async getEnquiryById(id: string) {
    return await fetchAdminApi<EnquiryItem>(`/enquiries/${id}`);
  },

  async submitEnquiry(payload: Partial<EnquiryItem>) {
    return await fetchAdminApi<EnquiryItem>("/enquiries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async createEnquiry(payload: Partial<EnquiryItem>) {
    return await fetchAdminApi<EnquiryItem>("/enquiries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateEnquiry(id: string, payload: Partial<EnquiryItem>) {
    return await fetchAdminApi<EnquiryItem>(`/enquiries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteEnquiry(id: string) {
    return await fetchAdminApi<{ success: boolean }>(`/enquiries/${id}`, {
      method: "DELETE",
    });
  },
};
