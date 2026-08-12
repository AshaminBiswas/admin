import { fetchAdminApi } from "./adminApi";
import { AdminUser, CreateAdminPayload } from "../types/admin";

export interface ListUsersParams {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  roleId?: string;
  status?: string;
}

export const usersService = {
  async listUsers(params: ListUsersParams = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.sortOrder) query.append("sortOrder", params.sortOrder);
    if (params.search) query.append("search", params.search);
    if (params.roleId) query.append("roleId", params.roleId);
    if (params.status) query.append("status", params.status);

    const queryString = query.toString();
    return await fetchAdminApi<AdminUser[]>(`/users${queryString ? `?${queryString}` : ""}`);
  },

  async getUserById(id: string) {
    return await fetchAdminApi<AdminUser>(`/users/${id}`);
  },

  async createUser(payload: CreateAdminPayload) {
    return await fetchAdminApi<AdminUser>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateUser(id: string, payload: Partial<CreateAdminPayload>) {
    return await fetchAdminApi<AdminUser>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteUser(id: string) {
    return await fetchAdminApi(`/users/${id}`, {
      method: "DELETE",
    });
  },

  async getUserRoles(id: string) {
    return await fetchAdminApi<string[]>(`/users/${id}/roles`);
  },

  async updateUserRoles(id: string, roleIds: string[]) {
    return await fetchAdminApi(`/users/${id}/roles`, {
      method: "PATCH",
      body: JSON.stringify({ roleIds }),
    });
  },
};
