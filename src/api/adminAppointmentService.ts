import { fetchAdminApi } from "./adminApi";


export interface AdminAppointmentItem {
  id: string;
  trackingId?: string;
  serviceId: string;
  serviceName?: string;
  service?: {
    id: string;
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
  };
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  locationId?: string;
  staffUserId?: string;
  date: string;
  startTime: string;
  endTime?: string;
  timezone?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  notes?: string;
  comment?: string;
  createdAt?: string;
}

export interface AdminCreateServicePayload {
  name: string;
  description?: string;
  durationMinutes: number;
  bufferMinutes?: number;
  maxParallelBookings?: number;
  price: number;
  isPaid?: boolean;
  isActive?: boolean;
}

export const adminAppointmentService = {
  // List all customer appointments (Admin/Staff)
  async listAppointments(query?: {
    page?: number;
    limit?: number;
    status?: string;
    serviceId?: string;
    staffUserId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", String(query.page));
    if (query?.limit) params.append("limit", String(query.limit));
    if (query?.status) params.append("status", query.status);
    if (query?.serviceId) params.append("serviceId", query.serviceId);
    if (query?.staffUserId) params.append("staffUserId", query.staffUserId);
    if (query?.search) params.append("search", query.search);
    if (query?.startDate) params.append("startDate", query.startDate);
    if (query?.endDate) params.append("endDate", query.endDate);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    return await fetchAdminApi<AdminAppointmentItem[]>(`/appointments${queryString}`);
  },

  // List Services (Admin)
  async listServices(query?: { isActive?: boolean; search?: string }) {
    const params = new URLSearchParams();
    if (query?.isActive !== undefined) params.append("isActive", String(query.isActive));
    if (query?.search) params.append("search", query.search);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return await fetchAdminApi<any[]>(`/appointments/services${queryString}`);
  },

  // Create Service (Admin)
  async createService(payload: AdminCreateServicePayload) {
    return await fetchAdminApi<any>("/appointments/services", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Update Service (Admin)
  async updateService(id: string, payload: Partial<AdminCreateServicePayload>) {
    return await fetchAdminApi<any>(`/appointments/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  // Update Appointment Status (Admin)
  async updateAppointmentStatus(id: string, payload: { status: string; comment?: string }) {
    return await fetchAdminApi<AdminAppointmentItem>(`/appointments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  // Cancel Appointment (Admin)
  async cancelAppointment(id: string, payload: { reason: string }) {
    return await fetchAdminApi<AdminAppointmentItem>(`/appointments/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
