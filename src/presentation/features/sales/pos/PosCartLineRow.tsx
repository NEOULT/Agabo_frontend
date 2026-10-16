import { Eye, EyeOff, Minus, Plus, Trash2 } from 'lucide-react';
import type { Product } from '@/domain/models';
import type { CartLine } from '@/application/hooks/pos/pos.types';
import { activeUnitOptions, avatarClass } from '@/application/hooks/pos/pos.utils';

interface PosCartLineRowProps {
  line: CartLine;
  /** Producto de la línea: da las presentaciones seleccionables. */
  product?: Product;
  /** Símbolo de la moneda base, con la que se escribe el precio de la línea. */
  baseSymbol: string;
  /** Pinta un importe en la moneda de visualización del POS. */
  formatAmount: (valueInBase: number) => string;
  onChangeUnit: (line: CartLine, unitId: string) => void;
  onQuantityChange: (line: CartLine, quantity: number) => void;
  onUnitPriceChange: (line: CartLine, unitPrice: number) => void;
  onToggleHidden: (line: CartLine) => void;
  onRemove: (line: CartLine) => void;
}

/** Línea del carrito: presentación, cantidad, precio, ocultar y quitar. */
export function PosCartLineRow({
  line,
  product,
  baseSymbol,
  formatAmount,
  onChangeUnit,
  onQuantityChange,
  onUnitPriceChange,
  onToggleHidden,
  onRemove,
}: PosCartLineRowProps) {
  const unitOptions = activeUnitOptions(product);

  return (
    <li
      className={`flex items-center gap-3 px-3 py-3 ${line.is_hidden ? 'opacity-50' : ''}`}
    >
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${avatarClass(
          line.product_name,
        )}`}
      >
        {line.product_name.charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{line.product_name}</p>
        <div className="mt-1 flex items-center gap-2">
          <select
            value={line.product_unit_id}
            onChange={(e) => onChangeUnit(line, e.target.value)}
            className="rounded-md border border-border-input bg-surface-primary px-2 py-0.5 text-xs text-text-secondary"
            aria-label="Presentación"
          >
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-text-tertiary">
            {line.unit_price > 0 ? `${formatAmount(line.unit_price)} c/u` : 'sin precio'}
          </span>
          {line.is_hidden && (
            <span className="text-xs font-medium text-semantic-warning-700">No cuenta</span>
          )}
        </div>
      </div>

      {/* Cantidad */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onQuantityChange(line, Math.max(1, line.quantity - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-input text-text-muted hover:text-text-primary hover:bg-surface-tertiary"
          aria-label="Quitar una unidad"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          min="1"
          step="any"
          value={line.quantity}
          onChange={(e) => onQuantityChange(line, Math.max(1, Number(e.target.value)))}
          className="w-14 rounded-lg border border-border-input bg-surface-primary px-2 py-1 text-center text-sm"
          aria-label="Cantidad"
        />
        <button
          type="button"
          onClick={() => onQuantityChange(line, line.quantity + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-input text-text-muted hover:text-text-primary hover:bg-surface-tertiary"
          aria-label="Agregar una unidad"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Precio editable (siempre en moneda base) */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-text-muted">{baseSymbol}</span>
        <input
          type="number"
          min="0"
          step="any"
          value={line.unit_price}
          onChange={(e) => onUnitPriceChange(line, Math.max(0, Number(e.target.value)))}
          className="w-20 rounded-lg border border-border-input bg-surface-primary px-2 py-1 text-right text-sm"
          aria-label="Precio unitario (moneda base)"
        />
      </div>

      <span className="w-24 text-right text-sm font-semibold text-text-primary">
        {formatAmount(line.quantity * line.unit_price)}
      </span>

      <button
        type="button"
        onClick={() => onToggleHidden(line)}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          line.is_hidden
            ? 'text-semantic-warning-600 hover:bg-surface-tertiary'
            : 'text-text-muted hover:text-brand-600 hover:bg-surface-tertiary'
        }`}
        aria-label={line.is_hidden ? 'Mostrar en el total' : 'Ocultar del total'}
        title={line.is_hidden ? 'Mostrar en el total' : 'Ocultar del total'}
      >
        {line.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>

      <button
        type="button"
        onClick={() => onRemove(line)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary"
        aria-label="Quitar del carrito"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
