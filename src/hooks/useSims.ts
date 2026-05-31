import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { simsApi } from "../api/sims.api";
import type {
  QueryGroupMembersParams,
  SimListParams,
  UsageHistoryParams,
} from "../types";
import { queryKeys } from "./queryKeys";

/**
 * All SIMs without pagination – for Transfer/picker components.
 */
export const useAllSims = () =>
  useQuery({
    queryKey: queryKeys.sims.allItems,
    queryFn: () => simsApi.getAll(),
    staleTime: 60_000,
  });

/**
 * Full detail for a single SIM (includes monthlyDataUsages + simGroups).
 */
export const useSimDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.sims.detail(id ?? ""),
    queryFn: () => simsApi.getDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

/**
 * Paginated SIM list with optional filters.
 * Falls back to empty data on network error so the page still renders.
 */
export const useSims = (params?: SimListParams) =>
  useQuery({
    queryKey: queryKeys.sims.list(params),
    queryFn: () => simsApi.getList(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

/**
 * Usage history for a single SIM identified by phone number.
 * Only enabled when `phoneNumber` is provided.
 */
export const useSimUsageHistory = (
  phoneNumber: string | null,
  params?: UsageHistoryParams,
) =>
  useQuery({
    queryKey: queryKeys.sims.usageHistory(phoneNumber ?? "", params),
    queryFn: () => simsApi.getUsageHistory(phoneNumber!, params),
    enabled: !!phoneNumber,
    staleTime: 60_000,
  });

/** GET /sims/group-members/:groupId – thành viên nhóm SOG */
export const useSimGroupMembers = (
  groupId: string | null,
  query?: QueryGroupMembersParams,
) =>
  useQuery({
    queryKey: ["sims", "groupMembers", groupId, query],
    queryFn: () => simsApi.getGroupMembers(groupId!, query),
    enabled: !!groupId,
    staleTime: 60_000,
  });
export const useUpdateSimStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "confirm" | "reset" }) =>
      simsApi.updateStatus(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sims.all });
    },
  });
};
export const useUpdateManySimStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      action,
    }: {
      ids: string[];
      action: "confirm" | "reset";
    }) => simsApi.batchUpdateStatus(ids, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sims.all });
    },
  });
};

/** POST /sims/bulk-cancel – hủy hàng loạt SIM theo số điện thoại */
export const useBulkCancelSims = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phoneNumbers: string[]) =>
      simsApi.bulkCancelSims(phoneNumbers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sims.all });
    },
  });
};

/** POST /sims/bulk-reset – reset hàng loạt SIM theo số điện thoại */
export const useBulkResetSims = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phoneNumbers: string[]) => simsApi.bulkResetSims(phoneNumbers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sims.all });
    },
  });
};

/** POST /sims/bulk-lock – tạm khoá hàng loạt SIM theo số điện thoại */
export const useBulkLockSims = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phoneNumbers: string[]) => simsApi.bulkLockSims(phoneNumbers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sims.all });
    },
  });
};

/** POST /sims/bulk-pending-cancel – chuyển trạng thái Chờ huỷ hàng loạt */
export const useBulkPendingCancelSims = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phoneNumbers: string[]) =>
      simsApi.bulkPendingCancelSims(phoneNumbers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sims.all });
    },
  });
};

/** PATCH /sims/:id/first-used-at */
export const useUpdateFirstUsedAt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, firstUsedAt }: { id: string; firstUsedAt: string }) =>
      simsApi.updateFirstUsedAt(id, firstUsedAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sims.all });
    },
  });
};

/** PATCH /sims/:id/note */
export const useUpdateSimNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string | null }) =>
      simsApi.updateNote(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sims.all });
    },
  });
};

/** Generic PATCH /sims/:id */
export const usePatchSim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      simsApi.patchSim(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sims.all });
    },
  });
};
