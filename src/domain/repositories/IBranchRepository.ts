import type { Branch, CreateBranchDTO, UpdateBranchDTO } from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/**
 * Filtros soportados por GET /api/branches.
 * El backend combina los filtros enviados con AND.
 */
export interface BranchQueryParams extends SearchParams {
  /** Filtro exacto por código (branch_code_text). */
  code?: string;
  /** Filtro por estado (branch_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de sucursales contra el schema company.
 *
 * El backend no elimina sucursales: se desactivan (RN-COM-016),
 * por eso no existe `delete` y se usan `setActive` / `setInactive`.
 */
export interface IBranchRepository {
  getAll(params?: BranchQueryParams): Promise<{ data: Branch[]; total: number }>;
  getById(id: string): Promise<Branch | null>;
  create(data: CreateBranchDTO): Promise<Branch>;
  update(id: string, data: UpdateBranchDTO): Promise<Branch>;
  /** POST /api/branches/{branch_uuid}/activate — idempotente. */
  setActive(id: string): Promise<Branch>;
  /** POST /api/branches/{branch_uuid}/deactivate — idempotente. */
  setInactive(id: string): Promise<Branch>;
}
