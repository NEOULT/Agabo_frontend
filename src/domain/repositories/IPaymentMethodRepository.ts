import type {
  PaymentMethod,
  CreatePaymentMethodDTO,
  UpdatePaymentMethodDTO,
} from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/**
 * Filtros soportados por GET /api/payment-methods.
 * El backend combina los filtros enviados con AND.
 */
export interface PaymentMethodQueryParams extends SearchParams {
  /** Filtro por estado (payment_method_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de métodos de pago contra el schema sales.
 *
 * No existe `delete`: se usa `setActive` / `setInactive` (RF-SAL-008).
 */
export interface IPaymentMethodRepository {
  getAll(params?: PaymentMethodQueryParams): Promise<{ data: PaymentMethod[]; total: number }>;
  getById(id: string): Promise<PaymentMethod | null>;
  create(data: CreatePaymentMethodDTO): Promise<PaymentMethod>;
  update(id: string, data: UpdatePaymentMethodDTO): Promise<PaymentMethod>;
  /** POST /api/payment-methods/{payment_method_uuid}/activate — idempotente. */
  setActive(id: string): Promise<PaymentMethod>;
  /** POST /api/payment-methods/{payment_method_uuid}/deactivate — idempotente. */
  setInactive(id: string): Promise<PaymentMethod>;
}
