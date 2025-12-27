import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import type { GetStaticProps } from 'next';
import Sidebar, { PageId } from '../components/layout/Sidebar';
import DashboardPage from '../components/pages/DashboardPage';
import ApiKeysPage from '../components/pages/ApiKeysPage';
import AlertsPage from '../components/pages/AlertsPage';
import UsageLogsPage from '../components/pages/UsageLogsPage';
import TeamPage from '../components/pages/TeamPage';
import RateLimitsPage from '../components/pages/RateLimitsPage';
import { calculateCost, calculateSavings } from '../lib/formatters';
import { fetchDashboardData } from '../lib/api';
import { mockDashboardData } from '../data/mockData';
import type { DashboardData, Alert } from '../types/dashboard';
import { useToast } from '../components/ui/ToastProvider';

type UsageDashboardProps = {
  initialData: DashboardData;
};

export const getStaticProps: GetStaticProps<UsageDashboardProps> = async () => ({
  props: {
    initialData: mockDashboardData,
  },
});

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

export default function UsageDashboard({ initialData }: UsageDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isDark, setIsDark] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData);
  const [dataStatus, setDataStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const lastAlertsRef = useRef<Alert[] | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      setIsDark(storedTheme === 'dark');
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    window.localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isClient, isDark]);

  const refreshDashboard = useCallback(async (signal?: AbortSignal, showToast = false) => {
    if (!isClient) return;
    setDataStatus('loading');
    try {
      const payload = await fetchDashboardData(signal);
      setDashboardData(payload);
      setDataStatus('idle');
      setLastUpdatedAt(Date.now());
      if (showToast) {
        addToast({
          title: 'Dashboard refreshed',
          description: 'Latest usage data is now available.',
          variant: 'success',
        });
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setDataStatus('error');
      addToast({
        title: 'Sync failed',
        description: 'Using the last cached data. Try again soon.',
        variant: 'error',
      });
    }
  }, [addToast, isClient]);

  useEffect(() => {
    if (!isClient) return;
    const controller = new AbortController();
    refreshDashboard(controller.signal);
    return () => controller.abort();
  }, [isClient, refreshDashboard]);

  const totalCost = useMemo(() => calculateCost(dashboardData.usage), [dashboardData.usage]);
  const savings = useMemo(() => calculateSavings(dashboardData.usage), [dashboardData.usage]);
  const budgetUsed = dashboardData.usage.billingCycle.budgetLimit > 0
    ? (totalCost / dashboardData.usage.billingCycle.budgetLimit) * 100
    : 0;
  const unreadAlerts = dashboardData.alerts.filter((alert) => !alert.read).length;

  const handleMarkRead = useCallback((id: number) => {
    setDashboardData((prev) => ({
      ...prev,
      alerts: prev.alerts.map((alert) => (alert.id === id ? { ...alert, read: true } : alert)),
    }));
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setDashboardData((prev) => {
      if (prev.alerts.every((alert) => alert.read)) return prev;
      lastAlertsRef.current = prev.alerts;
      return {
        ...prev,
        alerts: prev.alerts.map((alert) => ({ ...alert, read: true })),
      };
    });

    addToast({
      title: 'All alerts marked as read',
      description: 'Notifications have been cleared.',
      variant: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        if (!lastAlertsRef.current) return;
        setDashboardData((prev) => ({
          ...prev,
          alerts: lastAlertsRef.current ?? prev.alerts,
        }));
      },
    });
  }, [addToast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'b':
            event.preventDefault();
            setSidebarOpen((open) => !open);
            break;
          case '1':
            event.preventDefault();
            setCurrentPage('dashboard');
            break;
          case '2':
            event.preventDefault();
            setCurrentPage('api-keys');
            break;
          case '3':
            event.preventDefault();
            setCurrentPage('alerts');
            break;
          case '4':
            event.preventDefault();
            setCurrentPage('logs');
            break;
          case '5':
            event.preventDefault();
            setCurrentPage('team');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            data={dashboardData.usage}
            totalCost={totalCost}
            savings={savings}
            budgetUsed={budgetUsed}
            isClient={isClient}
            dataStatus={dataStatus}
            onRefresh={() => refreshDashboard(undefined, true)}
            lastUpdatedAt={lastUpdatedAt}
          />
        );
      case 'api-keys':
        return <ApiKeysPage apiKeys={dashboardData.apiKeys} isClient={isClient} />;
      case 'alerts':
        return <AlertsPage alerts={dashboardData.alerts} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} isClient={isClient} />;
      case 'logs':
        return <UsageLogsPage usageLogs={dashboardData.usageLogs} isClient={isClient} />;
      case 'team':
        return <TeamPage teamMembers={dashboardData.teamMembers} />;
      case 'rate-limits':
        return <RateLimitsPage isClient={isClient} />;
      default:
        return (
          <DashboardPage
            data={dashboardData.usage}
            totalCost={totalCost}
            savings={savings}
            budgetUsed={budgetUsed}
            isClient={isClient}
            dataStatus={dataStatus}
            onRefresh={() => refreshDashboard(undefined, true)}
            lastUpdatedAt={lastUpdatedAt}
          />
        );
    }
  };

  return (
    <>
      <Head>
        <title>API Usage Dashboard</title>
        <meta name="description" content="Monitor your Claude API consumption" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' : 'bg-gradient-to-br from-slate-100 via-white to-slate-100'} text-white font-sans`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[90] focus:bg-slate-900 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
          Skip to content
        </a>
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-violet-500/10 rounded-full blur-3xl"></div>
        </div>

        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          user={dashboardData.user}
          unreadAlerts={unreadAlerts}
          isDark={isDark}
          onThemeToggle={() => setIsDark(!isDark)}
        />

        <main id="main-content" className={`min-h-screen transition-all duration-300 ease-out-expo ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
          <div className="p-4 sm:p-6 lg:p-8">
            {renderPage()}
          </div>
        </main>
      </div>
    </>
  );
}
