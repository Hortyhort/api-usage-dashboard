import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icons } from '../icons';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastInput = Omit<Toast, 'id'>;

type ToastContextValue = {
  addToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantStyles: Record<ToastVariant, { icon: () => JSX.Element; tone: string }> = {
  success: { icon: Icons.Check, tone: 'text-emerald-400' },
  error: { icon: Icons.X, tone: 'text-red-400' },
  info: { icon: Icons.Info, tone: 'text-blue-400' },
  warning: { icon: Icons.Warning, tone: 'text-amber-400' },
};

const getToastId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
  }, []);

  const addToast = useCallback((toast: ToastInput) => {
    const id = getToastId();
    setToasts((prev) => [...prev, { id, variant: 'info', ...toast }]);
    const timeout = setTimeout(() => removeToast(id), toast.duration ?? 4000);
    timeoutsRef.current[id] = timeout;
  }, [removeToast]);

  const value = useMemo(() => ({ addToast }), [addToast]);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-6 bottom-6 z-[80] flex flex-col gap-3" aria-live="polite">
        {toasts.map((toast) => {
          const variant = toast.variant ?? 'info';
          const Icon = variantStyles[variant].icon;
          return (
            <div key={toast.id} className="glass-card glass-border rounded-2xl px-4 py-3 w-80 shadow-lg shadow-black/40 animate-slide-up">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${variantStyles[variant].tone}`}>
                  <Icon />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{toast.title}</div>
                  {toast.description && <div className="text-xs text-slate-400 mt-1">{toast.description}</div>}
                  {toast.actionLabel && toast.onAction && (
                    <button
                      type="button"
                      className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={() => {
                        toast.onAction?.();
                        removeToast(toast.id);
                      }}
                    >
                      {toast.actionLabel}
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => removeToast(toast.id)} className="text-slate-500 hover:text-slate-200 transition-colors" aria-label="Dismiss notification">
                  <Icons.X />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
