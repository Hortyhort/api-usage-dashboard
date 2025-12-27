import type { DashboardData } from '../types/dashboard';

export const fetchDashboardData = async (signal?: AbortSignal): Promise<DashboardData> => {
  const response = await fetch('/api/usage', { signal });
  if (!response.ok) {
    throw new Error('Failed to load dashboard data');
  }
  return response.json();
};
