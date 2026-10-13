import type { Branch } from '@/domain/models';

/**
 * Contrato crudo de GET/PATCH /api/branches del backend Express.
 * Los nombres de campo siguen la convención de columnas del proyecto.
 */
export interface ApiBranch {
  branch_uuid: string;
  company_uuid: string;
  branch_code_text: string;
  branch_name_text: string;
  branch_address_text: string | null;
  branch_phone_text: string | null;
  branch_is_active_bl: boolean;
  branch_created_at_tsz: string;
  branch_updated_at_tsz: string;
}

/** Respuesta de GET /api/branches (lista) y de los endpoints de detalle. */
export interface ApiBranchListResponse {
  message: string;
  items: ApiBranch[];
}

/** Convierte el modelo crudo del backend al modelo de dominio Branch. */
export function toBranch(apiBranch: ApiBranch): Branch {
  return {
    id: apiBranch.branch_uuid,
    company_id: apiBranch.company_uuid,
    code: apiBranch.branch_code_text,
    name: apiBranch.branch_name_text,
    address: apiBranch.branch_address_text ?? undefined,
    phone: apiBranch.branch_phone_text ?? undefined,
    is_active: apiBranch.branch_is_active_bl,
    created_at: apiBranch.branch_created_at_tsz,
    updated_at: apiBranch.branch_updated_at_tsz,
  };
}
