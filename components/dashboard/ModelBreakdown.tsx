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
    blue: 'bg-gradient-to-r from-claude-terracotta to-claude-terracotta shadow-sm shadow-claude-terracotta/30',
    violet: 'bg-gradient-to-r from-claude-terracotta-dark to-claude-terracotta-dark shadow-sm shadow-claude-terracotta-dark/30',
    emerald: 'bg-gradient-to-r from-[#E8A088] to-[#E8A088] shadow-sm shadow-[#E8A088]/30',
  } as const;
  const textColors = { blue: 'text-claude-terracotta', violet: 'text-claude-terracotta-dark', emerald: 'text-[#C75B39]' } as const;
  const ringColors = { blue: '#DA7756', violet: '#C75B39', emerald: '#E8A088' } as const;
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
        <div className="text-xs text-claude-text-muted">Total tokens: <span className="text-claude-text font-medium">{formatNumber(totalTokens)}</span></div>
      </div>
      {activeModel && (
        <div className="bg-claude-beige border border-claude-border rounded-xl p-4">
          <div className="text-xs text-claude-text-muted uppercase tracking-wider">Focused model</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm text-claude-text font-medium">{activeModel.model}</div>
            <div className={`${textColors[activeModel.color]} text-sm font-semibold`}>{formatNumber(activeModel.tokens)}</div>
          </div>
          <div className="text-xs text-claude-text-muted mt-1">{activeModel.percentage}% of total usage</div>
        </div>
      )}
      {models.map((model) => (
        <button
          key={model.model}
          type="button"
          onClick={() => onSelectModel?.(model.model)}
          className={`w-full text-left group rounded-xl transition-all ${selectedModel === model.model ? 'bg-claude-beige' : 'hover:bg-claude-beige/50'} p-2`}
        >
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-claude-text font-medium group-hover:text-claude-text transition-colors">{model.model}</span>
            <span className={`${textColors[model.color]} tabular-nums font-medium`}>{formatNumber(model.tokens)}</span>
          </div>
          <ProgressBar value={model.percentage} max={100} colorClass={colors[model.color]} />
          <div className="text-right text-xs text-claude-text-muted mt-2 tabular-nums font-medium">{model.percentage}%</div>
        </button>
      ))}
    </div>
  );
};

export default ModelBreakdown;
