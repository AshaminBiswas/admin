import { fetchAdminApi } from "./adminApi";

export interface PermissionItem {
  id: string;
  name: string;
  module: string;
  description?: string;
}

export interface RoleItem {
  id: string;
  name: string;
  description?: string;
  permissions?: string[] | PermissionItem[];
  userCount?: number;
  createdAt?: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions?: string[];
}

export const rolesService = {
  async listRoles() {
    return await fetchAdminApi<RoleItem[]>("/roles");
  },

  async getRoleById(id: string) {
    return await fetchAdminApi<RoleItem>(`/roles/${id}`);
  },

  async createRole(payload: CreateRolePayload) {
    return await fetchAdminApi<RoleItem>("/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateRole(id: string, payload: Partial<CreateRolePayload>) {
    return await fetchAdminApi<RoleItem>(`/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteRole(id: string) {
    return await fetchAdminApi(`/roles/${id}`, {
      method: "DELETE",
    });
  },

  async updateRolePermissions(id: string, permissions: string[]) {
    return await fetchAdminApi(`/roles/${id}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    });
  },

  async listPermissions() {
    return await fetchAdminApi<PermissionItem[]>("/roles/permissions");
  },
};
