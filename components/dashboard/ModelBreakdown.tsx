import type { ModelBreakdown as ModelBreakdownType } from '../../types/dashboard';
import ProgressBar from '../ui/ProgressBar';
import { formatNumber } from '../../lib/formatters';
import DonutChart from '../charts/DonutChart';

const ModelBreakdown = ({
  models,
  selectedModel,
  onSelectModel,
}: {
  models: ModelBreakdownType[];
  selectedModel?: string | null;
  onSelectModel?: (model: string) => void;
}) => {
  const colors = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-400 shadow-sm shadow-blue-500/30',
    violet: 'bg-gradient-to-r from-violet-500 to-violet-400 shadow-sm shadow-violet-500/30',
    emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/30',
  } as const;
  const textColors = { blue: 'text-blue-400', violet: 'text-violet-400', emerald: 'text-emerald-400' } as const;
  const ringColors = { blue: '#60a5fa', violet: '#a78bfa', emerald: '#34d399' } as const;
  const totalTokens = models.reduce((sum, model) => sum + model.tokens, 0);
  const activeModel = selectedModel ? models.find((model) => model.model === selectedModel) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <DonutChart
          segments={models.map((model) => ({ label: model.model, value: model.tokens, color: ringColors[model.color] }))}
          activeLabel={selectedModel ?? null}
          onSelect={onSelectModel}
        />
        <div className="text-xs text-slate-500">Total tokens: <span className="text-slate-200 font-medium">{formatNumber(totalTokens)}</span></div>
      </div>
      {activeModel && (
        <div className="glass-card glass-border rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Focused model</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm text-white font-medium">{activeModel.model}</div>
            <div className={`${textColors[activeModel.color]} text-sm font-semibold`}>{formatNumber(activeModel.tokens)}</div>
          </div>
          <div className="text-xs text-slate-500 mt-1">{activeModel.percentage}% of total usage</div>
        </div>
      )}
      {models.map((model) => (
        <button
          key={model.model}
          type="button"
          onClick={() => onSelectModel?.(model.model)}
          className={`w-full text-left group rounded-xl transition-all ${selectedModel === model.model ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'} p-2`}
        >
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-slate-200 font-medium group-hover:text-white transition-colors">{model.model}</span>
            <span className={`${textColors[model.color]} tabular-nums font-medium`}>{formatNumber(model.tokens)}</span>
          </div>
          <ProgressBar value={model.percentage} max={100} colorClass={colors[model.color]} />
          <div className="text-right text-xs text-slate-500 mt-2 tabular-nums font-medium">{model.percentage}%</div>
        </button>
      ))}
    </div>
  );
};

export default ModelBreakdown;
