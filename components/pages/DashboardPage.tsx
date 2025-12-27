import { useEffect, useMemo, useRef, useState } from 'react';
import type { UsageData, UsageLog } from '../../types/dashboard';
import { Icons } from '../icons';
import StatCard from '../ui/StatCard';
import ProgressBar from '../ui/ProgressBar';
import BarChart from '../charts/BarChart';
import LineChart from '../charts/LineChart';
import ModelBreakdown from '../dashboard/ModelBreakdown';
import CopyableValue from '../ui/CopyableValue';
import Tooltip from '../ui/Tooltip';
import { useToast } from '../ui/ToastProvider';
import { formatCurrency, formatNumber, formatRelativeTime } from '../../lib/formatters';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
] as const;

const SHARE_EXPIRY_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '24', label: '24 hours' },
  { value: '168', label: '7 days' },
] as const;

const MODEL_COLORS: Record<string, string> = {
  'Claude Sonnet 4.5': '#DA7756',
  'Claude Opus 4.5': '#C75B39',
  'Claude Haiku 4.5': '#E8A088',
};

const getTrend = (values: number[]) => {
  if (values.length < 2) return undefined;
  const previous = values[values.length - 2];
  if (previous === 0) return undefined;
  const current = values[values.length - 1];
  return Math.round(((current - previous) / previous) * 100);
};

const DashboardPage = ({
  data,
  totalCost,
  savings,
  budgetUsed,
  isClient,
  dataStatus,
  onRefresh,
  lastUpdatedAt,
  usageLogs,
  readOnly = false,
}: {
  data: UsageData;
  totalCost: number;
  savings: number;
  budgetUsed: number;
  isClient: boolean;
  dataStatus: 'idle' | 'loading' | 'error';
  onRefresh: () => void;
  lastUpdatedAt: number | null;
  usageLogs: UsageLog[];
  readOnly?: boolean;
}) => {
  const [chartMode, setChartMode] = useState<'sideBySide' | 'stacked'>('sideBySide');
  const [timeRange, setTimeRange] = useState<(typeof RANGE_OPTIONS)[number]['value']>('7d');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [isLive, setIsLive] = useState(true);
  const [liveTokens, setLiveTokens] = useState(data.currentPeriod.inputTokens + data.currentPeriod.outputTokens);
  const [growthRate, setGrowthRate] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareExpiry, setShareExpiry] = useState('24');
  const [sharePassword, setSharePassword] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [, setTimeTick] = useState(0);
  const shareRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isClient || !isLive) return;
    const interval = setInterval(() => {
      setLiveTokens((prev) => prev + Math.floor(Math.random() * 1000) + 100);
    }, 3000);
    return () => clearInterval(interval);
  }, [isClient, isLive]);

  useEffect(() => {
    if (!isLive) {
      setLiveTokens(data.currentPeriod.inputTokens + data.currentPeriod.outputTokens);
    }
  }, [data.currentPeriod.inputTokens, data.currentPeriod.outputTokens, isLive]);

  useEffect(() => {
    if (!isClient || !lastUpdatedAt) return;
    const interval = setInterval(() => {
      setTimeTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [isClient, lastUpdatedAt]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShareOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const sortedDailyUsage = useMemo(() => (
    [...data.dailyUsage].sort((a, b) => a.date.localeCompare(b.date))
  ), [data.dailyUsage]);

  const filteredDailyUsage = useMemo(() => {
    if (timeRange === 'all') return sortedDailyUsage;
    if (timeRange === '7d') return sortedDailyUsage.slice(-7);
    if (timeRange === '30d') return sortedDailyUsage.slice(-30);
    if (timeRange === 'custom') {
      if (!customRange.start || !customRange.end) return sortedDailyUsage;
      if (customRange.start > customRange.end) return sortedDailyUsage;
      return sortedDailyUsage.filter((day) => day.date >= customRange.start && day.date <= customRange.end);
    }
    return sortedDailyUsage;
  }, [sortedDailyUsage, timeRange, customRange]);

  const rangeLabel = useMemo(() => {
    if (timeRange === 'custom') {
      if (customRange.start && customRange.end) {
        return `${customRange.start} - ${customRange.end}`;
      }
      return 'Custom range';
    }
    const match = RANGE_OPTIONS.find((option) => option.value === timeRange);
    return match ? match.label : 'Custom range';
  }, [timeRange, customRange]);

  const rangeTotals = useMemo(() => {
    const totals = filteredDailyUsage.reduce((acc, day) => {
      acc.input += day.input;
      acc.output += day.output;
      acc.requests += day.requests;
      return acc;
    }, { input: 0, output: 0, requests: 0 });
    const cost = (totals.input / 1e6) * data.pricing.input + (totals.output / 1e6) * data.pricing.output;
    return {
      input: totals.input,
      output: totals.output,
      requests: totals.requests,
      totalTokens: totals.input + totals.output,
      cost,
      days: filteredDailyUsage.length,
    };
  }, [filteredDailyUsage, data.pricing]);

  const dailyCosts = useMemo(() => (
    filteredDailyUsage.map((day) => (day.input / 1e6) * data.pricing.input + (day.output / 1e6) * data.pricing.output)
  ), [filteredDailyUsage, data.pricing]);

  const fullDailyCosts = useMemo(() => (
    data.dailyUsage.map((day) => (day.input / 1e6) * data.pricing.input + (day.output / 1e6) * data.pricing.output)
  ), [data.dailyUsage, data.pricing]);

  const rangeDailyAvgCost = rangeTotals.days > 0 ? rangeTotals.cost / rangeTotals.days : 0;
  const fullDailyAvgCost = fullDailyCosts.length > 0
    ? fullDailyCosts.reduce((sum, value) => sum + value, 0) / fullDailyCosts.length
    : 0;
  const projectionMultiplier = 1 + growthRate / 100;
  const projectedMonthEnd = rangeDailyAvgCost * 31 * projectionMultiplier;
  const daysUntilBudget = fullDailyAvgCost > 0 && budgetUsed < 100
    ? Math.floor((data.billingCycle.budgetLimit - totalCost) / fullDailyAvgCost)
    : null;

  const latestUsageDate = filteredDailyUsage[filteredDailyUsage.length - 1]?.date ?? '';
  const lastUpdatedLabel = formatRelativeTime(lastUpdatedAt);
  const lastUpdatedFull = lastUpdatedAt && isClient ? new Date(lastUpdatedAt).toLocaleString() : 'Not synced yet';
  const cacheHitRate = data.currentPeriod.inputTokens > 0
    ? (data.currentPeriod.cacheReadTokens / data.currentPeriod.inputTokens) * 100
    : 0;

  const tokensSparkline = filteredDailyUsage.map((day) => day.input + day.output);
  const requestsSparkline = filteredDailyUsage.map((day) => day.requests);
  const costSparkline = dailyCosts;

  const tokensTrend = getTrend(tokensSparkline);
  const requestsTrend = getTrend(requestsSparkline);
  const costTrend = getTrend(costSparkline);

  const modelTotals = data.modelBreakdown.reduce((sum, model) => sum + model.tokens, 0) || 1;
  const selectedModelShare = selectedModel
    ? (data.modelBreakdown.find((model) => model.model === selectedModel)?.tokens ?? 0) / modelTotals
    : null;
  const selectedModelColor = selectedModel ? (MODEL_COLORS[selectedModel] ?? '#94a3b8') : '#94a3b8';
  const overlaySeries = selectedModelShare
    ? {
        label: `${selectedModel} trend`,
        values: filteredDailyUsage.map((day) => (day.input + day.output) * selectedModelShare),
        color: selectedModelColor,
      }
    : undefined;

  const requestTokens = useMemo(() => (
    usageLogs.map((log) => log.inputTokens + log.outputTokens)
  ), [usageLogs]);
  const avgTokensPerRequest = requestTokens.length > 0
    ? requestTokens.reduce((sum, value) => sum + value, 0) / requestTokens.length
    : 0;
  const medianTokensPerRequest = requestTokens.length > 0
    ? [...requestTokens].sort((a, b) => a - b)[Math.floor(requestTokens.length / 2)]
    : 0;
  const p95Latency = usageLogs.length > 0
    ? [...usageLogs].map((log) => log.latency).sort((a, b) => a - b)[Math.max(0, Math.ceil(usageLogs.length * 0.95) - 1)]
    : 0;
  const errorRate = usageLogs.length > 0
    ? (usageLogs.filter((log) => log.status === 'error').length / usageLogs.length) * 100
    : 0;

  const handleShare = async () => {
    if (!isClient) {
      addToast({
        title: 'Share unavailable',
        description: 'Share links can only be created in the browser.',
        variant: 'warning',
      });
      return;
    }
    setShareLoading(true);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresInHours: Number(shareExpiry),
          password: sharePassword || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create share link');
      }
      const payload = await response.json() as { url: string };
      setShareLink(payload.url);
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(payload.url);
        addToast({
          title: 'Share link copied',
          description: 'Link is ready to send to your team.',
          variant: 'success',
        });
      } else {
        addToast({
          title: 'Share link ready',
          description: 'Copy the link from the field below.',
          variant: 'info',
        });
      }
    } catch (error) {
      addToast({
        title: 'Share failed',
        description: 'Unable to generate a share link. Try again.',
        variant: 'error',
      });
    } finally {
      setShareLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (!isClient) {
      addToast({
        title: 'Export unavailable',
        description: 'Exports are available in the browser only.',
        variant: 'warning',
      });
      return;
    }

    const exportDate = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const payload = {
        exportedAt: new Date().toISOString(),
        range: rangeLabel,
        usage: data,
        usageLogs,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `usage-dashboard-${exportDate}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      addToast({
        title: 'Export ready',
        description: 'JSON download has started.',
        variant: 'success',
      });
    }

    if (format === 'csv') {
      const headers = ['Date', 'Input Tokens', 'Output Tokens', 'Requests', 'Estimated Cost'];
      const rows = filteredDailyUsage.map((day, index) => [
        day.date,
        day.input,
        day.output,
        day.requests,
        dailyCosts[index]?.toFixed(2) ?? '0.00',
      ]);
      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `usage-summary-${exportDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      addToast({
        title: 'Export ready',
        description: 'CSV download has started.',
        variant: 'success',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-claude-text dark:text-claude-dark-text">Dashboard</h1>
          <p className="text-claude-text-muted dark:text-claude-dark-text-muted text-sm mt-1.5 font-medium">Monitor your Claude API consumption</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {readOnly && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-claude-beige dark:bg-claude-dark-surface-hover text-xs text-claude-text-muted dark:text-claude-dark-text-muted dark:text-claude-dark-text-muted font-medium">
              <Icons.Info />
              Read-only share
            </div>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isLive ? 'bg-claude-terracotta/10 text-claude-terracotta' : 'bg-claude-beige-dark dark:bg-claude-dark-surface-hover text-claude-text-muted dark:text-claude-dark-text-muted'}`}>
            <div className={`${isLive ? 'animate-pulse' : ''}`}><Icons.Live /></div>
            <span className="text-xs font-medium">{isLive ? 'Live' : 'Paused'}</span>
            <button type="button" onClick={() => setIsLive(!isLive)} className="ml-1 hover:text-claude-text transition-colors" aria-label={isLive ? 'Pause live mode' : 'Resume live mode'}>
              {isLive ? <Icons.X /> : <Icons.Refresh />}
            </button>
          </div>
          {dataStatus === 'loading' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-claude-terracotta/10 text-claude-terracotta text-xs font-medium">
              <Icons.Refresh />
              <span className="animate-pulse">Syncing</span>
            </div>
          )}
          {dataStatus === 'error' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-claude-terracotta-dark/10 text-claude-terracotta-dark text-xs font-medium">
              Offline
            </div>
          )}
          <Tooltip label={`Synced at ${lastUpdatedFull}`}>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-claude-beige text-xs text-claude-text-muted dark:text-claude-dark-text-muted font-medium">
              <Icons.Refresh />
              Updated {lastUpdatedLabel}
            </span>
          </Tooltip>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as (typeof RANGE_OPTIONS)[number]['value'])} className="bg-white border border-claude-border text-claude-text px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-claude-terracotta/50 transition-all duration-200 cursor-pointer hover:bg-claude-beige">
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-white">{option.label}</option>
            ))}
          </select>
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customRange.start}
                onChange={(event) => setCustomRange((prev) => ({ ...prev, start: event.target.value }))}
                min={sortedDailyUsage[0]?.date}
                max={sortedDailyUsage[sortedDailyUsage.length - 1]?.date}
                className="bg-claude-beige text-claude-text px-3 py-2 rounded-lg text-xs border border-claude-border focus:outline-none focus:ring-2 focus:ring-claude-terracotta/40"
              />
              <span className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">to</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(event) => setCustomRange((prev) => ({ ...prev, end: event.target.value }))}
                min={sortedDailyUsage[0]?.date}
                max={sortedDailyUsage[sortedDailyUsage.length - 1]?.date}
                className="bg-claude-beige text-claude-text px-3 py-2 rounded-lg text-xs border border-claude-border focus:outline-none focus:ring-2 focus:ring-claude-terracotta/40"
              />
            </div>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={dataStatus === 'loading'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${dataStatus === 'loading' ? 'bg-claude-beige-dark text-claude-text-muted cursor-not-allowed' : 'bg-white border border-claude-border hover:bg-claude-beige text-claude-text'}`}
          >
            <Icons.Refresh />
            Refresh
          </button>
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((open) => !open)}
              className="flex items-center gap-2 bg-claude-terracotta hover:bg-claude-terracotta-dark active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-claude-terracotta/25"
            >
              <Icons.Download />
              Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-claude-border rounded-xl p-2 shadow-claude-lg z-30">
                <button
                  type="button"
                  onClick={() => { handleExport('csv'); setExportOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-claude-text hover:bg-claude-beige dark:hover:bg-claude-dark-surface-hover transition-colors"
                >
                  <Icons.Download />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => { handleExport('json'); setExportOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-claude-text hover:bg-claude-beige dark:hover:bg-claude-dark-surface-hover transition-colors"
                >
                  <Icons.Copy />
                  Export JSON
                </button>
              </div>
            )}
          </div>
          {!readOnly && (
            <div className="relative" ref={shareRef}>
              <button
                type="button"
                onClick={() => setShareOpen((open) => !open)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-claude-border hover:bg-claude-beige text-claude-text transition-all duration-200"
              >
                <Icons.Copy />
                Share
              </button>
              {shareOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-claude-border rounded-xl p-4 shadow-claude-lg z-30">
                  <div className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted uppercase tracking-wider">Share read-only link</div>
                  <div className="mt-3 space-y-3">
                    <label className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">Expiration</label>
                    <select
                      value={shareExpiry}
                      onChange={(event) => setShareExpiry(event.target.value)}
                      className="w-full bg-claude-beige text-claude-text px-3 py-2 rounded-lg text-sm border border-claude-border focus:outline-none focus:ring-2 focus:ring-claude-terracotta/40"
                    >
                      {SHARE_EXPIRY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-white">{option.label}</option>
                      ))}
                    </select>
                    <label className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">Password (optional)</label>
                    <input
                      type="password"
                      value={sharePassword}
                      onChange={(event) => setSharePassword(event.target.value)}
                      placeholder="Add a passcode"
                      className="w-full bg-claude-beige text-claude-text px-3 py-2 rounded-lg text-sm border border-claude-border focus:outline-none focus:ring-2 focus:ring-claude-terracotta/40"
                    />
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={shareLoading}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${shareLoading ? 'bg-claude-beige-dark text-claude-text-muted cursor-not-allowed' : 'bg-claude-terracotta text-white hover:bg-claude-terracotta-dark'}`}
                    >
                      {shareLoading ? 'Creating link...' : 'Generate link'}
                    </button>
                    {shareLink && (
                      <div className="rounded-lg border border-claude-border bg-claude-beige p-2 text-xs text-claude-text break-all">
                        {shareLink}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Tokens"
          value={formatNumber(rangeTotals.totalTokens)}
          subtitle={rangeLabel}
          icon={<Icons.Request />}
          color="blue"
          trend={tokensTrend}
          delay={0}
          tooltip="Input + output tokens for the selected range."
          copyValue={String(rangeTotals.totalTokens)}
          copyLabel="Total tokens"
          sparkline={tokensSparkline}
          sparklineColor="#DA7756"
        />
        <StatCard
          title="Requests"
          value={formatNumber(rangeTotals.requests)}
          subtitle={rangeLabel}
          icon={<Icons.Chart />}
          color="violet"
          trend={requestsTrend}
          delay={50}
          tooltip="API requests within the selected range."
          copyValue={String(rangeTotals.requests)}
          copyLabel="Requests"
          sparkline={requestsSparkline}
          sparklineColor="#C75B39"
        />
        <StatCard
          title="Est. Cost"
          value={formatCurrency(rangeTotals.cost)}
          subtitle={rangeLabel}
          icon={<Icons.Cost />}
          color="amber"
          trend={costTrend}
          delay={100}
          tooltip="Estimated spend for the selected range based on pricing."
          copyValue={formatCurrency(rangeTotals.cost)}
          copyLabel="Estimated cost"
          sparkline={costSparkline}
          sparklineColor="#DA7756"
        />
        <StatCard
          title="Projected"
          value={formatCurrency(projectedMonthEnd)}
          subtitle="End of month"
          icon={<Icons.TrendUp />}
          color={projectedMonthEnd > data.billingCycle.budgetLimit ? 'red' : 'emerald'}
          delay={150}
          tooltip={`Projection adjusted by ${growthRate}% growth.`}
          copyValue={formatCurrency(projectedMonthEnd)}
          copyLabel="Projected month end cost"
          sparkline={costSparkline}
          sparklineColor={projectedMonthEnd > data.billingCycle.budgetLimit ? '#C75B39' : '#DA7756'}
        />
      </div>

      {projectedMonthEnd > data.billingCycle.budgetLimit && (
        <div className="bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-4 border-l-4 border-l-claude-terracotta animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-claude-terracotta/20 rounded-lg text-claude-terracotta">
              <Icons.Warning />
            </div>
            <div>
              <h3 className="text-claude-text dark:text-claude-dark-text font-medium">Budget Alert</h3>
              <p className="text-claude-text-muted text-sm mt-1">
                At current usage rate, you will exceed your ${data.billingCycle.budgetLimit.toFixed(2)} budget by{' '}
                <span className="text-claude-terracotta font-medium">${(projectedMonthEnd - data.billingCycle.budgetLimit).toFixed(2)}</span> this month.
                {typeof daysUntilBudget === 'number' && daysUntilBudget > 0 && ` You have approximately ${daysUntilBudget} days until budget is reached.`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="lg:col-span-2 bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-claude-text">Daily Usage</h3>
              <p className="text-sm text-claude-text-muted dark:text-claude-dark-text-muted mt-1">Input and output token consumption</p>
            </div>
            <div className="flex items-center gap-2 bg-claude-beige p-1 rounded-lg">
              <button type="button" onClick={() => setChartMode('sideBySide')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${chartMode === 'sideBySide' ? 'bg-white text-claude-text shadow-sm' : 'text-claude-text-muted hover:text-claude-text hover:bg-claude-beige-dark'}`}>Grouped</button>
              <button type="button" onClick={() => setChartMode('stacked')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${chartMode === 'stacked' ? 'bg-white text-claude-text shadow-sm' : 'text-claude-text-muted hover:text-claude-text hover:bg-claude-beige-dark'}`}>Stacked</button>
            </div>
          </div>
          <BarChart data={filteredDailyUsage} stacked={chartMode === 'stacked'} highlightDate={latestUsageDate} overlaySeries={overlaySeries} />
          {selectedModel && (
            <div className="mt-4 text-xs text-claude-text-muted dark:text-claude-dark-text-muted">Overlay: <span className="text-claude-text dark:text-claude-dark-text font-medium">{selectedModel}</span> (estimated by model share)</div>
          )}
        </section>

        <section className="bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-claude-text">Model Usage</h3>
              <p className="text-sm text-claude-text-muted dark:text-claude-dark-text-muted mt-1">Token breakdown by model</p>
            </div>
            <button type="button" className="p-2 rounded-lg hover:bg-claude-beige text-claude-text-muted hover:text-claude-text transition-colors" aria-label="Model breakdown settings">
              <Icons.Settings />
            </button>
          </div>
          <ModelBreakdown
            models={data.modelBreakdown}
            selectedModel={selectedModel}
            onSelectModel={(model) => setSelectedModel((current) => (current === model ? null : model))}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="lg:col-span-2 bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '340ms' }}>
          <LineChart
            values={dailyCosts}
            stroke="#DA7756"
            label="Cost over time"
            formatValue={formatCurrency}
            rangeLabel={rangeLabel}
          />
        </section>
        <section className="bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '380ms' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-claude-terracotta/10 rounded-xl ring-1 ring-claude-terracotta/30 text-claude-terracotta"><Icons.Chart /></div>
            <div>
              <h3 className="font-medium text-claude-text">Operational Insights</h3>
              <p className="text-sm text-claude-text-muted dark:text-claude-dark-text-muted">Based on recent request logs</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-claude-beige dark:bg-claude-dark-surface-hover border border-claude-border dark:border-claude-dark-border rounded-xl p-3">
              <Tooltip label="Average tokens per request from usage logs.">
                <span className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">Avg tokens</span>
              </Tooltip>
              <CopyableValue
                display={<div className="text-lg font-semibold text-claude-text dark:text-claude-dark-text mt-1 tabular-nums">{formatNumber(Math.round(avgTokensPerRequest))}</div>}
                value={Math.round(avgTokensPerRequest).toString()}
                label="Average tokens"
              />
            </div>
            <div className="bg-claude-beige dark:bg-claude-dark-surface-hover border border-claude-border dark:border-claude-dark-border rounded-xl p-3">
              <Tooltip label="Median tokens per request from usage logs.">
                <span className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">Median tokens</span>
              </Tooltip>
              <CopyableValue
                display={<div className="text-lg font-semibold text-claude-text dark:text-claude-dark-text mt-1 tabular-nums">{formatNumber(Math.round(medianTokensPerRequest))}</div>}
                value={Math.round(medianTokensPerRequest).toString()}
                label="Median tokens"
              />
            </div>
            <div className="bg-claude-beige dark:bg-claude-dark-surface-hover border border-claude-border dark:border-claude-dark-border rounded-xl p-3">
              <Tooltip label="95th percentile latency across recent requests.">
                <span className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">P95 latency</span>
              </Tooltip>
              <CopyableValue
                display={<div className="text-lg font-semibold text-claude-text dark:text-claude-dark-text mt-1 tabular-nums">{p95Latency.toFixed(2)}s</div>}
                value={p95Latency.toFixed(2)}
                label="P95 latency"
              />
            </div>
            <div className="bg-claude-beige dark:bg-claude-dark-surface-hover border border-claude-border dark:border-claude-dark-border rounded-xl p-3">
              <Tooltip label="Percentage of requests that returned errors.">
                <span className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">Error rate</span>
              </Tooltip>
              <CopyableValue
                display={<div className="text-lg font-semibold text-claude-text dark:text-claude-dark-text mt-1 tabular-nums">{errorRate.toFixed(1)}%</div>}
                value={errorRate.toFixed(1)}
                label="Error rate"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '420ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-claude-terracotta/10 rounded-xl ring-1 ring-claude-terracotta/30 text-claude-terracotta"><Icons.Cost /></div>
            <div>
              <h3 className="font-medium text-claude-text">Billing Cycle</h3>
              <p className="text-sm text-claude-text-muted dark:text-claude-dark-text-muted">{data.billingCycle.start} - {data.billingCycle.end}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Tooltip label="Total spend vs budget for the current billing cycle.">
                <span className="text-sm text-claude-text-muted dark:text-claude-dark-text-muted">Budget used</span>
              </Tooltip>
              <CopyableValue
                display={<span className="tabular-nums text-claude-text dark:text-claude-dark-text font-medium">{formatCurrency(totalCost)} / {formatCurrency(data.billingCycle.budgetLimit)}</span>}
                value={`${formatCurrency(totalCost)} / ${formatCurrency(data.billingCycle.budgetLimit)}`}
                label="Budget used"
              />
            </div>
            <ProgressBar value={budgetUsed} max={100} colorClass={`bg-gradient-to-r ${budgetUsed > 90 ? 'from-claude-terracotta-dark to-claude-terracotta' : budgetUsed > 70 ? 'from-claude-terracotta to-claude-terracotta' : 'from-claude-terracotta to-claude-terracotta-dark'}`} showLabel />
          </div>
          <div className="mt-4 pt-4 border-t border-claude-border dark:border-claude-dark-border space-y-3">
            <div className="flex items-center justify-between text-xs text-claude-text-muted dark:text-claude-dark-text-muted">
              <span>Growth adjustment</span>
              <span className="text-claude-text dark:text-claude-dark-text font-medium">{growthRate}%</span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              step={1}
              value={growthRate}
              onChange={(event) => setGrowthRate(Number(event.target.value))}
              className="w-full accent-claude-terracotta"
            />
            <div className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">
              Projected month-end spend: <span className="text-claude-text dark:text-claude-dark-text font-medium">{formatCurrency(projectedMonthEnd)}</span>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '460ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-claude-terracotta/10 rounded-xl ring-1 ring-claude-terracotta/30 text-claude-terracotta"><Icons.Savings /></div>
              <h3 className="font-medium text-claude-text">Cost Savings</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <CopyableValue
                  display={<div className="text-3xl font-semibold tabular-nums tracking-tight text-claude-terracotta">{formatCurrency(savings)}</div>}
                  value={formatCurrency(savings)}
                  label="Cost savings"
                />
                <div className="text-sm text-claude-text-muted dark:text-claude-dark-text-muted font-medium mt-1">Saved from caching</div>
              </div>
              <div>
                <CopyableValue
                  display={<div className="text-2xl font-semibold text-claude-text dark:text-claude-dark-text tabular-nums tracking-tight">{formatNumber(data.currentPeriod.cacheReadTokens)}</div>}
                  value={data.currentPeriod.cacheReadTokens.toString()}
                  label="Cache hits"
                />
                <div className="text-sm text-claude-text-muted dark:text-claude-dark-text-muted font-medium mt-1">Cache hits</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-claude-border dark:border-claude-dark-border">
              <div className="flex justify-between text-sm">
                <span className="text-claude-text-muted">Cache hit rate</span>
                <CopyableValue
                  display={<span className="text-claude-terracotta font-medium">{cacheHitRate.toFixed(1)}%</span>}
                  value={cacheHitRate.toFixed(1)}
                  label="Cache hit rate"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-claude-terracotta/10 rounded-xl ring-1 ring-claude-terracotta/30 text-claude-terracotta"><Icons.Calendar /></div>
            <div>
              <h3 className="font-medium text-claude-text">Remaining Days</h3>
              <p className="text-sm text-claude-text-muted dark:text-claude-dark-text-muted">Billing cycle countdown</p>
            </div>
          </div>
          <CopyableValue
            display={<div className="text-4xl font-semibold text-claude-text dark:text-claude-dark-text tabular-nums tracking-tight mb-2">{data.billingCycle.daysRemaining}</div>}
            value={data.billingCycle.daysRemaining.toString()}
            label="Days remaining"
          />
          <div className="text-sm text-claude-text-muted dark:text-claude-dark-text-muted">Days left in current cycle</div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
