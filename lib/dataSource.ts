import { promises as fs } from 'fs';
import path from 'path';
import type { DashboardData } from '../types/dashboard';
import { mockDashboardData } from '../data/mockData';
import { getAnthropicClient, isAnthropicApiConfigured } from './anthropic/client';
import { buildDashboardData } from './anthropic/mappers';

const resolvePath = (value: string) => (path.isAbsolute(value) ? value : path.join(process.cwd(), value));

// Cache for API responses (1 minute TTL)
let apiCache: { data: DashboardData; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

const loadFromAnthropicApi = async (): Promise<DashboardData | null> => {
  if (!isAnthropicApiConfigured()) return null;

  // Check cache
  if (apiCache && Date.now() - apiCache.timestamp < CACHE_TTL_MS) {
    return apiCache.data;
  }

  const client = getAnthropicClient();
  if (!client) return null;

  try {
    // Fetch data from Anthropic Admin API in parallel
    const [usageRecords, billing, apiKeys, members] = await Promise.all([
      client.getDailyUsage(30),
      client.getBillingInfo(),
      client.getApiKeys().catch(() => undefined),
      client.getOrganizationMembers().catch(() => undefined),
    ]);

    const data = buildDashboardData({
      usageRecords,
      billing,
      apiKeys,
      members,
    });

    // Update cache
    apiCache = { data, timestamp: Date.now() };

    return data;
  } catch (error) {
    console.error('Failed to load from Anthropic API:', error);
    return null;
  }
};

export const loadDashboardData = async (): Promise<DashboardData> => {
  // Priority 1: Anthropic Admin API
  const anthropicData = await loadFromAnthropicApi();
  if (anthropicData) {
    return anthropicData;
  }

  // Priority 2: Custom HTTP endpoint
  const dataUrl = process.env.DASHBOARD_DATA_URL;
  if (dataUrl) {
    const headers: HeadersInit = {};
    const token = process.env.DASHBOARD_DATA_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(dataUrl, { headers });
    if (!response.ok) {
      throw new Error(`Upstream data request failed with ${response.status}`);
    }
    return response.json() as Promise<DashboardData>;
  }

  // Priority 3: Local JSON file
  const dataPath = process.env.DASHBOARD_DATA_PATH;
  if (dataPath) {
    const resolved = resolvePath(dataPath);
    const raw = await fs.readFile(resolved, 'utf8');
    return JSON.parse(raw) as DashboardData;
  }

  // Fallback: Mock data
  return mockDashboardData;
};

export const getDataSourceInfo = (): { type: 'anthropic' | 'http' | 'file' | 'mock'; configured: boolean } => {
  if (isAnthropicApiConfigured()) {
    return { type: 'anthropic', configured: true };
  }
  if (process.env.DASHBOARD_DATA_URL) {
    return { type: 'http', configured: true };
  }
  if (process.env.DASHBOARD_DATA_PATH) {
    return { type: 'file', configured: true };
  }
  return { type: 'mock', configured: false };
};

export const clearApiCache = (): void => {
  apiCache = null;
};
