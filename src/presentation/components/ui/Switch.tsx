interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Nombre accesible del interruptor (se lee con lector de pantalla). */
  label?: string;
  /** Texto de apoyo al pasar el cursor. */
  title?: string;
  id?: string;
  className?: string;
}

/**
 * Interruptor de encendido/apagado (on/off).
 *
 * Se usa en las listas donde marcar es la acción principal y no una selección
 * múltiple: el interruptor comunica estado, la casilla comunica selección.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  title,
  id,
  className = '',
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full
        transition-colors duration-150 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'bg-brand-500' : 'bg-border-input'}
        ${className}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-150 ease-in-out
          ${checked ? 'translate-x-4' : 'translate-x-0.5'}
        `}
      />
    </button>
  );
}
