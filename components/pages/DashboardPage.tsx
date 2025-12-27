import { useEffect, useMemo, useState } from 'react';
import type { UsageData } from '../../types/dashboard';
import { Icons } from '../icons';
import StatCard from '../ui/StatCard';
import ProgressBar from '../ui/ProgressBar';
import BarChart from '../charts/BarChart';
import ModelBreakdown from '../dashboard/ModelBreakdown';
import { formatCurrency, formatNumber, formatRelativeTime, getLatestUsageDate } from '../../lib/formatters';

const DashboardPage = ({
  data,
  totalCost,
  savings,
  budgetUsed,
  isClient,
  dataStatus,
  onRefresh,
  lastUpdatedAt,
}: {
  data: UsageData;
  totalCost: number;
  savings: number;
  budgetUsed: number;
  isClient: boolean;
  dataStatus: 'idle' | 'loading' | 'error';
  onRefresh: () => void;
  lastUpdatedAt: number | null;
}) => {
  const [chartMode, setChartMode] = useState<'sideBySide' | 'stacked'>('sideBySide');
  const [timeRange, setTimeRange] = useState('7d');
  const [isLive, setIsLive] = useState(true);
  const [liveTokens, setLiveTokens] = useState(data.currentPeriod.inputTokens + data.currentPeriod.outputTokens);
  const [, setTimeTick] = useState(0);

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

  const dailyAvgCost = totalCost > 0 ? totalCost / 26 : 0;
  const projectedMonthEnd = dailyAvgCost * 31;
  const daysUntilBudget = dailyAvgCost > 0 && budgetUsed < 100
    ? Math.floor((data.billingCycle.budgetLimit - totalCost) / dailyAvgCost)
    : null;

  const latestUsageDate = useMemo(() => getLatestUsageDate(data), [data]);
  const lastUpdatedLabel = formatRelativeTime(lastUpdatedAt);
  const cacheHitRate = data.currentPeriod.inputTokens > 0
    ? (data.currentPeriod.cacheReadTokens / data.currentPeriod.inputTokens) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Monitor your Claude API consumption</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isLive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
            <div className={`${isLive ? 'animate-pulse' : ''}`}><Icons.Live /></div>
            <span className="text-xs font-medium">{isLive ? 'Live' : 'Paused'}</span>
            <button type="button" onClick={() => setIsLive(!isLive)} className="ml-1 hover:text-white transition-colors" aria-label={isLive ? 'Pause live mode' : 'Resume live mode'}>
              {isLive ? <Icons.X /> : <Icons.Refresh />}
            </button>
          </div>
          {dataStatus === 'loading' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
              <span className="animate-pulse">Syncing</span>
            </div>
          )}
          {dataStatus === 'error' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
              Offline
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] text-xs text-slate-400 font-medium">
            <Icons.Refresh />
            Updated {lastUpdatedLabel}
          </div>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="glass-card glass-border bg-white/5 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 cursor-pointer hover:bg-white/10">
            <option value="7d" className="bg-slate-900">Last 7 days</option>
            <option value="30d" className="bg-slate-900">Last 30 days</option>
            <option value="90d" className="bg-slate-900">Last 90 days</option>
            <option value="custom" className="bg-slate-900">Custom range</option>
          </select>
          <button
            type="button"
            onClick={onRefresh}
            disabled={dataStatus === 'loading'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${dataStatus === 'loading' ? 'bg-slate-800/30 text-slate-500 cursor-not-allowed' : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-100'}`}
          >
            <Icons.Refresh />
            Refresh
          </button>
          <button type="button" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25">
            <Icons.Download />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Tokens" value={formatNumber(liveTokens)} subtitle="Input + Output" icon={<Icons.Request />} color="blue" trend={12} delay={0} />
        <StatCard title="Requests" value={data.currentPeriod.requestCount.toLocaleString()} subtitle="API calls" icon={<Icons.Chart />} color="violet" trend={8} delay={50} />
        <StatCard title="Est. Cost" value={formatCurrency(totalCost)} subtitle="This period" icon={<Icons.Cost />} color="amber" trend={-3} delay={100} />
        <StatCard title="Projected" value={formatCurrency(projectedMonthEnd)} subtitle="End of month" icon={<Icons.TrendUp />} color={projectedMonthEnd > data.billingCycle.budgetLimit ? 'red' : 'emerald'} delay={150} />
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
          <BarChart data={data.dailyUsage} stacked={chartMode === 'stacked'} highlightDate={latestUsageDate} />
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
          <ModelBreakdown models={data.modelBreakdown} />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-500/20 rounded-xl ring-1 ring-blue-500/30 text-blue-400"><Icons.Cost /></div>
            <div>
              <h3 className="font-medium text-white">Billing Cycle</h3>
              <p className="text-sm text-slate-500">{data.billingCycle.start} - {data.billingCycle.end}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Budget used</span>
              <span className="tabular-nums text-white font-medium">{formatCurrency(totalCost)} / {formatCurrency(data.billingCycle.budgetLimit)}</span>
            </div>
            <ProgressBar value={budgetUsed} max={100} colorClass={`bg-gradient-to-r ${budgetUsed > 90 ? 'from-red-500 to-red-400' : budgetUsed > 70 ? 'from-amber-500 to-amber-400' : 'from-blue-500 via-violet-500 to-violet-400'}`} showLabel />
          </div>
        </section>

        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-green-500/20 rounded-xl ring-1 ring-green-500/30 text-green-400"><Icons.Savings /></div>
              <h3 className="font-medium text-white">Cost Savings</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-3xl font-semibold tabular-nums tracking-tight bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{formatCurrency(savings)}</div>
                <div className="text-sm text-slate-400 font-medium mt-1">Saved from caching</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-white tabular-nums tracking-tight">{formatNumber(data.currentPeriod.cacheReadTokens)}</div>
                <div className="text-sm text-slate-400 font-medium mt-1">Cache hits</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Cache hit rate</span>
                <span className="text-emerald-400 font-medium">{cacheHitRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '450ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-violet-500/20 rounded-xl ring-1 ring-violet-500/30 text-violet-400"><Icons.Calendar /></div>
            <div>
              <h3 className="font-medium text-white">Remaining Days</h3>
              <p className="text-sm text-slate-500">Billing cycle countdown</p>
            </div>
          </div>
          <div className="text-4xl font-semibold text-white tabular-nums tracking-tight mb-2">{data.billingCycle.daysRemaining}</div>
          <div className="text-sm text-slate-400">Days left in current cycle</div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
