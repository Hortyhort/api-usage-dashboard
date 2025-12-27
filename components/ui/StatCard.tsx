import type { ReactNode } from 'react';
import { Icons } from '../icons';

const StatCard = ({ title, value, subtitle, icon, color, trend, delay }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color: 'blue' | 'violet' | 'emerald' | 'amber' | 'red';
  trend?: number;
  delay?: number;
}) => {
  const colors = {
    blue: { icon: 'bg-blue-500/20 text-blue-400', glow: 'shadow-glow-blue' },
    violet: { icon: 'bg-violet-500/20 text-violet-400', glow: 'shadow-glow-violet' },
    emerald: { icon: 'bg-emerald-500/20 text-emerald-400', glow: 'shadow-glow-emerald' },
    amber: { icon: 'bg-amber-500/20 text-amber-400', glow: 'shadow-glow-amber' },
    red: { icon: 'bg-red-500/20 text-red-400', glow: 'shadow-glow-red' },
  } as const;

  return (
    <div className={`group glass-card glass-border rounded-2xl p-4 sm:p-5 transition-all duration-300 ease-out-expo hover:scale-[1.02] active:scale-[0.98] hover:bg-white/[0.03] ${colors[color].glow} animate-slide-up`} style={{ animationDelay: `${delay ?? 0}ms` }}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colors[color].icon} transition-transform duration-300 group-hover:scale-110`}>
              {icon}
            </div>
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</span>
          </div>
          {typeof trend === 'number' && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend > 0 ? <Icons.TrendUp /> : <Icons.TrendDown />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="text-2xl sm:text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-1.5 font-medium">{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatCard;
