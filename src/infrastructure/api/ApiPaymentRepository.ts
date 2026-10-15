import type { IPaymentRepository, PaymentQueryParams } from '@/domain/repositories';
import type { SalePayment, CreatePaymentDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toPayment, type ApiPayment, type ApiPaymentListResponse } from './payment.mapper';

/**
 * Implementación REST de `sales.payment` contra el backend Express
 * (ver `docs/schema-sales/api-contract-payment.md`).
 *
 * Un pago no se elimina: se desactiva y deja de contar para el saldo de la
 * venta (RF-SAL-015). El backend revalida que la suma de pagos activos no
 * supere el total de la venta (RN-SAL-010).
 */
export class ApiPaymentRepository implements IPaymentRepository {
  async getAll(params?: PaymentQueryParams): Promise<{ data: SalePayment[]; total: number }> {
    try {
      const query: Record<string, string> = {};
      if (params?.saleId) query.sale_uuid = params.saleId;
      if (params?.paymentMethodId) query.payment_method_uuid = params.paymentMethodId;
      if (params?.isActive !== undefined) query.payment_is_active_bl = String(params.isActive);
      if (params?.fromDate) query.payment_created_at_tsz_from = params.fromDate;
      if (params?.toDate) query.payment_created_at_tsz_to = params.toDate;

      const { data } = await api.get<ApiPaymentListResponse>('/payments', { params: query });

      return { data: data.items.map(toPayment), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreatePaymentDTO): Promise<SalePayment> {
    try {
      const { data: created } = await api.post<ApiPayment>('/payments', {
        sale_uuid: data.sale_id,
        payment_method_uuid: data.payment_method_id,
        payment_amount_num: data.amount,
      });
      return toPayment(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<SalePayment> {
    try {
      const { data } = await api.post<ApiPayment>(`/payments/${id}/activate`);
      return toPayment(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<SalePayment> {
    try {
      const { data } = await api.post<ApiPayment>(`/payments/${id}/deactivate`);
      return toPayment(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
