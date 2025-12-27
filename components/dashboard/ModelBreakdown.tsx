import type { ModelBreakdown as ModelBreakdownType } from '../../types/dashboard';
import ProgressBar from '../ui/ProgressBar';
import { formatNumber } from '../../lib/formatters';

const ModelBreakdown = ({ models }: { models: ModelBreakdownType[] }) => {
  const colors = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-400 shadow-sm shadow-blue-500/30',
    violet: 'bg-gradient-to-r from-violet-500 to-violet-400 shadow-sm shadow-violet-500/30',
    emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/30',
  } as const;
  const textColors = { blue: 'text-blue-400', violet: 'text-violet-400', emerald: 'text-emerald-400' } as const;

  return (
    <div className="space-y-6">
      {models.map((model) => (
        <div key={model.model} className="group">
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-slate-200 font-medium group-hover:text-white transition-colors">{model.model}</span>
            <span className={`${textColors[model.color]} tabular-nums font-medium`}>{formatNumber(model.tokens)}</span>
          </div>
          <ProgressBar value={model.percentage} max={100} colorClass={colors[model.color]} />
          <div className="text-right text-xs text-slate-500 mt-2 tabular-nums font-medium">{model.percentage}%</div>
        </div>
      ))}
    </div>
  );
};

export default ModelBreakdown;
