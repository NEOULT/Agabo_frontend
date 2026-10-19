/**
 * 📦 Existencias de inventario (`inventory.stock`).
 *
 * Alineada al contrato (`docs/schema-inventory/api-contract-stock.md`):
 * - Existe una sola existencia por producto y almacén (RN-INV-003).
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

/** Existencia disponible de un producto en un almacén. */
export interface Stock {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lots: StockLot[];
}

/** Existencia con los nombres resueltos para la pantalla de gestión. */
export interface StockOverviewItem extends Stock {
  product_name: string;
  product_is_active: boolean;
  warehouse_name: string;
  warehouse_is_active: boolean;
  branch_id: string;
  branch_name: string;
}

export interface StockProductOption {
  id: string;
  name: string;
  is_active: boolean;
}

export interface StockWarehouseOption {
  id: string;
  name: string;
  is_active: boolean;
  branch_id: string;
  branch_name: string;
}

/** Respuesta de `GET /api/stocks/overview`: todo lo que necesita la pantalla. */
export interface StockOverview {
  items: StockOverviewItem[];
  products: StockProductOption[];
  warehouses: StockWarehouseOption[];
}

export interface CreateStockDTO {
  product_id: string;
  warehouse_id: string;
  quantity: number;
}

export interface UpdateStockDTO {
  quantity?: number;
}
