import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrgMember, RoleName, UserStatus } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

const TEAM_QUERY_KEY = ['team'] as const;

export function useOrgMembers() {
  return useQuery({
    queryKey: TEAM_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<OrgMember[]>('/users');
      return data;
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      firstName: string;
      lastName: string;
      role: RoleName;
    }) => {
      const { data } = await apiClient.post('/users/invite', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY }),
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      role?: RoleName;
      status?: UserStatus;
    }) => {
      const { data } = await apiClient.patch(`/users/${id}`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY }),
  });
}
