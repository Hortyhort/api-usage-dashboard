import { useMemo } from 'react';

const LineChart = ({
  values,
  stroke,
  label,
  formatValue,
  rangeLabel,
}: {
  values: number[];
  stroke: string;
  label: string;
  formatValue: (value: number) => string;
  rangeLabel?: string;
}) => {
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const points = useMemo(() => {
    if (!values.length || maxValue === 0) return '';
    return values.map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    }).join(' ');
  }, [values, maxValue]);

  const latestValue = values[values.length - 1] ?? 0;
  const displayRangeLabel = rangeLabel ?? 'Past 7 days';

  // Generate accessible description
  const chartDescription = useMemo(() => {
    if (!values.length) return 'No data available';
    const trend = values.length > 1
      ? values[values.length - 1] > values[0] ? 'increasing' : values[values.length - 1] < values[0] ? 'decreasing' : 'stable'
      : 'single data point';
    return `${label} showing ${trend} trend. Range: ${formatValue(minValue)} to ${formatValue(maxValue)}. Latest value: ${formatValue(latestValue)}. ${displayRangeLabel}.`;
  }, [values, label, formatValue, minValue, maxValue, latestValue, displayRangeLabel]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-claude-text">{label}</h3>
          <p className="text-sm text-claude-text-muted mt-1">Latest: {formatValue(latestValue)}</p>
        </div>
        <div className="text-xs text-claude-text-muted">{displayRangeLabel}</div>
      </div>
      <div className="relative h-48" role="img" aria-label={`${label} trend chart`} aria-describedby="line-chart-desc">
        <span id="line-chart-desc" className="sr-only">{chartDescription}</span>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          {points && (
            <>
              <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={`${points} 100,100 0,100`} fill="url(#lineFill)" stroke="none" />
            </>
          )}
        </svg>
        {!points && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-claude-text-muted" role="status">
            No data in range
          </div>
        )}
      </div>
    </div>
  );
};

export default LineChart;
