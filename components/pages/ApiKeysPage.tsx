import { useEffect, useRef, useState } from 'react';
import type { ApiKey } from '../../types/dashboard';
import { Icons } from '../icons';
import { formatNumber } from '../../lib/formatters';
import { useToast } from '../ui/ToastProvider';
import EmptyState from '../ui/EmptyState';

type CopyStatus = 'success' | 'error' | 'unavailable';

const ApiKeysPage = ({ apiKeys, isClient }: { apiKeys: ApiKey[]; isClient: boolean }) => {
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});
  const [copyStatus, setCopyStatus] = useState<{ key: string; status: CopyStatus } | null>(null);
  const resetCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copySupported = isClient && typeof navigator !== 'undefined' && navigator.clipboard && (typeof window === 'undefined' || window.isSecureContext);
  const { addToast } = useToast();

  useEffect(() => {
    return () => {
      if (resetCopyTimerRef.current) {
        clearTimeout(resetCopyTimerRef.current);
      }
    };
  }, []);

  const setCopyFeedback = (key: string, status: CopyStatus) => {
    setCopyStatus({ key, status });
    if (resetCopyTimerRef.current) {
      clearTimeout(resetCopyTimerRef.current);
    }
    resetCopyTimerRef.current = setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleCopy = async (key: string) => {
    if (!copySupported) {
      setCopyFeedback(key, 'unavailable');
      addToast({
        title: 'Clipboard unavailable',
        description: 'Use HTTPS or localhost to enable clipboard access.',
        variant: 'warning',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(key);
      setCopyFeedback(key, 'success');
      addToast({
        title: 'API key copied',
        description: 'The key is now in your clipboard.',
        variant: 'success',
      });
    } catch (error) {
      setCopyFeedback(key, 'error');
      addToast({
        title: 'Copy failed',
        description: 'Clipboard permissions were denied.',
        variant: 'error',
      });
    }
  };

  const handleCreateKey = () => {
    addToast({
      title: 'Create key',
      description: 'Connect this action to your backend to generate a new key.',
      variant: 'info',
    });
  };

  const handleDeleteKey = (keyName: string) => {
    addToast({
      title: 'Delete key',
      description: `Hook this action to revoke ${keyName}.`,
      variant: 'warning',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">API Keys</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Manage your API keys and access tokens</p>
        </div>
        <button type="button" onClick={handleCreateKey} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25">
          <Icons.Plus />
          Create New Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
        <EmptyState
          title="No API keys yet"
          description="Generate your first key to start sending requests."
          action={
            <button type="button" onClick={handleCreateKey} className="bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-lg text-sm font-medium">
              Create key
            </button>
          }
        />
      ) : (
        <div className="glass-card glass-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Name</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Key</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Usage</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Last Used</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {apiKeys.map((apiKey) => {
                  const status = copyStatus?.key === apiKey.key ? copyStatus.status : null;
                  const CopyIcon = status === 'success'
                    ? Icons.Check
                    : status === 'error' || status === 'unavailable'
                      ? Icons.Warning
                      : Icons.Copy;
                  const copyTone = status === 'success'
                    ? 'text-emerald-400'
                    : status === 'error'
                      ? 'text-red-400'
                      : status === 'unavailable'
                        ? 'text-amber-400'
                        : copySupported
                          ? 'text-slate-400 hover:text-white'
                          : 'text-slate-500 hover:text-slate-400';
                  const copyTitle = !copySupported
                    ? 'Clipboard copy unavailable in this context'
                    : status === 'success'
                      ? 'Copied'
                      : 'Copy to clipboard';

                  return (
                    <tr key={apiKey.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{apiKey.name}</div>
                        <div className="text-xs text-slate-500">Created {apiKey.created}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded">
                            {showKey[apiKey.id] ? 'sk-ant-api03-xxxx...full-key-here' : apiKey.key}
                          </code>
                          <button
                            type="button"
                            onClick={() => setShowKey({ ...showKey, [apiKey.id]: !showKey[apiKey.id] })}
                            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
                            aria-pressed={!!showKey[apiKey.id]}
                            aria-label={showKey[apiKey.id] ? 'Hide key' : 'Reveal key'}
                          >
                            {showKey[apiKey.id] ? <Icons.EyeOff /> : <Icons.Eye />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(apiKey.key)}
                            className={`p-1.5 rounded-lg transition-colors ${copySupported ? 'hover:bg-white/[0.06]' : 'cursor-not-allowed hover:bg-white/[0.02]'} ${copyTone}`}
                            title={copyTitle}
                            aria-label="Copy key"
                          >
                            <CopyIcon />
                          </button>
                          {status && (
                            <span className={`text-xs font-medium ${status === 'success' ? 'text-emerald-400' : status === 'unavailable' ? 'text-amber-400' : 'text-red-400'}`}>
                              {status === 'success' ? 'Copied' : status === 'unavailable' ? 'Unavailable' : 'Failed'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium tabular-nums">{formatNumber(apiKey.usage)}</div>
                        <div className="text-xs text-slate-500">tokens</div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{apiKey.lastUsed}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${apiKey.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                          {apiKey.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(apiKey.name)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                          aria-label={`Delete ${apiKey.name}`}
                        >
                          <Icons.Trash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeysPage;
