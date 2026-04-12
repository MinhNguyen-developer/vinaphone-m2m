import { useQuery } from '@tanstack/react-query';
import { masterSimsApi } from '../api/masterSims.api';
import { queryKeys } from './queryKeys';

export const useMasterSims = () =>
  useQuery({
    queryKey: queryKeys.masterSims.list(),
    queryFn: () => masterSimsApi.getList(),
    staleTime: 60_000,
    select: (res) => res.data,
  });

/**
 * Member SIMs for a given master SIM code.
 * Only enabled when `code` is non-empty.
 */
export const useMasterSimMembers = (code: string | null) =>
  useQuery({
    queryKey: queryKeys.masterSims.members(code ?? ''),
    queryFn: () => masterSimsApi.getMembers(code!),
    enabled: !!code,
    staleTime: 30_000,
    select: (res) => res.data,
  });
