import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserProfile } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';
import { CURRENT_USER_QUERY_KEY } from './use-current-user';

interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  title?: string;
  phone?: string;
  timezone?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data } = await apiClient.patch<UserProfile>('/users/me', payload);
      return data;
    },
    onSuccess: (data) => queryClient.setQueryData(CURRENT_USER_QUERY_KEY, data),
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<UserProfile>('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => queryClient.setQueryData(CURRENT_USER_QUERY_KEY, data),
  });
}
