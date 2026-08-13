import { useQuery } from '@tanstack/react-query';
import type { AuditLogEntry, PaginatedResult } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<AuditLogEntry>>('/audit-logs', { params: filters });
      return data;
    },
    placeholderData: (previous) => previous,
  });
}
