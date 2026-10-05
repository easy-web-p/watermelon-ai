import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { cn } from '../../lib/cn';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; tone: ToastTone; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE = {
  success: { icon: 'check_circle', className: 'bg-secondary text-on-secondary' },
  error: { icon: 'error', className: 'bg-error text-on-error' },
  info: { icon: 'info', className: 'bg-inverse-surface text-inverse-on-surface' },
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(window.clearTimeout);
  }, []);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, tone, message }]);
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
    timers.current.push(timer);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:top-20 sm:right-4 sm:left-auto sm:items-end"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-full px-4 py-3 shadow-dock',
              'animate-[toast-in_200ms_ease-out]',
              TONE[toast.tone].className,
            )}
          >
            <Icon name={TONE[toast.tone].icon} size={20} className="mt-0.5 shrink-0" />
            <p className="text-body-md">{toast.message}</p>
            <button
              type="button"
              aria-label="ปิดการแจ้งเตือน"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              className="ml-1 shrink-0 cursor-pointer opacity-70 transition-opacity hover:opacity-100"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
