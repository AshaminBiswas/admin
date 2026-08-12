import { fetchAdminApi } from "./adminApi";

export interface CategorySEO {
  metaTitle?: string;
  metaDescription?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  position?: number;
  status: "ACTIVE" | "INACTIVE";
  isVisible: boolean;
  parentId?: string | null;
  children?: CategoryItem[];
  seo?: CategorySEO;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  position?: number;
  status?: "ACTIVE" | "INACTIVE";
  isVisible?: boolean;
  parentId?: string;
  seo?: CategorySEO;
}

export const categoriesService = {
  async listCategories(page = 1, limit = 20) {
    return await fetchAdminApi<CategoryItem[]>(`/categories?page=${page}&limit=${limit}`);
  },

  async getCategoryTree() {
    return await fetchAdminApi<CategoryItem[]>("/categories/tree");
  },

  async createCategory(payload: CreateCategoryPayload) {
    return await fetchAdminApi<CategoryItem>("/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCategoryBySlug(slug: string) {
    return await fetchAdminApi<CategoryItem>(`/categories/${slug}`);
  },

  async updateCategory(id: string, payload: Partial<CreateCategoryPayload>) {
    return await fetchAdminApi<CategoryItem>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async updateCategoryStatus(id: string, status: "ACTIVE" | "INACTIVE") {
    return await fetchAdminApi(`/categories/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async reorderCategories(categories: Array<{ id: string; position: number }>) {
    return await fetchAdminApi("/categories/reorder", {
      method: "PATCH",
      body: JSON.stringify({ categories }),
    });
  },

  async getCategoryProducts(id: string, page = 1, limit = 20) {
    return await fetchAdminApi(`/categories/${id}/products?page=${page}&limit=${limit}`);
  },

  async deleteCategory(id: string) {
    return await fetchAdminApi(`/categories/${id}`, {
      method: "DELETE",
    });
  },
};
