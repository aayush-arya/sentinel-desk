import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Macro } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

const MACROS_KEY = ['macros'] as const;

export function useMacros() {
  return useQuery({
    queryKey: MACROS_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<Macro[]>('/macros');
      return data;
    },
  });
}

export function useCreateMacro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; body: string }) => {
      const { data } = await apiClient.post<Macro>('/macros', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MACROS_KEY }),
  });
}

export function useDeleteMacro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/macros/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MACROS_KEY }),
  });
}
