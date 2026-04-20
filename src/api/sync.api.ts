import { apiClient } from "./client";

export interface SyncTriggerResponse {
  triggered: boolean;
  job: string;
  timestamp: string;
}

export const syncApi = {
  triggerSims: () =>
    apiClient.post<SyncTriggerResponse>("/sync/sims").then((r) => r.data),

  triggerRatingPlans: () =>
    apiClient
      .post<SyncTriggerResponse>("/sync/rating-plans")
      .then((r) => r.data),

  triggerGroupSims: () =>
    apiClient.post<SyncTriggerResponse>("/sync/group-sims").then((r) => r.data),
};
