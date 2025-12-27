import type { DashboardData, UsageData, ApiKey, Alert, UsageLog, TeamMember, User } from '../types/dashboard';

export const mockUsageData: UsageData = {
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
  billingCycle: { start: 'Dec 1, 2025', end: 'Dec 31, 2025', daysRemaining: 5, budgetLimit: 75.0 },
  pricing: { input: 3.0, output: 15.0, cacheRead: 0.3, cacheWrite: 3.75 },
};

export const mockApiKeys: ApiKey[] = [
  { id: 1, name: 'Production API Key', key: 'sk-ant-api03-...7x9K', created: 'Nov 15, 2025', lastUsed: '2 minutes ago', usage: 2450000, status: 'active' },
  { id: 2, name: 'Development Key', key: 'sk-ant-api03-...2m4N', created: 'Dec 1, 2025', lastUsed: '3 hours ago', usage: 289000, status: 'active' },
  { id: 3, name: 'Testing Environment', key: 'sk-ant-api03-...8p2Q', created: 'Dec 10, 2025', lastUsed: '1 day ago', usage: 45000, status: 'active' },
  { id: 4, name: 'Old Integration Key', key: 'sk-ant-api03-...1k5L', created: 'Oct 5, 2025', lastUsed: '2 weeks ago', usage: 892000, status: 'inactive' },
];

export const mockAlerts: Alert[] = [
  { id: 1, type: 'warning', title: 'Budget threshold reached', message: 'You\'ve used 80% of your monthly budget ($60.00 of $75.00)', time: '2 hours ago', read: false },
  { id: 2, type: 'info', title: 'Usage spike detected', message: 'Token usage increased 45% compared to yesterday', time: '5 hours ago', read: false },
  { id: 3, type: 'success', title: 'Cache optimization improved', message: 'Your cache hit rate improved to 23% this week', time: '1 day ago', read: true },
  { id: 4, type: 'error', title: 'Rate limit warning', message: 'You approached 90% of rate limit at 2:34 PM', time: '1 day ago', read: true },
];

export const mockUsageLogs: UsageLog[] = [
  { id: 1, timestamp: '2025-12-26 14:32:15', model: 'claude-sonnet-4-5', inputTokens: 1250, outputTokens: 420, latency: 1.2, status: 'success', apiKey: 'Production API Key' },
  { id: 2, timestamp: '2025-12-26 14:31:58', model: 'claude-opus-4-5', inputTokens: 3200, outputTokens: 890, latency: 2.8, status: 'success', apiKey: 'Production API Key' },
  { id: 3, timestamp: '2025-12-26 14:31:42', model: 'claude-haiku-4-5', inputTokens: 450, outputTokens: 125, latency: 0.4, status: 'success', apiKey: 'Development Key' },
  { id: 4, timestamp: '2025-12-26 14:31:20', model: 'claude-sonnet-4-5', inputTokens: 2100, outputTokens: 0, latency: 0.1, status: 'error', apiKey: 'Production API Key' },
  { id: 5, timestamp: '2025-12-26 14:30:55', model: 'claude-sonnet-4-5', inputTokens: 1800, outputTokens: 560, latency: 1.5, status: 'success', apiKey: 'Production API Key' },
  { id: 6, timestamp: '2025-12-26 14:30:12', model: 'claude-opus-4-5', inputTokens: 4500, outputTokens: 1200, latency: 3.2, status: 'success', apiKey: 'Development Key' },
  { id: 7, timestamp: '2025-12-26 14:29:45', model: 'claude-haiku-4-5', inputTokens: 320, outputTokens: 95, latency: 0.3, status: 'success', apiKey: 'Testing Environment' },
  { id: 8, timestamp: '2025-12-26 14:29:02', model: 'claude-sonnet-4-5', inputTokens: 1650, outputTokens: 480, latency: 1.3, status: 'success', apiKey: 'Production API Key' },
];

export const mockTeamMembers: TeamMember[] = [
  { id: 1, name: 'David Horton', email: 'david@example.com', role: 'Owner', usage: 1450000, avatar: 'DH' },
  { id: 2, name: 'Sarah Chen', email: 'sarah@example.com', role: 'Admin', usage: 890000, avatar: 'SC' },
  { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Developer', usage: 320000, avatar: 'MJ' },
  { id: 4, name: 'Emily Davis', email: 'emily@example.com', role: 'Developer', usage: 180000, avatar: 'ED' },
];

export const mockUser: User = {
  name: 'David Horton',
  email: 'david@example.com',
  plan: 'Max plan',
  initials: 'DH',
};

export const mockDashboardData: DashboardData = {
  usage: mockUsageData,
  apiKeys: mockApiKeys,
  alerts: mockAlerts,
  usageLogs: mockUsageLogs,
  teamMembers: mockTeamMembers,
  user: mockUser,
};
