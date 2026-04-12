import type { GroupWithCount } from '../types';
import { apiClient } from './client';

export const groupsApi = {
  /**
   * GET /groups – list with simCount
   */
  getList: async (): Promise<{ data: GroupWithCount[] }> => {
    const res = await apiClient.get<{ data: GroupWithCount[] }>('/groups');
    return res.data;
  },
};
