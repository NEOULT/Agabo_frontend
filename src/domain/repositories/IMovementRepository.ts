import type { Movement, CreateMovementDTO } from '@/domain/models';
import type { PaginationParams, SearchParams } from '@/shared/types/common';

export interface MovementQueryParams extends PaginationParams, SearchParams {
  branchId?: string;
  productId?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
}

export interface IMovementRepository {
  getAll(params?: MovementQueryParams): Promise<{ data: Movement[]; total: number }>;
  getById(id: string): Promise<Movement | null>;
  create(data: CreateMovementDTO): Promise<Movement>;
  getByProduct(productId: string, params?: PaginationParams): Promise<{ data: Movement[]; total: number }>;
}
