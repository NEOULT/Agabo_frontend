import React from 'react';
import { Card } from '@/presentation/components/ui/Card';

type KpiVariant = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

interface KpiCardProps {
  label: string;
  /** Valor ya formateado (moneda, número...). */
  value: string;
  icon?: React.ReactNode;
  /** Texto de apoyo bajo el valor. */
  hint?: string;
  variant?: KpiVariant;
  /** Contenido extra al pie (mini-desglose, badges...). */
  footer?: React.ReactNode;
}

const iconStyles: Record<KpiVariant, string> = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-semantic-success-100 text-semantic-success-800',
  warning: 'bg-semantic-warning-100 text-semantic-warning-800',
  danger: 'bg-semantic-danger-100 text-semantic-danger-800',
  neutral: 'bg-surface-tertiary text-text-secondary',
};

/** Tarjeta de indicador reutilizable para dashboards y reportes. */
export function KpiCard({ label, value, icon, hint, variant = 'brand', footer }: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-tertiary">{label}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
        </div>
        {icon && (
          <span
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconStyles[variant]}`}
          >
            {icon}
          </span>
        )}
      </div>
      {footer && <div className="mt-3 border-t border-border-subtle pt-3">{footer}</div>}
    </Card>
  );
}
