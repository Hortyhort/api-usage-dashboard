import { useMemo } from 'react';

const DonutChart = ({
  segments,
  size = 140,
  strokeWidth = 18,
  activeLabel,
  onSelect,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  activeLabel?: string | null;
  onSelect?: (label: string) => void;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  const slices = useMemo(() => {
    let offset = 0;
    return segments.map((segment) => {
      const dash = (segment.value / total) * circumference;
      const slice = {
        ...segment,
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: -offset,
      };
      offset += dash;
      return slice;
    });
  }, [segments, total, circumference]);

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {slices.map((slice) => (
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
              style={{ cursor: onSelect ? 'pointer' : 'default', transition: 'opacity 0.2s ease' }}
            >
              <title>{`${slice.label}: ${slice.value.toLocaleString()}`}</title>
            </circle>
          ))}
        </g>
        <circle cx={size / 2} cy={size / 2} r={radius - strokeWidth / 2} fill="rgba(15, 23, 42, 0.9)" />
      </svg>
    </div>
  );
};

export default DonutChart;
