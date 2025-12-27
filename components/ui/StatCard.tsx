import type { ReactNode } from 'react';
import { Icons } from '../icons';
import CopyableValue from './CopyableValue';
import Tooltip from './Tooltip';

const StatCard = ({ title, value, subtitle, icon, color, trend, delay, tooltip, copyValue, copyLabel, sparkline, sparklineColor }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color: 'blue' | 'violet' | 'emerald' | 'amber' | 'red';
  trend?: number;
  delay?: number;
  tooltip?: string;
  copyValue?: string;
  copyLabel?: string;
  sparkline?: number[];
  sparklineColor?: string;
}) => {
  const colors = {
    blue: { icon: 'bg-claude-terracotta/10 text-claude-terracotta', glow: 'shadow-glow-terracotta' },
    violet: { icon: 'bg-claude-terracotta/15 text-claude-terracotta-dark', glow: 'shadow-glow-terracotta' },
    emerald: { icon: 'bg-claude-terracotta/10 text-claude-terracotta', glow: 'shadow-glow-terracotta' },
    amber: { icon: 'bg-claude-terracotta/15 text-claude-terracotta-dark', glow: 'shadow-glow-terracotta' },
    red: { icon: 'bg-claude-terracotta-dark/20 text-claude-terracotta-dark', glow: 'shadow-glow-terracotta' },
  } as const;

  return (
    <div className={`group bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-4 sm:p-5 transition-all duration-300 ease-out-expo hover:scale-[1.02] active:scale-[0.98] hover:shadow-claude-md dark:hover:shadow-lg dark:hover:shadow-black/20 animate-slide-up`} style={{ animationDelay: `${delay ?? 0}ms` }}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colors[color].icon} transition-transform duration-300 group-hover:scale-110`}>
              {icon}
            </div>
            {tooltip ? (
              <Tooltip label={tooltip}>
                <span className="text-claude-text-muted dark:text-claude-dark-text-muted text-xs font-medium uppercase tracking-wider">{title}</span>
              </Tooltip>
            ) : (
              <span className="text-claude-text-muted dark:text-claude-dark-text-muted text-xs font-medium uppercase tracking-wider">{title}</span>
            )}
          </div>
          {typeof trend === 'number' && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-claude-terracotta' : 'text-claude-terracotta-dark'}`}>
              {trend > 0 ? <Icons.TrendUp /> : <Icons.TrendDown />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="text-2xl sm:text-3xl font-semibold text-claude-text dark:text-claude-dark-text tabular-nums tracking-tight">
          {copyValue ? (
            <CopyableValue display={value} value={copyValue} label={copyLabel ?? title} />
          ) : (
            value
          )}
        </div>
        {subtitle && <div className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted mt-1.5 font-medium">{subtitle}</div>}
        {sparkline && sparkline.length > 1 && (
          <svg className="mt-3 h-8 w-full" viewBox="0 0 100 30" preserveAspectRatio="none">
            <polyline
              points={sparkline.map((val, index) => {
                const x = sparkline.length === 1 ? 0 : (index / (sparkline.length - 1)) * 100;
                const max = Math.max(...sparkline);
                const min = Math.min(...sparkline);
                const range = max - min || 1;
                const y = 28 - ((val - min) / range) * 24;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke={sparklineColor ?? '#DA7756'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
};

export default StatCard;
