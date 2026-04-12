import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../api/alerts.api';
import type { TriggeredAlertsResponse } from '../types';
import { queryKeys } from './queryKeys';

export const useAlerts = () =>
  useQuery({
    queryKey: queryKeys.alerts.list(),
    queryFn: () => alertsApi.getList(),
    staleTime: 120_000,
    select: (res) => res.data,
  });

export const useTriggeredAlerts = (productCode?: string) =>
  useQuery({
    queryKey: queryKeys.alerts.triggered(productCode),
    queryFn: () => alertsApi.getTriggered({ productCode }),
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
      const prevSnapshots = queryClient.getQueriesData<TriggeredAlertsResponse>({
        queryKey: ['alerts', 'triggered'],
      });

      // Optimistically toggle the checked flag
      queryClient.setQueriesData<TriggeredAlertsResponse>(
        { queryKey: ['alerts', 'triggered'] },
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
      queryClient.invalidateQueries({ queryKey: ['alerts', 'triggered'] });
    },
  });
};
