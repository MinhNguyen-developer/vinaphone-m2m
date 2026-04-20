import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import type { GroupSimListParams } from "../types";
import { groupSimApi } from "../api/group-sim.api";

export const useGroupSims = (params?: GroupSimListParams) => {
  return useQuery({
    queryKey: queryKeys.groupSims.list(params),
    queryFn: () => groupSimApi.getList(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
};
