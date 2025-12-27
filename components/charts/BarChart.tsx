import { useMemo, useState } from 'react';
import type { DailyUsage } from '../../types/dashboard';
import { formatNumber } from '../../lib/formatters';

const BarChart = ({
  data,
  stacked,
  highlightDate,
  overlaySeries,
  chartLabel = 'Daily usage chart',
}: {
  data: DailyUsage[];
  stacked: boolean;
  highlightDate?: string;
  overlaySeries?: { label: string; values: number[]; color: string };
  chartLabel?: string;
}) => {
  const [tooltip, setTooltip] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((day) => day.input + day.output), 0);
  const totalInput = data.reduce((sum, d) => sum + d.input, 0);
  const totalOutput = data.reduce((sum, d) => sum + d.output, 0);
  const overlayPoints = useMemo(() => {
    if (!overlaySeries || overlaySeries.values.length === 0 || maxValue === 0) return '';
    const pointCount = Math.min(overlaySeries.values.length, data.length);
    const points = [];
    for (let i = 0; i < pointCount; i += 1) {
      const value = overlaySeries.values[i] ?? 0;
      const x = pointCount === 1 ? 0 : (i / (pointCount - 1)) * 100;
      const y = 100 - (value / maxValue) * 100;
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  }, [overlaySeries, data.length, maxValue]);

  // Accessible summary
  const chartDescription = useMemo(() => {
    if (!data.length) return 'No usage data available';
    return `${chartLabel} showing ${data.length} days of data. Total input tokens: ${formatNumber(totalInput)}. Total output tokens: ${formatNumber(totalOutput)}. Combined total: ${formatNumber(totalInput + totalOutput)}.`;
  }, [data.length, chartLabel, totalInput, totalOutput]);

  return (
    <div className="space-y-4" role="figure" aria-label={chartLabel}>
      <span className="sr-only">{chartDescription}</span>
      <div className="relative h-48">
        <div className="flex items-end gap-2 sm:gap-3 h-48 overflow-x-auto pb-2 scrollbar-hide" role="list" aria-label="Daily usage bars">
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
                role="listitem"
                aria-label={`${day.label}: ${formatNumber(day.input)} input tokens, ${formatNumber(day.output)} output tokens, ${formatNumber(total)} total`}
              >
                {tooltip === index && (
                  <div className="absolute bottom-full mb-3 bg-white rounded-xl p-4 z-20 whitespace-nowrap shadow-claude-lg animate-scale-in border border-claude-border">
                    <div className="relative z-10">
                      <div className="font-semibold text-claude-text mb-2">{day.label}</div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="w-2.5 h-2.5 bg-claude-terracotta rounded-sm"></span>
                        <span className="text-claude-text-muted text-sm">Input:</span>
                        <span className="text-claude-text font-medium tabular-nums">{formatNumber(day.input)}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="w-2.5 h-2.5 bg-claude-terracotta-dark rounded-sm"></span>
                        <span className="text-claude-text-muted text-sm">Output:</span>
                        <span className="text-claude-text font-medium tabular-nums">{formatNumber(day.output)}</span>
                      </div>
                      <div className="border-t border-claude-border mt-3 pt-3">
                        <span className="text-claude-text-muted text-sm">Total:</span>
                        <span className="text-claude-text font-semibold ml-2 tabular-nums">{formatNumber(total)}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="w-full flex flex-col h-40">
                  <div style={{ flexGrow: 100 - totalPct }} />
                  {stacked ? (
                    <div className="w-full flex flex-col rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105" style={{ flexGrow: totalPct }}>
                      <div className={`w-full transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-claude-terracotta to-claude-terracotta shadow-lg shadow-claude-terracotta/40' : 'bg-claude-terracotta/70 group-hover:bg-claude-terracotta'}`} style={{ flexGrow: day.input }} />
                      <div className={`w-full transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-claude-terracotta-dark to-claude-terracotta-dark shadow-lg shadow-claude-terracotta-dark/40' : 'bg-claude-terracotta-dark/70 group-hover:bg-claude-terracotta-dark'}`} style={{ flexGrow: day.output }} />
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-1" style={{ flexGrow: totalPct }}>
                      <div className={`w-full rounded-lg transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-claude-terracotta to-claude-terracotta shadow-lg shadow-claude-terracotta/30' : 'bg-claude-terracotta/70 group-hover:bg-claude-terracotta'}`} style={{ flexGrow: day.input }} />
                      <div className={`w-full rounded-lg transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-claude-terracotta-dark to-claude-terracotta-dark shadow-lg shadow-claude-terracotta-dark/30' : 'bg-claude-terracotta-dark/70 group-hover:bg-claude-terracotta-dark'}`} style={{ flexGrow: day.output }} />
                    </div>
                  )}
                </div>
                <div className={`text-xs font-medium ${isCurrent ? 'text-claude-text' : 'text-claude-text-muted'} transition-colors`}>{day.label}</div>
              </div>
            );
          })}
        </div>
        {overlaySeries && overlayPoints && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              points={overlayPoints}
              fill="none"
              stroke={overlaySeries.color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          </svg>
        )}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 bg-gradient-to-br from-claude-terracotta to-claude-terracotta rounded-sm shadow-sm shadow-claude-terracotta/30" />
          <span className="text-sm text-claude-text-muted font-medium">Input tokens</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 bg-gradient-to-br from-claude-terracotta-dark to-claude-terracotta-dark rounded-sm shadow-sm shadow-claude-terracotta-dark/30" />
          <span className="text-sm text-claude-text-muted font-medium">Output tokens</span>
        </div>
      </div>
    </div>
  );
};

export default BarChart;
