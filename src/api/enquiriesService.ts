import { fetchAdminApi } from "./adminApi";

export interface EnquiryItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  subject: string;
  message: string;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminNotes?: string;
  createdAt: string;
}

export const enquiriesService = {
  async listEnquiries(page = 1, limit = 20) {
    return await fetchAdminApi<EnquiryItem[]>(`/enquiries?page=${page}&limit=${limit}`);
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

  async updateEnquiry(id: string, payload: { status?: string; adminNotes?: string }) {
    return await fetchAdminApi<EnquiryItem>(`/enquiries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
