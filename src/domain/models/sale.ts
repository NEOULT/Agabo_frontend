/**
 * 🧾 Venta (sales.sale) con su detalle y sus pagos.
 *
 * Alineada al contrato (`docs/schema-sales/api-contract-sale.md`):
 * - Es **inmutable**: se registra una vez y no se edita ni se elimina
 *   (RN-SAL-011). Solo tiene `created_at`.
 * - `sale_code_text` (`V-0001`) es único dentro de la sucursal y lo genera el
 *   backend, igual que `sale_total_num` y los importes de línea (RN-SAL-003,
 *   RN-SAL-006).
 * - Al registrarla, el backend solicita a `inventory` el movimiento de salida
 *   (RN-SAL-016); si la existencia es insuficiente, la venta se rechaza.
 * - El estado de pago (`payment_status`) NO es una columna: se deriva de los
 *   pagos activos (RN-SAL-006).
 */

/** Estado derivado del pago de una venta (RN-SAL-006 / RF-SAL-022). */
export type SalePaymentStatus = 'pending' | 'partial' | 'paid';

/** 📋 Línea de la venta: producto, presentación, cantidad y precio congelado. */
export interface SaleDetail {
  /** sale_detail_uuid */
  id: string;
  /** sale_uuid */
  sale_id: string;
  /** product_uuid */
  product_id: string;
  /** product_unit_uuid — presentación vendida */
  product_unit_id: string;
  /** location_uuid — ubicación de origen dentro del almacén (opcional) */
  location_id?: string;
  /** sale_detail_quantity_num — > 0 */
  quantity: number;
  /** sale_detail_unit_price_num — >= 0 */
  unit_price: number;
  /** sale_detail_line_total_num — calculado por el backend */
  line_total: number;
  /** sale_detail_created_at_tsz */
  created_at: string;
}

/** 💵 Pago registrado contra una venta (sales.payment). */
export interface SalePayment {
  /** payment_uuid */
  id: string;
  /** sale_uuid */
  sale_id: string;
  /** payment_method_uuid */
  payment_method_id: string;
  /** currency_uuid — moneda en que se recibió el pago (Bs, USD o EUR) */
  currency_id: string;
  /** payment_amount_num — importe en moneda base (> 0); cuenta para el saldo */
  amount: number;
  /** payment_currency_amount_num — importe entregado en la moneda del pago */
  currency_amount: number;
  /**
   * payment_exchange_rate_num — tasa congelada al registrar el pago: unidades de
   * la moneda del pago por 1 unidad de la moneda base.
   */
  exchange_rate: number;
  /** payment_is_active_bl — si cuenta para el saldo de la venta */
  is_active: boolean;
  /** payment_created_at_tsz */
  created_at: string;
  /** payment_updated_at_tsz */
  updated_at: string;
}

export interface Sale {
  /** sale_uuid */
  id: string;
  /** company_uuid */
  company_id: string;
  /** branch_uuid — sucursal donde se realizó la venta */
  branch_id: string;
  /** warehouse_uuid — almacén de origen de la mercancía vendida */
  warehouse_id: string;
  /** customer_uuid — nulo en la venta a consumidor final */
  customer_id?: string;
  /** sale_code_text — generado por el backend */
  code: string;
  /** sale_total_num — suma de las líneas del detalle */
  total: number;
  /** paid_amount_num — suma de los pagos activos (derivado) */
  paid_amount: number;
  /** balance_num — total menos pagos activos (derivado) */
  balance: number;
  /** Estado de pago derivado (pending / partial / paid) */
  payment_status: SalePaymentStatus;
  /** sale_note_text */
  note?: string;
  /** sale_created_at_tsz */
  created_at: string;
  /** Líneas de la venta */
  details: SaleDetail[];
  /** Pagos de la venta (activos e inactivos, historial) */
  payments: SalePayment[];
}

/** Línea al crear una venta: sin importes calculados (los calcula el backend). */
export interface CreateSaleDetailDTO {
  product_id: string;
  product_unit_id: string;
  location_id?: string;
  quantity: number;
  /**
   * Precio unitario congelado. Si se omite (o es null), el backend lo propone
   * desde `catalog.price_product` de la lista vigente de la sucursal
   * (RN-SAL-018); si no hay precio vigente responde `sale_price_required`.
   */
  unit_price?: number | null;
}

export interface CreateSaleDTO {
  branch_id: string;
  warehouse_id: string;
  customer_id?: string;
  note?: string;
  details: CreateSaleDetailDTO[];
}

export interface CreatePaymentDTO {
  sale_id: string;
  payment_method_id: string;
  /** Importe en moneda base: es el que cuenta para el saldo de la venta (RN-SAL-010). */
  amount: number;
  /** Moneda en que paga el cliente. Si se omite, el backend usa la moneda base. */
  currency_id?: string;
  /**
   * Importe entregado en esa moneda. Si se envía, el backend calcula el importe
   * en moneda base con la tasa vigente del catálogo y la congela en el pago.
   */
  currency_amount?: number;
}
