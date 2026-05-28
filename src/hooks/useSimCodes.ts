import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { simCodesApi, type SimCodeFormValues } from "../api/simCodes.api";
import { queryKeys } from "./queryKeys";
import { message } from "antd";

export function useSimCodes(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.simCodes.list(params),
    queryFn: () => simCodesApi.getList(params),
  });
}

export function useSimCodeSimIds(id: string | null) {
  return useQuery({
    queryKey: queryKeys.simCodes.simIds(id ?? ""),
    queryFn: () => simCodesApi.getSimIds(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateSimCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SimCodeFormValues & { simIds?: string[] }) =>
      simCodesApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simCodes.all });
      message.success("Tạo mã SIM thành công");
    },
    onError: () => {
      message.error("Tạo mã SIM thất bại");
    },
  });
}

export function useUpdateSimCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: SimCodeFormValues & { simIds?: string[] };
    }) => simCodesApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simCodes.all });
      message.success("Cập nhật mã SIM thành công");
    },
    onError: () => {
      message.error("Cập nhật mã SIM thất bại");
    },
  });
}

export function useDeleteSimCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => simCodesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simCodes.all });
      message.success("Xoá mã SIM thành công");
    },
    onError: () => {
      message.error("Xoá mã SIM thất bại");
    },
  });
}
