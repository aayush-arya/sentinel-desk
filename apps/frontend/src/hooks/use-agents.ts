import { useQuery } from '@tanstack/react-query';
import type { RoleName } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

export interface AssignableAgent {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: RoleName;
}

export function useAssignableAgents() {
  return useQuery({
    queryKey: ['assignable-agents'],
    queryFn: async () => {
      const { data } = await apiClient.get<AssignableAgent[]>('/users/assignable');
      return data;
    },
  });
}
