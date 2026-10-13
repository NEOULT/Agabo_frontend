import type { ISupplierRepository, SupplierQueryParams } from '@/domain/repositories';
import type { Supplier, CreateSupplierDTO, UpdateSupplierDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toSupplier, type ApiSupplier, type ApiSupplierListResponse } from './supplier.mapper';

/**
 * Implementación REST del repositorio de proveedores contra el backend Express
 * (módulo `purchases`, ver `docs/schema-purchases/api-contract-supplier.md`).
 *
 * Notas del contrato:
 * - No hay paginación: GET /api/suppliers devuelve todos los ítems filtrados.
 * - No hay DELETE: se usan los endpoints dedicados activate/deactivate.
 * - El código no es editable en PATCH; la empresa la determina el token.
 */
export class ApiSupplierRepository implements ISupplierRepository {
  async getAll(params?: SupplierQueryParams): Promise<{ data: Supplier[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400, así que solo se
      // envían los filtros realmente activos.
      const query: Record<string, string> = {};
      if (params?.search) query.supplier_name_text = params.search;
      if (params?.code) query.supplier_code_text = params.code;
      if (params?.taxId) query.supplier_tax_id_text = params.taxId;
      if (params?.isActive !== undefined) query.supplier_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiSupplierListResponse>('/suppliers', { params: query });

      return {
        data: data.items.map(toSupplier),
        total: data.items.length,
      };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Supplier | null> {
    try {
      const { data } = await api.get<ApiSupplierListResponse>('/suppliers', {
        params: { supplier_uuid: id },
      });

      const item = data.items[0];
      return item ? toSupplier(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateSupplierDTO): Promise<Supplier> {
    try {
      const { data: created } = await api.post<ApiSupplier>('/suppliers', {
        supplier_code_text: data.code,
        supplier_name_text: data.name,
        supplier_tax_id_text: data.tax_id ?? null,
        supplier_email_text: data.email ?? null,
        supplier_phone_text: data.phone ?? null,
      });

      return toSupplier(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateSupplierDTO): Promise<Supplier> {
    try {
      // El backend rechaza supplier_code_text con 400; solo se envían los
      // campos que el usuario modificó (null limpia los opcionales).
      const payload: Record<string, string | null> = {};
      if (data.name !== undefined) payload.supplier_name_text = data.name;
      if (data.tax_id !== undefined) payload.supplier_tax_id_text = data.tax_id;
      if (data.email !== undefined) payload.supplier_email_text = data.email;
      if (data.phone !== undefined) payload.supplier_phone_text = data.phone;

      const { data: updated } = await api.patch<ApiSupplier>(`/suppliers/${id}`, payload);

      return toSupplier(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<Supplier> {
    try {
      const { data } = await api.post<ApiSupplier>(`/suppliers/${id}/activate`);
      return toSupplier(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<Supplier> {
    try {
      const { data } = await api.post<ApiSupplier>(`/suppliers/${id}/deactivate`);
      return toSupplier(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
