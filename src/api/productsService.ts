import { fetchAdminApi } from "./adminApi";

export interface ProductManufacturerInfo {
  "Generic Name"?: string;
  "Country of Origin"?: string;
  manufacturerName?: string;
  manufacturerAddress?: string;
}

export interface ProductSpecification {
  weight?: string;
  height?: string;
  width?: string;
  steelGrade?: string;
  nylonGrade?: string;
  aluminiumGrade?: string;
  [key: string]: any;
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  description?: string;
  shortDesc?: string;
  price: number;
  salePrice?: number;
  stock: number;
  reorderLevel?: number;
  categoryId?: string;
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  isVisible?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isInOffer?: boolean;
  isNewArrival?: boolean;
  tags?: string[];
  colours?: string[];
  compatibleFor?: string[];
  warranty?: string;
  seo?: { metaTitle?: string; metaDescription?: string };
  manufacturerInfo?: ProductManufacturerInfo;
  productSpecification?: ProductSpecification;
}

export interface ProductVariantItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  salePrice?: number;
  stock: number;
  attributes?: Record<string, any>;
  isAvailable?: boolean;
}

export const productsService = {
  async listProducts(page = 1, limit = 20, sortOrder = "desc") {
    return await fetchAdminApi<ProductItem[]>(`/products?page=${page}&limit=${limit}&sortOrder=${sortOrder}`);
  },

  async getProductBySlug(slug: string) {
    return await fetchAdminApi<ProductItem>(`/products/slug/${slug}`);
  },

  async getProductById(id: string) {
    return await fetchAdminApi<ProductItem>(`/products/${id}`);
  },

  async createProduct(payload: Partial<ProductItem>) {
    return await fetchAdminApi<ProductItem>("/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateProduct(id: string, payload: Partial<ProductItem>) {
    return await fetchAdminApi<ProductItem>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteProduct(id: string) {
    return await fetchAdminApi(`/products/${id}`, {
      method: "DELETE",
    });
  },

  // Product Variants
  async listVariants(productId: string) {
    return await fetchAdminApi<ProductVariantItem[]>(`/products/${productId}/variants`);
  },

  async getVariantById(id: string) {
    return await fetchAdminApi<ProductVariantItem>(`/variants/${id}`);
  },

  async createVariant(productId: string, payload: Partial<ProductVariantItem>) {
    return await fetchAdminApi<ProductVariantItem>(`/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateVariant(id: string, payload: Partial<ProductVariantItem>) {
    return await fetchAdminApi<ProductVariantItem>(`/variants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteVariant(id: string) {
    return await fetchAdminApi(`/variants/${id}`, {
      method: "DELETE",
    });
  },
};
