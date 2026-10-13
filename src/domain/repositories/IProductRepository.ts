import type { Product, CreateProductDTO, UpdateProductDTO, ProductStock } from '@/domain/models';
import type { PaginationParams, SearchParams } from '@/shared/types/common';

export interface ProductQueryParams extends PaginationParams, SearchParams {
  branchId?: string;
  category?: string;
  isActive?: boolean;
}

export interface IProductRepository {
  getAll(params?: ProductQueryParams): Promise<{ data: Product[]; total: number }>;
  getById(id: string): Promise<Product | null>;
  getStockByBranch(productId: string): Promise<ProductStock[]>;
  create(product: CreateProductDTO): Promise<Product>;
  update(id: string, product: UpdateProductDTO): Promise<Product>;
  delete(id: string): Promise<void>;
}
