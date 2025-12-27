import { useEffect, useMemo } from 'react';
import type { UsageLog } from '../../types/dashboard';
import { Icons } from '../icons';
import { formatModelName } from '../../lib/formatters';
import { useToast } from '../ui/ToastProvider';

const UsageLogDrawer = ({ log, isOpen, onClose, isClient }: { log: UsageLog | null; isOpen: boolean; onClose: () => void; isClient: boolean }) => {
  const { addToast } = useToast();
  const requestId = useMemo(() => (log ? `REQ-${log.id.toString().padStart(6, '0')}` : ''), [log]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleCopy = async (value: string, label: string) => {
    if (!isClient || !navigator.clipboard) {
      addToast({
        title: 'Clipboard unavailable',
        description: 'Use HTTPS or localhost to enable clipboard access.',
        variant: 'warning',
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      addToast({
        title: `${label} copied`,
        description: 'Content is now in your clipboard.',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Copy failed',
        description: 'Clipboard permissions were denied.',
        variant: 'error',
      });
    }
  };

  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 z-[70] flex" role="dialog" aria-modal="true" aria-labelledby="log-drawer-title">
      <button type="button" aria-label="Close log details" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="ml-auto w-full max-w-lg h-full bg-white border-l border-claude-border p-6 overflow-y-auto relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-claude-text-muted uppercase tracking-wider">Usage Log</p>
            <h2 id="log-drawer-title" className="text-xl font-semibold text-claude-text mt-1">Request Details</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-claude-beige text-claude-text-muted hover:text-claude-text transition-colors" aria-label="Close">
            <Icons.X />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-claude-beige border border-claude-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-claude-text-muted">Request ID</div>
                <div className="text-sm text-claude-text font-medium mt-1 font-mono">{requestId}</div>
              </div>
              <button type="button" onClick={() => handleCopy(requestId, 'Request ID')} className="p-2 rounded-lg hover:bg-white text-claude-text-muted hover:text-claude-text transition-colors" aria-label="Copy request ID">
                <Icons.Copy />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-claude-beige border border-claude-border rounded-2xl p-4">
              <div className="text-xs text-claude-text-muted">Status</div>
              <div className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                {log.status}
              </div>
            </div>
            <div className="bg-claude-beige border border-claude-border rounded-2xl p-4">
              <div className="text-xs text-claude-text-muted">Latency</div>
              <div className="text-lg text-claude-text font-semibold mt-2 tabular-nums">{log.latency}s</div>
            </div>
            <div className="bg-claude-beige border border-claude-border rounded-2xl p-4">
              <div className="text-xs text-claude-text-muted">Input Tokens</div>
              <div className="text-lg text-claude-terracotta font-semibold mt-2 tabular-nums">{log.inputTokens.toLocaleString()}</div>
            </div>
            <div className="bg-claude-beige border border-claude-border rounded-2xl p-4">
              <div className="text-xs text-claude-text-muted">Output Tokens</div>
              <div className="text-lg text-claude-terracotta-dark font-semibold mt-2 tabular-nums">{log.outputTokens.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-claude-beige border border-claude-border rounded-2xl p-4 space-y-3">
            <div>
              <div className="text-xs text-claude-text-muted">Model</div>
              <div className="text-sm text-claude-text font-medium mt-1">{formatModelName(log.model)}</div>
            </div>
            <div>
              <div className="text-xs text-claude-text-muted">Timestamp</div>
              <div className="text-sm text-claude-text-muted font-mono mt-1">{log.timestamp}</div>
            </div>
            <div>
              <div className="text-xs text-claude-text-muted">API Key</div>
              <div className="text-sm text-claude-text-muted mt-1">{log.apiKey}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleCopy(JSON.stringify(log, null, 2), 'Log JSON')}
              className="flex-1 flex items-center justify-center gap-2 bg-claude-beige hover:bg-claude-beige-dark text-claude-text px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-claude-border"
            >
              <Icons.Copy />
              Copy JSON
            </button>
            <button
              type="button"
              onClick={() => handleCopy(`${log.timestamp} | ${formatModelName(log.model)} | ${log.status}`, 'Summary')}
              className="flex-1 flex items-center justify-center gap-2 bg-claude-beige hover:bg-claude-beige-dark text-claude-text px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-claude-border"
            >
              <Icons.Download />
              Copy Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageLogDrawer;
