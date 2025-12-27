import { useEffect, useState } from 'react';
import ProgressBar from '../ui/ProgressBar';
import { formatNumber } from '../../lib/formatters';

const RateLimitsPage = ({ isClient }: { isClient: boolean }) => {
  const limits = [
    { name: 'Requests per minute', current: 847, max: 1000, color: 'blue' },
    { name: 'Tokens per minute', current: 89000, max: 100000, color: 'violet' },
    { name: 'Tokens per day', current: 2847293, max: 5000000, color: 'emerald' },
  ] as const;
  const [requestRate, setRequestRate] = useState(() => Array.from({ length: 60 }, () => 30));

  useEffect(() => {
    if (!isClient) return;
    const minRate = 18;
    const maxRate = 100;
    const drift = 16;
    const updateIntervalMs = 1500;

    const seed = Array.from({ length: 60 }, () => minRate + Math.random() * (maxRate - minRate));
    setRequestRate(seed);

    const interval = setInterval(() => {
      setRequestRate((prev) => {
        const last = prev[prev.length - 1] ?? (minRate + (maxRate - minRate) / 2);
        const delta = (Math.random() - 0.5) * drift;
        const nextValue = Math.min(maxRate, Math.max(minRate, last + delta));
        return [...prev.slice(1), nextValue];
      });
    }, updateIntervalMs);

    return () => clearInterval(interval);
  }, [isClient]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Rate Limits</h1>
        <p className="text-slate-400 text-sm mt-1.5 font-medium">Monitor your API rate limits in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {limits.map((limit) => {
          const percentage = (limit.current / limit.max) * 100;
          const colorClasses = {
            blue: 'bg-gradient-to-r from-blue-500 to-blue-400',
            violet: 'bg-gradient-to-r from-violet-500 to-violet-400',
            emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
          } as const;
          return (
            <div key={limit.name} className="glass-card glass-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 text-sm font-medium">{limit.name}</span>
                <span className={`text-xs font-medium ${percentage > 90 ? 'text-red-400' : percentage > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="text-2xl font-semibold text-white tabular-nums mb-3">
                {formatNumber(limit.current)} <span className="text-slate-500 text-lg">/ {formatNumber(limit.max)}</span>
              </div>
              <ProgressBar value={limit.current} max={limit.max} colorClass={colorClasses[limit.color]} />
            </div>
          );
        })}
      </div>

      <div className="glass-card glass-border rounded-2xl p-6">
        <h3 className="text-lg font-medium text-white mb-4">Request Rate (Last Hour)</h3>
        <div className="h-48 flex items-end gap-1">
          {requestRate.map((height, index) => (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-blue-500/50 to-blue-400/50 rounded-t transition-all duration-300 hover:from-blue-500 hover:to-blue-400"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>60 min ago</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
};

export default RateLimitsPage;
