export type CurrentPeriod = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  requestCount: number;
};

export type DailyUsage = {
  date: string;
  label: string;
  input: number;
  output: number;
  requests: number;
};

export type ModelBreakdown = {
  model: string;
  tokens: number;
  percentage: number;
  color: 'blue' | 'violet' | 'emerald';
};

export type BillingCycle = {
  start: string;
  end: string;
  daysRemaining: number;
  budgetLimit: number;
};

export type Pricing = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

export type UsageData = {
  currentPeriod: CurrentPeriod;
  dailyUsage: DailyUsage[];
  modelBreakdown: ModelBreakdown[];
  billingCycle: BillingCycle;
  pricing: Pricing;
};

export type ApiKeyStatus = 'active' | 'inactive';

export type ApiKey = {
  id: number;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  usage: number;
  status: ApiKeyStatus;
};

export type AlertType = 'warning' | 'info' | 'success' | 'error';

export type Alert = {
  id: number;
  type: AlertType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

export type UsageLogStatus = 'success' | 'error';

export type UsageLog = {
  id: number;
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
  status: UsageLogStatus;
  apiKey: string;
};

export type TeamMemberRole = 'Owner' | 'Admin' | 'Developer';

export type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: TeamMemberRole;
  usage: number;
  avatar: string;
};

export type User = {
  name: string;
  email: string;
  plan: string;
  initials: string;
};

export type DashboardData = {
  usage: UsageData;
  apiKeys: ApiKey[];
  alerts: Alert[];
  usageLogs: UsageLog[];
  teamMembers: TeamMember[];
  user: User;
};
