import type { ICustomerRepository, CustomerQueryParams } from '@/domain/repositories';
import type { Customer, CreateCustomerDTO, UpdateCustomerDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toCustomer, type ApiCustomer, type ApiCustomerListResponse } from './customer.mapper';

/**
 * Implementación REST de `sales.customer` contra el backend Express
 * (ver `docs/schema-sales/api-contract-customer.md`).
 *
 * Notas del contrato:
 * - No hay paginación: GET /api/customers devuelve todos los ítems filtrados.
 * - No hay DELETE: se usan los endpoints dedicados activate/deactivate.
 * - La empresa la determina el token.
 */
export class ApiCustomerRepository implements ICustomerRepository {
  async getAll(params?: CustomerQueryParams): Promise<{ data: Customer[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400, así que solo se
      // envían los filtros realmente activos.
      const query: Record<string, string> = {};
      if (params?.search) query.customer_name_text = params.search;
      if (params?.taxId) query.customer_tax_id_text = params.taxId;
      if (params?.isActive !== undefined) query.customer_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiCustomerListResponse>('/customers', { params: query });

      return { data: data.items.map(toCustomer), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Customer | null> {
    try {
      const { data } = await api.get<ApiCustomerListResponse>('/customers', {
        params: { customer_uuid: id },
      });
      const item = data.items[0];
      return item ? toCustomer(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateCustomerDTO): Promise<Customer> {
    try {
      const { data: created } = await api.post<ApiCustomer>('/customers', {
        customer_name_text: data.name,
        customer_tax_id_text: data.tax_id ?? null,
        customer_email_text: data.email ?? null,
        customer_phone_text: data.phone ?? null,
      });
      return toCustomer(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    try {
      // Solo se envían los campos modificados (null limpia los opcionales).
      const payload: Record<string, string | null> = {};
      if (data.name !== undefined) payload.customer_name_text = data.name;
      if (data.tax_id !== undefined) payload.customer_tax_id_text = data.tax_id;
      if (data.email !== undefined) payload.customer_email_text = data.email;
      if (data.phone !== undefined) payload.customer_phone_text = data.phone;

      const { data: updated } = await api.patch<ApiCustomer>(`/customers/${id}`, payload);
      return toCustomer(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<Customer> {
    try {
      const { data } = await api.post<ApiCustomer>(`/customers/${id}/activate`);
      return toCustomer(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<Customer> {
    try {
      const { data } = await api.post<ApiCustomer>(`/customers/${id}/deactivate`);
      return toCustomer(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
