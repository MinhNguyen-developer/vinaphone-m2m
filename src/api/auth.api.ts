import type { LoginRequest, LoginResponse } from '../types';
import { apiClient } from './client';

export const authApi = {
  login: async (body: LoginRequest): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', body);
    return res.data;
  },
};
