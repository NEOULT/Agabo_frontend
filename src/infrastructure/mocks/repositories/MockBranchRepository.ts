import type { IBranchRepository, BranchQueryParams } from '@/domain/repositories';
import type { Branch, CreateBranchDTO, UpdateBranchDTO } from '@/domain/models';
import { MOCK_BRANCHES } from '@/infrastructure/mocks/data';

/**
 * Mock del repositorio de sucursales. Replica las reglas del backend:
 * - El código es único dentro de la empresa.
 * - No se eliminan sucursales: se activan/desactivan.
 * - El código y la empresa no se modifican en update.
 */
export class MockBranchRepository implements IBranchRepository {
  private branches: Branch[] = [...MOCK_BRANCHES];

  async getAll(params?: BranchQueryParams) {
    let filtered = [...this.branches];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        (b) => b.name.toLowerCase().includes(search) || b.code.toLowerCase().includes(search),
      );
    }

    if (params?.code) {
      const code = params.code.toLowerCase();
      filtered = filtered.filter((b) => b.code.toLowerCase() === code);
    }

    if (params?.isActive !== undefined) {
      filtered = filtered.filter((b) => b.is_active === params.isActive);
    }

    const total = filtered.length;

    await new Promise((r) => setTimeout(r, 200));
    return { data: filtered, total };
  }

  async getById(id: string) {
    await new Promise((r) => setTimeout(r, 100));
    return this.branches.find((b) => b.id === id) ?? null;
  }

  async create(data: CreateBranchDTO) {
    await new Promise((r) => setTimeout(r, 200));

    const codeExists = this.branches.some(
      (b) => b.company_id === data.company_id && b.code.toLowerCase() === data.code.toLowerCase(),
    );
    if (codeExists) {
      throw new Error(`Ya existe una sucursal con el código "${data.code}" en esta empresa.`);
    }

    const branch: Branch = {
      id: `branch-${Date.now()}`,
      company_id: data.company_id,
      code: data.code,
      name: data.name,
      address: data.address,
      phone: data.phone,
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

    const current = this.branches[index];
    this.branches[index] = {
      ...current,
      name: data.name ?? current.name,
      // null limpia el campo opcional (comportamiento del backend)
      address: data.address === undefined ? current.address : data.address ?? undefined,
      phone: data.phone === undefined ? current.phone : data.phone ?? undefined,
      updated_at: new Date().toISOString(),
    };
    return this.branches[index];
  }

  async setActive(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.branches.findIndex((b) => b.id === id);
    if (index === -1) throw new Error(`Sede con id ${id} no encontrada`);

    this.branches[index] = { ...this.branches[index], is_active: true, updated_at: new Date().toISOString() };
    return this.branches[index];
  }

  async setInactive(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.branches.findIndex((b) => b.id === id);
    if (index === -1) throw new Error(`Sede con id ${id} no encontrada`);

    this.branches[index] = { ...this.branches[index], is_active: false, updated_at: new Date().toISOString() };
    return this.branches[index];
  }
}
