import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  badge?: ReactNode;
};

const PageHeader = ({ title, description, action, badge }: PageHeaderProps) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-claude-text dark:text-claude-dark-text">
          {title}
        </h1>
        {badge}
      </div>
      {description && (
        <p className="text-claude-text-muted dark:text-claude-dark-text-muted text-sm mt-1.5 font-medium">
          {description}
        </p>
      )}
    </div>
    {action && <div className="flex flex-wrap items-center gap-3">{action}</div>}
  </div>
);

export default PageHeader;
