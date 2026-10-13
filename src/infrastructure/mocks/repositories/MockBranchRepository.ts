import type { IBranchRepository } from '@/domain/repositories';
import type { Branch, CreateBranchDTO, UpdateBranchDTO } from '@/domain/models';
import { MOCK_BRANCHES } from '@/infrastructure/mocks/data';

export class MockBranchRepository implements IBranchRepository {
  private branches: Branch[] = [...MOCK_BRANCHES];

  async getAll(params?: { page?: number; limit?: number; search?: string }) {
    let filtered = [...this.branches];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter((b) => b.name.toLowerCase().includes(search));
    }

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
    return this.branches.find((b) => b.id === id) ?? null;
  }

  async create(data: CreateBranchDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const branch: Branch = {
      id: `branch-${Date.now()}`,
      ...data,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.branches.push(branch);
    return branch;
  }

  async update(id: string, data: UpdateBranchDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.branches.findIndex((b) => b.id === id);
    if (index === -1) throw new Error(`Sede con id ${id} no encontrada`);
    this.branches[index] = { ...this.branches[index], ...data, updated_at: new Date().toISOString() };
    return this.branches[index];
  }

  async delete(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    this.branches = this.branches.filter((b) => b.id !== id);
  }
}
