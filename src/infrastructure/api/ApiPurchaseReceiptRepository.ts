import type { IPurchaseReceiptRepository, PurchaseReceiptQueryParams } from '@/domain/repositories';
import type { PurchaseReceipt, CreatePurchaseReceiptDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toPurchaseReceipt,
  type ApiPurchaseReceipt,
  type ApiPurchaseReceiptListResponse,
} from './purchase-receipt.mapper';

/**
 * Implementación REST de `purchases.purchase_receipt` contra el backend Express
 * (ver `docs/schema-purchases/api-contract-receipt.md`).
 *
 * Las recepciones son inmutables y únicas por orden. Al crearlas, el backend
 * genera el movimiento de entrada en `inventory`; si la empresa no tiene un
 * tipo de movimiento activo reservado al propósito `purchase_in`, responde
 * `purchases_movement_type_missing`.
 */
export class ApiPurchaseReceiptRepository implements IPurchaseReceiptRepository {
  async getAll(params?: PurchaseReceiptQueryParams): Promise<{ data: PurchaseReceipt[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400: solo filtros activos.
      const query: Record<string, string> = {};
      if (params?.orderId) query.purchase_order_uuid = params.orderId;
      if (params?.warehouseId) query.warehouse_uuid = params.warehouseId;
      if (params?.code) query.purchase_receipt_code_text = params.code;
      if (params?.fromDate) query.purchase_receipt_created_at_tsz_from = params.fromDate;
      if (params?.toDate) query.purchase_receipt_created_at_tsz_to = params.toDate;

      const { data } = await api.get<ApiPurchaseReceiptListResponse>('/purchase-receipts', {
        params: query,
      });

      return { data: data.items.map(toPurchaseReceipt), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<PurchaseReceipt | null> {
    try {
      const { data } = await api.get<ApiPurchaseReceiptListResponse>('/purchase-receipts', {
        params: { purchase_receipt_uuid: id },
      });
      const item = data.items[0];
      return item ? toPurchaseReceipt(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreatePurchaseReceiptDTO): Promise<PurchaseReceipt> {
    try {
      const { data: created } = await api.post<ApiPurchaseReceipt>('/purchase-receipts', {
        purchase_order_uuid: data.order_id,
        warehouse_uuid: data.warehouse_id,
        location_uuid: data.location_id ?? null,
        purchase_receipt_note_text: data.note ?? null,
      });
      return toPurchaseReceipt(created);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
