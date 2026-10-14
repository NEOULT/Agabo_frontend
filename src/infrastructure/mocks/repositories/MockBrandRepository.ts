import type { IBrandRepository, BrandQueryParams } from '@/domain/repositories';
import type { Brand, CreateBrandDTO, UpdateBrandDTO } from '@/domain/models';
import { MOCK_BRANDS, MOCK_COMPANY_ID } from '@/infrastructure/mocks/data';

/** Mock de `catalog.brand`: sin borrado físico. */
export class MockBrandRepository implements IBrandRepository {
  private brands: Brand[] = [...MOCK_BRANDS];

  async getAll(params?: BrandQueryParams) {
    let filtered = [...this.brands];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter((b) => b.name.toLowerCase().includes(search));
    }
    if (params?.isActive !== undefined) {
      filtered = filtered.filter((b) => b.is_active === params.isActive);
    }

    await new Promise((r) => setTimeout(r, 150));
    return { data: filtered, total: filtered.length };
  }

  async getById(id: string) {
    await new Promise((r) => setTimeout(r, 100));
    return this.brands.find((b) => b.id === id) ?? null;
  }

  async create(data: CreateBrandDTO) {
    await new Promise((r) => setTimeout(r, 200));

    const brand: Brand = {
      id: `brand-${Date.now()}`,
      company_id: MOCK_COMPANY_ID,
      name: data.name,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.brands.push(brand);
    return brand;
  }

  async update(id: string, data: UpdateBrandDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.brands.findIndex((b) => b.id === id);
    if (index === -1) throw new Error(`Marca ${id} no encontrada`);

    this.brands[index] = {
      ...this.brands[index],
      name: data.name ?? this.brands[index].name,
      updated_at: new Date().toISOString(),
    };
    return this.brands[index];
  }

  async setActive(id: string) {
    return this.toggle(id, true);
  }

  async setInactive(id: string) {
    return this.toggle(id, false);
  }

  private async toggle(id: string, isActive: boolean) {
    await new Promise((r) => setTimeout(r, 150));
    const index = this.brands.findIndex((b) => b.id === id);
    if (index === -1) throw new Error(`Marca ${id} no encontrada`);

    this.brands[index] = { ...this.brands[index], is_active: isActive, updated_at: new Date().toISOString() };
    return this.brands[index];
  }
}
