import type {
  IPaymentMethodRepository,
  PaymentMethodQueryParams,
} from '@/domain/repositories';
import type {
  PaymentMethod,
  CreatePaymentMethodDTO,
  UpdatePaymentMethodDTO,
} from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toPaymentMethod,
  type ApiPaymentMethod,
  type ApiPaymentMethodListResponse,
} from './payment-method.mapper';

/**
 * Implementación REST de `sales.payment_method` contra el backend Express
 * (ver `docs/schema-sales/api-contract-payment.md`).
 *
 * No hay paginación ni DELETE: se listan, se crean/editan y se
 * activan/desactivan.
 */
export class ApiPaymentMethodRepository implements IPaymentMethodRepository {
  async getAll(
    params?: PaymentMethodQueryParams,
  ): Promise<{ data: PaymentMethod[]; total: number }> {
    try {
      const query: Record<string, string> = {};
      if (params?.search) query.payment_method_name_text = params.search;
      if (params?.isActive !== undefined) {
        query.payment_method_is_active_bl = String(params.isActive);
      }

      const { data } = await api.get<ApiPaymentMethodListResponse>('/payment-methods', {
        params: query,
      });

      return { data: data.items.map(toPaymentMethod), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<PaymentMethod | null> {
    try {
      const { data } = await api.get<ApiPaymentMethodListResponse>('/payment-methods', {
        params: { payment_method_uuid: id },
      });
      const item = data.items[0];
      return item ? toPaymentMethod(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreatePaymentMethodDTO): Promise<PaymentMethod> {
    try {
      const { data: created } = await api.post<ApiPaymentMethod>('/payment-methods', {
        payment_method_name_text: data.name,
      });
      return toPaymentMethod(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdatePaymentMethodDTO): Promise<PaymentMethod> {
    try {
      const payload: Record<string, string> = {};
      if (data.name !== undefined) payload.payment_method_name_text = data.name;

      const { data: updated } = await api.patch<ApiPaymentMethod>(`/payment-methods/${id}`, payload);
      return toPaymentMethod(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<PaymentMethod> {
    try {
      const { data } = await api.post<ApiPaymentMethod>(`/payment-methods/${id}/activate`);
      return toPaymentMethod(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<PaymentMethod> {
    try {
      const { data } = await api.post<ApiPaymentMethod>(`/payment-methods/${id}/deactivate`);
      return toPaymentMethod(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
