import { useState } from 'react';
import type { DailyUsage } from '../../types/dashboard';
import { formatNumber } from '../../lib/formatters';

const BarChart = ({ data, stacked, highlightDate }: { data: DailyUsage[]; stacked: boolean; highlightDate?: string }) => {
  const [tooltip, setTooltip] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((day) => day.input + day.output), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 sm:gap-3 h-48 overflow-x-auto pb-2 scrollbar-hide">
        {data.map((day, index) => {
          const total = day.input + day.output;
          const totalPct = maxValue > 0 ? (total / maxValue) * 100 : 0;
          const isCurrent = highlightDate ? day.date === highlightDate : false;

          return (
            <div
              key={day.date}
              className="flex-1 min-w-[48px] flex flex-col items-center gap-2 group relative cursor-pointer"
              onMouseEnter={() => setTooltip(index)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={() => setTooltip(index)}
              onBlur={() => setTooltip(null)}
              tabIndex={0}
              aria-label={`${day.label}: ${formatNumber(day.input)} input, ${formatNumber(day.output)} output`}
            >
              {tooltip === index && (
                <div className="absolute bottom-full mb-3 glass-card rounded-xl p-4 z-20 whitespace-nowrap shadow-tooltip animate-scale-in border border-white/10">
                  <div className="relative z-10">
                    <div className="font-semibold text-white mb-2">{day.label}</div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="w-2.5 h-2.5 bg-blue-400 rounded-sm"></span>
                      <span className="text-slate-400 text-sm">Input:</span>
                      <span className="text-white font-medium tabular-nums">{formatNumber(day.input)}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-sm"></span>
                      <span className="text-slate-400 text-sm">Output:</span>
                      <span className="text-white font-medium tabular-nums">{formatNumber(day.output)}</span>
                    </div>
                    <div className="border-t border-white/10 mt-3 pt-3">
                      <span className="text-slate-400 text-sm">Total:</span>
                      <span className="text-white font-semibold ml-2 tabular-nums">{formatNumber(total)}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="w-full flex flex-col h-40">
                <div style={{ flexGrow: 100 - totalPct }} />
                {stacked ? (
                  <div className="w-full flex flex-col rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105" style={{ flexGrow: totalPct }}>
                    <div className={`w-full transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-blue-500 to-blue-400 shadow-lg shadow-blue-500/40' : 'bg-blue-500/70 group-hover:bg-blue-500'}`} style={{ flexGrow: day.input }} />
                    <div className={`w-full transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/40' : 'bg-emerald-500/70 group-hover:bg-emerald-500'}`} style={{ flexGrow: day.output }} />
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-1" style={{ flexGrow: totalPct }}>
                    <div className={`w-full rounded-lg transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-blue-500 to-blue-400 shadow-lg shadow-blue-500/30' : 'bg-blue-500/70 group-hover:bg-blue-500'}`} style={{ flexGrow: day.input }} />
                    <div className={`w-full rounded-lg transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/30' : 'bg-emerald-500/70 group-hover:bg-emerald-500'}`} style={{ flexGrow: day.output }} />
                  </div>
                )}
              </div>
              <div className={`text-xs font-medium ${isCurrent ? 'text-white' : 'text-slate-500'} transition-colors`}>{day.label}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-500 rounded-sm shadow-sm shadow-blue-500/30" />
          <span className="text-sm text-slate-400 font-medium">Input tokens</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-sm shadow-sm shadow-emerald-500/30" />
          <span className="text-sm text-slate-400 font-medium">Output tokens</span>
        </div>
      </div>
    </div>
  );
};

export default BarChart;
