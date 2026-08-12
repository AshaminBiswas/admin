import { fetchAdminApi } from "./adminApi";

export interface ShippingZoneItem {
  id: string;
  name: string;
  countries: string[];
  states?: string[];
  postalCodes?: string[];
  isActive: boolean;
}

export interface ShippingRateItem {
  id: string;
  zoneId: string;
  name: string;
  minWeight?: number;
  maxWeight?: number;
  rate: number;
  estimatedDays?: string;
  isActive: boolean;
}

export const shippingService = {
  // Zones
  async listShippingZones() {
    return await fetchAdminApi<ShippingZoneItem[]>("/shipping/zones");
  },

  async createShippingZone(payload: Partial<ShippingZoneItem>) {
    return await fetchAdminApi<ShippingZoneItem>("/shipping/zones", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateShippingZone(id: string, payload: Partial<ShippingZoneItem>) {
    return await fetchAdminApi<ShippingZoneItem>(`/shipping/zones/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteShippingZone(id: string) {
    return await fetchAdminApi(`/shipping/zones/${id}`, {
      method: "DELETE",
    });
  },

  // Rates
  async getZoneShippingRates(zoneId: string) {
    return await fetchAdminApi<ShippingRateItem[]>(`/shipping/zones/${zoneId}/rates`);
  },

  async createZoneShippingRate(zoneId: string, payload: Partial<ShippingRateItem>) {
    return await fetchAdminApi<ShippingRateItem>(`/shipping/zones/${zoneId}/rates`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateShippingRate(id: string, payload: Partial<ShippingRateItem>) {
    return await fetchAdminApi<ShippingRateItem>(`/shipping/rates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteShippingRate(id: string) {
    return await fetchAdminApi(`/shipping/rates/${id}`, {
      method: "DELETE",
    });
  },

  async calculateShipping(payload: { address: any; weight?: number; orderAmount?: number }) {
    return await fetchAdminApi("/shipping/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
