/**
 * 📦 Existencias de inventario (`inventory.stock`).
 *
 * Alineada al contrato (`docs/schema-inventory/api-contract-stock.md`):
 * - Existe una sola existencia por producto, almacén y ubicación (RN-INV-003).
 * - El desglose por lote (`inventory.stock_lot`) viaja anidado y solo se
 *   consulta: lo actualizan los movimientos que manejan lotes (RF-INV-017).
 */

/** Desglose de una existencia por lote (`inventory.stock_lot`). */
export interface StockLot {
  id: string;
  stock_id: string;
  lot_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

/** Existencia disponible de un producto en un almacén (y ubicación). */
export interface Stock {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id: string;
  location_id?: string;
  quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lots: StockLot[];
}

export interface CreateStockDTO {
  product_id: string;
  warehouse_id: string;
  location_id?: string | null;
  quantity: number;
}

export interface UpdateStockDTO {
  quantity?: number;
  location_id?: string | null;
}
