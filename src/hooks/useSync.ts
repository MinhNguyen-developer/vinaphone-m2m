import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import {
  syncApi,
  type SyncJobName,
  type SyncStatusResponse,
} from "../api/sync.api";
import { queryKeys } from "./queryKeys";

function getSyncError(error: unknown) {
  if (!import.meta.env.DEV) return "Đồng bộ thất bại.";

  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const detail = error.response?.data?.message;
    if (Array.isArray(detail)) return detail.join("; ");
    if (detail) return detail;
  }

  return error instanceof Error ? error.message : "Đồng bộ thất bại.";
}

export function useSync() {
  const qc = useQueryClient();
  const previousUpdates = useRef<Partial<Record<SyncJobName, string>>>({});
  const [statuses, setStatuses] = useState<SyncStatusResponse>();
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let reconnectTimer: number | undefined;

    const reconnect = () => {
      if (controller.signal.aborted) return;
      setStatusError(true);
      reconnectTimer = window.setTimeout(() => void connect(), 2000);
    };

    async function connect() {
      try {
        await syncApi.subscribeToStatus((nextStatuses) => {
          setStatuses(nextStatuses);
          setStatusError(false);
        }, controller.signal);
        reconnect();
      } catch {
        reconnect();
      }
    }

    void connect();
    return () => {
      controller.abort();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
    };
  }, []);

  useEffect(() => {
    const jobs = statuses;
    if (!jobs) return;

    const previous = previousUpdates.current;
    const completedJobs = Object.entries(jobs).filter(
      ([name, status]) =>
        previous[name as SyncJobName] !== status.updatedAt &&
        status.state === "completed",
    );

    for (const [name] of completedJobs) {
      switch (name as SyncJobName) {
        case "syncSims":
          void qc.invalidateQueries({ queryKey: queryKeys.sims.all });
          void qc.invalidateQueries({ queryKey: queryKeys.ratingPlans.all });
          void qc.invalidateQueries({ queryKey: queryKeys.groupSims.all });
          break;
        case "syncRatingPlans":
          void qc.invalidateQueries({ queryKey: queryKeys.ratingPlans.all });
          break;
        case "syncGroupSims":
          void qc.invalidateQueries({ queryKey: queryKeys.groupSims.all });
          break;
      }
    }

    previousUpdates.current = Object.fromEntries(
      Object.entries(jobs).map(([name, status]) => [name, status.updatedAt]),
    );
  }, [qc, statuses]);

  const syncSims = useMutation({
    mutationFn: syncApi.triggerSims,
    onSuccess: () => {
      message.success("Đã bắt đầu đồng bộ SIM.");
    },
    onError: (error) => message.error(getSyncError(error)),
  });

  const syncRatingPlans = useMutation({
    mutationFn: syncApi.triggerRatingPlans,
    onSuccess: () => {
      message.success("Đã bắt đầu đồng bộ gói cước.");
    },
    onError: (error) => message.error(getSyncError(error)),
  });

  const syncGroupSims = useMutation({
    mutationFn: syncApi.triggerGroupSims,
    onSuccess: () => {
      message.success("Đã bắt đầu đồng bộ nhóm thuê bao.");
    },
    onError: (error) => message.error(getSyncError(error)),
  });

  const syncMonthlyUsage = useMutation({
    mutationFn: syncApi.triggerMonthlyUsage,
    onSuccess: () => {
      message.success("Đã bắt đầu đồng bộ dung lượng tháng.");
    },
    onError: (error) => message.error(getSyncError(error)),
  });

  return {
    syncSims,
    syncRatingPlans,
    syncGroupSims,
    syncMonthlyUsage,
    statuses,
    statusError,
    triggerErrors: {
      syncSims: syncSims.isError ? getSyncError(syncSims.error) : undefined,
      syncRatingPlans: syncRatingPlans.isError
        ? getSyncError(syncRatingPlans.error)
        : undefined,
      syncGroupSims: syncGroupSims.isError
        ? getSyncError(syncGroupSims.error)
        : undefined,
      syncMonthlyUsage: syncMonthlyUsage.isError
        ? getSyncError(syncMonthlyUsage.error)
        : undefined,
    },
  };
}
