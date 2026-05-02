import { useQuery } from "@tanstack/react-query";
import { masterSimsApi } from "../api/masterSims.api";
import { queryKeys } from "./queryKeys";
import type { QueryMasterSimParams } from "../types";

export const useMasterSims = (params: QueryMasterSimParams) =>
  useQuery({
    queryKey: queryKeys.masterSims.list(params),
    queryFn: () => masterSimsApi.getList(params),
    staleTime: 60_000,
  });

export const useMasterSimMembers = (groupId: string | null) =>
  useQuery({
    queryKey: queryKeys.masterSims.members(groupId ?? ""),
    queryFn: () => masterSimsApi.getMembers(groupId!),
    enabled: !!groupId,
    staleTime: 30_000,
    select: (res) => res.data,
  });
