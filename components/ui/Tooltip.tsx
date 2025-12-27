import type { ReactNode } from 'react';

const Tooltip = ({ label, children }: { label: string; children: ReactNode }) => (
  <span className="relative inline-flex group">
    {children}
    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-slate-950/90 border border-white/10 px-2 py-1 text-[11px] text-slate-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
      {label}
    </span>
  </span>
);

export default Tooltip;
