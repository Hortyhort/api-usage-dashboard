const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ProgressBar = ({ value, max, colorClass, showLabel = false }: { value: number; max: number; colorClass: string; showLabel?: boolean }) => {
  const percentage = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="h-2 bg-slate-700/40 rounded-full overflow-hidden ring-1 ring-white/5">
        <div className={`h-full rounded-full transition-all duration-700 ease-out-expo ${colorClass}`} style={{ width: `${percentage}%` }} />
      </div>
      {showLabel && <div className="text-right text-xs text-slate-500 tabular-nums font-medium">{percentage.toFixed(1)}%</div>}
    </div>
  );
};

export default ProgressBar;
