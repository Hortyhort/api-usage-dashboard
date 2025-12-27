import type { ReactNode } from 'react';

const EmptyState = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="bg-white border border-claude-border rounded-2xl p-6 text-center">
    <div className="text-claude-text font-medium">{title}</div>
    {description && <div className="text-sm text-claude-text-muted mt-2">{description}</div>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
