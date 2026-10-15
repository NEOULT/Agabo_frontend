import type { SalePayment, CreatePaymentDTO } from '@/domain/models';

/** Filtros soportados por GET /api/payments. */
export interface PaymentQueryParams {
  /** Filtro exacto por venta (sale_uuid). */
  saleId?: string;
  /** Filtro exacto por método de pago (payment_method_uuid). */
  paymentMethodId?: string;
  /** Filtro por estado (payment_is_active_bl). */
  isActive?: boolean;
  /** Límite inferior del rango de fechas (ISO con offset). */
  fromDate?: string;
  /** Límite superior del rango de fechas (ISO con offset). */
  toDate?: string;
}

/**
 * Contrato de pagos (sales.payment).
 *
 * Un pago no se elimina: se desactiva, y deja de contar para el saldo de la
 * venta sin perder su historial (RF-SAL-015). La suma de los pagos activos no
 * puede superar el total de la venta (RN-SAL-010).
 */
export interface IPaymentRepository {
  getAll(params?: PaymentQueryParams): Promise<{ data: SalePayment[]; total: number }>;
  /** POST /api/payments — valida que el importe no exceda el saldo. */
  create(data: CreatePaymentDTO): Promise<SalePayment>;
  /** POST /api/payments/{payment_uuid}/activate — revalida el saldo. */
  setActive(id: string): Promise<SalePayment>;
  /** POST /api/payments/{payment_uuid}/deactivate — deja de contar para el saldo. */
  setInactive(id: string): Promise<SalePayment>;
}
