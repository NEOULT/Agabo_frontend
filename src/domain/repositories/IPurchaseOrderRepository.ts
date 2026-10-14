import type {
  PurchaseOrder,
  PurchaseOrderDetail,
  CreatePurchaseOrderDTO,
} from '@/domain/models';

/** Filtros soportados por GET /api/purchase-orders. */
export interface PurchaseOrderQueryParams {
  supplierId?: string;
  branchId?: string;
  productId?: string;
  /** Filtro exacto por número de orden (purchase_order_code_text). */
  code?: string;
  /** Estado derivado: pendiente o recibida (purchase_order_status_text). */
  status?: 'pending' | 'received';
  /** Límite inferior del rango de fechas (ISO con offset). */
  fromDate?: string;
  /** Límite superior del rango de fechas (ISO con offset). */
  toDate?: string;
}

/** Filtros de GET /api/purchase-order-details (RF-PUR-007). */
export interface PurchaseOrderDetailQueryParams {
  orderId?: string;
  productId?: string;
  productUnitId?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Contrato de órdenes de compra (purchases.purchase_order).
 *
 * Las órdenes son **inmutables**: no hay update ni delete (RN-PUR-011).
 * El estado se obtiene de `status`, derivado de la recepción (RN-PUR-017).
 */
export interface IPurchaseOrderRepository {
  getAll(params?: PurchaseOrderQueryParams): Promise<{ data: PurchaseOrder[]; total: number }>;
  getById(id: string): Promise<PurchaseOrder | null>;
  /** POST /api/purchase-orders — el backend genera código y totales. */
  create(data: CreatePurchaseOrderDTO): Promise<PurchaseOrder>;
  /** GET /api/purchase-order-details (líneas filtrables de forma independiente). */
  getDetails(params?: PurchaseOrderDetailQueryParams): Promise<{ data: PurchaseOrderDetail[]; total: number }>;
}
