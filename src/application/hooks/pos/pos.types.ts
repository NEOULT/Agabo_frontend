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

/** Línea del carrito del POS: producto, cantidad y precio. */
export interface CartLine {
  /** Clave local para React (no se envía al backend). */
  key: string;
  product_id: string;
  product_name: string;
  /** Nombre de la unidad base del producto. */
  unit_name: string;
  /** Cantidad en la unidad base del producto. */
  quantity: number;
  unit_price: number;
  /** Oculto con el "ojito": no cuenta en el total ni se cobra. */
  is_hidden: boolean;
}

/**
 * Resultado de resolver un código escaneado contra el catálogo del POS.
 * El escaneo por teléfono lo usa para pintar el nombre en el modal.
 */
export interface PhoneScanOutcome {
  /** Nombre del producto si el código existe; `null` si no se encontró. */
  productName: string | null;
}

/** Código recibido del teléfono, ya resuelto contra el catálogo. */
export interface PhoneScannedItem {
  /** Id incremental de la sesión; sirve de clave en React. */
  id: number;
  code: string;
  /** Nombre del producto, o `null` si ninguno tiene ese código. */
  productName: string | null;
}

/** Acción del POS que espera confirmación del cajero. */
export interface PosPendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'primary';
  run: () => void;
}

/** Existencia de un producto en una ubicación del almacén de origen. */
export interface PosStockLocation {
  /** `location_uuid`; ausente cuando la existencia no está ubicada. */
  location_id?: string;
  /** Cantidad en unidades base del producto. */
  quantity: number;
}

/** Existencia de un producto en el almacén de origen, por ubicación. */
export interface PosStockLevel {
  /** Suma de todas las ubicaciones, en unidades base del producto. */
  total: number;
  locations: PosStockLocation[];
}

/** Existencia del almacén de origen indexada por `product_uuid`. */
export type PosStockLevels = Record<string, PosStockLevel>;

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
