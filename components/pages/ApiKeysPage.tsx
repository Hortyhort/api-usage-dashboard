import { useEffect, useMemo, useRef, useState } from 'react';
import type { ApiKey } from '../../types/dashboard';
import { Icons } from '../icons';
import { formatNumber } from '../../lib/formatters';
import { useToast } from '../ui/ToastProvider';
import EmptyState from '../ui/EmptyState';

type CopyStatus = 'success' | 'error' | 'unavailable';

const ApiKeysPage = ({ apiKeys, isClient }: { apiKeys: ApiKey[]; isClient: boolean }) => {
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});
  const [copyStatus, setCopyStatus] = useState<{ key: string; status: CopyStatus } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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

  const filteredKeys = useMemo(() => apiKeys.filter((apiKey) => {
    if (statusFilter !== 'all' && apiKey.status !== statusFilter) return false;
    if (search) {
      const query = search.toLowerCase();
      const matchesName = apiKey.name.toLowerCase().includes(query);
      const matchesKey = apiKey.key.toLowerCase().includes(query);
      if (!matchesName && !matchesKey) return false;
    }
    return true;
  }), [apiKeys, search, statusFilter]);

  const hasFilters = search || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-claude-text dark:text-claude-dark-text">API Keys</h1>
          <p className="text-claude-text-muted dark:text-claude-dark-text-muted dark:text-claude-dark-text-muted text-sm mt-1.5 font-medium">Manage your API keys and access tokens</p>
        </div>
        <button type="button" onClick={handleCreateKey} className="flex items-center gap-2 bg-gradient-to-r from-claude-terracotta to-claude-terracotta hover:from-claude-terracotta-dark hover:to-claude-terracotta-dark active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-claude-terracotta/25">
          <Icons.Plus />
          Create New Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
        <EmptyState
          title="No API keys yet"
          description="Generate your first key to start sending requests."
          action={
            <button type="button" onClick={handleCreateKey} className="bg-claude-terracotta/10 text-claude-terracotta px-4 py-2 rounded-lg text-sm font-medium">
              Create key
            </button>
          }
        />
      ) : (
        <>
          <div className="bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border dark:border-claude-dark-border rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <label htmlFor="api-key-search" className="sr-only">Search API keys</label>
                <input
                  id="api-key-search"
                  type="text"
                  placeholder="Search by name or key..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-claude-beige dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text pl-10 pr-4 py-2.5 rounded-xl border border-claude-border dark:border-claude-dark-border focus:border-claude-terracotta/50 focus:outline-none placeholder-claude-text-muted"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-claude-text-muted dark:text-claude-dark-text-muted"><Icons.Search /></div>
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')} className="bg-claude-beige dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text px-4 py-2.5 rounded-xl border border-claude-border dark:border-claude-dark-border focus:border-claude-terracotta/50 focus:outline-none">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {hasFilters && (
                <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }} className="text-sm text-claude-text dark:text-claude-dark-text-muted dark:text-claude-dark-text-muted hover:text-claude-text transition-colors">
                  Clear filters
                </button>
              )}
            </div>
          </div>
          {filteredKeys.length === 0 ? (
            <EmptyState
              title="No keys match your filters"
              description="Try adjusting your search or filters."
              action={hasFilters ? (
                <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }} className="bg-claude-terracotta/10 text-claude-terracotta px-4 py-2 rounded-lg text-sm font-medium">
                  Clear filters
                </button>
              ) : undefined}
            />
          ) : (
        <div className="bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border dark:border-claude-dark-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-claude-border dark:border-claude-dark-border">
                  <th className="text-left text-xs font-medium text-claude-text-muted dark:text-claude-dark-text-muted uppercase tracking-wider px-6 py-4">Name</th>
                  <th className="text-left text-xs font-medium text-claude-text-muted dark:text-claude-dark-text-muted uppercase tracking-wider px-6 py-4">Key</th>
                  <th className="text-left text-xs font-medium text-claude-text-muted dark:text-claude-dark-text-muted uppercase tracking-wider px-6 py-4">Usage</th>
                  <th className="text-left text-xs font-medium text-claude-text-muted dark:text-claude-dark-text-muted uppercase tracking-wider px-6 py-4">Last Used</th>
                  <th className="text-left text-xs font-medium text-claude-text-muted dark:text-claude-dark-text-muted uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-right text-xs font-medium text-claude-text-muted dark:text-claude-dark-text-muted uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-claude-border">
                {filteredKeys.map((apiKey) => {
                  const status = copyStatus?.key === apiKey.key ? copyStatus.status : null;
                  const CopyIcon = status === 'success'
                    ? Icons.Check
                    : status === 'error' || status === 'unavailable'
                      ? Icons.Warning
                      : Icons.Copy;
                  const copyTone = status === 'success'
                    ? 'text-emerald-600'
                    : status === 'error'
                      ? 'text-red-600'
                      : status === 'unavailable'
                        ? 'text-amber-600'
                        : copySupported
                          ? 'text-claude-text-muted dark:text-claude-dark-text-muted hover:text-claude-text'
                          : 'text-claude-border hover:text-claude-text-muted dark:text-claude-dark-text-muted';
                  const copyTitle = !copySupported
                    ? 'Clipboard copy unavailable in this context'
                    : status === 'success'
                      ? 'Copied'
                      : 'Copy to clipboard';

                  return (
                    <tr key={apiKey.id} className="hover:bg-claude-beige dark:hover:bg-claude-dark-surface-hover/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-claude-text dark:text-claude-dark-text font-medium">{apiKey.name}</div>
                        <div className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">Created {apiKey.created}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-claude-text dark:text-claude-dark-text-muted dark:text-claude-dark-text-muted font-mono bg-claude-beige px-2 py-1 rounded">
                            {showKey[apiKey.id] ? 'sk-ant-api03-xxxx...full-key-here' : apiKey.key}
                          </code>
                          <button
                            type="button"
                            onClick={() => setShowKey({ ...showKey, [apiKey.id]: !showKey[apiKey.id] })}
                            className="p-1.5 rounded-lg hover:bg-claude-beige dark:hover:bg-claude-dark-surface-hover dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text-muted dark:text-claude-dark-text-muted hover:text-claude-text transition-colors"
                            aria-pressed={!!showKey[apiKey.id]}
                            aria-label={showKey[apiKey.id] ? 'Hide key' : 'Reveal key'}
                          >
                            {showKey[apiKey.id] ? <Icons.EyeOff /> : <Icons.Eye />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(apiKey.key)}
                            className={`p-1.5 rounded-lg transition-colors ${copySupported ? 'hover:bg-claude-beige dark:hover:bg-claude-dark-surface-hover' : 'cursor-not-allowed hover:bg-claude-beige dark:hover:bg-claude-dark-surface-hover/50'} ${copyTone}`}
                            title={copyTitle}
                            aria-label="Copy key"
                          >
                            <CopyIcon />
                          </button>
                          {status && (
                            <span className={`text-xs font-medium ${status === 'success' ? 'text-emerald-600' : status === 'unavailable' ? 'text-amber-600' : 'text-red-600'}`}>
                              {status === 'success' ? 'Copied' : status === 'unavailable' ? 'Unavailable' : 'Failed'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-claude-text dark:text-claude-dark-text font-medium tabular-nums">{formatNumber(apiKey.usage)}</div>
                        <div className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">tokens</div>
                      </td>
                      <td className="px-6 py-4 text-claude-text-muted dark:text-claude-dark-text-muted">{apiKey.lastUsed}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${apiKey.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-claude-beige dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text-muted dark:text-claude-dark-text-muted'}`}>
                          {apiKey.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(apiKey.name)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-claude-text-muted dark:text-claude-dark-text-muted hover:text-red-600 transition-colors"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-claude-border dark:border-claude-dark-border text-sm text-claude-text dark:text-claude-dark-text-muted dark:text-claude-dark-text-muted">
            <span>Showing {filteredKeys.length} of {apiKeys.length} keys</span>
            {hasFilters && <span className="text-xs text-claude-text-muted dark:text-claude-dark-text-muted">Filters active</span>}
          </div>
        </div>
          )}
        </>
      )}
    </div>
  );
};

export default ApiKeysPage;
