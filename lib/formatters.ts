import type { UsageData } from '../types/dashboard';

export const formatNumber = (num: number) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toLocaleString();
};

export const formatCurrency = (num: number) => `$${num.toFixed(2)}`;

export const calculateCost = (data: UsageData) => {
  const { currentPeriod: p, pricing: pr } = data;
  return (p.inputTokens / 1e6) * pr.input +
    (p.outputTokens / 1e6) * pr.output +
    (p.cacheReadTokens / 1e6) * pr.cacheRead +
    (p.cacheWriteTokens / 1e6) * pr.cacheWrite;
};

export const calculateSavings = (data: UsageData) => {
  const { currentPeriod: p, pricing: pr } = data;
  return (p.cacheReadTokens / 1e6) * pr.input - (p.cacheReadTokens / 1e6) * pr.cacheRead;
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getLatestUsageDate = (data: UsageData) => data.dailyUsage[data.dailyUsage.length - 1]?.date ?? '';

export const formatModelName = (model: string) => model.split('-').slice(1).join(' ');

export const formatRelativeTime = (timestamp: number | null) => {
  if (!timestamp) return 'Not synced yet';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 10) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
