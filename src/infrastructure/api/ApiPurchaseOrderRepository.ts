import type {
  IPurchaseOrderRepository,
  PurchaseOrderQueryParams,
  PurchaseOrderDetailQueryParams,
} from '@/domain/repositories';
import type { PurchaseOrder, PurchaseOrderDetail, CreatePurchaseOrderDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toPurchaseOrder,
  toPurchaseOrderDetail,
  type ApiPurchaseOrder,
  type ApiPurchaseOrderListResponse,
  type ApiPurchaseOrderDetailListResponse,
} from './purchase-order.mapper';

/**
 * Implementación REST de `purchases.purchase_order` contra el backend Express
 * (ver `docs/schema-purchases/api-contract-order.md`).
 *
 * Las órdenes son inmutables: solo se crean y se consultan (no hay PATCH ni
 * DELETE). El código, el total y los importes de línea los calcula el backend.
 */
export class ApiPurchaseOrderRepository implements IPurchaseOrderRepository {
  async getAll(params?: PurchaseOrderQueryParams): Promise<{ data: PurchaseOrder[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400: solo filtros activos.
      const query: Record<string, string> = {};
      if (params?.supplierId) query.supplier_uuid = params.supplierId;
      if (params?.branchId) query.branch_uuid = params.branchId;
      if (params?.productId) query.product_uuid = params.productId;
      if (params?.code) query.purchase_order_code_text = params.code;
      if (params?.status) query.purchase_order_status_text = params.status;
      if (params?.fromDate) query.purchase_order_created_at_tsz_from = params.fromDate;
      if (params?.toDate) query.purchase_order_created_at_tsz_to = params.toDate;

      const { data } = await api.get<ApiPurchaseOrderListResponse>('/purchase-orders', {
        params: query,
      });

      return { data: data.items.map(toPurchaseOrder), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<PurchaseOrder | null> {
    try {
      const { data } = await api.get<ApiPurchaseOrderListResponse>('/purchase-orders', {
        params: { purchase_order_uuid: id },
      });
      const item = data.items[0];
      return item ? toPurchaseOrder(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
    try {
      const { data: created } = await api.post<ApiPurchaseOrder>('/purchase-orders', {
        supplier_uuid: data.supplier_id,
        branch_uuid: data.branch_id,
        purchase_order_note_text: data.note ?? null,
        details: data.details.map((line) => ({
          product_uuid: line.product_id,
          product_unit_uuid: line.product_unit_id,
          purchase_order_detail_quantity_num: line.quantity,
          purchase_order_detail_unit_price_num: line.unit_price,
        })),
      });
      return toPurchaseOrder(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getDetails(
    params?: PurchaseOrderDetailQueryParams,
  ): Promise<{ data: PurchaseOrderDetail[]; total: number }> {
    try {
      const query: Record<string, string> = {};
      if (params?.orderId) query.purchase_order_uuid = params.orderId;
      if (params?.productId) query.product_uuid = params.productId;
      if (params?.productUnitId) query.product_unit_uuid = params.productUnitId;
      if (params?.fromDate) query.purchase_order_detail_created_at_tsz_from = params.fromDate;
      if (params?.toDate) query.purchase_order_detail_created_at_tsz_to = params.toDate;

      const { data } = await api.get<ApiPurchaseOrderDetailListResponse>('/purchase-order-details', {
        params: query,
      });

      return { data: data.items.map(toPurchaseOrderDetail), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }
}
