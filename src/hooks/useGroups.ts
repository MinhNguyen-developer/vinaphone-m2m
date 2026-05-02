import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { groupsApi, type GroupFormValues } from "../api/groups.api";
import { queryKeys } from "./queryKeys";
import type { QueryGroupDevicesParams } from "../types";

export const useGroups = (params: QueryGroupDevicesParams) =>
  useQuery({
    queryKey: queryKeys.groups.list({
      search: params.search,
      page: params.page,
      pageSize: params.pageSize,
    }),
    queryFn: () => groupsApi.getList(params),
    staleTime: 300_000, // groups change rarely
  });

export const useGetAllGroups = () =>
  useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: () => groupsApi.getAll(),
    staleTime: 300_000, // groups change rarely
    select: (res) => res.data,
  });

export const useCreateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: GroupFormValues) => groupsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.groups.all }),
  });
};

export const useUpdateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: GroupFormValues }) =>
      groupsApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.groups.all }),
  });
};

export const useDeleteGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sims.list() });
      qc.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
};
