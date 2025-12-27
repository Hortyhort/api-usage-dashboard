import { useEffect, useMemo, useState } from 'react';
import type { UsageLog } from '../../types/dashboard';
import { Icons } from '../icons';
import { formatModelName } from '../../lib/formatters';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../ui/ToastProvider';

const STORAGE_KEY = 'api-usage-dashboard:usage-log-filters';

const UsageLogsPage = ({ usageLogs, isClient }: { usageLogs: UsageLog[]; isClient: boolean }) => {
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const { addToast } = useToast();

  useEffect(() => {
    if (!isClient) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { search?: string; modelFilter?: string; statusFilter?: string };
        setSearch(parsed.search ?? '');
        setModelFilter(parsed.modelFilter ?? 'all');
        setStatusFilter(parsed.statusFilter ?? 'all');
      } catch (error) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ search, modelFilter, statusFilter }));
  }, [isClient, search, modelFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, modelFilter, statusFilter]);

  const filteredLogs = useMemo(() => usageLogs.filter((log) => {
    if (modelFilter !== 'all' && log.model !== modelFilter) return false;
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (search && !log.apiKey.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [usageLogs, modelFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = search || modelFilter !== 'all' || statusFilter !== 'all';

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  const handleExport = () => {
    addToast({
      title: 'Export queued',
      description: 'Connect this action to your backend to generate a CSV.',
      variant: 'info',
    });
  };

  const clearFilters = () => {
    setSearch('');
    setModelFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Usage Logs</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Detailed request history and debugging</p>
        </div>
        <button type="button" onClick={handleExport} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25">
          <Icons.Download />
          Export CSV
        </button>
      </div>

      <div className="glass-card glass-border rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <label htmlFor="usage-search" className="sr-only">Search by API key</label>
            <input
              id="usage-search"
              type="text"
              placeholder="Search by API key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800/50 text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500/50 focus:outline-none placeholder-slate-500"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></div>
          </div>
          <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} className="bg-slate-800/50 text-slate-200 px-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500/50 focus:outline-none">
            <option value="all">All Models</option>
            <option value="claude-sonnet-4-5">Sonnet 4.5</option>
            <option value="claude-opus-4-5">Opus 4.5</option>
            <option value="claude-haiku-4-5">Haiku 4.5</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800/50 text-slate-200 px-4 py-2.5 rounded-xl border border-white/10 focus:border-blue-500/50 focus:outline-none">
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-sm text-slate-400 hover:text-white transition-colors">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <EmptyState title="No logs found" description="Try adjusting your filters or search query." />
      ) : (
        <div className="glass-card glass-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Timestamp</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Model</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Tokens</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Latency</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">API Key</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {pagedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <td className="px-6 py-4 text-sm text-slate-300 font-mono">{log.timestamp}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white font-medium">{formatModelName(log.model)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <span className="text-blue-400">{log.inputTokens.toLocaleString()}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-emerald-400">{log.outputTokens.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300 tabular-nums">{log.latency}s</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{log.apiKey}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] text-sm text-slate-400">
            <span>Showing {pagedLogs.length} of {filteredLogs.length} entries</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className={`px-3 py-1 rounded-lg ${currentPage === 1 ? 'text-slate-600' : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}`}>
                Prev
              </button>
              <span className="text-xs text-slate-500">Page {currentPage} of {totalPages}</span>
              <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className={`px-3 py-1 rounded-lg ${currentPage === totalPages ? 'text-slate-600' : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}`}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageLogsPage;
