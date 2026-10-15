import type {
  PriceList,
  CreatePriceListDTO,
  UpdatePriceListDTO,
} from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/**
 * Filtros soportados por GET /api/price-lists.
 * El backend combina los filtros enviados con AND.
 */
export interface PriceListQueryParams extends SearchParams {
  /** Filtra por sucursal propietaria (branch_uuid). */
  branchId?: string;
  /** Filtro por estado (price_list_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de listas de precios (catalog.price_list).
 *
 * Una lista pertenece a una sucursal y agrupa los precios de sus productos
 * (RF-CAT-019 a RF-CAT-022). No existe `delete`: se activa/desactiva.
 */
export interface IPriceListRepository {
  getAll(params?: PriceListQueryParams): Promise<{ data: PriceList[]; total: number }>;
  getById(id: string): Promise<PriceList | null>;
  create(data: CreatePriceListDTO): Promise<PriceList>;
  update(id: string, data: UpdatePriceListDTO): Promise<PriceList>;
  /** POST /api/price-lists/{price_list_uuid}/activate — idempotente. */
  setActive(id: string): Promise<PriceList>;
  /** POST /api/price-lists/{price_list_uuid}/deactivate — idempotente. */
  setInactive(id: string): Promise<PriceList>;
}
