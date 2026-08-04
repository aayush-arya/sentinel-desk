import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionSummary } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

const SESSIONS_QUERY_KEY = ['sessions'] as const;

export function useSessions() {
  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<SessionSummary[]>('/auth/sessions');
      return data;
    },
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await apiClient.delete(`/auth/sessions/${sessionId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }),
  });
}

export function useLogoutAllOthers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ revokedCount: number }>('/auth/logout-all-others');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }),
  });
}
