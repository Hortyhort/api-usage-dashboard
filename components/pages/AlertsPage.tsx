import type { Alert } from '../../types/dashboard';
import { Icons } from '../icons';
import EmptyState from '../ui/EmptyState';

const AlertsPage = ({ alerts, onMarkRead, onMarkAllRead }: { alerts: Alert[]; onMarkRead: (id: number) => void; onMarkAllRead: () => void }) => {
  const alertStyles = {
    warning: { bg: 'bg-amber-500/10', border: 'border-l-amber-500', icon: Icons.Warning, iconBg: 'bg-amber-500/20 text-amber-400' },
    error: { bg: 'bg-red-500/10', border: 'border-l-red-500', icon: Icons.X, iconBg: 'bg-red-500/20 text-red-400' },
    success: { bg: 'bg-emerald-500/10', border: 'border-l-emerald-500', icon: Icons.Check, iconBg: 'bg-emerald-500/20 text-emerald-400' },
    info: { bg: 'bg-blue-500/10', border: 'border-l-blue-500', icon: Icons.Info, iconBg: 'bg-blue-500/20 text-blue-400' },
  } as const;

  const hasUnread = alerts.some((alert) => !alert.read);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Alerts</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Stay informed about your API usage</p>
        </div>
        <button type="button" onClick={onMarkAllRead} disabled={!hasUnread} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${hasUnread ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-600 cursor-not-allowed'}`}>
          <Icons.Check />
          Mark all as read
        </button>
      </div>

      <div className="glass-card glass-border rounded-2xl p-5">
        <h3 className="text-white font-medium mb-4">Alert Thresholds</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="budget-warning" className="text-xs text-slate-400 font-medium uppercase tracking-wider">Budget Warning</label>
            <div className="mt-2 flex items-center gap-2">
              <input id="budget-warning" type="number" defaultValue="80" className="w-20 bg-slate-800/50 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500/50 focus:outline-none" />
              <span className="text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label htmlFor="rate-limit-warning" className="text-xs text-slate-400 font-medium uppercase tracking-wider">Rate Limit Warning</label>
            <div className="mt-2 flex items-center gap-2">
              <input id="rate-limit-warning" type="number" defaultValue="90" className="w-20 bg-slate-800/50 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500/50 focus:outline-none" />
              <span className="text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label htmlFor="usage-spike" className="text-xs text-slate-400 font-medium uppercase tracking-wider">Usage Spike</label>
            <div className="mt-2 flex items-center gap-2">
              <input id="usage-spike" type="number" defaultValue="50" className="w-20 bg-slate-800/50 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500/50 focus:outline-none" />
              <span className="text-slate-400">% increase</span>
            </div>
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <EmptyState title="No alerts" description="You are all caught up. We'll notify you when something needs attention." />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const style = alertStyles[alert.type];
            return (
              <div key={alert.id} className={`glass-card glass-border rounded-2xl p-4 border-l-4 ${style.border} ${!alert.read ? style.bg : ''} transition-all duration-200`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${style.iconBg}`}><style.icon /></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${!alert.read ? 'text-white' : 'text-slate-300'}`}>{alert.title}</h3>
                      <span className="text-xs text-slate-500">{alert.time}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{alert.message}</p>
                  </div>
                  {!alert.read && (
                    <button type="button" onClick={() => onMarkRead(alert.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors" aria-label="Mark alert as read">
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
