import { fetchAdminApi } from "./adminApi";

export interface CMSPageItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  metaTitle?: string;
}

export interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category?: string;
  tags?: string[];
  status: "DRAFT" | "PUBLISHED";
}

export interface FAQCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  position?: number;
  isActive: boolean;
}

export interface FAQItem {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  position?: number;
  isActive: boolean;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  position: "HERO" | "SIDEBAR" | "FOOTER";
  order?: number;
  isActive: boolean;
}

export const cmsService = {
  // Public & Admin Pages
  async listPagesAdmin(page = 1, limit = 20) {
    return await fetchAdminApi<CMSPageItem[]>(`/cms/pages/admin?page=${page}&limit=${limit}`);
  },

  async getPageByIdAdmin(id: string) {
    return await fetchAdminApi<CMSPageItem>(`/cms/pages/admin/${id}`);
  },

  async createPageAdmin(payload: Partial<CMSPageItem>) {
    return await fetchAdminApi<CMSPageItem>("/cms/pages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updatePageAdmin(id: string, payload: Partial<CMSPageItem>) {
    return await fetchAdminApi<CMSPageItem>(`/cms/pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deletePageAdmin(id: string) {
    return await fetchAdminApi(`/cms/pages/${id}`, {
      method: "DELETE",
    });
  },

  // Blog Posts
  async listBlogAdmin(page = 1, limit = 20) {
    return await fetchAdminApi<BlogPostItem[]>(`/cms/blog/admin?page=${page}&limit=${limit}`);
  },

  async getBlogPostByIdAdmin(id: string) {
    return await fetchAdminApi<BlogPostItem>(`/cms/blog/admin/${id}`);
  },

  async createBlogPostAdmin(payload: Partial<BlogPostItem>) {
    return await fetchAdminApi<BlogPostItem>("/cms/blog", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateBlogPostAdmin(id: string, payload: Partial<BlogPostItem>) {
    return await fetchAdminApi<BlogPostItem>(`/cms/blog/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteBlogPostAdmin(id: string) {
    return await fetchAdminApi(`/cms/blog/${id}`, {
      method: "DELETE",
    });
  },

  // FAQ Categories
  async listFaqCategoriesAdmin() {
    return await fetchAdminApi<FAQCategoryItem[]>("/cms/faq-categories");
  },

  async createFaqCategoryAdmin(payload: Partial<FAQCategoryItem>) {
    return await fetchAdminApi<FAQCategoryItem>("/cms/faq-categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateFaqCategoryAdmin(id: string, payload: Partial<FAQCategoryItem>) {
    return await fetchAdminApi<FAQCategoryItem>(`/cms/faq-categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteFaqCategoryAdmin(id: string) {
    return await fetchAdminApi(`/cms/faq-categories/${id}`, {
      method: "DELETE",
    });
  },

  // FAQs
  async listFaqsAdmin(page = 1, limit = 20) {
    return await fetchAdminApi<FAQItem[]>(`/cms/faqs/admin?page=${page}&limit=${limit}`);
  },

  async createFaqAdmin(payload: Partial<FAQItem>) {
    return await fetchAdminApi<FAQItem>("/cms/faqs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateFaqAdmin(id: string, payload: Partial<FAQItem>) {
    return await fetchAdminApi<FAQItem>(`/cms/faqs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteFaqAdmin(id: string) {
    return await fetchAdminApi(`/cms/faqs/${id}`, {
      method: "DELETE",
    });
  },

  // Banners
  async listBannersAdmin() {
    return await fetchAdminApi<BannerItem[]>("/banners/admin");
  },

  async getBannerById(id: string) {
    return await fetchAdminApi<BannerItem>(`/banners/${id}`);
  },

  async createBanner(payload: Partial<BannerItem>) {
    return await fetchAdminApi<BannerItem>("/banners", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateBanner(id: string, payload: Partial<BannerItem>) {
    return await fetchAdminApi<BannerItem>(`/banners/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteBanner(id: string) {
    return await fetchAdminApi(`/banners/${id}`, {
      method: "DELETE",
    });
  },
};
