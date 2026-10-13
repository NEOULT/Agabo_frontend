import type { Supplier, CreateSupplierDTO, UpdateSupplierDTO } from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/**
 * Filtros soportados por GET /api/suppliers.
 * El backend combina los filtros enviados con AND.
 */
export interface SupplierQueryParams extends SearchParams {
  /** Filtro exacto por código (supplier_code_text). */
  code?: string;
  /** Filtro exacto por identificador fiscal (supplier_tax_id_text). */
  taxId?: string;
  /** Filtro por estado (supplier_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de proveedores contra el schema purchases.
 *
 * No existe `delete`: se usa `setActive` / `setInactive` (RF-PUR-004).
 * Las órdenes de compra viven en su propio repositorio (módulo purchases),
 * no aquí.
 */
export interface ISupplierRepository {
  getAll(params?: SupplierQueryParams): Promise<{ data: Supplier[]; total: number }>;
  getById(id: string): Promise<Supplier | null>;
  create(data: CreateSupplierDTO): Promise<Supplier>;
  update(id: string, data: UpdateSupplierDTO): Promise<Supplier>;
  /** POST /api/suppliers/{supplier_uuid}/activate — idempotente. */
  setActive(id: string): Promise<Supplier>;
  /** POST /api/suppliers/{supplier_uuid}/deactivate — idempotente. */
  setInactive(id: string): Promise<Supplier>;
}
