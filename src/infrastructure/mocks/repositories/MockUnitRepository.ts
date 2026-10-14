import type { IUnitRepository, UnitQueryParams } from '@/domain/repositories';
import type { Unit, CreateUnitDTO, UpdateUnitDTO } from '@/domain/models';
import { MOCK_COMPANY_ID, MOCK_UNITS } from '@/infrastructure/mocks/data';

/** Mock de `catalog.unit`: sin borrado físico. */
export class MockUnitRepository implements IUnitRepository {
  private units: Unit[] = [...MOCK_UNITS];

  async getAll(params?: UnitQueryParams) {
    let filtered = [...this.units];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter((u) => u.name.toLowerCase().includes(search));
    }
    if (params?.isActive !== undefined) {
      filtered = filtered.filter((u) => u.is_active === params.isActive);
    }

    await new Promise((r) => setTimeout(r, 150));
    return { data: filtered, total: filtered.length };
  }

  async getById(id: string) {
    await new Promise((r) => setTimeout(r, 100));
    return this.units.find((u) => u.id === id) ?? null;
  }

  async create(data: CreateUnitDTO) {
    await new Promise((r) => setTimeout(r, 200));

    const unit: Unit = {
      id: `unit-${Date.now()}`,
      company_id: MOCK_COMPANY_ID,
      name: data.name,
      abbreviation: data.abbreviation,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.units.push(unit);
    return unit;
  }

  async update(id: string, data: UpdateUnitDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.units.findIndex((u) => u.id === id);
    if (index === -1) throw new Error(`Unidad ${id} no encontrada`);

    const current = this.units[index];
    this.units[index] = {
      ...current,
      name: data.name ?? current.name,
      abbreviation: data.abbreviation === undefined ? current.abbreviation : data.abbreviation ?? undefined,
      updated_at: new Date().toISOString(),
    };
    return this.units[index];
  }

  async setActive(id: string) {
    return this.toggle(id, true);
  }

  async setInactive(id: string) {
    return this.toggle(id, false);
  }

  private async toggle(id: string, isActive: boolean) {
    await new Promise((r) => setTimeout(r, 150));
    const index = this.units.findIndex((u) => u.id === id);
    if (index === -1) throw new Error(`Unidad ${id} no encontrada`);

    this.units[index] = { ...this.units[index], is_active: isActive, updated_at: new Date().toISOString() };
    return this.units[index];
  }
}
