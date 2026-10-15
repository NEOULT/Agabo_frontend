import type {
  Sale,
  SaleDetail,
  SalePaymentStatus,
  CreateSaleDTO,
} from '@/domain/models';

/** Filtros soportados por GET /api/sales. */
export interface SaleQueryParams {
  /** Filtro exacto por sucursal (branch_uuid); se ignora fuera del alcance. */
  branchId?: string;
  /** Filtro exacto por almacén de origen (warehouse_uuid). */
  warehouseId?: string;
  /** Filtro exacto por cliente (customer_uuid). */
  customerId?: string;
  /** Filtra por producto del detalle (product_uuid). */
  productId?: string;
  /** Filtro exacto por número de venta (sale_code_text). */
  code?: string;
  /** Estado de pago derivado (payment_status_text). */
  paymentStatus?: SalePaymentStatus;
  /** Límite inferior del rango de fechas (ISO con offset). */
  fromDate?: string;
  /** Límite superior del rango de fechas (ISO con offset). */
  toDate?: string;
}

/** Filtros de GET /api/sale-details (RF-SAL-011). */
export interface SaleDetailQueryParams {
  saleId?: string;
  productId?: string;
  productUnitId?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Contrato de ventas (sales.sale).
 *
 * Las ventas son **inmutables**: no hay update ni delete (RN-SAL-011). El
 * estado de pago se obtiene de `payment_status`, derivado de los pagos activos
 * (RN-SAL-006).
 */
export interface ISaleRepository {
  getAll(params?: SaleQueryParams): Promise<{ data: Sale[]; total: number }>;
  getById(id: string): Promise<Sale | null>;
  /** POST /api/sales — el backend genera código, totales y movimiento de salida. */
  create(data: CreateSaleDTO): Promise<Sale>;
  /** GET /api/sale-details (líneas filtrables de forma independiente). */
  getDetails(params?: SaleDetailQueryParams): Promise<{ data: SaleDetail[]; total: number }>;
}
