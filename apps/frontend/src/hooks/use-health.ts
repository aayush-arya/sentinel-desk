import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface HealthCheckResult {
  status: 'ok' | 'error';
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string; message?: string }>;
  details?: Record<string, { status: string }>;
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data } = await apiClient.get<HealthCheckResult>('/health');
      return data;
    },
    refetchInterval: 60_000,
    retry: false,
  });
}
