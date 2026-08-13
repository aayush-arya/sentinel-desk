import { useQuery } from '@tanstack/react-query';
import type { AnalyticsOverview } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

export function useAnalyticsOverview(days = 30) {
  return useQuery({
    queryKey: ['analytics', 'overview', days],
    queryFn: async () => {
      const { data } = await apiClient.get<AnalyticsOverview>('/analytics/overview', { params: { days } });
      return data;
    },
  });
}
