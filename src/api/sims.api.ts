import type {
  PaginatedResponse,
  SimBasic,
  SimCard,
  SimListParams,
  SimUsageHistoryResponse,
  UsageHistoryParams,
  QueryGroupMembersParams,
} from "../types";
import { apiClient } from "./client";

export const simsApi = {
  /**
   * GET /sims/all – all SIMs without pagination (id, phoneNumber, ratingPlanName, productCode only)
   */
  getAll: async (): Promise<SimBasic[]> => {
    const res = await apiClient.get<SimBasic[]>("/sims/all");
    return res.data;
  },

  /**
   * GET /sims – paginated list with optional filters
   */
  getList: async (
    params?: SimListParams,
  ): Promise<PaginatedResponse<SimCard>> => {
    const res = await apiClient.get<PaginatedResponse<SimCard>>("/sims", {
      params,
    });
    return res.data;
  },

  /**
   * PATCH /sims/:id/status
   * action: "confirm" | "reset"
   */
  updateStatus: async (
    id: string,
    action: "confirm" | "reset",
  ): Promise<SimCard> => {
    const res = await apiClient.patch<SimCard>(`/sims/${id}/status`, {
      action,
    });
    return res.data;
  },

  /**
   * PATCH /sims/batch-update-status
   * action: "confirm" | "reset"
   */
  batchUpdateStatus: async (
    ids: string[],
    action: "confirm" | "reset",
  ): Promise<SimCard> => {
    const res = await apiClient.patch<SimCard>(`/sims/batch-update-status`, {
      ids,
      action,
    });
    return res.data;
  },

  /**
   * PATCH /sims/:id/first-used-at
   */
  updateFirstUsedAt: async (
    id: string,
    firstUsedAt: string,
  ): Promise<SimCard> => {
    const res = await apiClient.patch<SimCard>(`/sims/${id}/first-used-at`, {
      firstUsedAt,
    });
    return res.data;
  },

  /**
   * GET /sims/:phoneNumber/usage-history
   */
  getUsageHistory: async (
    phoneNumber: string,
    params?: UsageHistoryParams,
  ): Promise<SimUsageHistoryResponse> => {
    const res = await apiClient.get<SimUsageHistoryResponse>(
      `/sims/${phoneNumber}/usage-history`,
      { params },
    );
    return res.data;
  },

  /**
   * GET /sims/group-members/:groupId
   * Lấy danh sách thành viên của nhóm gói cước SOG
   */
  getGroupMembers: async (
    groupId: string,
    query?: QueryGroupMembersParams,
  ): Promise<PaginatedResponse<SimCard>> => {
    const res = await apiClient.get<PaginatedResponse<SimCard>>(
      `/sims/group-members/${groupId}`,
      { params: query },
    );
    return res.data;
  },
};
