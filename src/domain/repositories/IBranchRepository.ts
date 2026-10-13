import type { Branch, CreateBranchDTO, UpdateBranchDTO } from '@/domain/models';
import type { PaginationParams, SearchParams } from '@/shared/types/common';

export interface IBranchRepository {
  getAll(params?: PaginationParams & SearchParams): Promise<{ data: Branch[]; total: number }>;
  getById(id: string): Promise<Branch | null>;
  create(data: CreateBranchDTO): Promise<Branch>;
  update(id: string, data: UpdateBranchDTO): Promise<Branch>;
  delete(id: string): Promise<void>;
}
