import type { Location } from '@/domain/models';

/**
 * Contrato crudo de GET/POST/PATCH /api/locations del backend Express.
 * Los nombres de campo siguen la convención de columnas del proyecto.
 */
export interface ApiLocation {
  location_uuid: string;
  warehouse_uuid: string;
  location_code_text: string;
  location_name_text: string;
  location_type_text: string | null;
  location_is_active_bl: boolean;
  location_created_at_tsz: string;
  location_updated_at_tsz: string;
}

/** Respuesta de GET /api/locations (lista). */
export interface ApiLocationListResponse {
  message: string;
  items: ApiLocation[];
}

/** Convierte el modelo crudo del backend al modelo de dominio Location. */
export function toLocation(apiLocation: ApiLocation): Location {
  return {
    id: apiLocation.location_uuid,
    warehouse_id: apiLocation.warehouse_uuid,
    code: apiLocation.location_code_text,
    name: apiLocation.location_name_text,
    type: apiLocation.location_type_text ?? undefined,
    is_active: apiLocation.location_is_active_bl,
    created_at: apiLocation.location_created_at_tsz,
    updated_at: apiLocation.location_updated_at_tsz,
  };
}
