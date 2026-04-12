import type { MasterSimWithRemaining, PaginatedResponse, SimCard } from '../types';
import { apiClient } from './client';

export const masterSimsApi = {
  /**
   * GET /master-sims – list with remainingMB computed server-side
   */
  getList: async (): Promise<{ data: MasterSimWithRemaining[] }> => {
    const res = await apiClient.get<{ data: MasterSimWithRemaining[] }>('/master-sims');
    return res.data;
  },

  /**
   * GET /master-sims/:code/members – paginated member SIMs
   */
  getMembers: async (
    code: string,
    params?: { page?: number; pageSize?: number },
  ): Promise<PaginatedResponse<SimCard>> => {
    const res = await apiClient.get<PaginatedResponse<SimCard>>(
      `/master-sims/${code}/members`,
      { params },
    );
    return res.data;
  },
};
