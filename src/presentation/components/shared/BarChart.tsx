import { memo } from 'react';
import type { SeriesPoint } from '@/shared/utils/metrics';

interface BarChartProps {
  data: SeriesPoint[];
  /** Altura del área de barras, en píxeles. */
  height?: number;
  formatValue?: (value: number) => string;
  ariaLabel?: string;
  emptyLabel?: string;
}

/**
 * Gráfico de barras verticales (sin dependencias).
 *
 * Solo CSS: las barras se dimensionan con `height` en porcentaje y se animan
 * con opacidad, así el navegador no recalcula el layout. El valor exacto está
 * en el `title` de cada barra y las etiquetas se espacian solas cuando hay
 * muchas.
 */
function BarChartBase({
  data,
  height = 180,
  formatValue = (value) => String(value),
  ariaLabel = 'Gráfico de barras',
  emptyLabel = 'Sin datos en el período.',
}: BarChartProps) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-text-tertiary">{emptyLabel}</p>;
  }

  const max = Math.max(...data.map((point) => point.value), 0);
  const labelStep = data.length > 16 ? Math.ceil(data.length / 10) : 1;

  return (
    <div className="animate-fade-in" role="img" aria-label={ariaLabel}>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((point, index) => (
          <div
            key={index}
            className="group flex h-full flex-1 flex-col justify-end"
            title={`${point.label}: ${formatValue(point.value)}`}
          >
            <div
              className="w-full rounded-t bg-brand-400 transition-colors duration-150 group-hover:bg-brand-600"
              style={{
                height: `${max > 0 ? (point.value / max) * 100 : 0}%`,
                minHeight: point.value > 0 ? 3 : 0,
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-1">
        {data.map((point, index) => (
          <span key={index} className="flex-1 text-center text-[10px] text-text-muted">
            {index % labelStep === 0 ? point.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Memorizado: no se re-renderiza si las props (ya memoizadas) no cambian. */
export const BarChart = memo(BarChartBase);
