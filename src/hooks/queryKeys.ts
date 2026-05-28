import type {
  GroupSimListParams,
  QueryAlertParams,
  QueryGroupDevicesParams,
  QueryTriggeredParams,
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
    detail: (id: string) => ["sims", "detail", id] as const,
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
    list: (params?: QueryGroupDevicesParams) =>
      ["groups", "list", params ?? {}] as const,
  },
  alerts: {
    all: ["alerts"] as const,
    list: (params?: QueryAlertParams) =>
      ["alerts", "list", params ?? {}] as const,
    triggered: (params?: QueryTriggeredParams) =>
      ["alerts", "triggered", params ?? {}] as const,
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
  simCodes: {
    all: ["sim-codes"] as const,
    list: (params?: { page?: number; pageSize?: number; search?: string }) =>
      ["sim-codes", "list", params ?? {}] as const,
    simIds: (id: string) => ["sim-codes", id, "sim-ids"] as const,
  },
} as const;
