import { Input } from '@/presentation/components/ui/Input';
import {
  PERIOD_PRESETS,
  resolvePeriod,
  resolveDay,
  formatDateInput,
  type PeriodPreset,
  type PeriodRange,
} from '@/shared/utils/date-range';

export interface PeriodValue {
  preset: PeriodPreset | 'custom';
  range: PeriodRange;
}

interface PeriodSelectorProps {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  /** Texto del rango resuelto, para mostrar junto a los controles. */
  rangeLabel?: string;
}

/**
 * Selector de período reutilizable: presets rápidos + rango personalizado.
 *
 * Deja el rango en ISO listo para enviar a la API, así sirve para ventas,
 * compras o movimientos sin duplicar lógica.
 */
export function PeriodSelector({ value, onChange, rangeLabel }: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      <div className="inline-flex overflow-hidden rounded-lg border border-border-input">
        {PERIOD_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange({ preset: preset.value, range: resolvePeriod(preset.value) })}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              value.preset === preset.value
                ? 'bg-brand-500 text-white'
                : 'bg-surface-primary text-text-secondary hover:bg-surface-secondary'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <Input
          label="Desde"
          type="date"
          value={formatDateInput(value.range.from)}
          onChange={(e) =>
            onChange({
              preset: 'custom',
              range: { from: resolveDay(e.target.value).from, to: value.range.to },
            })
          }
        />
        <Input
          label="Hasta"
          type="date"
          value={formatDateInput(value.range.to)}
          onChange={(e) =>
            onChange({
              preset: 'custom',
              range: { from: value.range.from, to: resolveDay(e.target.value).to },
            })
          }
        />
      </div>

      {rangeLabel && <p className="text-xs text-text-muted">{rangeLabel}</p>}
    </div>
  );
}
