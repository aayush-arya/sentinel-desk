import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Webhook, WebhookCreated } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

const WEBHOOKS_KEY = ['webhooks'] as const;

export function useWebhooks() {
  return useQuery({
    queryKey: WEBHOOKS_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<Webhook[]>('/webhooks');
      return data;
    },
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { url: string; events: string[] }) => {
      const { data } = await apiClient.post<WebhookCreated>('/webhooks', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WEBHOOKS_KEY }),
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/webhooks/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WEBHOOKS_KEY }),
  });
}
