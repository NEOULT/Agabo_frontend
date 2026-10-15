/**
 * 📅 Rangos de fecha reutilizables para reportes y filtros.
 *
 * Todo el rango se entrega como ISO con zona (lo que espera la API), así que
 * sirve igual para ventas, compras o movimientos.
 */

export type PeriodPreset = 'today' | 'last7' | 'last30' | 'thisMonth';

export interface PeriodRange {
  /** Límite inferior (ISO con zona). */
  from: string;
  /** Límite superior (ISO con zona). */
  to: string;
}

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'last7', label: '7 días' },
  { value: 'last30', label: '30 días' },
  { value: 'thisMonth', label: 'Este mes' },
];

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Resuelve un preset al rango ISO correspondiente (por defecto, 30 días). */
export function resolvePeriod(preset: PeriodPreset, now: Date = new Date()): PeriodRange {
  const today = startOfDay(now);

  switch (preset) {
    case 'today':
      return { from: today.toISOString(), to: now.toISOString() };
    case 'last7':
      return { from: addDays(today, -6).toISOString(), to: now.toISOString() };
    case 'thisMonth':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        to: now.toISOString(),
      };
    case 'last30':
    default:
      return { from: addDays(today, -29).toISOString(), to: now.toISOString() };
  }
}

/** Rango de un día concreto (ISO), útil para selects de fecha sueltos. */
export function resolveDay(isoDate: string): PeriodRange {
  const start = startOfDay(new Date(`${isoDate}T00:00:00`));
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Valor `YYYY-MM-DD` (para `<input type="date">`) de un ISO con zona. */
export function formatDateInput(iso: string): string {
  const date = new Date(iso);
  return dayKeyLocal(date);
}

function dayKeyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Texto corto y legible del rango (ej: "01/10/2026 – 15/10/2026"). */
export function formatRangeLabel(range: PeriodRange): string {
  const fmt = new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${fmt.format(new Date(range.from))} – ${fmt.format(new Date(range.to))}`;
}
