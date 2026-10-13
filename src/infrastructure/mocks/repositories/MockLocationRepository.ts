import type { ILocationRepository, LocationQueryParams } from '@/domain/repositories';
import type { Location, CreateLocationDTO, UpdateLocationDTO } from '@/domain/models';
import { MOCK_LOCATIONS } from '@/infrastructure/mocks/data';

/**
 * Mock del repositorio de ubicaciones. Replica las reglas del backend:
 * - El código es único dentro del almacén y NO es editable.
 * - No se eliminan ubicaciones: se activan/desactivan.
 */
export class MockLocationRepository implements ILocationRepository {
  private locations: Location[] = [...MOCK_LOCATIONS];

  async getAll(params?: LocationQueryParams) {
    let filtered = [...this.locations];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        (l) => l.name.toLowerCase().includes(search) || l.code.toLowerCase().includes(search),
      );
    }

    if (params?.warehouseId) {
      filtered = filtered.filter((l) => l.warehouse_id === params.warehouseId);
    }

    if (params?.code) {
      const code = params.code.toLowerCase();
      filtered = filtered.filter((l) => l.code.toLowerCase() === code);
    }

    if (params?.type) {
      filtered = filtered.filter((l) => l.type === params.type);
    }

    if (params?.isActive !== undefined) {
      filtered = filtered.filter((l) => l.is_active === params.isActive);
    }

    const total = filtered.length;

    await new Promise((r) => setTimeout(r, 200));
    return { data: filtered, total };
  }

  async getById(id: string) {
    await new Promise((r) => setTimeout(r, 100));
    return this.locations.find((l) => l.id === id) ?? null;
  }

  async create(data: CreateLocationDTO) {
    await new Promise((r) => setTimeout(r, 200));

    const codeExists = this.locations.some(
      (l) =>
        l.warehouse_id === data.warehouse_id && l.code.toLowerCase() === data.code.toLowerCase(),
    );
    if (codeExists) {
      throw new Error(`Ya existe una ubicación con el código "${data.code}" en este almacén.`);
    }

    const location: Location = {
      id: `location-${Date.now()}`,
      warehouse_id: data.warehouse_id,
      code: data.code,
      name: data.name,
      type: data.type,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.locations.push(location);
    return location;
  }

  async update(id: string, data: UpdateLocationDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.locations.findIndex((l) => l.id === id);
    if (index === -1) throw new Error(`Ubicación con id ${id} no encontrada`);

    const current = this.locations[index];
    this.locations[index] = {
      ...current,
      name: data.name ?? current.name,
      // null limpia el campo opcional (comportamiento del backend)
      type: data.type === undefined ? current.type : data.type ?? undefined,
      updated_at: new Date().toISOString(),
    };
    return this.locations[index];
  }

  async setActive(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.locations.findIndex((l) => l.id === id);
    if (index === -1) throw new Error(`Ubicación con id ${id} no encontrada`);

    this.locations[index] = { ...this.locations[index], is_active: true, updated_at: new Date().toISOString() };
    return this.locations[index];
  }

  async setInactive(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.locations.findIndex((l) => l.id === id);
    if (index === -1) throw new Error(`Ubicación con id ${id} no encontrada`);

    this.locations[index] = { ...this.locations[index], is_active: false, updated_at: new Date().toISOString() };
    return this.locations[index];
  }
}
