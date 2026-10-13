import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToastStore, type Toast, type ToastType } from '@/application/stores/useToastStore';

const typeStyles: Record<ToastType, { container: string; icon: React.ReactNode }> = {
  success: {
    container: 'border-semantic-success-500',
    icon: <CheckCircle2 className="h-5 w-5 text-semantic-success-600" />,
  },
  error: {
    container: 'border-semantic-danger-500',
    icon: <XCircle className="h-5 w-5 text-semantic-danger-600" />,
  },
  info: {
    container: 'border-brand-500',
    icon: <Info className="h-5 w-5 text-brand-600" />,
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div
      className={`flex items-center gap-3 w-full max-w-sm p-4 bg-surface-primary border-l-4 rounded-lg shadow-lg ${typeStyles[toast.type].container}`}
      role="alert"
    >
      {typeStyles[toast.type].icon}
      <p className="flex-1 text-sm text-text-secondary">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Contenedor de toasts. Se monta una sola vez en AppShell. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
