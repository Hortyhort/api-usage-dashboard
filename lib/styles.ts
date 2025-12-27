// Centralized color and style mappings for consistent theming

export const alertStyles = {
  warning: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    border: 'border-l-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/20 text-amber-500 dark:text-amber-400',
  },
  error: {
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    border: 'border-l-red-500',
    text: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500/20 text-red-500 dark:text-red-400',
  },
  success: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    border: 'border-l-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400',
  },
  info: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    border: 'border-l-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/20 text-blue-500 dark:text-blue-400',
  },
} as const;

export const statusStyles = {
  active: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  inactive: {
    bg: 'bg-claude-beige dark:bg-claude-dark-surface-hover',
    text: 'text-claude-text-muted dark:text-claude-dark-text-muted',
    dot: 'bg-claude-text-muted dark:bg-claude-dark-text-muted',
  },
  pending: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  error: {
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
} as const;

export const modelColors: Record<string, { bg: string; text: string; chart: string }> = {
  'Claude Sonnet 4.5': {
    bg: 'bg-claude-terracotta/10',
    text: 'text-claude-terracotta',
    chart: '#DA7756',
  },
  'Claude Opus 4.5': {
    bg: 'bg-claude-terracotta-dark/10',
    text: 'text-claude-terracotta-dark',
    chart: '#C75B39',
  },
  'Claude Haiku 4.5': {
    bg: 'bg-orange-200/30 dark:bg-orange-400/20',
    text: 'text-orange-600 dark:text-orange-400',
    chart: '#E8A088',
  },
  default: {
    bg: 'bg-slate-200/50 dark:bg-slate-700/50',
    text: 'text-slate-600 dark:text-slate-400',
    chart: '#94A3B8',
  },
};

export const getModelColor = (model: string) => modelColors[model] ?? modelColors.default;

export const roleStyles: Record<string, { bg: string; text: string }> = {
  admin: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
  },
  developer: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
  },
  viewer: {
    bg: 'bg-claude-beige dark:bg-claude-dark-surface-hover',
    text: 'text-claude-text-muted dark:text-claude-dark-text-muted',
  },
  billing: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
};

export const getRoleStyle = (role: string) => roleStyles[role.toLowerCase()] ?? roleStyles.viewer;

// Common component class patterns
export const cardClasses = {
  base: 'bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl',
  interactive: 'bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl transition-all duration-200 hover:shadow-claude-md dark:hover:shadow-lg dark:hover:shadow-black/20',
  section: 'bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-5 sm:p-6',
};

export const inputClasses = {
  base: 'bg-claude-beige dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text border border-claude-border dark:border-claude-dark-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-claude-terracotta/40 placeholder:text-claude-text-muted/60 dark:placeholder:text-claude-dark-text-muted/60',
  select: 'bg-claude-beige dark:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text border border-claude-border dark:border-claude-dark-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-claude-terracotta/40 cursor-pointer',
};

export const buttonClasses = {
  primary: 'bg-claude-terracotta hover:bg-claude-terracotta-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-claude-terracotta/25 active:scale-[0.98]',
  secondary: 'bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border hover:bg-claude-beige dark:hover:bg-claude-dark-surface-hover text-claude-text dark:text-claude-dark-text px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
  ghost: 'text-claude-text-muted dark:text-claude-dark-text-muted hover:text-claude-text dark:hover:text-claude-dark-text hover:bg-claude-beige dark:hover:bg-claude-dark-surface-hover px-3 py-2 rounded-lg transition-all duration-200',
  danger: 'hover:bg-red-500/10 dark:hover:bg-red-500/20 text-claude-text-muted dark:text-claude-dark-text-muted hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg transition-colors',
};

export const textClasses = {
  heading: 'text-claude-text dark:text-claude-dark-text',
  muted: 'text-claude-text-muted dark:text-claude-dark-text-muted',
  label: 'text-xs text-claude-text-muted dark:text-claude-dark-text-muted font-medium uppercase tracking-wider',
};
