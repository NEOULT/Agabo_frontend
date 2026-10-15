import { memo } from 'react';
import type { RankedItem } from '@/shared/utils/metrics';

interface RankedBarListProps {
  items: RankedItem[];
  /** Formatea el valor mostrado a la derecha. */
  formatValue?: (value: number) => string;
  emptyLabel?: string;
  /** Clase del relleno de la barra (por defecto, color de marca). */
  barClassName?: string;
}

/**
 * Lista con barras horizontales proporcionales.
 *
 * Reutilizable para rankings (top productos) y desgloses (estado de pagos).
 * La barra se mide contra el mayor valor y entra con un `scaleX` (transform),
 * que no provoca reflow.
 */
function RankedBarListBase({
  items,
  formatValue = (value) => String(value),
  emptyLabel = 'Sin datos en el período.',
  barClassName = 'bg-brand-500',
}: RankedBarListProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-text-tertiary">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 0);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-text-primary" title={item.label}>
              {item.label}
            </span>
            <span className="flex-shrink-0 text-text-secondary">
              {item.secondary && (
                <span className="mr-2 text-xs text-text-muted">{item.secondary}</span>
              )}
              {formatValue(item.value)}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
            <div
              className={`h-full origin-left animate-grow-x rounded-full ${barClassName}`}
              style={{ width: `${max > 0 ? Math.max(2, (item.value / max) * 100) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Memorizado: evita repintar la lista si los datos no cambiaron. */
export const RankedBarList = memo(RankedBarListBase);
