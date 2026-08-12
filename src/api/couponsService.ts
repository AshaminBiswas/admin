import { fetchAdminApi } from "./adminApi";

export interface CouponItem {
  id: string;
  code: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  isActive: boolean;
}

export const couponsService = {
  async listCoupons(page = 1, limit = 20) {
    return await fetchAdminApi<CouponItem[]>(`/coupons?page=${page}&limit=${limit}`);
  },

  async getCouponDetails(code: string) {
    return await fetchAdminApi<CouponItem>(`/coupons/${code}`);
  },

  async createCoupon(payload: Partial<CouponItem>) {
    return await fetchAdminApi<CouponItem>("/coupons", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateCoupon(id: string, payload: Partial<CouponItem>) {
    return await fetchAdminApi<CouponItem>(`/coupons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteCoupon(id: string) {
    return await fetchAdminApi(`/coupons/${id}`, {
      method: "DELETE",
    });
  },

  async validateCoupon(code: string, orderAmount: number) {
    return await fetchAdminApi("/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, orderAmount }),
    });
  },
};
