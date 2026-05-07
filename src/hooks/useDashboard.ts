import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard.api";
import { queryKeys } from "./queryKeys";

export const useDashboardOverview = () =>
  useQuery({
    queryKey: queryKeys.dashboard.overview,
    queryFn: () => dashboardApi.getOverview(),
    staleTime: 60_000,
  });

export const useSimsGroupByRatingPlan = () =>
  useQuery({
    queryKey: queryKeys.dashboard.simsByRatingPlan,
    queryFn: () => dashboardApi.getSimsGroupByRatingPlan(),
    staleTime: 60_000,
  });
