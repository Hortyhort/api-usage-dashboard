import React, { useState, useMemo } from 'react';
import Head from 'next/head';

const mockUsageData = {
  currentPeriod: {
    inputTokens: 2847293,
    outputTokens: 892451,
    cacheReadTokens: 156320,
    cacheWriteTokens: 42180,
    requestCount: 3842,
  },
  dailyUsage: [
    { date: '2025-12-20', label: 'Dec 20', input: 380000, output: 120000 },
    { date: '2025-12-21', label: 'Dec 21', input: 420000, output: 135000 },
    { date: '2025-12-22', label: 'Dec 22', input: 290000, output: 95000 },
    { date: '2025-12-23', label: 'Dec 23', input: 510000, output: 165000 },
    { date: '2025-12-24', label: 'Dec 24', input: 445000, output: 142000 },
    { date: '2025-12-25', label: 'Dec 25', input: 320000, output: 98000 },
    { date: '2025-12-26', label: 'Dec 26', input: 482293, output: 137451 },
  ],
  modelBreakdown: [
    { model: 'Claude Sonnet 4.5', tokens: 2150000, percentage: 57.5, color: 'blue' },
    { model: 'Claude Opus 4.5', tokens: 980000, percentage: 26.2, color: 'violet' },
    { model: 'Claude Haiku 4.5', tokens: 609744, percentage: 16.3, color: 'emerald' },
  ],
  billingCycle: { start: 'Dec 1, 2025', end: 'Dec 31, 2025', daysRemaining: 5, budgetLimit: 75.00 },
  pricing: { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
};

const formatNumber = (num) => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return num.toLocaleString();
};

const formatCurrency = (num) => '$' + num.toFixed(2);

const calculateCost = (data) => {
  const { currentPeriod: p, pricing: pr } = data;
  return (p.inputTokens / 1e6) * pr.input + (p.outputTokens / 1e6) * pr.output + 
         (p.cacheReadTokens / 1e6) * pr.cacheRead + (p.cacheWriteTokens / 1e6) * pr.cacheWrite;
};

const calculateSavings = (data) => {
  const { currentPeriod: p, pricing: pr } = data;
  return (p.cacheReadTokens / 1e6) * pr.input - (p.cacheReadTokens / 1e6) * pr.cacheRead;
};

const isToday = (dateStr) => dateStr === '2025-12-26';

const StatCard = ({ title, value, subtitle, icon, color }) => {
  const colors = {
    blue: 'bg-blue-500/15 text-blue-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    violet: 'bg-violet-500/15 text-violet-400',
    amber: 'bg-amber-500/15 text-amber-400',
  };
  return (
    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 hover:border-slate-600/60 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 rounded-xl ${colors[color]}`}>{icon}</div>
        <span className="text-slate-300 text-xs font-medium">{title}</span>
      </div>
      <div className="text-xl font-semibold text-white tabular-nums">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
};

const BarChart = ({ data, stacked }) => {
  const [tooltip, setTooltip] = useState(null);
  const maxValue = Math.max(...data.map(d => d.input + d.output));
  
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2" style={{ minWidth: '100%' }}>
        {data.map((day, i) => {
          const total = day.input + day.output;
          const totalPct = (total / maxValue) * 100;
          const inputPct = (day.input / maxValue) * 100;
          const outputPct = (day.output / maxValue) * 100;
          const isCurrent = isToday(day.date);
          
          return (
            <div key={i} className="flex-1 min-w-[44px] flex flex-col items-center gap-2 group relative cursor-pointer"
                 onMouseEnter={() => setTooltip(i)} onMouseLeave={() => setTooltip(null)}
                 onClick={() => setTooltip(tooltip === i ? null : i)}>
              {tooltip === i && (
                <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-xs rounded-xl p-3 border border-slate-700 z-10 whitespace-nowrap shadow-xl">
                  <div className="font-semibold mb-1.5">{day.label}</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-sm"></span>
                    <span className="text-slate-300">Input:</span>
                    <span className="text-white font-medium">{formatNumber(day.input)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-sm"></span>
                    <span className="text-slate-300">Output:</span>
                    <span className="text-white font-medium">{formatNumber(day.output)}</span>
                  </div>
                  <div className="border-t border-slate-700 mt-2 pt-2">
                    <span className="text-slate-300">Total:</span>
                    <span className="text-white font-semibold ml-2">{formatNumber(total)}</span>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900"></div>
                </div>
              )}
              <div className="w-full flex flex-col h-40">
                <div style={{ flexGrow: 100 - totalPct }} />
                {stacked ? (
                  <div className="w-full flex flex-col rounded-lg overflow-hidden" style={{ flexGrow: totalPct }}>
                    <div className={`w-full transition-colors ${isCurrent ? 'bg-blue-400 shadow-lg shadow-blue-500/30' : 'bg-blue-500/80 group-hover:bg-blue-500'}`} style={{ flexGrow: day.input }} />
                    <div className={`w-full transition-colors ${isCurrent ? 'bg-emerald-400 shadow-lg shadow-emerald-500/30' : 'bg-emerald-500/80 group-hover:bg-emerald-500'}`} style={{ flexGrow: day.output }} />
                  </div>
                ) : (
                  <div className="w-full flex gap-1 items-end" style={{ flexGrow: totalPct }}>
                    <div className={`flex-1 rounded-t-md transition-colors ${isCurrent ? 'bg-blue-400 shadow-lg shadow-blue-500/30' : 'bg-blue-500/80 group-hover:bg-blue-500'}`} 
                         style={{ height: `${(inputPct / totalPct) * 100}%`, minHeight: '3px' }} />
                    <div className={`flex-1 rounded-t-md transition-colors ${isCurrent ? 'bg-emerald-400 shadow-lg shadow-emerald-500/30' : 'bg-emerald-500/80 group-hover:bg-emerald-500'}`} 
                         style={{ height: `${(outputPct / totalPct) * 100}%`, minHeight: '3px' }} />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center">
                {isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full mb-1" />}
                <span className={`text-xs transition-colors ${isCurrent ? 'text-white font-semibold' : 'text-slate-400 group-hover:text-slate-300'}`}>
                  {isCurrent ? 'Today' : day.label.split(' ')[1]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm" /><span className="text-sm text-slate-300">Input tokens</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-sm" /><span className="text-sm text-slate-300">Output tokens</span></div>
      </div>
    </div>
  );
};

const ProgressBar = ({ value, max, colorClass }) => (
  <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
    <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
  </div>
);

const ModelBreakdown = ({ models }) => {
  const colors = { blue: 'bg-blue-500', violet: 'bg-violet-500', emerald: 'bg-emerald-500' };
  return (
    <div className="space-y-5">
      {models.map((m, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-200 font-medium">{m.model}</span>
            <span className="text-slate-300 tabular-nums">{formatNumber(m.tokens)}</span>
          </div>
          <ProgressBar value={m.percentage} max={100} colorClass={colors[m.color]} />
          <div className="text-right text-xs text-slate-400 mt-1.5 tabular-nums">{m.percentage}%</div>
        </div>
      ))}
    </div>
  );
};

const Icons = {
  Input: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
  Output: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  Request: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  Cost: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Cache: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" /></svg>,
  Savings: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>,
  Calendar: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
};

export default function UsageDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [chartMode, setChartMode] = useState('sideBySide');
  const data = mockUsageData;
  
  const totalCost = useMemo(() => calculateCost(data), []);
  const savings = useMemo(() => calculateSavings(data), []);
  const budgetUsed = (totalCost / data.billingCycle.budgetLimit) * 100;

  return (
    <>
      <Head>
        <title>API Usage Dashboard</title>
        <meta name="description" content="Monitor your Claude API consumption" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8 text-white">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">API Usage</h1>
              <p className="text-slate-400 text-sm mt-1">Monitor your Claude API consumption</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}
                      className="bg-slate-800 text-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                Export
              </button>
            </div>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-8">
            <StatCard title="Input Tokens" value={formatNumber(data.currentPeriod.inputTokens)} subtitle="Prompts sent" icon={<Icons.Input />} color="blue" />
            <StatCard title="Output Tokens" value={formatNumber(data.currentPeriod.outputTokens)} subtitle="Responses" icon={<Icons.Output />} color="emerald" />
            <StatCard title="Requests" value={data.currentPeriod.requestCount.toLocaleString()} subtitle="API calls" icon={<Icons.Request />} color="violet" />
            <StatCard title="Est. Cost" value={formatCurrency(totalCost)} subtitle="This period" icon={<Icons.Cost />} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <section className="lg:col-span-2 bg-slate-800/40 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <h2 className="text-base sm:text-lg font-medium">Daily Token Usage</h2>
                <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-0.5">
                  <button onClick={() => setChartMode('sideBySide')} 
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${chartMode === 'sideBySide' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
                    Grouped
                  </button>
                  <button onClick={() => setChartMode('stacked')} 
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${chartMode === 'stacked' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
                    Stacked
                  </button>
                </div>
              </div>
              <BarChart data={data.dailyUsage} stacked={chartMode === 'stacked'} />
            </section>

            <section className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700/50">
              <h2 className="text-base sm:text-lg font-medium mb-5 sm:mb-6">Usage by Model</h2>
              <ModelBreakdown models={data.modelBreakdown} />
            </section>
          </div>

          <section className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700/50 mb-4 sm:mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-2.5 bg-slate-700/50 rounded-xl"><Icons.Calendar /></div>
                <div>
                  <h2 className="text-base sm:text-lg font-medium">Billing Cycle</h2>
                  <p className="text-slate-400 text-xs sm:text-sm">{data.billingCycle.start} — {data.billingCycle.end}</p>
                </div>
              </div>
              <div className="flex items-center gap-5 sm:gap-8">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-semibold tabular-nums">{data.billingCycle.daysRemaining}</div>
                  <div className="text-xs text-slate-400">Days left</div>
                </div>
                <div className="w-px h-10 sm:h-12 bg-slate-700 hidden sm:block" />
                <div className="min-w-[160px] sm:min-w-[200px]">
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span className="text-slate-400">Budget</span>
                    <span className="tabular-nums">{formatCurrency(totalCost)} / {formatCurrency(data.billingCycle.budgetLimit)}</span>
                  </div>
                  <ProgressBar value={budgetUsed} max={100} colorClass="bg-gradient-to-r from-blue-500 to-violet-500" />
                  <div className="text-right text-xs text-slate-400 mt-1.5 tabular-nums">{budgetUsed.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <section className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700/50">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
                <div className="p-2 sm:p-2.5 bg-cyan-500/15 rounded-xl ring-1 ring-cyan-500/30 text-cyan-400"><Icons.Cache /></div>
                <h3 className="font-medium text-sm sm:text-base">Prompt Caching</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <div className="text-xl sm:text-2xl font-semibold tabular-nums">{formatNumber(data.currentPeriod.cacheReadTokens)}</div>
                  <div className="text-xs sm:text-sm text-slate-400">Cache reads</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-semibold tabular-nums">{formatNumber(data.currentPeriod.cacheWriteTokens)}</div>
                  <div className="text-xs sm:text-sm text-slate-400">Cache writes</div>
                </div>
              </div>
            </section>

            <section className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700/50">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
                <div className="p-2 sm:p-2.5 bg-green-500/15 rounded-xl ring-1 ring-green-500/30 text-green-400"><Icons.Savings /></div>
                <h3 className="font-medium text-sm sm:text-base">Cost Savings</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-semibold text-green-400 tabular-nums">{formatCurrency(savings)}</span>
                <span className="text-slate-400 text-sm">saved</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">From caching ({formatNumber(data.currentPeriod.cacheReadTokens)} hits)</p>
            </section>
          </div>

          <footer className="mt-6 sm:mt-8 text-center text-xs text-slate-500">
            Data refreshes every 5 minutes • Last updated just now
          </footer>
        </div>
      </div>
    </>
  );
}
