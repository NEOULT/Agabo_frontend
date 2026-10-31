import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type SelectVariant = 'default' | 'header';
type SelectSize = 'sm' | 'md';

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  /** `header` pinta el control para la barra oscura de navegación. */
  variant?: SelectVariant;
  /** `sm` es la versión compacta de filtros y barras de herramientas. */
  size?: SelectSize;
}

const variantStyles: Record<SelectVariant, { select: string; chevron: string }> = {
  default: {
    select: 'border-border-input bg-surface-primary text-text-primary focus:border-brand-500 focus:ring-brand-500',
    chevron: 'text-text-muted',
  },
  header: {
    select: 'border-header-border bg-header-select text-header-text focus:border-header-ring focus:ring-header-ring',
    chevron: 'text-header-muted',
  },
};

const sizeStyles: Record<SelectSize, { select: string; chevron: string }> = {
  sm: { select: 'px-2.5 py-1 pr-8 text-xs', chevron: 'right-2 h-4 w-4' },
  md: { select: 'px-3 py-2 pr-10 text-sm', chevron: 'right-3 h-4 w-4' },
};

/**
 * Select nativo con apariencia de proyecto.
 *
 * Es el único componente de selección de la app: todas las pantallas lo usan,
 * incluido el selector de sucursal del navbar (variante `header`) y los filtros
 * compactos (tamaño `sm`).
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      variant = 'default',
      size = 'md',
      className = '',
      ...props
    },
    ref,
  ) => {
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
            {props.required && <span className="ml-1 text-semantic-danger-500">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full appearance-none rounded-lg border transition-colors duration-150
              focus:outline-none focus:ring-2
              disabled:cursor-not-allowed disabled:opacity-60
              ${variantStyle.select}
              ${sizeStyle.select}
              ${error ? 'border-semantic-danger-300 focus:border-semantic-danger-500 focus:ring-semantic-danger-500' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${sizeStyle.chevron} ${variantStyle.chevron}`}
          />
        </div>

        {error && <p className="text-sm text-semantic-danger-600">{error}</p>}
        {helperText && !error && <p className="text-sm text-text-tertiary">{helperText}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
