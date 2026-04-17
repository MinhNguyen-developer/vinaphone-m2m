import type {
  PaginatedResponse,
  RatingPlan,
  RatingPlanListParams,
} from "../types";
import { apiClient } from "./client";

export const ratingPlansApi = {
  getList: async (params?: RatingPlanListParams) => {
    const res = await apiClient.get<PaginatedResponse<RatingPlan>>(
      "/rating-plans",
      { params },
    );
    return res.data;
  },
};
