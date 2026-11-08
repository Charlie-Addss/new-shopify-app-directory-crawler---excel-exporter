import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  X,
} from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'action';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  timestamp: number;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        id,
        message,
        title,
        type,
        timestamp: Date.now(),
      };

      setToasts((prev) => {
        // Keep max 4 toasts visible at a time
        const updated = [...prev, newToast];
        if (updated.length > 4) {
          return updated.slice(updated.length - 4);
        }
        return updated;
      });

      // Auto-dismiss after 3200ms
      const timeout = setTimeout(() => {
        dismissToast(id);
      }, 3200);

      timeoutsRef.current.set(id, timeout);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, clearAllToasts }}>
      {children}
      {/* Global Toast Container */}
      <aside
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          const isAction = toast.type === 'action';

          let borderClass = 'border-[#E1E4E8]';
          let bgClass = 'bg-white';
          let textClass = 'text-[#20242B]';
          let badgeBg = 'bg-[#F0F2F5] text-[#626B78] border-[#E1E4E8]';
          let icon = <Info className="w-4 h-4 text-[#626B78] shrink-0" />;

          if (isSuccess) {
            borderClass = 'border-emerald-300 shadow-emerald-500/5';
            textClass = 'text-emerald-950';
            badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
          } else if (isError) {
            borderClass = 'border-rose-300 shadow-rose-500/5';
            textClass = 'text-rose-950';
            badgeBg = 'bg-rose-50 text-rose-800 border-rose-200';
            icon = <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
          } else if (isWarning) {
            borderClass = 'border-amber-300 shadow-amber-500/5';
            textClass = 'text-amber-950';
            badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
            icon = <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
          } else if (isAction) {
            borderClass = 'border-[#20242B] shadow-slate-900/10';
            textClass = 'text-[#20242B]';
            badgeBg = 'bg-[#20242B] text-white border-[#20242B]';
            icon = <Sparkles className="w-4 h-4 text-[#20242B] shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-xl shadow-lg border ${borderClass} ${bgClass} transition-all duration-200 flex items-start gap-3 backdrop-blur-md`}
              role="alert"
            >
              <div className="pt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {toast.title && (
                    <span className="font-bold text-xs text-[#20242B]">
                      {toast.title}
                    </span>
                  )}
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded border ${badgeBg}`}
                  >
                    {toast.type}
                  </span>
                </div>
                <p className={`text-xs ${textClass} leading-snug break-words`}>
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-[#69717D] hover:text-[#20242B] p-1 rounded-md hover:bg-[#F0F2F5] transition shrink-0 cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
