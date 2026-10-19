import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Línea de un ticket en espera (misma forma que el carrito, sin la clave de React). */
export interface ParkedSaleLine {
  product_id: string;
  product_name: string;
  /** Nombre de la unidad base del producto. */
  unit_name: string;
  quantity: number;
  unit_price: number;
  /** Oculto con el "ojito": no cuenta en el total ni se cobra. */
  is_hidden: boolean;
}

/**
 * Ticket en espera del punto de venta.
 *
 * Vive solo en el navegador (localStorage): no toca el backend. Es un carrito
 * que el cajero deja "aparcado" para atender a otro cliente y retoma después.
 */
export interface ParkedSale {
  id: string;
  /** Etiqueta legible: el cliente o "Ticket N". */
  label: string;
  /** ISO de cuándo se puso en espera. */
  created_at: string;
  customer_id: string;
  note: string;
  branch_id: string;
  warehouse_id: string;
  payment_method_id: string;
  lines: ParkedSaleLine[];
}

interface ParkedSalesState {
  /** Tickets en espera, el más reciente primero. Sin límite práctico. */
  parkedSales: ParkedSale[];
  parkSale: (sale: ParkedSale) => void;
  removeParkedSale: (id: string) => void;
  clearParkedSales: () => void;
}

export const useParkedSalesStore = create<ParkedSalesState>()(
  persist(
    (set) => ({
      parkedSales: [],
      parkSale: (sale) => set((state) => ({ parkedSales: [sale, ...state.parkedSales] })),
      removeParkedSale: (id) =>
        set((state) => ({ parkedSales: state.parkedSales.filter((sale) => sale.id !== id) })),
      clearParkedSales: () => set({ parkedSales: [] }),
    }),
    { name: 'agabo.pos.parkedSales' },
  ),
);
