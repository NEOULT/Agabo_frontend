import React from 'react';
import { createPortal } from 'react-dom';
import { Filter, Search } from 'lucide-react';

export interface ColumnFilterOption {
  /** Valor aceptado por el filtro; `''` representa "sin valor". */
  value: string;
  label: string;
  /** Cantidad de filas con ese valor (opcional). */
  count?: number;
}

interface ColumnFilterProps {
  /** Nombre de la columna, solo para accesibilidad y título. */
  columnLabel: string;
  options: ColumnFilterOption[];
  /** Valores aceptados. Lista vacía = se muestran todos. */
  selected: string[];
  onChange: (values: string[]) => void;
}

const POPOVER_WIDTH = 240;
const VIEWPORT_MARGIN = 8;

/**
 * Filtro de columna estilo hoja de cálculo.
 *
 * Se coloca en el encabezado de la tabla y abre un desplegable con los valores
 * presentes en esa columna. Sin valores seleccionados se muestran todos; se
 * puede aceptar uno o varios, o la opción "sin valor" para las filas que no
 * tienen dato en esa columna.
 *
 * El desplegable se monta en un portal porque las tablas viven dentro de un
 * contenedor con scroll, y ahí un `absolute` quedaría recortado.
 */
export function ColumnFilter({
  columnLabel,
  options,
  selected,
  onChange,
}: ColumnFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [position, setPosition] = React.useState<{ left: number; top: number } | null>(null);

  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const isActive = selected.length > 0;

  const close = React.useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const open = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.right - POPOVER_WIDTH),
      window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN,
    );

    setPosition({ left, top: rect.bottom + 6 });
    setQuery('');
    setIsOpen(true);
  };

  // Cierra al hacer clic fuera, con Escape o cuando la página se mueve.
  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    // Al mover la página el desplegable quedaría descolocado: se cierra. El
    // scroll interno de la lista de valores no cuenta.
    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (target && popoverRef.current?.contains(target)) return;
      close();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', close);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [close, isOpen]);

  const visibleOptions = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? close() : open())}
        aria-label={`Filtrar ${columnLabel}`}
        aria-expanded={isOpen}
        title={`Filtrar ${columnLabel}`}
        className={`inline-flex items-center rounded p-0.5 transition-colors ${
          isActive
            ? 'bg-brand-100 text-brand-700'
            : 'text-text-muted hover:bg-surface-tertiary hover:text-text-secondary'
        }`}
      >
        <Filter className="h-3.5 w-3.5" />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={`Filtro de ${columnLabel}`}
            style={{ left: position.left, top: position.top, width: POPOVER_WIDTH }}
            className="fixed z-50 rounded-lg border border-border-default bg-surface-primary p-2 shadow-elevated"
          >
            <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {columnLabel}
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={!isActive}
                className="text-xs font-medium text-brand-600 hover:underline disabled:text-text-muted disabled:no-underline"
              >
                Todos
              </button>
            </div>

            {options.length > 8 && (
              <div className="relative mb-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar valor…"
                  className="w-full rounded-md border border-border-input bg-surface-primary py-1 pl-7 pr-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            <ul className="max-h-56 overflow-y-auto">
              {visibleOptions.length === 0 && (
                <li className="px-1 py-2 text-xs text-text-tertiary">Sin valores</li>
              )}

              {visibleOptions.map((option) => {
                const checked = selected.includes(option.value);

                return (
                  <li key={option.value || '__empty__'}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-surface-tertiary">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand-600"
                        checked={checked}
                        onChange={() => toggle(option.value)}
                      />
                      <span className="flex-1 truncate text-text-secondary">{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-xs text-text-tertiary">{option.count}</span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
