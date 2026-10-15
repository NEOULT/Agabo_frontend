import type { Stock, StockLot } from '@/domain/models';

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
  location_uuid: string | null;
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
    location_id: apiStock.location_uuid ?? undefined,
    quantity: apiStock.stock_quantity_num,
    is_active: apiStock.stock_is_active_bl,
    created_at: apiStock.stock_created_at_tsz,
    updated_at: apiStock.stock_updated_at_tsz,
    lots: (apiStock.lots ?? []).map(toStockLot),
  };
}
