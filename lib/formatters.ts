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
