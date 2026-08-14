import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrganizationSummary } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';
import { CURRENT_USER_QUERY_KEY } from './use-current-user';

const ORG_KEY = ['organization'] as const;

export function useOrganization() {
  return useQuery({
    queryKey: ORG_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<OrganizationSummary>('/organization');
      return data;
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name?: string; logoUrl?: string; primaryColor?: string }) => {
      const { data } = await apiClient.patch<OrganizationSummary>('/organization', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_KEY });
      // user.organization is embedded in /users/me too - refresh it so the sidebar
      // logo/brand color pick up the change without a full reload.
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
