import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CommentVisibility,
  PaginatedResult,
  TicketDetail,
  TicketHistoryEntry,
  TicketPriority,
  TicketStatus,
  TicketSummary,
} from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  assignee?: string;
  tagId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

const TICKETS_KEY = (filters: TicketFilters) => ['tickets', filters] as const;
export const TICKET_KEY = (id: string) => ['tickets', id] as const;
const TICKET_HISTORY_KEY = (id: string) => ['tickets', id, 'history'] as const;

// The backend's global ValidationPipe (forbidNonWhitelisted) rejects bracket-notation
// array keys, and Express 5's default query parser doesn't expand them anyway — so
// array filters must be sent as repeated bare keys (status=A&status=B), which axios's
// default array serialization does NOT produce. Build the query string ourselves.
function toTicketSearchParams(filters: TicketFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.append(key, String(value));
    }
  }
  return params;
}

export function useTickets(filters: TicketFilters) {
  return useQuery({
    queryKey: TICKETS_KEY(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<TicketSummary>>('/tickets', {
        params: toTicketSearchParams(filters),
      });
      return data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: TICKET_KEY(id ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<TicketDetail>(`/tickets/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useTicketHistory(id: string | undefined) {
  return useQuery({
    queryKey: TICKET_HISTORY_KEY(id ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<TicketHistoryEntry[]>(`/tickets/${id}/history`);
      return data;
    },
    enabled: !!id,
  });
}

function useInvalidateTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: TICKET_KEY(ticketId) });
    queryClient.invalidateQueries({ queryKey: TICKET_HISTORY_KEY(ticketId) });
    queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false });
  };
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      subject: string;
      body: string;
      priority?: TicketPriority;
      requesterId?: string;
      tagIds?: string[];
      files?: File[];
    }) => {
      const formData = new FormData();
      formData.append('subject', payload.subject);
      formData.append('body', payload.body);
      if (payload.priority) formData.append('priority', payload.priority);
      if (payload.requesterId) formData.append('requesterId', payload.requesterId);
      payload.tagIds?.forEach((id) => formData.append('tagIds[]', id));
      payload.files?.forEach((file) => formData.append('files', file));

      const { data } = await apiClient.post<TicketDetail>('/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false }),
  });
}

// Unlike useUpdateTicket, not scoped to one ticket id up front - the kanban board
// needs a single mutation instance it can fire with whichever ticket was just dropped.
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const { data } = await apiClient.patch<TicketDetail>(`/tickets/${ticketId}`, { status });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TICKET_KEY(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false });
    },
  });
}

export function useUpdateTicket(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: async (payload: { subject?: string; priority?: TicketPriority; status?: TicketStatus }) => {
      const { data } = await apiClient.patch<TicketDetail>(`/tickets/${ticketId}`, payload);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useReopenTicket(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<TicketDetail>(`/tickets/${ticketId}/reopen`);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useRateCsat(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: async (payload: { rating: number; comment?: string }) => {
      const { data } = await apiClient.post<TicketDetail>(`/tickets/${ticketId}/csat`, payload);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useAddComment(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: async (payload: { body: string; visibility?: CommentVisibility; files?: File[] }) => {
      const formData = new FormData();
      formData.append('body', payload.body);
      if (payload.visibility) formData.append('visibility', payload.visibility);
      payload.files?.forEach((file) => formData.append('files', file));

      const { data } = await apiClient.post<TicketDetail>(`/tickets/${ticketId}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useAssignTicket(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: async (assigneeId: string) => {
      const { data } = await apiClient.post<TicketDetail>(`/tickets/${ticketId}/assign`, { assigneeId });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useEscalateTicket(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: async (payload: { reason: string; newAssigneeId?: string; priority?: TicketPriority }) => {
      const { data } = await apiClient.post<TicketDetail>(`/tickets/${ticketId}/escalate`, payload);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useMergeTicket(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: async (intoTicketId: string) => {
      const { data } = await apiClient.post<TicketDetail>(`/tickets/${ticketId}/merge`, { intoTicketId });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useSplitTicket(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  return useMutation({
    mutationFn: async (payload: { subject: string; commentIds: string[] }) => {
      const { data } = await apiClient.post<TicketDetail>(`/tickets/${ticketId}/split`, payload);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useTicketTags(ticketId: string) {
  const invalidate = useInvalidateTicket(ticketId);
  const add = useMutation({
    mutationFn: async (tagId: string) => {
      const { data } = await apiClient.post<TicketDetail>(`/tickets/${ticketId}/tags/${tagId}`);
      return data;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (tagId: string) => {
      const { data } = await apiClient.delete<TicketDetail>(`/tickets/${ticketId}/tags/${tagId}`);
      return data;
    },
    onSuccess: invalidate,
  });
  return { add, remove };
}
