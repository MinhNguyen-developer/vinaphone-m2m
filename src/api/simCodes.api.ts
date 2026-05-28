import type { PaginatedResponse } from "../types";
import { apiClient } from "./client";

export interface SimCodeItem {
  id: string;
  code: string;
  description?: string | null;
  createdAt?: string;
  _count?: { sims: number };
}

export interface SimCodeFormValues {
  code: string;
  description?: string;
}

export interface SimCodeSimItem {
  id: string;
  phoneNumber: string;
  usedMB: number;
  status: number;
  firstUsedAt?: string | null;
  ratingPlanName?: string | null;
}

export const simCodesApi = {
  getList: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResponse<SimCodeItem>> => {
    const res = await apiClient.get<PaginatedResponse<SimCodeItem>>(
      "/sim-codes",
      { params },
    );
    return res.data;
  },

  getOne: async (id: string): Promise<SimCodeItem> => {
    const res = await apiClient.get<SimCodeItem>(`/sim-codes/${id}`);
    return res.data;
  },

  create: async (
    dto: SimCodeFormValues & { simIds?: string[] },
  ): Promise<SimCodeItem> => {
    const res = await apiClient.post<SimCodeItem>("/sim-codes", dto);
    return res.data;
  },

  update: async (
    id: string,
    dto: SimCodeFormValues & { simIds?: string[] },
  ): Promise<SimCodeItem> => {
    const res = await apiClient.patch<SimCodeItem>(`/sim-codes/${id}`, dto);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/sim-codes/${id}`);
  },

  getSimIds: async (id: string): Promise<string[]> => {
    const res = await apiClient.get<{ data: string[] }>(
      `/sim-codes/${id}/sims`,
    );
    return res.data.data;
  },

  getSimsDetail: async (
    id: string,
    params?: { page?: number; pageSize?: number; sort?: string },
  ): Promise<PaginatedResponse<SimCodeSimItem>> => {
    const res = await apiClient.get<PaginatedResponse<SimCodeSimItem>>(
      `/sim-codes/${id}/sims-detail`,
      { params },
    );
    return res.data;
  },
};
