import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BusinessHoursSchedule,
  PaginatedResult,
  SlaDashboardSummary,
  SlaPolicy,
  SlaViolationTicket,
} from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

export function useSlaDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['sla', 'dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<SlaDashboardSummary>('/sla/dashboard');
      return data;
    },
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useSlaViolations(kind: 'response' | 'resolution' | 'both' = 'both') {
  return useQuery({
    queryKey: ['sla', 'violations', kind],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<SlaViolationTicket>>('/sla/violations', {
        params: { kind },
      });
      return data;
    },
  });
}

export function useBusinessHoursSchedules() {
  return useQuery({
    queryKey: ['sla', 'business-hours'],
    queryFn: async () => {
      const { data } = await apiClient.get<BusinessHoursSchedule[]>('/sla/business-hours');
      return data;
    },
  });
}

export function useSlaPolicies() {
  return useQuery({
    queryKey: ['sla', 'policies'],
    queryFn: async () => {
      const { data } = await apiClient.get<SlaPolicy[]>('/sla/policies');
      return data;
    },
  });
}

export function useCreateSlaPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      businessHoursScheduleId: string;
      isDefault?: boolean;
      autoEscalateAtPercent?: number;
      rules: { priority: string; responseTargetMinutes: number; resolutionTargetMinutes: number }[];
    }) => {
      const { data } = await apiClient.post<SlaPolicy>('/sla/policies', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sla', 'policies'] }),
  });
}

export function useUpdateSlaPolicy(policyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      autoEscalateAtPercent?: number;
      rules?: { priority: string; responseTargetMinutes: number; resolutionTargetMinutes: number }[];
    }) => {
      const { data } = await apiClient.patch<SlaPolicy>(`/sla/policies/${policyId}`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sla', 'policies'] }),
  });
}
