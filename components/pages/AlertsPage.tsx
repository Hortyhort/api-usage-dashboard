import { useEffect, useMemo, useRef, useState } from 'react';
import type { Alert } from '../../types/dashboard';
import { Icons } from '../icons';
import EmptyState from '../ui/EmptyState';

const STORAGE_KEY = 'api-usage-dashboard:alert-thresholds';
const DEFAULT_THRESHOLDS = { budget: 80, rateLimit: 90, spike: 50 };

const AlertsPage = ({ alerts, onMarkRead, onMarkAllRead, isClient }: { alerts: Alert[]; onMarkRead: (id: number) => void; onMarkAllRead: () => void; isClient: boolean }) => {
  const alertStyles = {
    warning: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-l-amber-500', icon: Icons.Warning, iconBg: 'bg-amber-500/20 text-amber-500 dark:text-amber-400' },
    error: { bg: 'bg-red-500/10 dark:bg-red-500/20', border: 'border-l-red-500', icon: Icons.X, iconBg: 'bg-red-500/20 text-red-500 dark:text-red-400' },
    success: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-l-emerald-500', icon: Icons.Check, iconBg: 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400' },
    info: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-l-blue-500', icon: Icons.Info, iconBg: 'bg-blue-500/20 text-blue-500 dark:text-blue-400' },
  } as const;

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHydrateRef = useRef(false);

  useEffect(() => {
    if (!isClient) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as typeof DEFAULT_THRESHOLDS;
        setThresholds({ ...DEFAULT_THRESHOLDS, ...parsed });
      } catch (error) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    didHydrateRef.current = true;
  }, [isClient]);

  useEffect(() => {
    if (!isClient || !didHydrateRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
      setSaveStatus('saved');
      resetTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 1500);
    }, 400);
  }, [thresholds, isClient]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const unreadCount = alerts.filter((alert) => !alert.read).length;
  const visibleAlerts = useMemo(() => {
    if (filter === 'unread') {
      return alerts.filter((alert) => !alert.read);
    }
    return alerts;
  }, [alerts, filter]);

  const hasUnread = alerts.some((alert) => !alert.read);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-claude-text dark:text-claude-dark-text">Alerts</h1>
          <p className="text-claude-text dark:text-claude-dark-text-muted text-sm mt-1.5 font-medium">Stay informed about your API usage</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-claude-beige dark:bg-claude-dark-surface-hover p-1 rounded-lg">
            <button type="button" onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${filter === 'all' ? 'bg-white text-claude-text dark:text-claude-dark-text shadow-sm' : 'text-claude-text dark:text-claude-dark-text-muted hover:text-claude-text dark:text-claude-dark-text hover:bg-white dark:hover:bg-claude-dark-surface/50'}`}>
              All ({alerts.length})
            </button>
            <button type="button" onClick={() => setFilter('unread')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${filter === 'unread' ? 'bg-white text-claude-text dark:text-claude-dark-text shadow-sm' : 'text-claude-text dark:text-claude-dark-text-muted hover:text-claude-text dark:text-claude-dark-text hover:bg-white dark:hover:bg-claude-dark-surface/50'}`}>
              Unread ({unreadCount})
            </button>
          </div>
          <button type="button" onClick={onMarkAllRead} disabled={!hasUnread} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${hasUnread ? 'text-claude-text dark:text-claude-dark-text-muted hover:text-claude-text dark:text-claude-dark-text hover:bg-claude-beige dark:bg-claude-dark-surface-hover' : 'text-claude-border cursor-not-allowed'}`}>
            <Icons.Check />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-claude-text dark:text-claude-dark-text font-medium">Alert Thresholds</h3>
          <div className="flex items-center gap-3 text-xs text-claude-text dark:text-claude-dark-text-muted">
            {saveStatus === 'saving' && <span className="animate-pulse">Saving...</span>}
            {saveStatus === 'saved' && <span className="text-emerald-600">Saved</span>}
            <button type="button" onClick={() => setThresholds(DEFAULT_THRESHOLDS)} className="text-claude-text dark:text-claude-dark-text-muted hover:text-claude-text dark:text-claude-dark-text transition-colors">
              Reset defaults
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="budget-warning" className="text-xs text-claude-text dark:text-claude-dark-text-muted font-medium uppercase tracking-wider">Budget Warning</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="budget-warning"
                type="number"
                min={1}
                max={100}
                value={thresholds.budget}
                onChange={(event) => setThresholds((prev) => ({ ...prev, budget: Number(event.target.value) }))}
                className="w-20 bg-claude-beige dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text px-3 py-2 rounded-lg border border-claude-border focus:border-claude-terracotta/50 focus:outline-none"
              />
              <span className="text-claude-text dark:text-claude-dark-text-muted">%</span>
            </div>
          </div>
          <div>
            <label htmlFor="rate-limit-warning" className="text-xs text-claude-text dark:text-claude-dark-text-muted font-medium uppercase tracking-wider">Rate Limit Warning</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="rate-limit-warning"
                type="number"
                min={1}
                max={100}
                value={thresholds.rateLimit}
                onChange={(event) => setThresholds((prev) => ({ ...prev, rateLimit: Number(event.target.value) }))}
                className="w-20 bg-claude-beige dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text px-3 py-2 rounded-lg border border-claude-border focus:border-claude-terracotta/50 focus:outline-none"
              />
              <span className="text-claude-text dark:text-claude-dark-text-muted">%</span>
            </div>
          </div>
          <div>
            <label htmlFor="usage-spike" className="text-xs text-claude-text dark:text-claude-dark-text-muted font-medium uppercase tracking-wider">Usage Spike</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="usage-spike"
                type="number"
                min={1}
                max={300}
                value={thresholds.spike}
                onChange={(event) => setThresholds((prev) => ({ ...prev, spike: Number(event.target.value) }))}
                className="w-20 bg-claude-beige dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text px-3 py-2 rounded-lg border border-claude-border focus:border-claude-terracotta/50 focus:outline-none"
              />
              <span className="text-claude-text dark:text-claude-dark-text-muted">% increase</span>
            </div>
          </div>
        </div>
      </div>

      {visibleAlerts.length === 0 ? (
        <EmptyState title={filter === 'unread' ? 'No unread alerts' : 'No alerts'} description="You are all caught up. We'll notify you when something needs attention." />
      ) : (
        <div className="space-y-3">
          {visibleAlerts.map((alert) => {
            const style = alertStyles[alert.type];
            return (
              <div key={alert.id} className={`bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-4 border-l-4 ${style.border} ${!alert.read ? style.bg : ''} transition-all duration-200`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${style.iconBg}`}><style.icon /></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${!alert.read ? 'text-claude-text dark:text-claude-dark-text' : 'text-claude-text dark:text-claude-dark-text-muted'}`}>{alert.title}</h3>
                      <span className="text-xs text-claude-text dark:text-claude-dark-text-muted">{alert.time}</span>
                    </div>
                    <p className="text-sm text-claude-text dark:text-claude-dark-text-muted mt-1">{alert.message}</p>
                  </div>
                  {!alert.read && (
                    <button type="button" onClick={() => onMarkRead(alert.id)} className="p-1.5 rounded-lg hover:bg-claude-beige dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text-muted hover:text-claude-text dark:text-claude-dark-text transition-colors" aria-label="Mark alert as read">
                      <Icons.Check />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
