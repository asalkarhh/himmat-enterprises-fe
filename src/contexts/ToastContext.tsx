import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../utils/cn';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, durationMs = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message, durationMs }]);

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => addToast({ type: 'success', message, title }),
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string) => addToast({ type: 'error', message, title, durationMs: 6000 }),
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string) => addToast({ type: 'info', message, title }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => addToast({ type: 'warning', message, title, durationMs: 5000 }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastItem[]; onClose: (id: string) => void }> = ({
  toasts,
  onClose,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
          info: <Info className="w-5 h-5 text-teal-600 shrink-0" />,
        };

        const bgStyles = {
          success: 'bg-emerald-50 border-emerald-200 text-emerald-950',
          error: 'bg-red-50 border-red-200 text-red-950',
          warning: 'bg-amber-50 border-amber-200 text-amber-950',
          info: 'bg-teal-50 border-teal-200 text-teal-950',
        };

        return (
          <div
            key={toast.id}
            role="alert"
            aria-live="polite"
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg transition-all animate-in slide-in-from-bottom-2 duration-200',
              bgStyles[toast.type]
            )}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              {toast.title && <p className="text-xs font-semibold leading-tight">{toast.title}</p>}
              <p className="text-xs mt-0.5 leading-relaxed break-words">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onClose(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
