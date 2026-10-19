import type {
  Product,
  ProductCode,
  CreateProductDTO,
  UpdateProductDTO,
  CreateProductCodeDTO,
  UpdateProductCodeDTO,
} from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/**
 * Filtros soportados por GET /api/products.
 */
export interface ProductQueryParams extends SearchParams {
  /** Filtro exacto por categoría (category_uuid). */
  categoryId?: string;
  /** Filtro exacto por marca (brand_uuid). */
  brandId?: string;
  /** Filtro exacto por unidad base (base_unit_uuid). */
  baseUnitId?: string;
  /** Filtro por valor de código exacto (product_code_text). */
  code?: string;
  /** Filtro por estado (product_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato del catálogo de productos (schema catalog).
 *
 * Agrupa `product` y `product_code` porque son un mismo agregado: los códigos
 * se administran desde el detalle del producto (RF-CAT-013 a RF-CAT-017).
 *
 * No existe `delete` para productos: se activan/desactivan (RF-CAT-016).
 */
export interface IProductRepository {
  // --- Productos -----------------------------------------------------------
  getAll(params?: ProductQueryParams): Promise<{ data: Product[]; total: number }>;
  getById(id: string): Promise<Product | null>;
  create(data: CreateProductDTO): Promise<Product>;
  update(id: string, data: UpdateProductDTO): Promise<Product>;
  /** POST /api/products/{product_uuid}/activate */
  setActive(id: string): Promise<Product>;
  /** POST /api/products/{product_uuid}/deactivate */
  setInactive(id: string): Promise<Product>;

  // --- Códigos (RF-CAT-017) ------------------------------------------------
  createCode(data: CreateProductCodeDTO): Promise<ProductCode>;
  updateCode(id: string, data: UpdateProductCodeDTO): Promise<ProductCode>;
  /** DELETE /api/product-codes/{uuid} — falla con `last_code_cannot_be_removed`. */
  removeCode(id: string): Promise<void>;
}
