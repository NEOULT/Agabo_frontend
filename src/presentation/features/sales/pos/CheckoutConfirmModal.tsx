import { ShoppingCart } from 'lucide-react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Button } from '@/presentation/components/ui/Button';

/**
 * Cobro en la moneda en que paga el cliente. Los precios y el total están en la
 * moneda base, así que aquí se repasa lo que el cliente entrega.
 */
export interface PaymentInCurrencyView {
  /** Código ISO de la moneda cobrada (Bs, EUR...). */
  code: string;
  /** Importe ya formateado con el símbolo de esa moneda. */
  amountLabel: string;
  /** Tasa usada: unidades de esa moneda por 1 unidad de la moneda base. */
  rateLabel: string;
  /** Símbolo de la moneda base, donde queda el saldo de la venta. */
  baseSymbol: string;
}

/** Línea que se muestra en la confirmación (subconjunto del carrito). */
export interface CheckoutLineView {
  product_id: string;
  product_name: string;
  unit_name: string;
  quantity: number;
  unit_price: number;
}

interface CheckoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  /** Líneas que se van a cobrar (sin las ocultas con el "ojito"). */
  lines: CheckoutLineView[];
  /** Cuántas líneas quedaron ocultas y por eso no se cobran. */
  hiddenCount: number;
  total: number;
  amount: number;
  customerName?: string;
  /** Pinta un importe en la moneda de visualización del POS. */
  formatAmount: (value: number) => string;
  /**
   * Existencia por producto en el almacén de origen (`null` = todavía sin dato,
   * por ejemplo si el usuario no tiene permiso de inventario): sin dato no se
   * bloquea el cobro, el backend sigue validando.
   */
  availability: Record<string, number> | null;
  isStockLoading: boolean;
  /**
   * Cobro en la moneda del cliente. `null` cuando el pago va en la moneda base
   * (los precios ya están en ella).
   */
  paymentInCurrency: PaymentInCurrencyView | null;
}

/**
 * Confirmación de cobro: repasa con el cliente lo que se lleva antes de cerrar y
 * avisa si el almacén de origen no alcanza para cubrirlo (RN-INV-009), así el
 * problema se ve al cobrar y no como un error después de confirmar.
 */
export function CheckoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  lines,
  hiddenCount,
  total,
  amount,
  customerName,
  formatAmount,
  availability,
  isStockLoading,
  paymentInCurrency,
}: CheckoutConfirmModalProps) {
  // Cantidad total por producto: el backend descuenta la existencia línea por
  // línea, así que dos líneas del mismo producto suman sobre la misma fila.
  const requiredByProduct = new Map<string, number>();
  for (const line of lines) {
    requiredByProduct.set(
      line.product_id,
      (requiredByProduct.get(line.product_id) ?? 0) + line.quantity,
    );
  }

  const shortages = availability
    ? [...requiredByProduct]
        .filter(([productId, required]) => (availability[productId] ?? 0) < required)
        .map(([productId, required]) => ({
          name: lines.find((line) => line.product_id === productId)?.product_name ?? 'Producto',
          required,
          available: availability[productId] ?? 0,
        }))
    : [];

  const hasShortage = shortages.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar cobro"
      subtitle="Revisa con el cliente los productos que se lleva."
      icon={<ShoppingCart className="h-5 w-5" />}
      size="lg"
      disableBackdropClose={isLoading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={hasShortage}
            title={hasShortage ? 'Sin existencia suficiente en el almacén de origen' : undefined}
          >
            Cobrar {formatAmount(amount)}
          </Button>
        </>
      }
    >
      {customerName && (
        <p className="mb-3 text-sm text-text-secondary">
          Cliente: <span className="font-medium text-text-primary">{customerName}</span>
        </p>
      )}

      <ul className="overflow-hidden rounded-xl border border-border-default">
        {lines.map((line, index) => {
          const short = availability
            ? (availability[line.product_id] ?? 0) <
              (requiredByProduct.get(line.product_id) ?? line.quantity)
            : false;

          return (
            <li
              key={`${line.product_id}-${index}`}
              className={`flex items-center gap-3 border-b border-border-subtle px-3 py-2.5 last:border-b-0 ${
                short ? 'bg-semantic-danger-50' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {line.product_name}
                </p>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {line.quantity} {line.unit_name} × {formatAmount(line.unit_price)}
                  {availability && (
                    <>
                      {' · '}Disponible:{' '}
                      <span className={short ? 'font-medium text-semantic-danger-700' : undefined}>
                        {availability[line.product_id] ?? 0}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <span className="text-sm font-semibold text-text-primary">
                {formatAmount(line.quantity * line.unit_price)}
              </span>
            </li>
          );
        })}
      </ul>

      {isStockLoading && (
        <p className="mt-3 text-xs text-text-tertiary">Consultando existencia del almacén…</p>
      )}

      {hasShortage && (
        <p className="mt-3 rounded-lg bg-semantic-danger-50 px-3 py-2 text-xs text-semantic-danger-700">
          No hay existencia suficiente en el almacén de origen:{' '}
          {shortages
            .map((s) => `${s.name} (necesitas ${s.required}, hay ${s.available})`)
            .join('; ')}
          . Ajusta las cantidades o repón el inventario antes de cobrar.
        </p>
      )}

      {hiddenCount > 0 && (
        <p className="mt-3 rounded-lg bg-semantic-warning-50 px-3 py-2 text-xs text-semantic-warning-800">
          {hiddenCount} producto(s) oculto(s) no se cobran en esta venta.
        </p>
      )}

      {paymentInCurrency && (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
          El cliente paga <span className="font-semibold">{paymentInCurrency.amountLabel}</span> · tasa{' '}
          {paymentInCurrency.rateLabel} {paymentInCurrency.code} por 1{' '}
          {paymentInCurrency.baseSymbol}. El saldo de la venta queda en{' '}
          {paymentInCurrency.baseSymbol} (moneda base).
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="text-sm text-text-tertiary">Total a cobrar</span>
        <span className="text-lg font-bold text-text-primary">{formatAmount(total)}</span>
      </div>
    </Modal>
  );
}
