import type { Unit } from '@/domain/models';

/** Contrato crudo de GET/POST/PATCH /api/units. */
export interface ApiUnit {
  unit_uuid: string;
  company_uuid: string;
  unit_name_text: string;
  unit_abbreviation_text: string | null;
  unit_is_active_bl: boolean;
  unit_created_at_tsz: string;
  unit_updated_at_tsz: string;
}

export interface ApiUnitListResponse {
  message: string;
  items: ApiUnit[];
}

export function toUnit(apiUnit: ApiUnit): Unit {
  return {
    id: apiUnit.unit_uuid,
    company_id: apiUnit.company_uuid,
    name: apiUnit.unit_name_text,
    abbreviation: apiUnit.unit_abbreviation_text ?? undefined,
    is_active: apiUnit.unit_is_active_bl,
    created_at: apiUnit.unit_created_at_tsz,
    updated_at: apiUnit.unit_updated_at_tsz,
  };
}
