/**
 * Maps Anthropic Admin API data to the dashboard's internal types
 */

import type { DashboardData, UsageData, DailyUsage, ModelBreakdown, ApiKey, TeamMember, Alert, Pricing } from '../../types/dashboard';
import type { UsageRecord, BillingInfo, ApiKeyInfo, OrganizationMember } from './client';

// Pricing per 1M tokens (update as needed)
const MODEL_PRICING: Record<string, Pricing> = {
  'claude-opus-4-5-20251101': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4-5-20251101': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4-5-20251101': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  'claude-3-opus-20240229': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-3-sonnet-20240229': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25, cacheRead: 0.025, cacheWrite: 0.3125 },
  default: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
};

const MODEL_COLORS: Record<string, ModelBreakdown['color']> = {
  'Claude Opus 4.5': 'violet',
  'Claude Sonnet 4.5': 'blue',
  'Claude Haiku 4.5': 'emerald',
  'Claude Opus 3': 'violet',
  'Claude Sonnet 3': 'blue',
  'Claude Haiku 3': 'emerald',
};

const getModelDisplayName = (modelId: string): string => {
  const displayNames: Record<string, string> = {
    'claude-opus-4-5-20251101': 'Claude Opus 4.5',
    'claude-sonnet-4-5-20251101': 'Claude Sonnet 4.5',
    'claude-haiku-4-5-20251101': 'Claude Haiku 4.5',
    'claude-3-opus-20240229': 'Claude Opus 3',
    'claude-3-sonnet-20240229': 'Claude Sonnet 3',
    'claude-3-haiku-20240307': 'Claude Haiku 3',
  };

  return displayNames[modelId] ?? modelId;
};

const getModelColor = (model: string): ModelBreakdown['color'] => {
  return MODEL_COLORS[model] ?? 'blue';
};

const formatDateLabel = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const mapUsageRecordsToDailyUsage = (records: UsageRecord[]): DailyUsage[] => {
  // Group by date
  const byDate = records.reduce((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = { input: 0, output: 0, requests: 0 };
    }
    acc[record.date].input += record.inputTokens;
    acc[record.date].output += record.outputTokens;
    acc[record.date].requests += record.requests;
    return acc;
  }, {} as Record<string, { input: number; output: number; requests: number }>);

  return Object.entries(byDate)
    .map(([date, data]) => ({
      date,
      label: formatDateLabel(date),
      input: data.input,
      output: data.output,
      requests: data.requests,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const mapUsageRecordsToModelBreakdown = (records: UsageRecord[]): ModelBreakdown[] => {
  const byModel = records.reduce((acc, record) => {
    const displayName = getModelDisplayName(record.model);
    if (!acc[displayName]) {
      acc[displayName] = 0;
    }
    acc[displayName] += record.inputTokens + record.outputTokens;
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = Object.values(byModel).reduce((sum, val) => sum + val, 0) || 1;

  return Object.entries(byModel)
    .map(([model, tokens]) => ({
      model,
      tokens,
      percentage: (tokens / grandTotal) * 100,
      color: getModelColor(model),
    }))
    .sort((a, b) => b.tokens - a.tokens);
};

export const mapUsageRecordsToCurrentPeriod = (records: UsageRecord[]): UsageData['currentPeriod'] => {
  return records.reduce(
    (acc, record) => ({
      inputTokens: acc.inputTokens + record.inputTokens,
      outputTokens: acc.outputTokens + record.outputTokens,
      cacheReadTokens: acc.cacheReadTokens + record.cacheReadTokens,
      cacheWriteTokens: acc.cacheWriteTokens + record.cacheWriteTokens,
      requestCount: acc.requestCount + record.requests,
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      requestCount: 0,
    }
  );
};

export const mapBillingInfoToBillingCycle = (
  billing: BillingInfo
): UsageData['billingCycle'] => ({
  start: billing.currentPeriodStart,
  end: billing.currentPeriodEnd,
  budgetLimit: billing.budgetLimit,
  daysRemaining: billing.daysRemaining,
});

export const mapApiKeysToInternal = (apiKeys: ApiKeyInfo[]): ApiKey[] => {
  return apiKeys.map((key, index) => ({
    id: index + 1,
    name: key.name,
    key: `${key.prefix}...`,
    created: new Date(key.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    lastUsed: key.lastUsedAt
      ? new Date(key.lastUsedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Never',
    status: key.status === 'active' ? 'active' : 'inactive',
    usage: key.usage,
  }));
};

export const mapOrganizationMembersToTeam = (members: OrganizationMember[]): TeamMember[] => {
  return members.map((member, index) => ({
    id: index + 1,
    name: member.name || member.email.split('@')[0],
    email: member.email,
    role: mapRole(member.role),
    usage: 0, // Would need separate API call for per-user usage
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.email)}&background=DA7756&color=fff`,
  }));
};

const mapRole = (apiRole: string): TeamMember['role'] => {
  const roleMap: Record<string, TeamMember['role']> = {
    owner: 'Owner',
    admin: 'Admin',
    developer: 'Developer',
  };
  return roleMap[apiRole.toLowerCase()] ?? 'Developer';
};

export const generateAlertsFromUsage = (
  billing: BillingInfo,
  dailyUsage: DailyUsage[]
): Alert[] => {
  const alerts: Alert[] = [];
  let alertId = 1;

  // Budget alerts
  const budgetUsedPercent = (billing.totalSpend / billing.budgetLimit) * 100;

  if (budgetUsedPercent >= 90) {
    alerts.push({
      id: alertId++,
      type: 'error',
      title: 'Critical: Budget nearly exhausted',
      message: `You have used ${budgetUsedPercent.toFixed(1)}% of your budget limit.`,
      time: 'Just now',
      read: false,
    });
  } else if (budgetUsedPercent >= 75) {
    alerts.push({
      id: alertId++,
      type: 'warning',
      title: 'Budget warning',
      message: `You have used ${budgetUsedPercent.toFixed(1)}% of your budget.`,
      time: '1 hour ago',
      read: false,
    });
  }

  // Usage spike detection
  if (dailyUsage.length >= 2) {
    const recent = dailyUsage[dailyUsage.length - 1];
    const previous = dailyUsage[dailyUsage.length - 2];
    const recentTotal = recent.input + recent.output;
    const previousTotal = previous.input + previous.output;

    if (previousTotal > 0) {
      const spikePercent = ((recentTotal - previousTotal) / previousTotal) * 100;
      if (spikePercent > 50) {
        alerts.push({
          id: alertId++,
          type: 'warning',
          title: 'Usage spike detected',
          message: `Token usage increased by ${spikePercent.toFixed(0)}% compared to the previous day.`,
          time: '2 hours ago',
          read: false,
        });
      }
    }
  }

  // Days remaining alert
  if (billing.daysRemaining <= 3 && billing.daysRemaining > 0) {
    alerts.push({
      id: alertId++,
      type: 'info',
      title: 'Billing cycle ending soon',
      message: `Your billing cycle ends in ${billing.daysRemaining} day${billing.daysRemaining === 1 ? '' : 's'}.`,
      time: '3 hours ago',
      read: true,
    });
  }

  return alerts;
};

// Build complete dashboard data from API responses
export const buildDashboardData = (data: {
  usageRecords: UsageRecord[];
  billing: BillingInfo;
  apiKeys?: ApiKeyInfo[];
  members?: OrganizationMember[];
}): DashboardData => {
  const dailyUsage = mapUsageRecordsToDailyUsage(data.usageRecords);
  const modelBreakdown = mapUsageRecordsToModelBreakdown(data.usageRecords);
  const currentPeriod = mapUsageRecordsToCurrentPeriod(data.usageRecords);
  const billingCycle = mapBillingInfoToBillingCycle(data.billing);

  // Calculate pricing based on predominant model (simplified)
  const pricing = MODEL_PRICING['claude-sonnet-4-5-20251101'];

  const usage: UsageData = {
    currentPeriod,
    dailyUsage,
    modelBreakdown,
    billingCycle,
    pricing,
  };

  return {
    usage,
    apiKeys: data.apiKeys ? mapApiKeysToInternal(data.apiKeys) : [],
    alerts: generateAlertsFromUsage(data.billing, dailyUsage),
    usageLogs: [], // Would need separate API for individual request logs
    teamMembers: data.members ? mapOrganizationMembersToTeam(data.members) : [],
    user: {
      name: 'Dashboard User',
      email: 'user@example.com',
      initials: 'DU',
      plan: 'API',
    },
  };
};
