import type { ReactNode } from 'react';

const EmptyState = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="glass-card glass-border rounded-2xl p-6 text-center">
    <div className="text-white font-medium">{title}</div>
    {description && <div className="text-sm text-slate-400 mt-2">{description}</div>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
