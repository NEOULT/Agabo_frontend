import type { Customer, CreateCustomerDTO, UpdateCustomerDTO } from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/**
 * Filtros soportados por GET /api/customers.
 * El backend combina los filtros enviados con AND.
 */
export interface CustomerQueryParams extends SearchParams {
  /** Filtro exacto por identificación fiscal (customer_tax_id_text). */
  taxId?: string;
  /** Filtro por estado (customer_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de clientes contra el schema sales.
 *
 * No existe `delete`: se usa `setActive` / `setInactive` (RF-SAL-004). Las
 * ventas viven en su propio repositorio (`ISaleRepository`), no aquí.
 */
export interface ICustomerRepository {
  getAll(params?: CustomerQueryParams): Promise<{ data: Customer[]; total: number }>;
  getById(id: string): Promise<Customer | null>;
  create(data: CreateCustomerDTO): Promise<Customer>;
  update(id: string, data: UpdateCustomerDTO): Promise<Customer>;
  /** POST /api/customers/{customer_uuid}/activate — idempotente. */
  setActive(id: string): Promise<Customer>;
  /** POST /api/customers/{customer_uuid}/deactivate — idempotente. */
  setInactive(id: string): Promise<Customer>;
}
