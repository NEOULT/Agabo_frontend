import { Link } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import type { PosLastSale } from '@/application/hooks/pos/pos.types';

interface PosAlertsProps {
  /** Error al cargar los precios del catálogo (se puede escribir a mano). */
  pricesError?: string | null;
  /** Error al cargar las monedas (se cobra en la moneda base). */
  currenciesError?: string | null;
  /** Último cobro registrado. */
  lastSale: PosLastSale | null;
  onDismissLastSale: () => void;
  /** Pinta un importe en la moneda de visualización del POS. */
  formatAmount: (valueInBase: number) => string;
}

/** Avisos del POS: catálogo caído y el resumen del último cobro. */
export function PosAlerts({
  pricesError,
  currenciesError,
  lastSale,
  onDismissLastSale,
  formatAmount,
}: PosAlertsProps) {
  return (
    <>
      {pricesError && (
        <div className="mb-4 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          No se pudieron cargar los precios del catálogo ({pricesError}). Puedes escribir el precio
          de cada línea manualmente.
        </div>
      )}

      {currenciesError && (
        <div className="mb-4 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          No se pudieron cargar las monedas ({currenciesError}). Se muestra el cobro en la moneda
          base.
        </div>
      )}

      {lastSale && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-semantic-success-200 bg-semantic-success-50 px-4 py-3 text-sm text-semantic-success-800">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>
            Venta <span className="font-semibold">{lastSale.code}</span> cobrada por{' '}
            <span className="font-semibold">{formatAmount(lastSale.paid)}</span>
            {lastSale.balance > 0
              ? ` · saldo ${formatAmount(lastSale.balance)} (queda parcial)`
              : ' · pagada'}
            .{' '}
            <Link className="font-medium underline" to={`/sales/history/${lastSale.id}`}>
              Ver detalle
            </Link>
          </span>
          <button
            onClick={onDismissLastSale}
            className="ml-auto p-1 rounded-lg text-semantic-success-700 hover:bg-semantic-success-100"
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
