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
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-claude-text">Rate Limits</h1>
        <p className="text-claude-text-muted text-sm mt-1.5 font-medium">Monitor your API rate limits in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {limits.map((limit) => {
          const percentage = (limit.current / limit.max) * 100;
          const colorClasses = {
            blue: 'bg-gradient-to-r from-claude-terracotta to-claude-terracotta shadow-sm shadow-claude-terracotta/30',
            violet: 'bg-gradient-to-r from-claude-terracotta-dark to-claude-terracotta-dark shadow-sm shadow-claude-terracotta-dark/30',
            emerald: 'bg-gradient-to-r from-[#E8A088] to-[#E8A088] shadow-sm shadow-[#E8A088]/30',
          } as const;
          return (
            <div key={limit.name} className="bg-white border border-claude-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-claude-text-muted text-sm font-medium">{limit.name}</span>
                <span className={`text-xs font-medium ${percentage > 90 ? 'text-red-500' : percentage > 70 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="text-2xl font-semibold text-claude-text tabular-nums mb-3">
                {formatNumber(limit.current)} <span className="text-claude-text-muted text-lg">/ {formatNumber(limit.max)}</span>
              </div>
              <ProgressBar value={limit.current} max={limit.max} colorClass={colorClasses[limit.color]} />
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-claude-border rounded-2xl p-6">
        <h3 className="text-lg font-medium text-claude-text mb-4">Request Rate (Last Hour)</h3>
        <div className="h-48 flex items-end gap-1">
          {requestRate.map((height, index) => (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-claude-terracotta/50 to-claude-terracotta/30 rounded-t transition-all duration-300 hover:from-claude-terracotta hover:to-claude-terracotta/80"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-claude-text-muted">
          <span>60 min ago</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
};

export default RateLimitsPage;
