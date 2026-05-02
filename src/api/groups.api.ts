import type {
  Group,
  GroupWithCount,
  PaginatedResponse,
  QueryGroupDevicesParams,
} from "../types";
import { apiClient } from "./client";

export interface GroupFormValues {
  name: string;
  description?: string;
  simIds?: string[];
}

export const groupsApi = {
  /**
   * GET /groups – list with simCount
   */
  getList: async (
    params: QueryGroupDevicesParams,
  ): Promise<PaginatedResponse<GroupWithCount>> => {
    const res = await apiClient.get<PaginatedResponse<GroupWithCount>>(
      "/groups",
      {
        params,
      },
    );
    return res.data;
  },

  /**
   * GET /groups/all – list without simCount, for dropdowns and such
   */
  getAll: async (): Promise<{ data: Group[] }> => {
    const res = await apiClient.get<{ data: Group[] }>("/groups/all");
    return res.data;
  },

  /**
   * POST /groups – create a new group
   */
  create: async (dto: GroupFormValues): Promise<GroupWithCount> => {
    const res = await apiClient.post<GroupWithCount>("/groups", dto);
    return res.data;
  },

  /**
   * PATCH /groups/:id – update group fields and/or sim members
   */
  update: async (id: string, dto: GroupFormValues): Promise<GroupWithCount> => {
    const res = await apiClient.patch<GroupWithCount>(`/groups/${id}`, dto);
    return res.data;
  },

  /**
   * DELETE /groups/:id – remove a group
   */
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/groups/${id}`);
  },

  /**
   * GET /groups/:id/sims – list sim IDs in this group
   */
  getSimIds: async (id: string): Promise<string[]> => {
    const res = await apiClient.get<{ data: string[] }>(`/groups/${id}/sims`);
    return res.data.data;
  },
};
