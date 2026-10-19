import type {
  Stock,
  StockOverview,
  CreateStockDTO,
  UpdateStockDTO,
} from '@/domain/models';
import type { PaginationParams } from '@/shared/types/common';

/** Filtros de `GET /api/stocks` (RF-INV-009). */
export interface StockQueryParams extends PaginationParams {
  productId?: string;
  warehouseId?: string;
  isActive?: boolean;
}

/** Filtros de `GET /api/stocks/overview`: una sola llamada para la pantalla. */
export interface StockOverviewParams {
  productId?: string;
  warehouseId?: string;
  branchId?: string;
  isActive?: boolean;
}

/**
 * Contrato de existencias (`inventory.stock`).
 *
 * Solo puede existir una existencia por producto y almacén (RN-INV-003).
 * No existe `delete`: se desactiva con `setInactive`, y el backend lo rechaza
 * si queda cantidad mayor que cero.
 */
export interface IStockRepository {
  getAll(params?: StockQueryParams): Promise<{ data: Stock[]; total: number }>;
  /** GET /api/stocks/overview — existencias + productos + almacenes en una llamada. */
  getOverview(params?: StockOverviewParams): Promise<StockOverview>;
  getById(id: string): Promise<Stock | null>;
  create(data: CreateStockDTO): Promise<Stock>;
  /** PATCH /api/stocks/{id} — solo la cantidad es editable (RF-INV-011). */
  update(id: string, data: UpdateStockDTO): Promise<Stock>;
  setActive(id: string): Promise<Stock>;
  setInactive(id: string): Promise<Stock>;
}
