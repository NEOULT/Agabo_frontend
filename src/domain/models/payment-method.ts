/**
 * 💳 Método de pago (sales.payment_method)
 *
 * Alineado al contrato (`docs/schema-sales/api-contract-payment.md`):
 * - Es una entidad **por empresa**; la empresa se determina por el token.
 * - No se elimina: se activa/desactiva (RF-SAL-008, RF-SAL-019).
 * - Un método inactivo no puede usarse en pagos nuevos, pero los pagos que ya
 *   lo usan conservan su referencia.
 */
export interface PaymentMethod {
  /** payment_method_uuid */
  id: string;
  /** company_uuid — empresa propietaria del método de pago */
  company_id: string;
  /** payment_method_name_text — ej: Efectivo, Tarjeta de crédito */
  name: string;
  /** payment_method_is_active_bl */
  is_active: boolean;
  /** payment_method_created_at_tsz */
  created_at: string;
  /** payment_method_updated_at_tsz */
  updated_at: string;
}

export interface CreatePaymentMethodDTO {
  name: string;
}

/** El backend solo acepta `name` en PATCH (RF-SAL-007). */
export interface UpdatePaymentMethodDTO {
  name?: string;
}
