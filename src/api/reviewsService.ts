import { fetchAdminApi } from "./adminApi";

export interface ReviewItem {
  id: string;
  productId: string;
  productName?: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export const reviewsService = {
  async listAllReviews(page = 1, limit = 20) {
    return await fetchAdminApi<ReviewItem[]>(`/reviews?page=${page}&limit=${limit}`);
  },

  async getProductReviews(productId: string, page = 1, limit = 20) {
    return await fetchAdminApi<ReviewItem[]>(`/reviews/product/${productId}?page=${page}&limit=${limit}`);
  },

  async createReview(payload: Partial<ReviewItem>) {
    return await fetchAdminApi<ReviewItem>("/reviews", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateReviewStatus(id: string, status: "APPROVED" | "REJECTED" | "PENDING") {
    return await fetchAdminApi<ReviewItem>(`/reviews/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
