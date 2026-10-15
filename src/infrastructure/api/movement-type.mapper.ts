import type { MovementType, MovementPurpose } from '@/domain/models';

/** Contrato crudo de GET/POST/PATCH /api/movement-types (RF-INV-001/003). */
export interface ApiMovementType {
  movement_type_uuid: string;
  company_uuid: string;
  movement_type_name_text: string;
  movement_type_description_text: string | null;
  movement_type_purpose_text: string | null;
  movement_type_is_active_bl: boolean;
  movement_type_created_at_tsz: string;
  movement_type_updated_at_tsz: string;
}

/** Respuesta de GET /api/movement-types (lista). */
export interface ApiMovementTypeListResponse {
  message: string;
  items: ApiMovementType[];
}

/** El propósito reservado solo admite `sale_out` o `purchase_in`. */
function toPurpose(value: string | null): MovementPurpose | undefined {
  return value === 'sale_out' || value === 'purchase_in' ? value : undefined;
}

export function toMovementType(apiType: ApiMovementType): MovementType {
  return {
    id: apiType.movement_type_uuid,
    company_id: apiType.company_uuid,
    name: apiType.movement_type_name_text,
    description: apiType.movement_type_description_text ?? undefined,
    purpose: toPurpose(apiType.movement_type_purpose_text),
    is_active: apiType.movement_type_is_active_bl,
    created_at: apiType.movement_type_created_at_tsz,
    updated_at: apiType.movement_type_updated_at_tsz,
  };
}
