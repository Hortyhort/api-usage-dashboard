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
  'Claude Sonnet 4.5': '#60a5fa',
  'Claude Opus 4.5': '#a78bfa',
  'Claude Haiku 4.5': '#34d399',
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
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Monitor your Claude API consumption</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {readOnly && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] text-xs text-slate-300 font-medium">
              <Icons.Info />
              Read-only share
            </div>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isLive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
            <div className={`${isLive ? 'animate-pulse' : ''}`}><Icons.Live /></div>
            <span className="text-xs font-medium">{isLive ? 'Live' : 'Paused'}</span>
            <button type="button" onClick={() => setIsLive(!isLive)} className="ml-1 hover:text-white transition-colors" aria-label={isLive ? 'Pause live mode' : 'Resume live mode'}>
              {isLive ? <Icons.X /> : <Icons.Refresh />}
            </button>
          </div>
          {dataStatus === 'loading' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
              <Icons.Refresh />
              <span className="animate-pulse">Syncing</span>
            </div>
          )}
          {dataStatus === 'error' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
              Offline
            </div>
          )}
          <Tooltip label={`Synced at ${lastUpdatedFull}`}>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] text-xs text-slate-400 font-medium">
              <Icons.Refresh />
              Updated {lastUpdatedLabel}
            </span>
          </Tooltip>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as (typeof RANGE_OPTIONS)[number]['value'])} className="glass-card glass-border bg-white/5 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 cursor-pointer hover:bg-white/10">
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-900">{option.label}</option>
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
                className="bg-slate-800/60 text-slate-200 px-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(event) => setCustomRange((prev) => ({ ...prev, end: event.target.value }))}
                min={sortedDailyUsage[0]?.date}
                max={sortedDailyUsage[sortedDailyUsage.length - 1]?.date}
                className="bg-slate-800/60 text-slate-200 px-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={dataStatus === 'loading'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${dataStatus === 'loading' ? 'bg-slate-800/30 text-slate-500 cursor-not-allowed' : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-100'}`}
          >
            <Icons.Refresh />
            Refresh
          </button>
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((open) => !open)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              <Icons.Download />
              Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-52 glass-card glass-border rounded-xl p-2 shadow-2xl z-30">
                <button
                  type="button"
                  onClick={() => { handleExport('csv'); setExportOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/[0.06] transition-colors"
                >
                  <Icons.Download />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => { handleExport('json'); setExportOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/[0.06] transition-colors"
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 transition-all duration-200"
              >
                <Icons.Copy />
                Share
              </button>
              {shareOpen && (
                <div className="absolute right-0 mt-2 w-72 glass-card glass-border rounded-xl p-4 shadow-2xl z-30">
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Share read-only link</div>
                  <div className="mt-3 space-y-3">
                    <label className="text-xs text-slate-500">Expiration</label>
                    <select
                      value={shareExpiry}
                      onChange={(event) => setShareExpiry(event.target.value)}
                      className="w-full bg-slate-800/60 text-slate-200 px-3 py-2 rounded-lg text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      {SHARE_EXPIRY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-slate-900">{option.label}</option>
                      ))}
                    </select>
                    <label className="text-xs text-slate-500">Password (optional)</label>
                    <input
                      type="password"
                      value={sharePassword}
                      onChange={(event) => setSharePassword(event.target.value)}
                      placeholder="Add a passcode"
                      className="w-full bg-slate-800/60 text-slate-200 px-3 py-2 rounded-lg text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={shareLoading}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${shareLoading ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed' : 'bg-blue-500/20 text-blue-200 hover:bg-blue-500/30'}`}
                    >
                      {shareLoading ? 'Creating link...' : 'Generate link'}
                    </button>
                    {shareLink && (
                      <div className="rounded-lg border border-white/10 bg-slate-900/40 p-2 text-xs text-slate-300 break-all">
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
          sparklineColor="#60a5fa"
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
          sparklineColor="#a78bfa"
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
          sparklineColor="#fbbf24"
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
          sparklineColor={projectedMonthEnd > data.billingCycle.budgetLimit ? '#f87171' : '#34d399'}
        />
      </div>

      {projectedMonthEnd > data.billingCycle.budgetLimit && (
        <div className="glass-card glass-border rounded-2xl p-4 border-l-4 border-l-amber-500 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <Icons.Warning />
            </div>
            <div>
              <h3 className="text-white font-medium">Budget Alert</h3>
              <p className="text-slate-400 text-sm mt-1">
                At current usage rate, you will exceed your ${data.billingCycle.budgetLimit.toFixed(2)} budget by{' '}
                <span className="text-amber-400 font-medium">${(projectedMonthEnd - data.billingCycle.budgetLimit).toFixed(2)}</span> this month.
                {typeof daysUntilBudget === 'number' && daysUntilBudget > 0 && ` You have approximately ${daysUntilBudget} days until budget is reached.`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="lg:col-span-2 glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-white">Daily Usage</h3>
              <p className="text-sm text-slate-400 mt-1">Input and output token consumption</p>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.04] p-1 rounded-lg">
              <button type="button" onClick={() => setChartMode('sideBySide')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${chartMode === 'sideBySide' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}>Grouped</button>
              <button type="button" onClick={() => setChartMode('stacked')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${chartMode === 'stacked' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}>Stacked</button>
            </div>
          </div>
          <BarChart data={filteredDailyUsage} stacked={chartMode === 'stacked'} highlightDate={latestUsageDate} overlaySeries={overlaySeries} />
          {selectedModel && (
            <div className="mt-4 text-xs text-slate-400">Overlay: <span className="text-slate-200 font-medium">{selectedModel}</span> (estimated by model share)</div>
          )}
        </section>

        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-white">Model Usage</h3>
              <p className="text-sm text-slate-400 mt-1">Token breakdown by model</p>
            </div>
            <button type="button" className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors" aria-label="Model breakdown settings">
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
        <section className="lg:col-span-2 glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '340ms' }}>
          <LineChart
            values={dailyCosts}
            stroke="#60a5fa"
            label="Cost over time"
            formatValue={formatCurrency}
            rangeLabel={rangeLabel}
          />
        </section>
        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '380ms' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-slate-500/20 rounded-xl ring-1 ring-slate-500/30 text-slate-300"><Icons.Chart /></div>
            <div>
              <h3 className="font-medium text-white">Operational Insights</h3>
              <p className="text-sm text-slate-500">Based on recent request logs</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card glass-border rounded-xl p-3">
              <Tooltip label="Average tokens per request from usage logs.">
                <span className="text-xs text-slate-500">Avg tokens</span>
              </Tooltip>
              <CopyableValue
                display={<div className="text-lg font-semibold text-white mt-1 tabular-nums">{formatNumber(Math.round(avgTokensPerRequest))}</div>}
                value={Math.round(avgTokensPerRequest).toString()}
                label="Average tokens"
              />
            </div>
            <div className="glass-card glass-border rounded-xl p-3">
              <Tooltip label="Median tokens per request from usage logs.">
                <span className="text-xs text-slate-500">Median tokens</span>
              </Tooltip>
              <CopyableValue
                display={<div className="text-lg font-semibold text-white mt-1 tabular-nums">{formatNumber(Math.round(medianTokensPerRequest))}</div>}
                value={Math.round(medianTokensPerRequest).toString()}
                label="Median tokens"
              />
            </div>
            <div className="glass-card glass-border rounded-xl p-3">
              <Tooltip label="95th percentile latency across recent requests.">
                <span className="text-xs text-slate-500">P95 latency</span>
              </Tooltip>
              <CopyableValue
                display={<div className="text-lg font-semibold text-white mt-1 tabular-nums">{p95Latency.toFixed(2)}s</div>}
                value={p95Latency.toFixed(2)}
                label="P95 latency"
              />
            </div>
            <div className="glass-card glass-border rounded-xl p-3">
              <Tooltip label="Percentage of requests that returned errors.">
                <span className="text-xs text-slate-500">Error rate</span>
              </Tooltip>
              <CopyableValue
                display={<div className="text-lg font-semibold text-white mt-1 tabular-nums">{errorRate.toFixed(1)}%</div>}
                value={errorRate.toFixed(1)}
                label="Error rate"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '420ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-500/20 rounded-xl ring-1 ring-blue-500/30 text-blue-400"><Icons.Cost /></div>
            <div>
              <h3 className="font-medium text-white">Billing Cycle</h3>
              <p className="text-sm text-slate-500">{data.billingCycle.start} - {data.billingCycle.end}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Tooltip label="Total spend vs budget for the current billing cycle.">
                <span className="text-sm text-slate-400">Budget used</span>
              </Tooltip>
              <CopyableValue
                display={<span className="tabular-nums text-white font-medium">{formatCurrency(totalCost)} / {formatCurrency(data.billingCycle.budgetLimit)}</span>}
                value={`${formatCurrency(totalCost)} / ${formatCurrency(data.billingCycle.budgetLimit)}`}
                label="Budget used"
              />
            </div>
            <ProgressBar value={budgetUsed} max={100} colorClass={`bg-gradient-to-r ${budgetUsed > 90 ? 'from-red-500 to-red-400' : budgetUsed > 70 ? 'from-amber-500 to-amber-400' : 'from-blue-500 via-violet-500 to-violet-400'}`} showLabel />
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Growth adjustment</span>
              <span className="text-slate-200 font-medium">{growthRate}%</span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              step={1}
              value={growthRate}
              onChange={(event) => setGrowthRate(Number(event.target.value))}
              className="w-full"
            />
            <div className="text-xs text-slate-500">
              Projected month-end spend: <span className="text-slate-200 font-medium">{formatCurrency(projectedMonthEnd)}</span>
            </div>
          </div>
        </section>

        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '460ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-green-500/20 rounded-xl ring-1 ring-green-500/30 text-green-400"><Icons.Savings /></div>
              <h3 className="font-medium text-white">Cost Savings</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <CopyableValue
                  display={<div className="text-3xl font-semibold tabular-nums tracking-tight bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{formatCurrency(savings)}</div>}
                  value={formatCurrency(savings)}
                  label="Cost savings"
                />
                <div className="text-sm text-slate-400 font-medium mt-1">Saved from caching</div>
              </div>
              <div>
                <CopyableValue
                  display={<div className="text-2xl font-semibold text-white tabular-nums tracking-tight">{formatNumber(data.currentPeriod.cacheReadTokens)}</div>}
                  value={data.currentPeriod.cacheReadTokens.toString()}
                  label="Cache hits"
                />
                <div className="text-sm text-slate-400 font-medium mt-1">Cache hits</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Cache hit rate</span>
                <CopyableValue
                  display={<span className="text-emerald-400 font-medium">{cacheHitRate.toFixed(1)}%</span>}
                  value={cacheHitRate.toFixed(1)}
                  label="Cache hit rate"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-violet-500/20 rounded-xl ring-1 ring-violet-500/30 text-violet-400"><Icons.Calendar /></div>
            <div>
              <h3 className="font-medium text-white">Remaining Days</h3>
              <p className="text-sm text-slate-500">Billing cycle countdown</p>
            </div>
          </div>
          <CopyableValue
            display={<div className="text-4xl font-semibold text-white tabular-nums tracking-tight mb-2">{data.billingCycle.daysRemaining}</div>}
            value={data.billingCycle.daysRemaining.toString()}
            label="Days remaining"
          />
          <div className="text-sm text-slate-400">Days left in current cycle</div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
