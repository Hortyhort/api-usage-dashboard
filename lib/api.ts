import type { DashboardData } from '../types/dashboard';

type FetchOptions = {
  shareToken?: string | null;
  sharePassword?: string | null;
};

export const fetchDashboardData = async (signal?: AbortSignal, options?: FetchOptions): Promise<DashboardData> => {
  const shareToken = options?.shareToken;
  const sharePassword = options?.sharePassword;
  const path = shareToken ? `/api/usage?share=${encodeURIComponent(shareToken)}` : '/api/usage';
  const headers: HeadersInit = {};
  if (sharePassword) {
    headers['x-share-password'] = sharePassword;
  }

  const response = await fetch(path, { signal, headers });
  if (!response.ok) {
    let errorCode = 'request_failed';
    try {
      const payload = await response.json() as { error?: string } | null;
      if (payload?.error) errorCode = payload.error;
    } catch (error) {
      errorCode = 'request_failed';
    }
    const error = new Error('Failed to load dashboard data') as Error & { code?: string };
    error.code = errorCode;
    throw error;
  }
  return response.json();
};
