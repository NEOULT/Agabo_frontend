import React from 'react';
import { History } from 'lucide-react';

import { useMovementTypes } from '@/application/hooks/useMovementTypes';
import { useStockHistory } from '@/application/hooks/useStockHistory';
import { Modal } from '@/presentation/components/ui/Modal';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { formatDate, formatQuantity } from '@/shared/utils/format';
import type { Stock } from '@/domain/models';

interface StockHistoryModalProps {
  isOpen: boolean;
  stock: Stock | null;
  productName: string;
  warehouseName: string;
  onClose: () => void;
}

/**
 * Historial de una existencia (producto + almacén) en un modal centrado.
 *
 * El saldo corrido parte del saldo actual y se reconstruye hacia atrás con los
 * movimientos: entradas suman, salidas restan y las transferencias afectan solo
 * al almacén seleccionado.
 */
export function StockHistoryModal({
  isOpen,
  stock,
  productName,
  warehouseName,
  onClose,
}: StockHistoryModalProps) {
  const { movementTypes, fetchMovementTypes } = useMovementTypes();
  const { entries, isLoading, error } = useStockHistory({
    productId: stock?.product_id ?? '',
    warehouseId: stock?.warehouse_id ?? '',
    currentQuantity: stock?.quantity ?? 0,
    enabled: isOpen && stock !== null,
  });

  React.useEffect(() => {
    if (isOpen) void fetchMovementTypes();
  }, [isOpen, fetchMovementTypes]);

  if (!isOpen || !stock) return null;

  const typeName = (typeId: string) =>
    movementTypes.find((type) => type.id === typeId)?.name ?? 'Movimiento';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productName}
      subtitle={warehouseName}
      icon={<History className="h-5 w-5" />}
      size="2xl"
    >
      <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-secondary/60 px-4 py-3">
        <span className="text-sm text-text-secondary">Saldo actual</span>
        <span className="text-lg font-bold text-text-primary">
          {formatQuantity(stock.quantity)}
        </span>
      </div>

      {isLoading && <LoadingSpinner label="Cargando historial..." />}

      {!isLoading && error && (
        <div className="rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <div className="rounded-lg border border-dashed border-border-subtle px-6 py-10 text-center">
          <p className="font-medium text-text-primary">Sin movimientos registrados</p>
          <p className="mt-1 text-sm text-text-tertiary">
            Esta existencia todavía no tiene entradas, salidas, transferencias ni anulaciones.
          </p>
        </div>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isIn = entry.direction === 'in';

            return (
              <article
                key={entry.movement.id}
                className="rounded-lg border border-border-subtle bg-surface-secondary/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isIn
                            ? 'bg-semantic-success-100 text-semantic-success-700'
                            : 'bg-semantic-danger-100 text-semantic-danger-700'
                        }`}
                      >
                        {isIn ? 'Entrada' : 'Salida'}
                      </span>
                      <span className="text-sm font-medium text-text-primary">
                        {typeName(entry.movement.movement_type_id)}
                      </span>
                      {entry.movement.reversed_movement_id && (
                        <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-text-tertiary">
                          Anulación
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {formatDate(entry.movement.created_at)}
                      {entry.movement.reference ? ` · Ref. ${entry.movement.reference}` : ''}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        isIn ? 'text-semantic-success-700' : 'text-semantic-danger-700'
                      }`}
                    >
                      {isIn ? '+' : '−'}
                      {formatQuantity(entry.quantity)}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Saldo: {formatQuantity(entry.balance)}
                    </p>
                  </div>
                </div>

                {entry.movement.note && (
                  <p className="mt-2 text-xs text-text-secondary">{entry.movement.note}</p>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-xs text-text-tertiary">
        El historial se construye con los movimientos de inventario. Los ajustes manuales de
        cantidad no se registran como movimientos y no aparecen aquí.
      </p>
    </Modal>
  );
}
