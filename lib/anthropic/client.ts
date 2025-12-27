/**
 * Anthropic Admin API Client
 *
 * This module provides integration with the Anthropic Admin API
 * for fetching real usage data. The Admin API provides organization-level
 * usage metrics and billing information.
 *
 * Note: The Admin API may require enterprise access and specific API keys.
 * Contact Anthropic for access details.
 */

export type ApiConfig = {
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
};

export type UsageRecord = {
  date: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  requests: number;
};

export type BillingInfo = {
  currentPeriodStart: string;
  currentPeriodEnd: string;
  totalSpend: number;
  budgetLimit: number;
  daysRemaining: number;
};

export type ApiKeyInfo = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  status: 'active' | 'inactive' | 'revoked';
  usage: number;
};

export type OrganizationMember = {
  id: string;
  email: string;
  name: string;
  role: string;
  joinedAt: string;
  lastActiveAt: string | null;
};

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1/admin';

class AnthropicAdminClient {
  private apiKey: string;
  private baseUrl: string;
  private organizationId?: string;

  constructor(config: ApiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.organizationId = config.organizationId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
      'anthropic-version': '2024-01-01',
      ...(this.organizationId && { 'anthropic-organization': this.organizationId }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, error.error?.message ?? 'API request failed', error);
    }

    return response.json() as Promise<T>;
  }

  async getUsage(options: {
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'model' | 'api_key';
  }): Promise<UsageRecord[]> {
    const params = new URLSearchParams({
      start_date: options.startDate,
      end_date: options.endDate,
      ...(options.groupBy && { group_by: options.groupBy }),
    });

    const response = await this.request<{ data: RawUsageRecord[] }>(`/usage?${params}`);

    return response.data.map(mapUsageRecord);
  }

  async getDailyUsage(days = 30): Promise<UsageRecord[]> {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    return this.getUsage({ startDate, endDate, groupBy: 'day' });
  }

  async getBillingInfo(): Promise<BillingInfo> {
    const response = await this.request<RawBillingInfo>('/billing');

    return {
      currentPeriodStart: response.current_period_start,
      currentPeriodEnd: response.current_period_end,
      totalSpend: response.total_spend,
      budgetLimit: response.budget_limit,
      daysRemaining: calculateDaysRemaining(response.current_period_end),
    };
  }

  async getApiKeys(): Promise<ApiKeyInfo[]> {
    const response = await this.request<{ data: RawApiKey[] }>('/api-keys');

    return response.data.map(mapApiKey);
  }

  async getOrganizationMembers(): Promise<OrganizationMember[]> {
    const response = await this.request<{ data: RawOrgMember[] }>('/organization/members');

    return response.data.map(mapOrgMember);
  }

  async getModelUsageBreakdown(days = 30): Promise<Array<{ model: string; tokens: number; percentage: number }>> {
    const usage = await this.getUsage({
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      groupBy: 'model',
    });

    const modelTotals = usage.reduce((acc, record) => {
      const total = record.inputTokens + record.outputTokens;
      acc[record.model] = (acc[record.model] ?? 0) + total;
      return acc;
    }, {} as Record<string, number>);

    const grandTotal = Object.values(modelTotals).reduce((sum, val) => sum + val, 0) || 1;

    return Object.entries(modelTotals)
      .map(([model, tokens]) => ({
        model,
        tokens,
        percentage: (tokens / grandTotal) * 100,
      }))
      .sort((a, b) => b.tokens - a.tokens);
  }
}

// Error class
export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Raw API response types
type RawUsageRecord = {
  date: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  requests: number;
};

type RawBillingInfo = {
  current_period_start: string;
  current_period_end: string;
  total_spend: number;
  budget_limit: number;
};

type RawApiKey = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  status: 'active' | 'inactive' | 'revoked';
  usage: number;
};

type RawOrgMember = {
  id: string;
  email: string;
  name: string;
  role: string;
  joined_at: string;
  last_active_at: string | null;
};

// Mappers
const mapUsageRecord = (raw: RawUsageRecord): UsageRecord => ({
  date: raw.date,
  model: raw.model,
  inputTokens: raw.input_tokens,
  outputTokens: raw.output_tokens,
  cacheReadTokens: raw.cache_read_tokens ?? 0,
  cacheWriteTokens: raw.cache_write_tokens ?? 0,
  requests: raw.requests,
});

const mapApiKey = (raw: RawApiKey): ApiKeyInfo => ({
  id: raw.id,
  name: raw.name,
  prefix: raw.prefix,
  createdAt: raw.created_at,
  lastUsedAt: raw.last_used_at,
  status: raw.status,
  usage: raw.usage,
});

const mapOrgMember = (raw: RawOrgMember): OrganizationMember => ({
  id: raw.id,
  email: raw.email,
  name: raw.name,
  role: raw.role,
  joinedAt: raw.joined_at,
  lastActiveAt: raw.last_active_at,
});

const calculateDaysRemaining = (endDate: string): number => {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
};

// Factory function
let clientInstance: AnthropicAdminClient | null = null;

export const getAnthropicClient = (): AnthropicAdminClient | null => {
  const apiKey = process.env.ANTHROPIC_ADMIN_API_KEY;
  if (!apiKey) return null;

  if (!clientInstance) {
    clientInstance = new AnthropicAdminClient({
      apiKey,
      baseUrl: process.env.ANTHROPIC_ADMIN_API_URL,
      organizationId: process.env.ANTHROPIC_ORG_ID,
    });
  }

  return clientInstance;
};

export const isAnthropicApiConfigured = (): boolean => {
  return Boolean(process.env.ANTHROPIC_ADMIN_API_KEY);
};

export { AnthropicAdminClient };
