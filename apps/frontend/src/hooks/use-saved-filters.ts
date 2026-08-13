import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SavedFilter } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

const SAVED_FILTERS_KEY = ['saved-filters'] as const;

export function useSavedFilters() {
  return useQuery({
    queryKey: SAVED_FILTERS_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<SavedFilter[]>('/saved-filters');
      return data;
    },
  });
}

export function useCreateSavedFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; filters: Record<string, unknown> }) => {
      const { data } = await apiClient.post<SavedFilter>('/saved-filters', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAVED_FILTERS_KEY }),
  });
}

export function useDeleteSavedFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/saved-filters/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAVED_FILTERS_KEY }),
  });
}
