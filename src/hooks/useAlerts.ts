import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alertsApi, type AlertFormValues } from "../api/alerts.api";
import type { QueryAlertParams, TriggeredAlertsResponse } from "../types";
import { queryKeys } from "./queryKeys";

export const useAlerts = (params?: QueryAlertParams) =>
  useQuery({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () => alertsApi.getList(params),
    staleTime: 120_000,
  });

export const useTriggeredAlerts = (ratingPlanId?: number) =>
  useQuery({
    queryKey: queryKeys.alerts.triggered(ratingPlanId),
    queryFn: () => alertsApi.getTriggered({ ratingPlanId }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

/**
 * Marks a single triggered alert as checked / unchecked.
 * Uses optimistic update so the UI responds instantly.
 */
export const useCheckAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      simId,
      alertId,
      checked,
    }: {
      simId: string;
      alertId: string;
      checked: boolean;
    }) => alertsApi.checkAlert(simId, alertId, checked),

    onMutate: async ({ simId, alertId, checked }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.alerts.all });

      // Snapshot for rollback
      const prevSnapshots = queryClient.getQueriesData<TriggeredAlertsResponse>(
        {
          queryKey: ["alerts", "triggered"],
        },
      );

      // Optimistically toggle the checked flag
      queryClient.setQueriesData<TriggeredAlertsResponse>(
        { queryKey: ["alerts", "triggered"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) =>
              item.sim.id === simId && item.alert.id === alertId
                ? { ...item, checked }
                : item,
            ),
          };
        },
      );

      return { prevSnapshots };
    },

    onError: (_err, _vars, ctx) => {
      // Roll back
      ctx?.prevSnapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", "triggered"] });
    },
  });
};

export const useCreateAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: AlertFormValues) => alertsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alerts.all }),
  });
};

export const useUpdateAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<AlertFormValues> }) =>
      alertsApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alerts.all }),
  });
};

export const useDeleteAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alerts.all }),
  });
};

export const useToggleAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.toggleActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alerts.all }),
  });
};
