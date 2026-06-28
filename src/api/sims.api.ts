import type {
  PaginatedResponse,
  SimCard,
  SimListParams,
  SimUsageHistoryResponse,
  UsageHistoryParams,
  QueryGroupMembersParams,
} from "../types";
import { apiClient } from "./client";

export const simsApi = {
  /**
   * GET /sims/all – all SIMs without pagination (for export / pickers)
   */
  getAll: async (): Promise<SimCard[]> => {
    const res = await apiClient.get<SimCard[]>("/sims/all");
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
   * GET /sims/:id – full SIM detail with monthlyDataUsages + simGroups
   */
  getDetail: async (id: string): Promise<SimCard> => {
    const res = await apiClient.get<SimCard>(`/sims/${id}`);
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
   * status: target numeric SIM status
   */
  batchUpdateStatus: async (
    ids: string[],
    status: number,
  ): Promise<{ count: number }> => {
    const res = await apiClient.patch<{ count: number }>(
      `/sims/batch-update-status`,
      {
        ids,
        status,
      },
    );
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

  /**
   * POST /sims/bulk-cancel
   * Hủy hàng loạt SIM theo số điện thoại
   */
  bulkCancelSims: async (
    phoneNumbers: string[],
  ): Promise<{ cancelled: number; requested: number; notFound: number }> => {
    const res = await apiClient.post<{
      cancelled: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-cancel", { phoneNumbers });
    return res.data;
  },

  /**
   * POST /sims/bulk-reset
   * Reset hàng loạt SIM theo số điện thoại (status→NEW, xóa lịch sử dữ liệu)
   */
  bulkResetSims: async (
    phoneNumbers: string[],
  ): Promise<{ reset: number; requested: number; notFound: number }> => {
    const res = await apiClient.post<{
      reset: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-reset", { phoneNumbers });
    return res.data;
  },

  bulkLockSims: async (
    phoneNumbers: string[],
  ): Promise<{ locked: number; requested: number; notFound: number }> => {
    const res = await apiClient.post<{
      locked: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-lock", { phoneNumbers });
    return res.data;
  },

  bulkPendingCancelSims: async (
    phoneNumbers: string[],
  ): Promise<{
    pendingCancelled: number;
    requested: number;
    notFound: number;
  }> => {
    const res = await apiClient.post<{
      pendingCancelled: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-pending-cancel", { phoneNumbers });
    return res.data;
  },

  /**
   * PATCH /sims/:id/note
   */
  updateNote: async (id: string, note: string | null): Promise<SimCard> => {
    const res = await apiClient.patch<SimCard>(`/sims/${id}/note`, { note });
    return res.data;
  },

  patchSim: async (
    id: string,
    data: Record<string, unknown>,
  ): Promise<SimCard> => {
    const res = await apiClient.patch<SimCard>(`/sims/${id}`, data);
    return res.data;
  },

  bulkChangeStatusSims: async (
    phoneNumbers: string[],
    status: number,
  ): Promise<{
    changed: number;
    requested: number;
    notFound: number;
  }> => {
    const res = await apiClient.patch<{
      changed: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-change-status", { phoneNumbers, status });
    return res.data;
  },
};
