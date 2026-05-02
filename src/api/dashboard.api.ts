import type { DashboardOverview, SimGroupByRatingPlan } from "../types";
import { apiClient } from "./client";

export const dashboardApi = {
  /**
   * GET /statistics/overview
   */
  getOverview: async (): Promise<DashboardOverview> => {
    const res = await apiClient.get<DashboardOverview>("/statistics/overview");
    return res.data;
  },

  /**
   * GET /sims/group/rating-plans
   */
  getSimsGroupByRatingPlan: async (): Promise<SimGroupByRatingPlan[]> => {
    const res = await apiClient.get<SimGroupByRatingPlan[]>(
      "/sims/group/rating-plans",
    );
    return res.data;
  },
};
