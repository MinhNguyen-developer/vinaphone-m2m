import { useQuery } from '@tanstack/react-query';
import { groupsApi } from '../api/groups.api';
import { queryKeys } from './queryKeys';

export const useGroups = () =>
  useQuery({
    queryKey: queryKeys.groups.list(),
    queryFn: () => groupsApi.getList(),
    staleTime: 300_000, // groups change rarely
    select: (res) => res.data,
  });
