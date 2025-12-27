import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
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
import { useTheme } from '../lib/ThemeContext';
import { getSessionFromRequest, isAuthConfigured, SHARE_QUERY_KEY, verifyShareToken } from '../lib/auth';
import { loadDashboardData } from '../lib/dataSource';

type UsageDashboardProps = {
  initialData: DashboardData;
  shareToken: string | null;
  readOnly: boolean;
};

export const getServerSideProps: GetServerSideProps<UsageDashboardProps> = async ({ req, query }) => {
  const authReady = isAuthConfigured();
  const shareToken = typeof query[SHARE_QUERY_KEY] === 'string' ? query[SHARE_QUERY_KEY] : null;

  const getInitialData = async () => {
    try {
      return await loadDashboardData();
    } catch (error) {
      return mockDashboardData;
    }
  };

  if (!authReady) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const session = getSessionFromRequest(req);
  if (session) {
    const initialData = await getInitialData();
    return {
      props: {
        initialData,
        shareToken: null,
        readOnly: false,
      },
    };
  }

  if (shareToken) {
    const share = verifyShareToken(shareToken);
    if (share) {
      const initialData = share.passwordDigest ? mockDashboardData : await getInitialData();
      return {
        props: {
          initialData,
          shareToken,
          readOnly: true,
        },
      };
    }
  }

  return {
    redirect: {
      destination: '/login',
      permanent: false,
    },
  };
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

export default function UsageDashboard({ initialData, shareToken: initialShareToken, readOnly }: UsageDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isClient, setIsClient] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData);
  const [dataStatus, setDataStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [sharePassword, setSharePassword] = useState<string | null>(null);
  const [shareGateOpen, setShareGateOpen] = useState(false);
  const [shareGateMessage, setShareGateMessage] = useState<string | null>(null);
  const [sharePasscode, setSharePasscode] = useState('');
  const lastAlertsRef = useRef<Alert[] | null>(null);
  const { addToast } = useToast();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const shareToken = initialShareToken;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (readOnly) {
      setCurrentPage('dashboard');
    }
  }, [readOnly]);

  const refreshDashboard = useCallback(async (signal?: AbortSignal, showToast = false, overrideSharePassword?: string | null) => {
    if (!isClient) return;
    setDataStatus('loading');
    try {
      const payload = await fetchDashboardData(signal, {
        shareToken,
        sharePassword: overrideSharePassword ?? sharePassword,
      });
      setDashboardData(payload);
      setDataStatus('idle');
      setLastUpdatedAt(Date.now());
      setShareGateOpen(false);
      if (showToast) {
        addToast({
          title: 'Dashboard refreshed',
          description: 'Latest usage data is now available.',
          variant: 'success',
        });
      }
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code === 'share_password_required' || code === 'share_password_invalid') {
        setShareGateOpen(true);
        setShareGateMessage(code === 'share_password_invalid' ? 'Incorrect passcode. Try again.' : null);
        setDataStatus('idle');
        return;
      }
      if ((error as Error).name === 'AbortError') return;
      setDataStatus('error');
      addToast({
        title: 'Sync failed',
        description: 'Using the last cached data. Try again soon.',
        variant: 'error',
      });
    }
  }, [addToast, isClient, sharePassword, shareToken]);

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
            if (readOnly) return;
            event.preventDefault();
            setCurrentPage('api-keys');
            break;
          case '3':
            if (readOnly) return;
            event.preventDefault();
            setCurrentPage('alerts');
            break;
          case '4':
            if (readOnly) return;
            event.preventDefault();
            setCurrentPage('logs');
            break;
          case '5':
            if (readOnly) return;
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
  }, [readOnly]);

  const handleUnlockShare = async () => {
    if (!sharePasscode) {
      setShareGateMessage('Enter the passcode to continue.');
      return;
    }
    setSharePassword(sharePasscode);
    setShareGateMessage(null);
    await refreshDashboard(undefined, true, sharePasscode);
  };

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
            usageLogs={dashboardData.usageLogs}
            readOnly={readOnly}
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
            usageLogs={dashboardData.usageLogs}
            readOnly={readOnly}
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

      <div className="min-h-screen bg-claude-cream dark:bg-claude-dark-bg text-claude-text dark:text-claude-dark-text font-sans transition-colors duration-300">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[90] focus:bg-claude-terracotta focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
          Skip to content
        </a>

        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          currentPage={currentPage}
          onPageChange={readOnly ? () => setCurrentPage('dashboard') : setCurrentPage}
          user={dashboardData.user}
          unreadAlerts={unreadAlerts}
          isDark={isDark}
          onThemeToggle={toggleTheme}
          readOnly={readOnly}
        />

        <main id="main-content" className={`min-h-screen transition-all duration-300 ease-out-expo ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
          <div className="p-4 sm:p-6 lg:p-8">
            {renderPage()}
          </div>
        </main>
      </div>

      {shareGateOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-claude-text/50" />
          <div className="relative z-10 w-full max-w-md bg-white border border-claude-border rounded-2xl p-6 shadow-claude-lg">
            <h2 className="text-xl font-semibold text-claude-text">Passcode required</h2>
            <p className="text-sm text-claude-text-muted mt-2">Enter the passcode shared with you to unlock this dashboard.</p>
            <div className="mt-4 space-y-3">
              <input
                type="password"
                value={sharePasscode}
                onChange={(event) => setSharePasscode(event.target.value)}
                placeholder="Enter passcode"
                className="w-full bg-claude-beige text-claude-text px-4 py-2.5 rounded-xl border border-claude-border focus:outline-none focus:ring-2 focus:ring-claude-terracotta/40 placeholder:text-claude-text-muted/60"
              />
              {shareGateMessage && <div className="text-xs text-claude-terracotta-dark">{shareGateMessage}</div>}
              <button
                type="button"
                onClick={handleUnlockShare}
                className="w-full bg-claude-terracotta text-white hover:bg-claude-terracotta-dark px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Unlock dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
