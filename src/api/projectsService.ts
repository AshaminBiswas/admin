import { fetchAdminApi } from "./adminApi";
import { ProjectItem, ProjectLocationsSummaryResponse } from "../types/admin";

export interface ListProjectsResponse {
  projects: ProjectItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export const projectsService = {
  /**
   * List projects with admin query parameters & resilient fallback
   */
  async listProjects(params?: {
    search?: string;
    city?: string;
    state?: string;
    category?: string;
    isPanIndia?: string;
    isFeatured?: string;
    status?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<ListProjectsResponse> {
    const qs = new URLSearchParams();
    if (params?.search) qs.append("search", params.search);
    if (params?.city) qs.append("city", params.city);
    if (params?.state) qs.append("state", params.state);
    if (params?.category) qs.append("category", params.category);
    if (params?.isPanIndia !== undefined) qs.append("isPanIndia", params.isPanIndia);
    if (params?.isFeatured !== undefined) qs.append("isFeatured", params.isFeatured);
    if (params?.status) qs.append("status", params.status);
    if (params?.page) qs.append("page", String(params.page));
    if (params?.limit) qs.append("limit", String(params.limit));
    if (params?.sort) qs.append("sort", params.sort);

    const queryStr = qs.toString() ? `?${qs.toString()}` : "";

    try {
      // 1. Try authenticated admin endpoint
      const res = await fetchAdminApi<any>(`/projects/admin/all${queryStr}`);
      const raw = res?.data || res?.projects || res;
      if (raw && (Array.isArray(raw) || Array.isArray(raw?.projects) || Array.isArray(raw?.data))) {
        const list: ProjectItem[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.projects)
          ? raw.projects
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        const pagination = raw?.pagination || res?.pagination || {
          total: list.length,
          page: params?.page || 1,
          limit: params?.limit || 200,
          totalPages: Math.ceil(list.length / (params?.limit || 200)),
          hasMore: false,
        };
        return { projects: list, pagination };
      }
    } catch (e) {
      console.warn("[projectsService] /projects/admin/all failed, trying public endpoint...", e);
    }

    try {
      // 2. Fallback to public endpoint
      const fallbackRes = await fetchAdminApi<any>(`/projects${queryStr}`);
      const raw = fallbackRes?.data || fallbackRes?.projects || fallbackRes;
      const list: ProjectItem[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.projects)
        ? raw.projects
        : Array.isArray(raw?.data)
        ? raw.data
        : [];
      const pagination = raw?.pagination || fallbackRes?.pagination || {
        total: list.length,
        page: params?.page || 1,
        limit: params?.limit || 200,
        totalPages: Math.ceil(list.length / (params?.limit || 200)),
        hasMore: false,
      };
      return { projects: list, pagination };
    } catch (err) {
      console.error("[projectsService] Failed to load projects:", err);
      return { projects: [], pagination: { total: 0, page: 1, limit: 200, totalPages: 1, hasMore: false } };
    }
  },

  /**
   * Get single project by ID
   */
  async getProjectById(id: string) {
    const res = await fetchAdminApi<any>(`/projects/${id}`);
    return res?.data || res;
  },

  /**
   * Create new project
   */
  async createProject(data: Partial<ProjectItem>) {
    const res = await fetchAdminApi<any>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },

  /**
   * Update existing project
   */
  async updateProject(id: string, data: Partial<ProjectItem>) {
    const res = await fetchAdminApi<any>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },

  /**
   * Delete project
   */
  async deleteProject(id: string) {
    const res = await fetchAdminApi<any>(`/projects/${id}`, {
      method: "DELETE",
    });
    return res?.data || res;
  },

  /**
   * Toggle featured status
   */
  async toggleFeatured(id: string) {
    const res = await fetchAdminApi<any>(`/projects/${id}/featured`, {
      method: "PATCH",
    });
    return res?.data || res;
  },

  /**
   * Toggle active / inactive visibility
   */
  async toggleStatus(id: string) {
    const res = await fetchAdminApi<any>(`/projects/${id}/status`, {
      method: "PATCH",
    });
    return res?.data || res;
  },

  /**
   * Seed / migrate the 200 completed projects dataset
   */
  async seedProjects(force = false) {
    const res = await fetchAdminApi<any>(
      `/projects/seed${force ? "?force=true" : ""}`,
      { method: "POST" }
    );
    return res?.data || res;
  },

  /**
   * Geographic cluster summary for India map
   */
  async getMapLocationsSummary() {
    const res = await fetchAdminApi<any>("/projects/map/locations");
    return res?.data || res;
  },

  /**
   * Distinct categories and counts
   */
  async getCategories() {
    const res = await fetchAdminApi<any>("/projects/categories");
    return res?.data || res || [];
  },
};

export default projectsService;
