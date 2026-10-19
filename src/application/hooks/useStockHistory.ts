import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Movement } from '@/domain/models';

export interface StockHistoryEntry {
  movement: Movement;
  /** Cantidad del producto afectada por el movimiento. */
  quantity: number;
  /** Efecto sobre la existencia seleccionada. */
  direction: 'in' | 'out';
  /** Saldo de la existencia después de aplicar el movimiento. */
  balance: number;
}

interface UseStockHistoryOptions {
  productId: string;
  warehouseId: string;
  /** Saldo actual de la existencia; es el punto de partida del saldo corrido. */
  currentQuantity: number;
  enabled: boolean;
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/**
 * Historial de una existencia (producto + almacén) a partir de sus movimientos.
 *
 * El backend devuelve los movimientos más recientes primero. Se recorre en ese
 * orden partiendo del saldo actual y se deshace cada efecto para obtener el
 * saldo que quedó después de cada movimiento.
 *
 * Los ajustes manuales de cantidad no son movimientos: no aparecen aquí.
 */
export function useStockHistory({
  productId,
  warehouseId,
  currentQuantity,
  enabled,
}: UseStockHistoryOptions) {
  const { movements: movementRepo } = useRepositories();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!enabled || !productId || !warehouseId) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await movementRepo.getByProduct(productId, { warehouseId });
      setMovements(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.');
      setMovements([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, movementRepo, productId, warehouseId]);

  useEffect(() => {
    if (!enabled) {
      setMovements([]);
      setError(null);
      return;
    }

    void fetchHistory();
  }, [enabled, fetchHistory]);

  const entries = useMemo<StockHistoryEntry[]>(() => {
    let balance = currentQuantity;
    const result: StockHistoryEntry[] = [];

    for (const movement of movements) {
      const quantity = movement.details
        .filter((detail) => detail.product_id === productId)
        .reduce((sum, detail) => sum + Number(detail.quantity), 0);

      if (!(quantity > 0)) continue;

      const isOrigin = movement.origin_warehouse_id === warehouseId;
      const isDestination = movement.destination_warehouse_id === warehouseId;

      if (!isOrigin && !isDestination) continue;

      // Una transferencia no puede tener el mismo almacén en origen y destino
      // (RN-INV-007), así que solo una de las dos condiciones aplica.
      const direction: 'in' | 'out' = isOrigin ? 'out' : 'in';
      const delta = direction === 'in' ? quantity : -quantity;

      result.push({
        movement,
        quantity,
        direction,
        balance: round4(balance),
      });

      balance = round4(balance - delta);
    }

    return result;
  }, [currentQuantity, movements, productId, warehouseId]);

  return { entries, isLoading, error, reload: fetchHistory };
}
