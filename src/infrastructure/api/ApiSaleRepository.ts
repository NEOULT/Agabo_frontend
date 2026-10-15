import type {
  ISaleRepository,
  SaleQueryParams,
  SaleDetailQueryParams,
} from '@/domain/repositories';
import type { Sale, SaleDetail, CreateSaleDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toSale,
  toSaleDetail,
  type ApiSale,
  type ApiSaleListResponse,
  type ApiSaleDetailListResponse,
} from './sale.mapper';

/**
 * Implementación REST de `sales.sale` contra el backend Express
 * (ver `docs/schema-sales/api-contract-sale.md`).
 *
 * Las ventas son inmutables: solo se crean y se consultan (no hay PATCH ni
 * DELETE). El código, el total y los importes de línea los calcula el backend;
 * al registrar la venta el backend genera el movimiento de salida en
 * `inventory`.
 */
export class ApiSaleRepository implements ISaleRepository {
  async getAll(params?: SaleQueryParams): Promise<{ data: Sale[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400: solo filtros activos.
      const query: Record<string, string> = {};
      if (params?.branchId) query.branch_uuid = params.branchId;
      if (params?.warehouseId) query.warehouse_uuid = params.warehouseId;
      if (params?.customerId) query.customer_uuid = params.customerId;
      if (params?.productId) query.product_uuid = params.productId;
      if (params?.code) query.sale_code_text = params.code;
      if (params?.paymentStatus) query.payment_status_text = params.paymentStatus;
      if (params?.fromDate) query.sale_created_at_tsz_from = params.fromDate;
      if (params?.toDate) query.sale_created_at_tsz_to = params.toDate;

      const { data } = await api.get<ApiSaleListResponse>('/sales', { params: query });

      return { data: data.items.map(toSale), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Sale | null> {
    try {
      const { data } = await api.get<ApiSaleListResponse>('/sales', {
        params: { sale_uuid: id },
      });
      const item = data.items[0];
      return item ? toSale(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateSaleDTO): Promise<Sale> {
    try {
      const { data: created } = await api.post<ApiSale>('/sales', {
        branch_uuid: data.branch_id,
        warehouse_uuid: data.warehouse_id,
        customer_uuid: data.customer_id ?? null,
        sale_note_text: data.note ?? null,
        details: data.details.map((line) => ({
          product_uuid: line.product_id,
          product_unit_uuid: line.product_unit_id,
          location_uuid: line.location_id ?? null,
          sale_detail_quantity_num: line.quantity,
          // Si se omite, el backend propone el precio desde catalog.price_product.
          sale_detail_unit_price_num: line.unit_price ?? null,
        })),
      });
      return toSale(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getDetails(
    params?: SaleDetailQueryParams,
  ): Promise<{ data: SaleDetail[]; total: number }> {
    try {
      const query: Record<string, string> = {};
      if (params?.saleId) query.sale_uuid = params.saleId;
      if (params?.productId) query.product_uuid = params.productId;
      if (params?.productUnitId) query.product_unit_uuid = params.productUnitId;
      if (params?.fromDate) query.sale_detail_created_at_tsz_from = params.fromDate;
      if (params?.toDate) query.sale_detail_created_at_tsz_to = params.toDate;

      const { data } = await api.get<ApiSaleDetailListResponse>('/sale-details', {
        params: query,
      });

      return { data: data.items.map(toSaleDetail), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }
}
