import type {
  PaginatedResponse,
  SimCard,
  SimListParams,
  SimUsageHistoryResponse,
  UsageHistoryParams,
  QueryGroupMembersParams,
  SimStatusAction,
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
    action: SimStatusAction,
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
   * Hủy hàng loạt SIM theo IMSI
   */
  bulkCancelSims: async (
    imsis: string[],
  ): Promise<{ cancelled: number; requested: number; notFound: number }> => {
    const res = await apiClient.post<{
      cancelled: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-cancel", { imsis });
    return res.data;
  },

  /**
   * POST /sims/bulk-reset
   * Reset hàng loạt SIM theo IMSI (status→NEW, xóa lịch sử dữ liệu)
   */
  bulkResetSims: async (
    imsis: string[],
  ): Promise<{ reset: number; requested: number; notFound: number }> => {
    const res = await apiClient.post<{
      reset: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-reset", { imsis });
    return res.data;
  },

  bulkLockSims: async (
    imsis: string[],
  ): Promise<{ locked: number; requested: number; notFound: number }> => {
    const res = await apiClient.post<{
      locked: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-lock", { imsis });
    return res.data;
  },

  bulkPendingCancelSims: async (
    imsis: string[],
  ): Promise<{
    pendingCancelled: number;
    requested: number;
    notFound: number;
  }> => {
    const res = await apiClient.post<{
      pendingCancelled: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-pending-cancel", { imsis });
    return res.data;
  },

  bulkPendingLockSims: async (
    imsis: string[],
  ): Promise<{
    pendingLocked: number;
    requested: number;
    notFound: number;
  }> => {
    const res = await apiClient.post<{
      pendingLocked: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-pending-lock", { imsis });
    return res.data;
  },

  bulkPendingRevokeSims: async (
    imsis: string[],
  ): Promise<{
    pendingRevoked: number;
    requested: number;
    notFound: number;
  }> => {
    const res = await apiClient.post<{
      pendingRevoked: number;
      requested: number;
      notFound: number;
    }>("/sims/bulk-pending-revoke", { imsis });
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
