/**
 * 💳 Método de pago (sales.payment_method)
 *
 * Alineado al contrato (`docs/schema-sales/api-contract-payment.md`):
 * - Es una entidad **por empresa**; la empresa se determina por el token.
 * - No se elimina: se activa/desactiva (RF-SAL-008, RF-SAL-019).
 * - Un método inactivo no puede usarse en pagos nuevos, pero los pagos que ya
 *   lo usan conservan su referencia.
 * - La comisión es la fracción de la venta que cobra el punto de venta por cada
 *   pago (0 a 1); `0` significa sin comisión.
 */
export interface PaymentMethod {
  /** payment_method_uuid */
  id: string;
  /** company_uuid — empresa propietaria del método de pago */
  company_id: string;
  /** payment_method_name_text — ej: Efectivo, Tarjeta de crédito */
  name: string;
  /** payment_method_commission_rate_num — comisión como fracción (0 a 1) */
  commission_rate: number;
  /** payment_method_is_active_bl */
  is_active: boolean;
  /** payment_method_created_at_tsz */
  created_at: string;
  /** payment_method_updated_at_tsz */
  updated_at: string;
}

export interface CreatePaymentMethodDTO {
  name: string;
  /** Opcional; si se omite el backend la deja en 0. */
  commission_rate?: number;
}

/** El backend solo acepta `name` y `commission_rate` en PATCH (RF-SAL-007). */
export interface UpdatePaymentMethodDTO {
  name?: string;
  commission_rate?: number;
}
