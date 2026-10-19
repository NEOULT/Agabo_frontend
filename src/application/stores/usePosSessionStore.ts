import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/application/hooks/pos/pos.types';
import { cartLineKey } from '@/application/hooks/pos/pos.utils';

/**
 * Sesión del punto de venta: la venta que el cajero está armando ahora mismo.
 *
 * Vive solo en el navegador (localStorage): no toca el backend. Guarda el
 * carrito en curso junto con las decisiones del cobro (almacén, cliente, forma
 * de pago, nota e importe), de modo que si el cajero sale de la pantalla,
 * recarga la página o cierra el POS, al volver encuentra la venta tal como la
 * dejó.
 *
 * No confundir con los tickets que el cajero aparca a propósito para atender a
 * otro cliente: esos son `useParkedSalesStore`.
 *
 * La sucursal NO vive aquí: el cobro sigue siempre a la sucursal activa de la
 * app, que es la que viaja en la cabecera `X-Branch-Uuid` con cada petición. Si
 * se persistiera una sucursal distinta, el POS cobraría contra una y el backend
 * acotaría por otra.
 */
interface PosSessionState {
  lines: CartLine[];
  warehouseId: string;
  customerId: string;
  note: string;
  paymentMethodId: string;
  amount: string;
  amountEdited: boolean;

  /** Agrega la línea; si ya existe el mismo producto, suma 1. */
  upsertLine: (line: CartLine) => void;
  updateLine: (key: string, changes: Partial<CartLine>) => void;
  removeLine: (key: string) => void;
  toggleLineHidden: (key: string) => void;
  /** Reemplaza el carrito completo (retomar un ticket en espera). */
  replaceLines: (lines: CartLine[]) => void;
  clearLines: () => void;

  setWarehouseId: (warehouseId: string) => void;
  setCustomerId: (customerId: string) => void;
  setNote: (note: string) => void;
  setPaymentMethodId: (paymentMethodId: string) => void;
  setAmount: (amount: string) => void;
  setAmountEdited: (amountEdited: boolean) => void;
}

export const usePosSessionStore = create<PosSessionState>()(
  persist(
    (set) => ({
      lines: [],
      warehouseId: '',
      customerId: '',
      note: '',
      paymentMethodId: '',
      amount: '',
      amountEdited: false,

      upsertLine: (line) =>
        set((state) => {
          const key = cartLineKey(line.product_id);
          const existing = state.lines.find(
            (current) => cartLineKey(current.product_id) === key,
          );

          if (existing) {
            return {
              lines: state.lines.map((current) =>
                current.key === existing.key
                  ? { ...current, quantity: current.quantity + 1 }
                  : current,
              ),
            };
          }

          return { lines: [...state.lines, line] };
        }),

      updateLine: (key, changes) =>
        set((state) => ({
          lines: state.lines.map((line) => (line.key === key ? { ...line, ...changes } : line)),
        })),

      removeLine: (key) =>
        set((state) => ({ lines: state.lines.filter((line) => line.key !== key) })),

      toggleLineHidden: (key) =>
        set((state) => ({
          lines: state.lines.map((line) =>
            line.key === key ? { ...line, is_hidden: !line.is_hidden } : line,
          ),
        })),

      replaceLines: (lines) => set({ lines }),

      clearLines: () => set({ lines: [] }),

      setWarehouseId: (warehouseId) => set({ warehouseId }),
      setCustomerId: (customerId) => set({ customerId }),
      setNote: (note) => set({ note }),
      setPaymentMethodId: (paymentMethodId) => set({ paymentMethodId }),
      setAmount: (amount) => set({ amount }),
      setAmountEdited: (amountEdited) => set({ amountEdited }),
    }),
    { name: 'agabo.pos.session' },
  ),
);
