import type {
  MasterSim,
  PaginatedResponse,
  QueryMasterSimParams,
  SimCard,
} from "../types";
import { apiClient } from "./client";

export const masterSimsApi = {
  /**
   * GET /master-sims – list of SimGroupMembers
   */
  getList: async (
    params?: QueryMasterSimParams,
  ): Promise<PaginatedResponse<SimCard>> => {
    const res = await apiClient.get<PaginatedResponse<SimCard>>(
      "/master-sims",
      {
        params,
      },
    );
    return res.data;
  },

  /**
   * GET /master-sims/:groupId/members – paginated members of a group
   */
  getMembers: async (
    groupId: string,
    params?: { page?: number; pageSize?: number },
  ): Promise<PaginatedResponse<MasterSim>> => {
    const res = await apiClient.get<PaginatedResponse<MasterSim>>(
      `/master-sims/${groupId}/members`,
      { params },
    );
    return res.data;
  },
};
