import type {
  AlertConfig,
  BulkCheckResponse,
  BulkCheckStatusResponse,
  QueryAlertParams,
  QueryTriggeredParams,
  TriggeredAlertsResponse,
} from "../types";
import { apiClient } from "./client";

export interface AlertFormValues {
  label: string;
  thresholdMB: number;
  simId?: string;
  groupId?: string;
  productCode?: string;
  ratingPlanId?: number;
  simCodeLabel?: string;
  /** 1 = Mới, 2 = Đã kiểm tra */
  status?: number;
}

export const alertsApi = {
  /**
   * GET /alerts – paginated + filtered alert configurations
   */
  getList: async (
    params?: QueryAlertParams,
  ): Promise<{ data: AlertConfig[]; total: number }> => {
    const res = await apiClient.get<{ data: AlertConfig[]; total: number }>(
      "/alerts",
      { params },
    );
    return res.data;
  },

  /**
   * PATCH /alerts/:id/toggle-active – toggle active state
   */
  toggleActive: async (id: string): Promise<AlertConfig> => {
    const res = await apiClient.patch<AlertConfig>(
      `/alerts/${id}/toggle-active`,
    );
    return res.data;
  },

  /**
   * POST /alerts – create a new alert configuration
   */
  create: async (dto: AlertFormValues): Promise<AlertConfig> => {
    const res = await apiClient.post<AlertConfig>("/alerts", dto);
    return res.data;
  },

  /**
   * PATCH /alerts/:id – update an alert configuration
   */
  update: async (
    id: string,
    dto: Partial<AlertFormValues>,
  ): Promise<AlertConfig> => {
    const res = await apiClient.patch<AlertConfig>(`/alerts/${id}`, dto);
    return res.data;
  },

  /**
   * DELETE /alerts/:id – remove an alert configuration
   */
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/alerts/${id}`);
  },

  /**
   * GET /alerts/triggered – SIMs currently exceeding thresholds (unchecked only)
   */
  getTriggered: async (
    params?: QueryTriggeredParams,
  ): Promise<TriggeredAlertsResponse> => {
    const res = await apiClient.get<TriggeredAlertsResponse>(
      "/alerts/triggered",
      { params },
    );
    return res.data;
  },

  /**
   * POST /alerts/bulk-check-status – bulk mark AlertConfigs as Checked (status 1 → 2)
   */
  bulkCheckStatus: async (ids: string[]): Promise<BulkCheckStatusResponse> => {
    const res = await apiClient.post<BulkCheckStatusResponse>(
      "/alerts/bulk-check-status",
      { ids },
    );
    return res.data;
  },

  /**
   * POST /alerts/triggered/bulk-check
   */
  bulkCheckAlerts: async (
    phoneNumbers: string[],
  ): Promise<BulkCheckResponse> => {
    const res = await apiClient.post<BulkCheckResponse>(
      "/alerts/triggered/bulk-check",
      { phoneNumbers },
    );
    return res.data;
  },

  /**
   * PATCH /alerts/triggered/:simId/:alertId/check
   */
  checkAlert: async (
    simId: string,
    alertId: string,
    checked: boolean,
  ): Promise<void> => {
    await apiClient.patch(`/alerts/triggered/${simId}/${alertId}/check`, {
      checked,
    });
  },
};
