import type { Stock, CreateStockDTO, UpdateStockDTO } from '@/domain/models';
import type { PaginationParams } from '@/shared/types/common';

/** Filtros de `GET /api/stocks` (RF-INV-009). */
export interface StockQueryParams extends PaginationParams {
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  isActive?: boolean;
}

/**
 * Contrato de existencias (`inventory.stock`).
 *
 * Solo puede existir una existencia por producto, almacén y ubicación
 * (RN-INV-003). No existe `delete`: se desactiva con `setInactive`, y el
 * backend lo rechaza si queda cantidad mayor que cero.
 */
export interface IStockRepository {
  getAll(params?: StockQueryParams): Promise<{ data: Stock[]; total: number }>;
  getById(id: string): Promise<Stock | null>;
  create(data: CreateStockDTO): Promise<Stock>;
  /** PATCH /api/stocks/{id} — solo cantidad y ubicación son editables (RF-INV-011). */
  update(id: string, data: UpdateStockDTO): Promise<Stock>;
  setActive(id: string): Promise<Stock>;
  setInactive(id: string): Promise<Stock>;
}
