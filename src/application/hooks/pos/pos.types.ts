/**
 * Estado en que la confirmación de cobro muestra el pago en la moneda del
 * cliente. Los precios y el total están en la moneda base, así que la vista
 * repasa aparte lo que el cliente entrega.
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

/** Línea del carrito del POS: producto, presentación, cantidad y precio. */
export interface CartLine {
  /** Clave local para React (no se envía al backend). */
  key: string;
  product_id: string;
  product_unit_id: string;
  product_name: string;
  unit_name: string;
  quantity: number;
  unit_price: number;
  /** Oculto con el "ojito": no cuenta en el total ni se cobra. */
  is_hidden: boolean;
}

/** Acción del POS que espera confirmación del cajero. */
export interface PosPendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'primary';
  run: () => void;
}

/** Resumen del cobro que se acaba de registrar. */
export interface PosLastSale {
  id: string;
  code: string;
  total: number;
  paid: number;
  balance: number;
}

/**
 * Instantánea del POS que se guarda como ticket en espera. Es lo que el
 * guardado necesita saber del POS: nada más.
 */
export interface ParkedTicketSnapshot {
  lines: CartLine[];
  customer_id: string;
  /** Nombre del cliente, si hay uno elegido: da la etiqueta del ticket. */
  customer_name?: string;
  note: string;
  branch_id: string;
  warehouse_id: string;
  payment_method_id: string;
}
