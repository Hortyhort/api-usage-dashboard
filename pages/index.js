import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockUsageData = {
  currentPeriod: {
    inputTokens: 2847293,
    outputTokens: 892451,
    cacheReadTokens: 156320,
    cacheWriteTokens: 42180,
    requestCount: 3842,
  },
  dailyUsage: [
    { date: '2025-12-20', label: 'Dec 20', input: 380000, output: 120000, requests: 485 },
    { date: '2025-12-21', label: 'Dec 21', input: 420000, output: 135000, requests: 532 },
    { date: '2025-12-22', label: 'Dec 22', input: 290000, output: 95000, requests: 378 },
    { date: '2025-12-23', label: 'Dec 23', input: 510000, output: 165000, requests: 645 },
    { date: '2025-12-24', label: 'Dec 24', input: 445000, output: 142000, requests: 567 },
    { date: '2025-12-25', label: 'Dec 25', input: 320000, output: 98000, requests: 412 },
    { date: '2025-12-26', label: 'Dec 26', input: 482293, output: 137451, requests: 523 },
  ],
  modelBreakdown: [
    { model: 'Claude Sonnet 4.5', tokens: 2150000, percentage: 57.5, color: 'blue' },
    { model: 'Claude Opus 4.5', tokens: 980000, percentage: 26.2, color: 'violet' },
    { model: 'Claude Haiku 4.5', tokens: 609744, percentage: 16.3, color: 'emerald' },
  ],
  billingCycle: { start: 'Dec 1, 2025', end: 'Dec 31, 2025', daysRemaining: 5, budgetLimit: 75.00 },
  pricing: { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
};

const mockApiKeys = [
  { id: 1, name: 'Production API Key', key: 'sk-ant-api03-...7x9K', created: 'Nov 15, 2025', lastUsed: '2 minutes ago', usage: 2450000, status: 'active' },
  { id: 2, name: 'Development Key', key: 'sk-ant-api03-...2m4N', created: 'Dec 1, 2025', lastUsed: '3 hours ago', usage: 289000, status: 'active' },
  { id: 3, name: 'Testing Environment', key: 'sk-ant-api03-...8p2Q', created: 'Dec 10, 2025', lastUsed: '1 day ago', usage: 45000, status: 'active' },
  { id: 4, name: 'Old Integration Key', key: 'sk-ant-api03-...1k5L', created: 'Oct 5, 2025', lastUsed: '2 weeks ago', usage: 892000, status: 'inactive' },
];

const mockAlerts = [
  { id: 1, type: 'warning', title: 'Budget threshold reached', message: 'You\'ve used 80% of your monthly budget ($60.00 of $75.00)', time: '2 hours ago', read: false },
  { id: 2, type: 'info', title: 'Usage spike detected', message: 'Token usage increased 45% compared to yesterday', time: '5 hours ago', read: false },
  { id: 3, type: 'success', title: 'Cache optimization improved', message: 'Your cache hit rate improved to 23% this week', time: '1 day ago', read: true },
  { id: 4, type: 'error', title: 'Rate limit warning', message: 'You approached 90% of rate limit at 2:34 PM', time: '1 day ago', read: true },
];

const mockUsageLogs = [
  { id: 1, timestamp: '2025-12-26 14:32:15', model: 'claude-sonnet-4-5', inputTokens: 1250, outputTokens: 420, latency: 1.2, status: 'success', apiKey: 'Production API Key' },
  { id: 2, timestamp: '2025-12-26 14:31:58', model: 'claude-opus-4-5', inputTokens: 3200, outputTokens: 890, latency: 2.8, status: 'success', apiKey: 'Production API Key' },
  { id: 3, timestamp: '2025-12-26 14:31:42', model: 'claude-haiku-4-5', inputTokens: 450, outputTokens: 125, latency: 0.4, status: 'success', apiKey: 'Development Key' },
  { id: 4, timestamp: '2025-12-26 14:31:20', model: 'claude-sonnet-4-5', inputTokens: 2100, outputTokens: 0, latency: 0.1, status: 'error', apiKey: 'Production API Key' },
  { id: 5, timestamp: '2025-12-26 14:30:55', model: 'claude-sonnet-4-5', inputTokens: 1800, outputTokens: 560, latency: 1.5, status: 'success', apiKey: 'Production API Key' },
  { id: 6, timestamp: '2025-12-26 14:30:12', model: 'claude-opus-4-5', inputTokens: 4500, outputTokens: 1200, latency: 3.2, status: 'success', apiKey: 'Development Key' },
  { id: 7, timestamp: '2025-12-26 14:29:45', model: 'claude-haiku-4-5', inputTokens: 320, outputTokens: 95, latency: 0.3, status: 'success', apiKey: 'Testing Environment' },
  { id: 8, timestamp: '2025-12-26 14:29:02', model: 'claude-sonnet-4-5', inputTokens: 1650, outputTokens: 480, latency: 1.3, status: 'success', apiKey: 'Production API Key' },
];

const mockTeamMembers = [
  { id: 1, name: 'David Horton', email: 'david@example.com', role: 'Owner', usage: 1450000, avatar: 'DH' },
  { id: 2, name: 'Sarah Chen', email: 'sarah@example.com', role: 'Admin', usage: 890000, avatar: 'SC' },
  { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Developer', usage: 320000, avatar: 'MJ' },
  { id: 4, name: 'Emily Davis', email: 'emily@example.com', role: 'Developer', usage: 180000, avatar: 'ED' },
];

const mockUser = {
  name: 'David Horton',
  email: 'david@example.com',
  plan: 'Max plan',
  initials: 'DH',
};

// ============================================================================
// UTILITIES
// ============================================================================

const formatNumber = (num) => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return num.toLocaleString();
};

const formatCurrency = (num) => '$' + num.toFixed(2);

const calculateCost = (data) => {
  const { currentPeriod: p, pricing: pr } = data;
  return (p.inputTokens / 1e6) * pr.input + (p.outputTokens / 1e6) * pr.output +
         (p.cacheReadTokens / 1e6) * pr.cacheRead + (p.cacheWriteTokens / 1e6) * pr.cacheWrite;
};

const calculateSavings = (data) => {
  const { currentPeriod: p, pricing: pr } = data;
  return (p.cacheReadTokens / 1e6) * pr.input - (p.cacheReadTokens / 1e6) * pr.cacheRead;
};

const isToday = (dateStr) => dateStr === '2025-12-26';

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  // Navigation
  Dashboard: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  Key: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>,
  Bell: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>,
  Logs: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" /></svg>,
  Team: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
  Chart: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  Gauge: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,

  // Stats
  Input: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
  Output: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  Request: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  Cost: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Cache: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" /></svg>,
  Savings: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>,
  Calendar: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  TrendUp: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>,
  TrendDown: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" /></svg>,

  // UI
  SidebarClose: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 4.5v15m-6-15h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3a1.5 1.5 0 01-1.5-1.5v-12A1.5 1.5 0 013 4.5z" /></svg>,
  Plus: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  Filter: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>,
  Settings: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Language: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>,
  Help: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>,
  Plans: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>,
  Gift: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18a1.5 1.5 0 001.5-1.5v-1.5a1.5 1.5 0 00-1.5-1.5h-18a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 001.5 1.5z" /></svg>,
  Info: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>,
  Logout: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>,
  ChevronRight: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>,
  ChevronUpDown: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>,
  Search: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  Download: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  Copy: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  EyeOff: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" /></svg>,
  X: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Warning: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  Sun: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>,
  Moon: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>,
  Refresh: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
  Live: () => <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>,
};

// ============================================================================
// COMPONENTS
// ============================================================================

// User Account Dropdown
const UserAccountDropdown = ({ user, isOpen, dropdownRef }) => {
  if (!isOpen) return null;

  const menuItems = [
    { type: 'header', email: user.email },
    { type: 'divider' },
    { icon: Icons.Settings, label: 'Settings', shortcut: ',' },
    { icon: Icons.Language, label: 'Language', hasSubmenu: true },
    { icon: Icons.Help, label: 'Get help' },
    { type: 'divider' },
    { icon: Icons.Plans, label: 'View all plans' },
    { icon: Icons.Gift, label: 'Gift Claude' },
    { icon: Icons.Info, label: 'Learn more', hasSubmenu: true },
    { type: 'divider' },
    { icon: Icons.Logout, label: 'Log out' },
  ];

  return (
    <div ref={dropdownRef} className="absolute bottom-full left-0 mb-2 w-64 glass-card rounded-xl border border-white/10 shadow-2xl shadow-black/50 animate-scale-in origin-bottom-left overflow-hidden z-50">
      <div className="py-1.5">
        {menuItems.map((item, i) => {
          if (item.type === 'header') return <div key={i} className="px-4 py-2.5"><div className="text-sm text-slate-300 font-medium truncate">{item.email}</div></div>;
          if (item.type === 'divider') return <div key={i} className="my-1.5 border-t border-white/[0.06]" />;
          return (
            <button key={i} className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors">
              <item.icon />
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && <span className="text-xs text-slate-500 font-medium"><span className="text-slate-600 mr-0.5">&#8984;</span>{item.shortcut}</span>}
              {item.hasSubmenu && <Icons.ChevronRight />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Navigation Item
const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
               ${active ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}
  >
    <Icon />
    <span className="flex-1 text-left text-sm font-medium">{label}</span>
    {badge && (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.color}`}>
        {badge.value}
      </span>
    )}
  </button>
);

// Sidebar
const Sidebar = ({ isOpen, onToggle, currentPage, onPageChange, user, unreadAlerts, isDark, onThemeToggle }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target) && userButtonRef.current && !userButtonRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'dashboard', icon: Icons.Dashboard, label: 'Dashboard' },
    { id: 'api-keys', icon: Icons.Key, label: 'API Keys' },
    { id: 'alerts', icon: Icons.Bell, label: 'Alerts', badge: unreadAlerts > 0 ? { value: unreadAlerts, color: 'bg-red-500/20 text-red-400' } : null },
    { id: 'logs', icon: Icons.Logs, label: 'Usage Logs' },
    { id: 'team', icon: Icons.Team, label: 'Team' },
    { id: 'rate-limits', icon: Icons.Gauge, label: 'Rate Limits' },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={onToggle} />}

      <button onClick={onToggle} className="fixed top-4 left-4 z-[60] p-2 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-white transition-colors">
        <Icons.SidebarClose />
      </button>

      <aside className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-out-expo ${isOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full'} bg-slate-950/95 backdrop-blur-xl border-r border-white/[0.06]`}>
        <div className={`h-full flex flex-col ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
          <div className="h-14 border-b border-white/[0.06]" />

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
            {navItems.map(item => (
              <NavItem key={item.id} {...item} active={currentPage === item.id} onClick={() => onPageChange(item.id)} />
            ))}
          </nav>

          {/* Theme Toggle */}
          <div className="px-3 py-2 border-t border-white/[0.06]">
            <button
              onClick={onThemeToggle}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
            >
              {isDark ? <Icons.Sun /> : <Icons.Moon />}
              <span className="text-sm font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          {/* User Account */}
          <div className="relative p-3 border-t border-white/[0.06]">
            <UserAccountDropdown user={user} isOpen={userMenuOpen} dropdownRef={userMenuRef} />
            <button
              ref={userButtonRef}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${userMenuOpen ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-semibold text-white shadow-lg shadow-orange-500/20">
                {user.initials}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-white truncate">{user.name}</div>
                <div className="text-xs text-slate-500">{user.plan}</div>
              </div>
              <Icons.ChevronUpDown />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

// Stat Card
const StatCard = ({ title, value, subtitle, icon, color, trend, delay = 0 }) => {
  const colors = {
    blue: { icon: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30', glow: 'group-hover:shadow-glow-blue' },
    emerald: { icon: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30', glow: 'group-hover:shadow-glow-emerald' },
    violet: { icon: 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30', glow: 'group-hover:shadow-glow-violet' },
    amber: { icon: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30', glow: 'group-hover:shadow-glow-amber' },
    cyan: { icon: 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30', glow: 'group-hover:shadow-glow-cyan' },
    red: { icon: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30', glow: 'group-hover:shadow-glow-red' },
  };

  return (
    <div className={`group glass-card glass-border rounded-2xl p-4 sm:p-5 transition-all duration-300 ease-out-expo hover:scale-[1.02] active:scale-[0.98] hover:bg-white/[0.03] ${colors[color].glow} animate-slide-up`} style={{ animationDelay: `${delay}ms` }}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colors[color].icon} transition-transform duration-300 group-hover:scale-110`}>
              {icon}
            </div>
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</span>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend > 0 ? <Icons.TrendUp /> : <Icons.TrendDown />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="text-2xl sm:text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-1.5 font-medium">{subtitle}</div>}
      </div>
    </div>
  );
};

// Progress Bar
const ProgressBar = ({ value, max, colorClass, showLabel = false }) => (
  <div className="space-y-1">
    <div className="h-2 bg-slate-700/40 rounded-full overflow-hidden ring-1 ring-white/5">
      <div className={`h-full rounded-full transition-all duration-700 ease-out-expo ${colorClass}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
    </div>
    {showLabel && <div className="text-right text-xs text-slate-500 tabular-nums font-medium">{((value / max) * 100).toFixed(1)}%</div>}
  </div>
);

// Bar Chart
const BarChart = ({ data, stacked }) => {
  const [tooltip, setTooltip] = useState(null);
  const maxValue = Math.max(...data.map(d => d.input + d.output));

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 sm:gap-3 h-48 overflow-x-auto pb-2 scrollbar-hide">
        {data.map((day, i) => {
          const total = day.input + day.output;
          const totalPct = (total / maxValue) * 100;
          const inputPct = (day.input / maxValue) * 100;
          const outputPct = (day.output / maxValue) * 100;
          const isCurrent = isToday(day.date);

          return (
            <div key={i} className="flex-1 min-w-[48px] flex flex-col items-center gap-2 group relative cursor-pointer"
                 onMouseEnter={() => setTooltip(i)} onMouseLeave={() => setTooltip(null)}>
              {tooltip === i && (
                <div className="absolute bottom-full mb-3 glass-card rounded-xl p-4 z-20 whitespace-nowrap shadow-tooltip animate-scale-in border border-white/10">
                  <div className="relative z-10">
                    <div className="font-semibold text-white mb-2">{day.label}</div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="w-2.5 h-2.5 bg-blue-400 rounded-sm"></span>
                      <span className="text-slate-400 text-sm">Input:</span>
                      <span className="text-white font-medium tabular-nums">{formatNumber(day.input)}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-sm"></span>
                      <span className="text-slate-400 text-sm">Output:</span>
                      <span className="text-white font-medium tabular-nums">{formatNumber(day.output)}</span>
                    </div>
                    <div className="border-t border-white/10 mt-3 pt-3">
                      <span className="text-slate-400 text-sm">Total:</span>
                      <span className="text-white font-semibold ml-2 tabular-nums">{formatNumber(total)}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="w-full flex flex-col h-40">
                <div style={{ flexGrow: 100 - totalPct }} />
                {stacked ? (
                  <div className="w-full flex flex-col rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105" style={{ flexGrow: totalPct }}>
                    <div className={`w-full transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-blue-500 to-blue-400 shadow-lg shadow-blue-500/40' : 'bg-blue-500/70 group-hover:bg-blue-500'}`} style={{ flexGrow: day.input }} />
                    <div className={`w-full transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/40' : 'bg-emerald-500/70 group-hover:bg-emerald-500'}`} style={{ flexGrow: day.output }} />
                  </div>
                ) : (
                  <div className="w-full flex gap-1.5 items-end transition-all duration-300 group-hover:scale-105" style={{ flexGrow: totalPct }}>
                    <div className={`flex-1 rounded-t-lg transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-blue-500 to-blue-400 shadow-lg shadow-blue-500/40' : 'bg-blue-500/70 group-hover:bg-blue-500'}`} style={{ height: `${(inputPct / totalPct) * 100}%`, minHeight: '4px' }} />
                    <div className={`flex-1 rounded-t-lg transition-all duration-300 ${isCurrent ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/40' : 'bg-emerald-500/70 group-hover:bg-emerald-500'}`} style={{ height: `${(outputPct / totalPct) * 100}%`, minHeight: '4px' }} />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center">
                {isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full mb-1.5 shadow-lg shadow-white/50 animate-glow-pulse" />}
                <span className={`text-xs transition-all duration-300 ${isCurrent ? 'text-white font-semibold' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {isCurrent ? 'Today' : day.label.split(' ')[1]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-8">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-500 rounded-sm shadow-sm shadow-blue-500/30" />
          <span className="text-sm text-slate-400 font-medium">Input tokens</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-sm shadow-sm shadow-emerald-500/30" />
          <span className="text-sm text-slate-400 font-medium">Output tokens</span>
        </div>
      </div>
    </div>
  );
};

// Model Breakdown
const ModelBreakdown = ({ models }) => {
  const colors = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-400 shadow-sm shadow-blue-500/30',
    violet: 'bg-gradient-to-r from-violet-500 to-violet-400 shadow-sm shadow-violet-500/30',
    emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/30'
  };
  const textColors = { blue: 'text-blue-400', violet: 'text-violet-400', emerald: 'text-emerald-400' };

  return (
    <div className="space-y-6">
      {models.map((m, i) => (
        <div key={i} className="group">
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-slate-200 font-medium group-hover:text-white transition-colors">{m.model}</span>
            <span className={`${textColors[m.color]} tabular-nums font-medium`}>{formatNumber(m.tokens)}</span>
          </div>
          <ProgressBar value={m.percentage} max={100} colorClass={colors[m.color]} />
          <div className="text-right text-xs text-slate-500 mt-2 tabular-nums font-medium">{m.percentage}%</div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// PAGE COMPONENTS
// ============================================================================

// Dashboard Page
const DashboardPage = ({ data, totalCost, savings, budgetUsed, isClient }) => {
  const [chartMode, setChartMode] = useState('sideBySide');
  const [timeRange, setTimeRange] = useState('7d');
  const [isLive, setIsLive] = useState(true);
  const [liveTokens, setLiveTokens] = useState(data.currentPeriod.inputTokens + data.currentPeriod.outputTokens);

  // Simulate live updates
  useEffect(() => {
    if (!isClient || !isLive) return;
    const interval = setInterval(() => {
      setLiveTokens(prev => prev + Math.floor(Math.random() * 1000) + 100);
    }, 3000);
    return () => clearInterval(interval);
  }, [isClient, isLive]);

  // Projected cost calculation
  const dailyAvgCost = totalCost / 26; // days elapsed
  const projectedMonthEnd = dailyAvgCost * 31;
  const daysUntilBudget = budgetUsed < 100 ? Math.floor((data.billingCycle.budgetLimit - totalCost) / dailyAvgCost) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Monitor your Claude API consumption</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isLive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
            <div className={`${isLive ? 'animate-pulse' : ''}`}><Icons.Live /></div>
            <span className="text-xs font-medium">{isLive ? 'Live' : 'Paused'}</span>
            <button onClick={() => setIsLive(!isLive)} className="ml-1 hover:text-white transition-colors">
              {isLive ? <Icons.X /> : <Icons.Refresh />}
            </button>
          </div>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="glass-card glass-border bg-white/5 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 cursor-pointer hover:bg-white/10">
            <option value="7d" className="bg-slate-900">Last 7 days</option>
            <option value="30d" className="bg-slate-900">Last 30 days</option>
            <option value="90d" className="bg-slate-900">Last 90 days</option>
            <option value="custom" className="bg-slate-900">Custom range</option>
          </select>
          <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25">
            <Icons.Download />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Tokens" value={formatNumber(liveTokens)} subtitle="Input + Output" icon={<Icons.Request />} color="blue" trend={12} delay={0} />
        <StatCard title="Requests" value={data.currentPeriod.requestCount.toLocaleString()} subtitle="API calls" icon={<Icons.Chart />} color="violet" trend={8} delay={50} />
        <StatCard title="Est. Cost" value={formatCurrency(totalCost)} subtitle="This period" icon={<Icons.Cost />} color="amber" trend={-3} delay={100} />
        <StatCard title="Projected" value={formatCurrency(projectedMonthEnd)} subtitle="End of month" icon={<Icons.TrendUp />} color={projectedMonthEnd > data.billingCycle.budgetLimit ? 'red' : 'emerald'} delay={150} />
      </div>

      {/* Cost Projection Alert */}
      {projectedMonthEnd > data.billingCycle.budgetLimit && (
        <div className="glass-card glass-border rounded-2xl p-4 border-l-4 border-l-amber-500 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <Icons.Warning />
            </div>
            <div>
              <h3 className="text-white font-medium">Budget Alert</h3>
              <p className="text-slate-400 text-sm mt-1">
                At current usage rate, you'll exceed your ${data.billingCycle.budgetLimit.toFixed(2)} budget by{' '}
                <span className="text-amber-400 font-medium">${(projectedMonthEnd - data.billingCycle.budgetLimit).toFixed(2)}</span> this month.
                {daysUntilBudget > 0 && ` You have approximately ${daysUntilBudget} days until budget is reached.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="lg:col-span-2 glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-white">Daily Token Usage</h2>
              <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1 ring-1 ring-white/5">
                <button onClick={() => setChartMode('sideBySide')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${chartMode === 'sideBySide' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}>Grouped</button>
                <button onClick={() => setChartMode('stacked')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${chartMode === 'stacked' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}>Stacked</button>
              </div>
            </div>
            <BarChart data={data.dailyUsage} stacked={chartMode === 'stacked'} />
          </div>
        </section>

        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="relative z-10">
            <h2 className="text-lg font-medium text-white mb-6">Usage by Model</h2>
            <ModelBreakdown models={data.modelBreakdown} />
          </div>
        </section>
      </div>

      {/* Billing & Caching */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '350ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-slate-700/30 rounded-xl ring-1 ring-white/10 text-slate-300"><Icons.Calendar /></div>
              <div>
                <h2 className="text-lg font-medium text-white">Billing Cycle</h2>
                <p className="text-slate-400 text-sm font-medium">{data.billingCycle.start} — {data.billingCycle.end}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{data.billingCycle.daysRemaining}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">Days left</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2.5">
                  <span className="text-slate-400 font-medium">Budget</span>
                  <span className="tabular-nums text-white font-medium">{formatCurrency(totalCost)} / {formatCurrency(data.billingCycle.budgetLimit)}</span>
                </div>
                <ProgressBar value={budgetUsed} max={100} colorClass={`bg-gradient-to-r ${budgetUsed > 90 ? 'from-red-500 to-red-400' : budgetUsed > 70 ? 'from-amber-500 to-amber-400' : 'from-blue-500 via-violet-500 to-violet-400'}`} showLabel />
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card glass-border rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-green-500/20 rounded-xl ring-1 ring-green-500/30 text-green-400"><Icons.Savings /></div>
              <h3 className="font-medium text-white">Cost Savings</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-3xl font-semibold tabular-nums tracking-tight bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{formatCurrency(savings)}</div>
                <div className="text-sm text-slate-400 font-medium mt-1">Saved from caching</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-white tabular-nums tracking-tight">{formatNumber(data.currentPeriod.cacheReadTokens)}</div>
                <div className="text-sm text-slate-400 font-medium mt-1">Cache hits</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Cache hit rate</span>
                <span className="text-emerald-400 font-medium">{((data.currentPeriod.cacheReadTokens / data.currentPeriod.inputTokens) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// API Keys Page
const ApiKeysPage = ({ isClient }) => {
  const [showKey, setShowKey] = useState({});
  const [copyStatus, setCopyStatus] = useState(null);
  const resetCopyTimerRef = useRef(null);
  const copySupported = isClient && typeof navigator !== 'undefined' && navigator.clipboard && (typeof window === 'undefined' || window.isSecureContext);

  useEffect(() => {
    return () => {
      if (resetCopyTimerRef.current) {
        clearTimeout(resetCopyTimerRef.current);
      }
    };
  }, []);

  const setCopyFeedback = (key, status) => {
    setCopyStatus({ key, status });
    if (resetCopyTimerRef.current) {
      clearTimeout(resetCopyTimerRef.current);
    }
    resetCopyTimerRef.current = setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleCopy = async (key) => {
    if (!copySupported) {
      setCopyFeedback(key, 'unavailable');
      return;
    }
    try {
      await navigator.clipboard.writeText(key);
      setCopyFeedback(key, 'success');
    } catch (error) {
      setCopyFeedback(key, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">API Keys</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Manage your API keys and access tokens</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25">
          <Icons.Plus />
          Create New Key
        </button>
      </div>

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
              {mockApiKeys.map((apiKey) => {
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
                      <button onClick={() => setShowKey({ ...showKey, [apiKey.id]: !showKey[apiKey.id] })} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors">
                        {showKey[apiKey.id] ? <Icons.EyeOff /> : <Icons.Eye />}
                      </button>
                      <button
                        onClick={() => handleCopy(apiKey.key)}
                        className={`p-1.5 rounded-lg transition-colors ${copySupported ? 'hover:bg-white/[0.06]' : 'cursor-not-allowed hover:bg-white/[0.02]'} ${copyTone}`}
                        title={copyTitle}
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
                    <button className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
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
    </div>
  );
};

// Alerts Page
const AlertsPage = ({ alerts, onMarkRead }) => {
  const alertStyles = {
    warning: { bg: 'bg-amber-500/10', border: 'border-l-amber-500', icon: Icons.Warning, iconBg: 'bg-amber-500/20 text-amber-400' },
    error: { bg: 'bg-red-500/10', border: 'border-l-red-500', icon: Icons.X, iconBg: 'bg-red-500/20 text-red-400' },
    success: { bg: 'bg-emerald-500/10', border: 'border-l-emerald-500', icon: Icons.Check, iconBg: 'bg-emerald-500/20 text-emerald-400' },
    info: { bg: 'bg-blue-500/10', border: 'border-l-blue-500', icon: Icons.Info, iconBg: 'bg-blue-500/20 text-blue-400' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Alerts</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Stay informed about your API usage</p>
        </div>
        <button className="flex items-center gap-2 text-slate-400 hover:text-white px-4 py-2 rounded-xl hover:bg-white/[0.06] transition-all duration-200">
          <Icons.Check />
          Mark all as read
        </button>
      </div>

      {/* Alert Settings Card */}
      <div className="glass-card glass-border rounded-2xl p-5">
        <h3 className="text-white font-medium mb-4">Alert Thresholds</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Budget Warning</label>
            <div className="mt-2 flex items-center gap-2">
              <input type="number" defaultValue="80" className="w-20 bg-slate-800/50 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500/50 focus:outline-none" />
              <span className="text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Rate Limit Warning</label>
            <div className="mt-2 flex items-center gap-2">
              <input type="number" defaultValue="90" className="w-20 bg-slate-800/50 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500/50 focus:outline-none" />
              <span className="text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Usage Spike</label>
            <div className="mt-2 flex items-center gap-2">
              <input type="number" defaultValue="50" className="w-20 bg-slate-800/50 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-blue-500/50 focus:outline-none" />
              <span className="text-slate-400">% increase</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
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
                  <p className="text-slate-400 text-sm mt-1">{alert.message}</p>
                </div>
                {!alert.read && (
                  <button onClick={() => onMarkRead(alert.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors">
                    <Icons.Check />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Usage Logs Page
const UsageLogsPage = () => {
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLogs = mockUsageLogs.filter(log => {
    if (modelFilter !== 'all' && log.model !== modelFilter) return false;
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (search && !log.apiKey.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Usage Logs</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Detailed request history and debugging</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25">
          <Icons.Download />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card glass-border rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Icons.Search />
            <input
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
        </div>
      </div>

      {/* Logs Table */}
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
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <td className="px-6 py-4 text-sm text-slate-300 font-mono">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white font-medium">{log.model.split('-').slice(1).join(' ')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="text-blue-400">{log.inputTokens.toLocaleString()}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-emerald-400">{log.outputTokens.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300 tabular-nums">{log.latency}s</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{log.apiKey}</td>
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
      </div>
    </div>
  );
};

// Team Page
const TeamPage = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Team</h1>
        <p className="text-slate-400 text-sm mt-1.5 font-medium">Manage team members and permissions</p>
      </div>
      <button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-violet-500/25">
        <Icons.Plus />
        Invite Member
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {mockTeamMembers.map((member) => (
        <div key={member.id} className="glass-card glass-border rounded-2xl p-5 hover:bg-white/[0.03] transition-all duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-lg font-semibold text-white">
              {member.avatar}
            </div>
            <div>
              <div className="text-white font-medium">{member.name}</div>
              <div className="text-xs text-slate-500">{member.email}</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${member.role === 'Owner' ? 'bg-amber-500/10 text-amber-400' : member.role === 'Admin' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'}`}>
              {member.role}
            </span>
            <div className="text-right">
              <div className="text-white font-medium tabular-nums">{formatNumber(member.usage)}</div>
              <div className="text-xs text-slate-500">tokens</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Rate Limits Page
const RateLimitsPage = ({ isClient }) => {
  const limits = [
    { name: 'Requests per minute', current: 847, max: 1000, color: 'blue' },
    { name: 'Tokens per minute', current: 89000, max: 100000, color: 'violet' },
    { name: 'Tokens per day', current: 2847293, max: 5000000, color: 'emerald' },
  ];
  const [requestRate, setRequestRate] = useState(() => Array.from({ length: 60 }, () => 30));

  useEffect(() => {
    if (!isClient) return;
    const minRate = 18;
    const maxRate = 100;
    const drift = 16;
    const updateIntervalMs = 1500;

    const seed = Array.from({ length: 60 }, () => minRate + Math.random() * (maxRate - minRate));
    setRequestRate(seed);

    const interval = setInterval(() => {
      setRequestRate((prev) => {
        const last = prev[prev.length - 1] ?? (minRate + (maxRate - minRate) / 2);
        const delta = (Math.random() - 0.5) * drift;
        const nextValue = Math.min(maxRate, Math.max(minRate, last + delta));
        return [...prev.slice(1), nextValue];
      });
    }, updateIntervalMs);

    return () => clearInterval(interval);
  }, [isClient]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Rate Limits</h1>
        <p className="text-slate-400 text-sm mt-1.5 font-medium">Monitor your API rate limits in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {limits.map((limit, i) => {
          const percentage = (limit.current / limit.max) * 100;
          const colorClasses = {
            blue: 'bg-gradient-to-r from-blue-500 to-blue-400',
            violet: 'bg-gradient-to-r from-violet-500 to-violet-400',
            emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
          };
          return (
            <div key={i} className="glass-card glass-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 text-sm font-medium">{limit.name}</span>
                <span className={`text-xs font-medium ${percentage > 90 ? 'text-red-400' : percentage > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="text-2xl font-semibold text-white tabular-nums mb-3">
                {formatNumber(limit.current)} <span className="text-slate-500 text-lg">/ {formatNumber(limit.max)}</span>
              </div>
              <ProgressBar value={limit.current} max={limit.max} colorClass={colorClasses[limit.color]} />
            </div>
          );
        })}
      </div>

      {/* Real-time Chart Placeholder */}
      <div className="glass-card glass-border rounded-2xl p-6">
        <h3 className="text-lg font-medium text-white mb-4">Request Rate (Last Hour)</h3>
        <div className="h-48 flex items-end gap-1">
          {requestRate.map((height, i) => {
            return (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-blue-500/50 to-blue-400/50 rounded-t transition-all duration-300 hover:from-blue-500 hover:to-blue-400"
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>60 min ago</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function UsageDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isDark, setIsDark] = useState(true);
  const [alerts, setAlerts] = useState(mockAlerts);
  const [isClient, setIsClient] = useState(false);
  const data = mockUsageData;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const totalCost = useMemo(() => calculateCost(data), []);
  const savings = useMemo(() => calculateSavings(data), []);
  const budgetUsed = (totalCost / data.billingCycle.budgetLimit) * 100;
  const unreadAlerts = alerts.filter(a => !a.read).length;

  const handleMarkRead = (id) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'b': e.preventDefault(); setSidebarOpen(s => !s); break;
          case '1': e.preventDefault(); setCurrentPage('dashboard'); break;
          case '2': e.preventDefault(); setCurrentPage('api-keys'); break;
          case '3': e.preventDefault(); setCurrentPage('alerts'); break;
          case '4': e.preventDefault(); setCurrentPage('logs'); break;
          case '5': e.preventDefault(); setCurrentPage('team'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage data={data} totalCost={totalCost} savings={savings} budgetUsed={budgetUsed} isClient={isClient} />;
      case 'api-keys': return <ApiKeysPage isClient={isClient} />;
      case 'alerts': return <AlertsPage alerts={alerts} onMarkRead={handleMarkRead} />;
      case 'logs': return <UsageLogsPage />;
      case 'team': return <TeamPage />;
      case 'rate-limits': return <RateLimitsPage isClient={isClient} />;
      default: return <DashboardPage data={data} totalCost={totalCost} savings={savings} budgetUsed={budgetUsed} isClient={isClient} />;
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
        {/* Ambient background glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-violet-500/10 rounded-full blur-3xl"></div>
        </div>

        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          user={mockUser}
          unreadAlerts={unreadAlerts}
          isDark={isDark}
          onThemeToggle={() => setIsDark(!isDark)}
        />

        <main className={`min-h-screen transition-all duration-300 ease-out-expo ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto relative z-10">
              {renderPage()}

              {/* Keyboard Shortcuts Help */}
              <div className="fixed bottom-4 right-4 text-xs text-slate-600">
                <span className="hidden sm:inline">Press </span>
                <kbd className="px-1.5 py-0.5 bg-slate-800/50 rounded border border-white/10 font-mono">&#8984;B</kbd>
                <span className="hidden sm:inline"> to toggle sidebar</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
