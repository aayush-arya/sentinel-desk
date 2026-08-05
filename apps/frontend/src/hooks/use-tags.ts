import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TicketTagSummary } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

const TAGS_KEY = ['tags'] as const;

export function useTags() {
  return useQuery({
    queryKey: TAGS_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<TicketTagSummary[]>('/tags');
      return data;
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string }) => {
      const { data } = await apiClient.post<TicketTagSummary>('/tags', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TAGS_KEY }),
  });
}
