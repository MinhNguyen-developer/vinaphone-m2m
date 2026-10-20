import { apiClient, getAccessToken } from "./client";

export interface SyncTriggerResponse {
  triggered: boolean;
  job: string;
  timestamp: string;
}

export type SyncJobName =
  | "syncSims"
  | "syncRatingPlans"
  | "syncGroupSims"
  | "syncMonthlyUsage";

export interface SyncJobStatus {
  state: "idle" | "running" | "completed" | "failed";
  progress: string;
  progressPercent: number;
  updatedAt: string;
  lastSyncedAt?: string;
  error?: string;
}

export type SyncStatusResponse = Record<SyncJobName, SyncJobStatus>;

async function subscribeToSyncStatus(
  onStatus: (status: SyncStatusResponse) => void,
  signal: AbortSignal,
) {
  const token = getAccessToken();
  const response = await fetch(apiClient.getUri({ url: "/sync/events" }), {
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    signal,
  });

  if (response.status === 401) {
    localStorage.removeItem("vinaphone-auth");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!response.ok) throw new Error("Unable to connect to sync status stream");
  if (!response.body) throw new Error("Sync status stream is unavailable");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleEvent = (event: string) => {
    let eventName = "message";
    const data: string[] = [];
    for (const line of event.split(/\r?\n/)) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (eventName === "ping" || data.length === 0) return;
    onStatus(JSON.parse(data.join("\n")) as SyncStatusResponse);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    events.forEach(handleEvent);
  }

  if (buffer.trim()) handleEvent(buffer);
}

export const syncApi = {
  subscribeToStatus: subscribeToSyncStatus,

  triggerSims: () =>
    apiClient.post<SyncTriggerResponse>("/sync/sims").then((r) => r.data),

  triggerRatingPlans: () =>
    apiClient
      .post<SyncTriggerResponse>("/sync/rating-plans")
      .then((r) => r.data),

  triggerGroupSims: () =>
    apiClient.post<SyncTriggerResponse>("/sync/group-sims").then((r) => r.data),

  triggerMonthlyUsage: () =>
    apiClient
      .post<SyncTriggerResponse>("/sync/monthly-usage")
      .then((r) => r.data),
};
