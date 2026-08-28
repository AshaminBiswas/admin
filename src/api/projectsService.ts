import { fetchAdminApi } from "./adminApi";
import { ProjectItem, ProjectLocationsSummaryResponse } from "../types/admin";

export interface ListProjectsResponse {
  projects: ProjectItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export const projectsService = {
  /**
   * List projects with admin query parameters
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
  }) {
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
    return await fetchAdminApi<ListProjectsResponse>(`/projects/admin/all${queryStr}`);
  },

  /**
   * Get single project by ID
   */
  async getProjectById(id: string) {
    return await fetchAdminApi<ProjectItem>(`/projects/${id}`);
  },

  /**
   * Create new project
   */
  async createProject(data: Partial<ProjectItem>) {
    return await fetchAdminApi<ProjectItem>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update existing project
   */
  async updateProject(id: string, data: Partial<ProjectItem>) {
    return await fetchAdminApi<ProjectItem>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete project
   */
  async deleteProject(id: string) {
    return await fetchAdminApi<void>(`/projects/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Toggle featured status
   */
  async toggleFeatured(id: string) {
    return await fetchAdminApi<ProjectItem>(`/projects/${id}/featured`, {
      method: "PATCH",
    });
  },

  /**
   * Toggle active / inactive visibility
   */
  async toggleStatus(id: string) {
    return await fetchAdminApi<ProjectItem>(`/projects/${id}/status`, {
      method: "PATCH",
    });
  },

  /**
   * Seed / migrate the 133+ completed projects dataset
   */
  async seedProjects(force = false) {
    return await fetchAdminApi<{ count: number; message: string }>(
      `/projects/seed${force ? "?force=true" : ""}`,
      { method: "POST" }
    );
  },

  /**
   * Geographic cluster summary for India map
   */
  async getMapLocationsSummary() {
    return await fetchAdminApi<ProjectLocationsSummaryResponse>("/projects/map/locations");
  },

  /**
   * Distinct categories and counts
   */
  async getCategories() {
    return await fetchAdminApi<{ category: string; count: number }[]>("/projects/categories");
  },
};
