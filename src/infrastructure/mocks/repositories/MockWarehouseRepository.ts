import type { IWarehouseRepository, WarehouseQueryParams } from '@/domain/repositories';
import type { Warehouse, CreateWarehouseDTO, UpdateWarehouseDTO } from '@/domain/models';
import { MOCK_WAREHOUSES } from '@/infrastructure/mocks/data';

/**
 * Mock del repositorio de almacenes. Replica las reglas del backend:
 * - No se eliminan almacenes: se activan/desactivan.
 * - La sucursal no se modifica en update.
 */
export class MockWarehouseRepository implements IWarehouseRepository {
  private warehouses: Warehouse[] = [...MOCK_WAREHOUSES];

  async getAll(params?: WarehouseQueryParams) {
    let filtered = [...this.warehouses];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter((w) => w.name.toLowerCase().includes(search));
    }

    if (params?.branchId) {
      filtered = filtered.filter((w) => w.branch_id === params.branchId);
    }

    if (params?.type) {
      filtered = filtered.filter((w) => w.type === params.type);
    }

    if (params?.isActive !== undefined) {
      filtered = filtered.filter((w) => w.is_active === params.isActive);
    }

    const total = filtered.length;

    await new Promise((r) => setTimeout(r, 200));
    return { data: filtered, total };
  }

  async getById(id: string) {
    await new Promise((r) => setTimeout(r, 100));
    return this.warehouses.find((w) => w.id === id) ?? null;
  }

  async create(data: CreateWarehouseDTO) {
    await new Promise((r) => setTimeout(r, 200));

    const warehouse: Warehouse = {
      id: `warehouse-${Date.now()}`,
      branch_id: data.branch_id,
      name: data.name,
      type: data.type,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.warehouses.push(warehouse);
    return warehouse;
  }

  async update(id: string, data: UpdateWarehouseDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.warehouses.findIndex((w) => w.id === id);
    if (index === -1) throw new Error(`Almacén con id ${id} no encontrado`);

    const current = this.warehouses[index];

    this.warehouses[index] = {
      ...current,
      name: data.name ?? current.name,
      // null limpia el campo opcional (comportamiento del backend)
      type: data.type === undefined ? current.type : data.type ?? undefined,
      updated_at: new Date().toISOString(),
    };
    return this.warehouses[index];
  }

  async setActive(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.warehouses.findIndex((w) => w.id === id);
    if (index === -1) throw new Error(`Almacén con id ${id} no encontrado`);

    this.warehouses[index] = { ...this.warehouses[index], is_active: true, updated_at: new Date().toISOString() };
    return this.warehouses[index];
  }

  async setInactive(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.warehouses.findIndex((w) => w.id === id);
    if (index === -1) throw new Error(`Almacén con id ${id} no encontrado`);

    this.warehouses[index] = { ...this.warehouses[index], is_active: false, updated_at: new Date().toISOString() };
    return this.warehouses[index];
  }
}
