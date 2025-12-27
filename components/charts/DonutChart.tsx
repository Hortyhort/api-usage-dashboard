import { useMemo } from 'react';

const DonutChart = ({
  segments,
  size = 140,
  strokeWidth = 18,
  activeLabel,
  onSelect,
  chartLabel = 'Distribution chart',
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  activeLabel?: string | null;
  onSelect?: (label: string) => void;
  chartLabel?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  const slices = useMemo(() => {
    let offset = 0;
    return segments.map((segment) => {
      const percentage = ((segment.value / total) * 100).toFixed(1);
      const dash = (segment.value / total) * circumference;
      const slice = {
        ...segment,
        percentage,
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: -offset,
      };
      offset += dash;
      return slice;
    });
  }, [segments, total, circumference]);

  // Generate accessible description
  const chartDescription = useMemo(() => {
    return slices.map((s) => `${s.label}: ${s.value.toLocaleString()} (${s.percentage}%)`).join(', ');
  }, [slices]);

  const handleKeyDown = (event: React.KeyboardEvent, label: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(label);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
        role="img"
        aria-label={chartLabel}
        aria-describedby="donut-chart-desc"
      >
        <desc id="donut-chart-desc">{chartDescription}</desc>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {slices.map((slice, index) => (
            <circle
              key={slice.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
              opacity={activeLabel && slice.label !== activeLabel ? 0.4 : 1}
              onClick={() => onSelect?.(slice.label)}
              onKeyDown={(e) => handleKeyDown(e, slice.label)}
              tabIndex={onSelect ? 0 : undefined}
              role={onSelect ? 'button' : undefined}
              aria-label={`${slice.label}: ${slice.value.toLocaleString()} (${slice.percentage}%)`}
              style={{ cursor: onSelect ? 'pointer' : 'default', transition: 'opacity 0.2s ease', outline: 'none' }}
              className="focus:ring-2 focus:ring-blue-500"
            >
              <title>{`${slice.label}: ${slice.value.toLocaleString()} (${slice.percentage}%)`}</title>
            </circle>
          ))}
        </g>
        <circle cx={size / 2} cy={size / 2} r={radius - strokeWidth / 2} fill="#FAF8F3" />
      </svg>
    </div>
  );
};

export default DonutChart;
