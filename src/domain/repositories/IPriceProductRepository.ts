import type {
  PriceProduct,
  CreatePriceProductDTO,
  UpdatePriceProductDTO,
} from '@/domain/models';

/**
 * Filtros soportados por GET /api/price-products.
 * El backend combina los filtros enviados con AND.
 */
export interface PriceProductQueryParams {
  /** Filtra por lista de precios (price_list_uuid). */
  priceListId?: string;
  /** Filtro exacto por producto (product_uuid). */
  productId?: string;
  /** Filtro por estado (price_product_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de precios de producto (catalog.price_product).
 *
 * Liga una lista de precios con un producto (RF-CAT-023 a RF-CAT-026). No existe `delete`: el precio se retira con desactivación.
 *
 * El punto de venta usa `getAll` para armar el mapa de precios de la sucursal
 * activa; la administración completa vive en el módulo de precios.
 */
export interface IPriceProductRepository {
  getAll(params?: PriceProductQueryParams): Promise<{ data: PriceProduct[]; total: number }>;
  getById(id: string): Promise<PriceProduct | null>;
  create(data: CreatePriceProductDTO): Promise<PriceProduct>;
  update(id: string, data: UpdatePriceProductDTO): Promise<PriceProduct>;
  /** POST /api/price-products/{price_product_uuid}/activate — idempotente. */
  setActive(id: string): Promise<PriceProduct>;
  /** POST /api/price-products/{price_product_uuid}/deactivate — idempotente. */
  setInactive(id: string): Promise<PriceProduct>;
}
