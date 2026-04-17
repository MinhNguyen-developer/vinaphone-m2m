import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { simsApi } from "../api/sims.api";
import type {
  QueryGroupMembersParams,
  SimListParams,
  UsageHistoryParams,
} from "../types";
import { queryKeys } from "./queryKeys";

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
