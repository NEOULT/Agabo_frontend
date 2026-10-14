import React from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Línea de apoyo bajo el título (qué hace el diálogo, contexto, etc.). */
  subtitle?: string;
  /** Icono a la izquierda del título. */
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  /** Evita cerrar al hacer clic fuera (útil con formularios en progreso). */
  disableBackdropClose?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-6xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  disableBackdropClose = false,
}: ModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-text-primary/50 backdrop-blur-sm"
        onClick={disableBackdropClose ? undefined : onClose}
      />

      {/* Contenido */}
      <div
        className={`relative w-full ${sizeStyles[size]} bg-surface-primary rounded-xl border border-border-default shadow-xl animate-in`}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border-subtle">
          <div className="flex items-start gap-3">
            {icon && (
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                {icon}
              </span>
            )}

            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-sm text-text-tertiary">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>

        {/* Pie (acciones) */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
