import { useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { syncApi } from "../api/sync.api";
import { queryKeys } from "./queryKeys";

export function useSync() {
  const qc = useQueryClient();

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.sims.all });
    void qc.invalidateQueries({ queryKey: queryKeys.ratingPlans.all });
    void qc.invalidateQueries({ queryKey: queryKeys.groupSims.all });
  };

  const syncSims = useMutation({
    mutationFn: syncApi.triggerSims,
    onSuccess: () => {
      message.success(
        "Đồng bộ SIM đã được kích hoạt, dữ liệu sẽ sớm được cập nhật.",
      );
      invalidateAll();
    },
    onError: () => message.error("Không thể kích hoạt đồng bộ SIM."),
  });

  const syncRatingPlans = useMutation({
    mutationFn: syncApi.triggerRatingPlans,
    onSuccess: () => {
      message.success("Đồng bộ gói cước đã được kích hoạt.");
      void qc.invalidateQueries({ queryKey: queryKeys.ratingPlans.all });
    },
    onError: () => message.error("Không thể kích hoạt đồng bộ gói cước."),
  });

  const syncGroupSims = useMutation({
    mutationFn: syncApi.triggerGroupSims,
    onSuccess: () => {
      message.success("Đồng bộ nhóm thuê bao đã được kích hoạt.");
      void qc.invalidateQueries({ queryKey: queryKeys.groupSims.all });
    },
    onError: () => message.error("Không thể kích hoạt đồng bộ nhóm thuê bao."),
  });

  const isAnyPending =
    syncSims.isPending || syncRatingPlans.isPending || syncGroupSims.isPending;

  return { syncSims, syncRatingPlans, syncGroupSims, isAnyPending };
}
