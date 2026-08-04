import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody } from '@sentinel-desk/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

apiClient.interceptors.request.use((config) => {
  if (config.method && MUTATING_METHODS.has(config.method)) {
    const csrfToken = readCookie('sd_csrf');
    if (csrfToken) config.headers.set('X-CSRF-Token', csrfToken);
  }
  return config;
});

let refreshPromise: Promise<unknown> | null = null;

// A logged-out redirect is a last resort, not the primary UX — pages should read
// auth state from the query cache first. This only fires when refresh itself fails.
function handleSessionExpired() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/login')) return;
  window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthEndpoint = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (error.response?.status !== 401 || !original || original._retried || isAuthEndpoint) {
      throw error;
    }
    original._retried = true;

    try {
      refreshPromise ??= apiClient.post('/auth/refresh').finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return apiClient(original);
    } catch (refreshError) {
      handleSessionExpired();
      throw refreshError;
    }
  },
);

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message[0] ?? fallback;
    if (typeof message === 'string') return message;
  }
  return fallback;
}
