import type { IBranchRepository, BranchQueryParams } from '@/domain/repositories';
import type { Branch, CreateBranchDTO, UpdateBranchDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toBranch, type ApiBranch, type ApiBranchListResponse } from './branch.mapper';

/**
 * Implementación REST del repositorio de sucursales contra el backend Express
 * (módulo `company`, ver `docs/schema-company/api-contract-branch.md`).
 *
 * Notas del contrato:
 * - No hay paginación: GET /api/branches devuelve todos los ítems filtrados.
 * - No hay DELETE: se usan los endpoints dedicados activate/deactivate.
 * - El código (`branch_code_text`) solo se envía al crear; PATCH lo rechaza.
 */
export class ApiBranchRepository implements IBranchRepository {
  async getAll(params?: BranchQueryParams): Promise<{ data: Branch[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400, así que solo se
      // envían los filtros realmente activos.
      const query: Record<string, string> = {};
      if (params?.search) query.branch_name_text = params.search;
      if (params?.code) query.branch_code_text = params.code;
      if (params?.isActive !== undefined) query.branch_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiBranchListResponse>('/branches', { params: query });

      return {
        data: data.items.map(toBranch),
        total: data.items.length,
      };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Branch | null> {
    try {
      const { data } = await api.get<ApiBranchListResponse>('/branches', {
        params: { branch_uuid: id },
      });

      const item = data.items[0];
      return item ? toBranch(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateBranchDTO): Promise<Branch> {
    try {
      const { data: created } = await api.post<ApiBranch>('/branches', {
        company_uuid: data.company_id,
        branch_code_text: data.code,
        branch_name_text: data.name,
        branch_address_text: data.address ?? null,
        branch_phone_text: data.phone ?? null,
      });

      return toBranch(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateBranchDTO): Promise<Branch> {
    try {
      // El backend rechaza campos no editables (company_uuid, code) con 400,
      // así que solo se envían los que el usuario modificó.
      const payload: Record<string, string | null> = {};
      if (data.name !== undefined) payload.branch_name_text = data.name;
      if (data.address !== undefined) payload.branch_address_text = data.address;
      if (data.phone !== undefined) payload.branch_phone_text = data.phone;

      const { data: updated } = await api.patch<ApiBranch>(`/branches/${id}`, payload);

      return toBranch(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<Branch> {
    try {
      const { data } = await api.post<ApiBranch>(`/branches/${id}/activate`);
      return toBranch(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<Branch> {
    try {
      const { data } = await api.post<ApiBranch>(`/branches/${id}/deactivate`);
      return toBranch(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
