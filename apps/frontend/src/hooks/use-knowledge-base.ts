import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { KnowledgeArticle, KnowledgeArticleStatus, PaginatedResult } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';

export interface ArticleFilters {
  search?: string;
  status?: KnowledgeArticleStatus;
  page?: number;
  pageSize?: number;
}

const ARTICLES_KEY = (filters: ArticleFilters) => ['knowledge-base', filters] as const;
export const ARTICLE_KEY = (id: string) => ['knowledge-base', id] as const;

export function useArticles(filters: ArticleFilters) {
  return useQuery({
    queryKey: ARTICLES_KEY(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<KnowledgeArticle>>('/knowledge-base', { params: filters });
      return data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useArticle(id: string | undefined) {
  return useQuery({
    queryKey: ARTICLE_KEY(id ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<KnowledgeArticle>(`/knowledge-base/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; body: string; status?: KnowledgeArticleStatus }) => {
      const { data } = await apiClient.post<KnowledgeArticle>('/knowledge-base', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge-base'], exact: false }),
  });
}

export function useUpdateArticle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title?: string; body?: string; status?: KnowledgeArticleStatus }) => {
      const { data } = await apiClient.patch<KnowledgeArticle>(`/knowledge-base/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARTICLE_KEY(id) });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'], exact: false });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/knowledge-base/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge-base'], exact: false }),
  });
}
