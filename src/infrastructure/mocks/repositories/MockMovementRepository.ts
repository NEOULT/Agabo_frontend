import type { IMovementRepository, MovementQueryParams } from '@/domain/repositories';
import type { Movement, CreateMovementDTO } from '@/domain/models';
import { MOCK_MOVEMENTS } from '@/infrastructure/mocks/data';

export class MockMovementRepository implements IMovementRepository {
  private movements: Movement[] = [...MOCK_MOVEMENTS];

  async getAll(params?: MovementQueryParams) {
    let filtered = [...this.movements];

    if (params?.branchId) {
      filtered = filtered.filter((m) => m.branch_id === params.branchId);
    }
    if (params?.productId) {
      filtered = filtered.filter((m) => m.product_id === params.productId);
    }
    if (params?.type) {
      filtered = filtered.filter((m) => m.type === params.type);
    }
    if (params?.fromDate) {
      filtered = filtered.filter((m) => m.created_at >= params.fromDate!);
    }
    if (params?.toDate) {
      filtered = filtered.filter((m) => m.created_at <= params.toDate!);
    }

    // Ordenar por fecha descendente (más reciente primero)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = filtered.length;
    if (params?.page && params?.limit) {
      const start = (params.page - 1) * params.limit;
      filtered = filtered.slice(start, start + params.limit);
    }

    await new Promise((r) => setTimeout(r, 200));
    return { data: filtered, total };
  }

  async getById(id: string) {
    await new Promise((r) => setTimeout(r, 100));
    return this.movements.find((m) => m.id === id) ?? null;
  }

  async create(data: CreateMovementDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const movement: Movement = {
      id: `mov-${Date.now()}`,
      ...data,
      performed_by: 'user-001',
      performed_by_name: 'Juan Admin',
      created_at: new Date().toISOString(),
    };
    this.movements.push(movement);
    return movement;
  }

  async getByProduct(productId: string, params?: { page?: number; limit?: number }) {
    let filtered = this.movements.filter((m) => m.product_id === productId);
    const total = filtered.length;
    if (params?.page && params?.limit) {
      const start = (params.page - 1) * params.limit;
      filtered = filtered.slice(start, start + params.limit);
    }
    return { data: filtered, total };
  }
}
