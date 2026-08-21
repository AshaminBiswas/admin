import { fetchAdminApi } from "./adminApi";

export interface CouponItem {
  id: string;
  code: string;
  description?: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  perUserLimit?: number | null;
  applicableProductIds: string[];
  applicableCategoryIds: string[];
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  isExpired?: boolean;
  computedStatus?: "ACTIVE" | "INACTIVE" | "EXPIRED";
  createdAt: string;
  updatedAt: string;
}

export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  inactiveCoupons: number;
  totalRedemptions: number;
}

export interface CouponUsageDetail {
  id: string;
  usedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string | null;
    phone?: string | null;
  };
  order: {
    id: string;
    orderNumber: string;
    grandTotal: number;
    discountAmount: number | null;
    createdAt: string;
  } | null;
}

export const couponsService = {
  async listCoupons(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: "ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED";
    discountType?: "PERCENTAGE" | "FIXED_AMOUNT";
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    if (params?.status && params.status !== "ALL") query.append("status", params.status);
    if (params?.discountType) query.append("discountType", params.discountType);
    const qs = query.toString();
    return await fetchAdminApi<CouponItem[]>(`/coupons${qs ? `?${qs}` : ""}`);
  },

  async getStats() {
    return await fetchAdminApi<CouponStats>("/coupons/stats");
  },

  async getCouponDetails(codeOrId: string) {
    return await fetchAdminApi<CouponItem>(`/coupons/${codeOrId}`);
  },

  async getUsages(id: string) {
    return await fetchAdminApi<{ coupon: any; usages: CouponUsageDetail[] }>(`/coupons/${id}/usages`);
  },

  async createCoupon(payload: {
    code: string;
    description?: string | null;
    discountType: "PERCENTAGE" | "FIXED_AMOUNT";
    discountValue: number;
    minOrderAmount?: number | null;
    maxDiscountAmount?: number | null;
    usageLimit?: number | null;
    perUserLimit?: number | null;
    applicableProductIds?: string[];
    applicableCategoryIds?: string[];
    startDate?: string | null;
    endDate?: string | null;
    isActive?: boolean;
  }) {
    return await fetchAdminApi<CouponItem>("/coupons", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateCoupon(
    id: string,
    payload: {
      code?: string;
      description?: string | null;
      discountType?: "PERCENTAGE" | "FIXED_AMOUNT";
      discountValue?: number;
      minOrderAmount?: number | null;
      maxDiscountAmount?: number | null;
      usageLimit?: number | null;
      perUserLimit?: number | null;
      applicableProductIds?: string[];
      applicableCategoryIds?: string[];
      startDate?: string | null;
      endDate?: string | null;
      isActive?: boolean;
    }
  ) {
    return await fetchAdminApi<CouponItem>(`/coupons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async toggleStatus(id: string) {
    return await fetchAdminApi<CouponItem>(`/coupons/${id}/toggle`, {
      method: "PATCH",
    });
  },

  async deleteCoupon(id: string) {
    return await fetchAdminApi(`/coupons/${id}`, {
      method: "DELETE",
    });
  },

  async validateCoupon(payload: {
    code: string;
    orderAmount: number;
    items?: Array<{ productId: string; categoryId?: string | null; price: number; quantity: number }>;
  }) {
    return await fetchAdminApi<any>("/coupons/validate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
