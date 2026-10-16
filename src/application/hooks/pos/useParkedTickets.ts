import { useCallback } from 'react';
import { useParkedSalesStore, type ParkedSale } from '@/application/stores/useParkedSalesStore';
import type { ParkedTicketSnapshot } from './pos.types';
import { nextParkedTicketId, toParkedLines } from './pos.utils';

interface UseParkedTicketsOptions {
  /** Instantánea del POS actual: carrito más los datos del cobro. */
  buildSnapshot: () => ParkedTicketSnapshot;
  /** Vuelve a poner el POS en el estado del ticket. */
  restoreSnapshot: (sale: ParkedSale) => void;
  /** Deja el POS listo para el siguiente cliente. */
  resetSession: () => void;
}

/**
 * Tickets en espera del POS.
 *
 * El hook no conoce el estado de la pantalla: pide una instantánea y devuelve
 * el POS a la instantánea del ticket. Así el carrito, el cliente y la forma de
 * pago pueden cambiar sin tocar esta lógica.
 */
export function useParkedTickets({
  buildSnapshot,
  restoreSnapshot,
  resetSession,
}: UseParkedTicketsOptions) {
  const parkedSales = useParkedSalesStore((state) => state.parkedSales);
  const parkSale = useParkedSalesStore((state) => state.parkSale);
  const removeParkedSale = useParkedSalesStore((state) => state.removeParkedSale);

  /** Guarda el ticket y libera el POS. Devuelve la etiqueta para avisar. */
  const parkCurrent = useCallback((): string => {
    const snapshot = buildSnapshot();
    const label = snapshot.customer_name ?? `Ticket ${parkedSales.length + 1}`;

    parkSale({
      id: nextParkedTicketId(),
      label,
      created_at: new Date().toISOString(),
      customer_id: snapshot.customer_id,
      note: snapshot.note,
      branch_id: snapshot.branch_id,
      warehouse_id: snapshot.warehouse_id,
      payment_method_id: snapshot.payment_method_id,
      lines: toParkedLines(snapshot.lines),
    });

    resetSession();
    return label;
  }, [buildSnapshot, parkSale, parkedSales.length, resetSession]);

  /** Carga un ticket en espera en el POS y lo retira de la lista. */
  const resume = useCallback(
    (sale: ParkedSale) => {
      restoreSnapshot(sale);
      removeParkedSale(sale.id);
    },
    [removeParkedSale, restoreSnapshot],
  );

  return { parkedSales, parkCurrent, resume, removeParked: removeParkedSale };
}
