import type { GroupSim, GroupSimListParams, PaginatedResponse } from "../types";
import { apiClient } from "./client";

export const groupSimApi = {
  getList: async (
    params?: GroupSimListParams,
  ): Promise<PaginatedResponse<GroupSim>> => {
    const res = await apiClient.get<PaginatedResponse<GroupSim>>("/sim-group", {
      params,
    });
    return res.data;
  },
};
