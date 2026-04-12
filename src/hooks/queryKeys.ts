import type { SimListParams, UsageHistoryParams } from '../types';

export const queryKeys = {
  sims: {
    all: ['sims'] as const,
    list: (params?: SimListParams) => ['sims', 'list', params ?? {}] as const,
    usageHistory: (phoneNumber: string, params?: UsageHistoryParams) =>
      ['sims', phoneNumber, 'usage-history', params ?? {}] as const,
  },
  masterSims: {
    all: ['master-sims'] as const,
    list: () => ['master-sims', 'list'] as const,
    members: (code: string) => ['master-sims', code, 'members'] as const,
  },
  groups: {
    all: ['groups'] as const,
    list: () => ['groups', 'list'] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    list: () => ['alerts', 'list'] as const,
    triggered: (productCode?: string) =>
      ['alerts', 'triggered', productCode ?? ''] as const,
  },
} as const;
