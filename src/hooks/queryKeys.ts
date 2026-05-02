import type {
  GroupSimListParams,
  QueryAlertParams,
  RatingPlanListParams,
  SimListParams,
  UsageHistoryParams,
} from "../types";

export const queryKeys = {
  dashboard: {
    overview: ["dashboard", "overview"] as const,
    simsByRatingPlan: ["dashboard", "sims-by-rating-plan"] as const,
  },
  sims: {
    all: ["sims"] as const,
    allItems: ["sims", "all-items"] as const,
    list: (params?: SimListParams) => ["sims", "list", params ?? {}] as const,
    usageHistory: (phoneNumber: string, params?: UsageHistoryParams) =>
      ["sims", phoneNumber, "usage-history", params ?? {}] as const,
  },
  masterSims: {
    all: ["master-sims"] as const,
    list: (params?: SimListParams) =>
      ["master-sims", "list", params ?? {}] as const,
    members: (code: string) => ["master-sims", code, "members"] as const,
  },
  groups: {
    all: ["groups"] as const,
    list: (params?: { search?: string; page?: number; pageSize?: number }) =>
      ["groups", "list", params ?? {}] as const,
  },
  alerts: {
    all: ["alerts"] as const,
    list: (params?: QueryAlertParams) =>
      ["alerts", "list", params ?? {}] as const,
    triggered: (ratingPlanId?: number) =>
      ["alerts", "triggered", ratingPlanId ?? 0] as const,
  },
  ratingPlans: {
    all: ["rating-plans"] as const,
    list: (params?: RatingPlanListParams) =>
      ["rating-plans", "list", params ?? {}] as const,
    byRatingPlanId: (id: number) => ["rating-plans", id] as const,
  },
  groupSims: {
    all: ["group-sims"] as const,
    list: (params?: GroupSimListParams) =>
      ["group-sims", "list", params ?? {}] as const,
  },
} as const;
