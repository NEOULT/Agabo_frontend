import type {
  Stock,
  StockLot,
  StockOverviewItem,
  StockProductOption,
  StockWarehouseOption,
} from '@/domain/models';

/** Contrato crudo de `inventory.stock_lot` (RF-INV-013). */
export interface ApiStockLot {
  stock_lot_uuid: string;
  stock_uuid: string;
  lot_uuid: string;
  stock_lot_quantity_num: number;
  stock_lot_created_at_tsz: string;
  stock_lot_updated_at_tsz: string;
}

/** Contrato crudo de GET/POST/PATCH /api/stocks (RF-INV-009/011). */
export interface ApiStock {
  stock_uuid: string;
  company_uuid: string;
  product_uuid: string;
  warehouse_uuid: string;
  stock_quantity_num: number;
  stock_is_active_bl: boolean;
  stock_created_at_tsz: string;
  stock_updated_at_tsz: string;
  lots: ApiStockLot[];
}

/** Respuesta de GET /api/stocks (lista). */
export interface ApiStockListResponse {
  message: string;
  items: ApiStock[];
}

/** Fila de `GET /api/stocks/overview` (existencia + nombres resueltos). */
export interface ApiStockOverviewItem extends ApiStock {
  product_name_text: string;
  product_is_active_bl: boolean;
  warehouse_name_text: string;
  warehouse_is_active_bl: boolean;
  branch_uuid: string;
  branch_name_text: string;
}

export interface ApiStockOverviewProduct {
  product_uuid: string;
  product_name_text: string;
  product_is_active_bl: boolean;
}

export interface ApiStockOverviewWarehouse {
  warehouse_uuid: string;
  warehouse_name_text: string;
  warehouse_is_active_bl: boolean;
  branch_uuid: string;
  branch_name_text: string;
}

export interface ApiStockOverviewResponse {
  message: string;
  items: ApiStockOverviewItem[];
  products: ApiStockOverviewProduct[];
  warehouses: ApiStockOverviewWarehouse[];
}

export function toStockOverviewItem(apiStock: ApiStockOverviewItem): StockOverviewItem {
  return {
    ...toStock(apiStock),
    product_name: apiStock.product_name_text,
    product_is_active: apiStock.product_is_active_bl,
    warehouse_name: apiStock.warehouse_name_text,
    warehouse_is_active: apiStock.warehouse_is_active_bl,
    branch_id: apiStock.branch_uuid,
    branch_name: apiStock.branch_name_text,
  };
}

export function toStockProductOption(apiProduct: ApiStockOverviewProduct): StockProductOption {
  return {
    id: apiProduct.product_uuid,
    name: apiProduct.product_name_text,
    is_active: apiProduct.product_is_active_bl,
  };
}

export function toStockWarehouseOption(
  apiWarehouse: ApiStockOverviewWarehouse,
): StockWarehouseOption {
  return {
    id: apiWarehouse.warehouse_uuid,
    name: apiWarehouse.warehouse_name_text,
    is_active: apiWarehouse.warehouse_is_active_bl,
    branch_id: apiWarehouse.branch_uuid,
    branch_name: apiWarehouse.branch_name_text,
  };
}

export function toStockLot(apiLot: ApiStockLot): StockLot {
  return {
    id: apiLot.stock_lot_uuid,
    stock_id: apiLot.stock_uuid,
    lot_id: apiLot.lot_uuid,
    quantity: apiLot.stock_lot_quantity_num,
    created_at: apiLot.stock_lot_created_at_tsz,
    updated_at: apiLot.stock_lot_updated_at_tsz,
  };
}

export function toStock(apiStock: ApiStock): Stock {
  return {
    id: apiStock.stock_uuid,
    company_id: apiStock.company_uuid,
    product_id: apiStock.product_uuid,
    warehouse_id: apiStock.warehouse_uuid,
    quantity: apiStock.stock_quantity_num,
    is_active: apiStock.stock_is_active_bl,
    created_at: apiStock.stock_created_at_tsz,
    updated_at: apiStock.stock_updated_at_tsz,
    lots: (apiStock.lots ?? []).map(toStockLot),
  };
}
