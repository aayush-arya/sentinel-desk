import { useMutation } from '@tanstack/react-query';
import type { AiDuplicatesResponse, AiSuggestReplyResponse, AiSummaryResponse } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

export function useTicketSummary(ticketId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<AiSummaryResponse>(`/tickets/${ticketId}/ai/summary`);
      return data;
    },
  });
}

export function useSuggestReply(ticketId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<AiSuggestReplyResponse>(`/tickets/${ticketId}/ai/suggest-reply`);
      return data;
    },
  });
}

export function useDuplicateCandidates(ticketId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<AiDuplicatesResponse>(`/tickets/${ticketId}/ai/duplicates`);
      return data;
    },
  });
}
