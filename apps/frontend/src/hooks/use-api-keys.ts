import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiKeyCreated, ApiKeySummary } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

const API_KEYS_KEY = ['api-keys'] as const;

export function useApiKeys() {
  return useQuery({
    queryKey: API_KEYS_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<ApiKeySummary[]>('/api-keys');
      return data;
    },
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      const { data } = await apiClient.post<ApiKeyCreated>('/api-keys', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: API_KEYS_KEY }),
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api-keys/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: API_KEYS_KEY }),
  });
}
