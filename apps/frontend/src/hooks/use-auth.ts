import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginResponse } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';
import { CURRENT_USER_QUERY_KEY } from './use-current-user';

interface MessageResponse {
  message: string;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; password: string; rememberMe?: boolean }) => {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
      return data;
    },
    onSuccess: () => {
      // Login response shape (AuthUser) is a subset of the full profile (UserProfile),
      // so we invalidate and let /users/me refetch rather than seed the cache with it.
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: async (payload: {
      organizationName: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) => {
      const { data } = await apiClient.post<MessageResponse>('/auth/signup', payload);
      return data;
    },
  });
}

export function useSignupCustomer() {
  return useMutation({
    mutationFn: async (payload: {
      organizationSlug: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) => {
      const { data } = await apiClient.post<MessageResponse>('/auth/signup-customer', payload);
      return data;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, undefined);
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (payload: { email: string }) => {
      const { data } = await apiClient.post<MessageResponse>('/auth/forgot-password', payload);
      return data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: { token: string; password: string }) => {
      const { data } = await apiClient.post<MessageResponse>('/auth/reset-password', payload);
      return data;
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async (payload: { email: string }) => {
      const { data } = await apiClient.post<MessageResponse>('/auth/resend-verification', payload);
      return data;
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data } = await apiClient.get<MessageResponse>('/auth/verify-email', { params: { token } });
      return data;
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { token: string; password: string }) => {
      const { data } = await apiClient.post<LoginResponse>('/auth/accept-invite', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
