import React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Texto secundario bajo la etiqueta (código, categoría, etc.). */
  description?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  /** Texto cuando la búsqueda no encuentra coincidencias. */
  emptyText?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

/**
 * Select con caja de búsqueda: el usuario escribe para filtrar en vez de
 * recorrer una lista larga de opciones (productos, almacenes, etc.).
 *
 * El filtro compara contra la etiqueta y la descripción. Se comporta como un
 * combobox: se cierra con `Escape` o al hacer clic fuera, y permite navegar con
 * las flechas y confirmar con `Enter`.
 */
export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  emptyText = 'Sin coincidencias',
  error,
  helperText,
  required = false,
  disabled = false,
  id,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [highlighted, setHighlighted] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        option.description?.toLowerCase().includes(term),
    );
  }, [options, query]);

  // Cierra al hacer clic fuera del control.
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Mantiene el foco en el buscador al abrir.
  React.useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setQuery('');
    const index = options.findIndex((option) => option.value === value);
    setHighlighted(index >= 0 ? index : 0);
  };

  const selectOption = (option: SearchableSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[highlighted];
      if (option) selectOption(option);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text-secondary"
        >
          {label}
          {required && <span className="ml-1 text-semantic-danger-500">*</span>}
        </label>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={id ? `${id}-listbox` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={isOpen ? query : selected?.label ?? ''}
          placeholder={selected && !isOpen ? selected.label : placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
            setIsOpen(true);
          }}
          onClick={open}
          onKeyDown={handleKeyDown}
          className={`
            w-full rounded-lg border bg-surface-primary py-2 pl-9 pr-9 text-sm
            transition-colors duration-150 placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
            disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-tertiary
            ${
              error
                ? 'border-semantic-danger-300 focus:ring-semantic-danger-500 focus:border-semantic-danger-500'
                : 'border-border-input'
            }
          `}
        />

        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && (
        <div className="relative">
          <ul
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border-default bg-surface-primary py-1 shadow-elevated"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-text-tertiary">{emptyText}</li>
            )}

            {filtered.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlighted;

              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={option.disabled}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => selectOption(option)}
                    className={`
                      flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors
                      disabled:cursor-not-allowed disabled:opacity-60
                      ${
                        isHighlighted
                          ? 'bg-surface-tertiary text-text-primary'
                          : 'text-text-secondary'
                      }
                      ${isSelected ? 'font-medium text-brand-600' : ''}
                    `}
                  >
                    <span className="flex-1">
                      {option.label}
                      {option.description && (
                        <span className="block text-xs font-normal text-text-tertiary">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-semantic-danger-600">{error}</p>}
      {helperText && !error && <p className="text-sm text-text-tertiary">{helperText}</p>}
    </div>
  );
}
