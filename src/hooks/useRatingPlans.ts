import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { ratingPlansApi } from "../api/rating-plans.api";
import type { RatingPlanListParams } from "../types";

export const useRatingPlans = (params?: RatingPlanListParams) => {
  return useQuery({
    queryKey: queryKeys.ratingPlans.list(params),
    queryFn: () => ratingPlansApi.getList(params),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
};

export const useGetRatingPlanByRatingPlanId = (id: number) => {
  return useQuery({
    queryKey: queryKeys.ratingPlans.byRatingPlanId(id),
    queryFn: () => ratingPlansApi.findByRatingPlanId(id),
    enabled: !!id,
    staleTime: 60_000,
  });
};
