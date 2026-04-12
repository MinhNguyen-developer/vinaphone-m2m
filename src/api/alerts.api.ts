import type { AlertConfig, TriggeredAlertsResponse } from '../types';
import { apiClient } from './client';

export const alertsApi = {
  /**
   * GET /alerts – all alert configurations
   */
  getList: async (): Promise<{ data: AlertConfig[] }> => {
    const res = await apiClient.get<{ data: AlertConfig[] }>('/alerts');
    return res.data;
  },

  /**
   * GET /alerts/triggered – SIMs currently exceeding thresholds
   */
  getTriggered: async (params?: {
    productCode?: string;
  }): Promise<TriggeredAlertsResponse> => {
    const res = await apiClient.get<TriggeredAlertsResponse>('/alerts/triggered', {
      params,
    });
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
    await apiClient.patch(`/alerts/triggered/${simId}/${alertId}/check`, { checked });
  },
};
