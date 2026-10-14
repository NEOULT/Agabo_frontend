import type { Warehouse } from '@/domain/models';

/**
 * Contrato crudo de GET/POST/PATCH /api/warehouses del backend Express.
 * Los nombres de campo siguen la convención de columnas del proyecto.
 */
export interface ApiWarehouse {
  warehouse_uuid: string;
  branch_uuid: string;
  warehouse_name_text: string;
  warehouse_type_text: string | null;
  warehouse_is_active_bl: boolean;
  warehouse_created_at_tsz: string;
  warehouse_updated_at_tsz: string;
}

/** Respuesta de GET /api/warehouses (lista). */
export interface ApiWarehouseListResponse {
  message: string;
  items: ApiWarehouse[];
}

/** Convierte el modelo crudo del backend al modelo de dominio Warehouse. */
export function toWarehouse(apiWarehouse: ApiWarehouse): Warehouse {
  return {
    id: apiWarehouse.warehouse_uuid,
    branch_id: apiWarehouse.branch_uuid,
    name: apiWarehouse.warehouse_name_text,
    type: apiWarehouse.warehouse_type_text ?? undefined,
    is_active: apiWarehouse.warehouse_is_active_bl,
    created_at: apiWarehouse.warehouse_created_at_tsz,
    updated_at: apiWarehouse.warehouse_updated_at_tsz,
  };
}
