import { useQuery } from '@tanstack/react-query';
import type { UserProfile } from '@sentinel-desk/types';
import { apiClient, setCsrfToken } from '@/lib/api-client';

export const CURRENT_USER_QUERY_KEY = ['me'] as const;

async function fetchCurrentUser(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>('/users/me');
  setCsrfToken(data.csrfToken);
  return data;
}

export function useCurrentUser(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    enabled: options?.enabled ?? true,
  });
}
