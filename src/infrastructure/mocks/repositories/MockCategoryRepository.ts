import type { ICategoryRepository, CategoryQueryParams } from '@/domain/repositories';
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '@/domain/models';
import { MOCK_CATEGORIES, MOCK_COMPANY_ID, MOCK_PRODUCTS } from '@/infrastructure/mocks/data';

/** Mock de `catalog.category`: jerarquía y sin borrado físico. */
export class MockCategoryRepository implements ICategoryRepository {
  private categories: Category[] = [...MOCK_CATEGORIES];

  async getAll(params?: CategoryQueryParams) {
    let filtered = [...this.categories];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(search));
    }
    if (params?.parentId) {
      filtered = filtered.filter((c) => c.parent_id === params.parentId);
    }
    if (params?.isActive !== undefined) {
      filtered = filtered.filter((c) => c.is_active === params.isActive);
    }

    await new Promise((r) => setTimeout(r, 150));
    return { data: filtered, total: filtered.length };
  }

  async getById(id: string) {
    await new Promise((r) => setTimeout(r, 100));
    return this.categories.find((c) => c.id === id) ?? null;
  }

  async create(data: CreateCategoryDTO) {
    await new Promise((r) => setTimeout(r, 200));

    const category: Category = {
      id: `category-${Date.now()}`,
      company_id: MOCK_COMPANY_ID,
      parent_id: data.parent_id,
      name: data.name,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.categories.push(category);
    return category;
  }

  async update(id: string, data: UpdateCategoryDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Categoría ${id} no encontrada`);

    const current = this.categories[index];

    // Evita ciclos: la categoría no puede ser su propio padre
    if (data.parent_id === id) {
      throw new Error('Una categoría no puede ser su propio padre.');
    }

    this.categories[index] = {
      ...current,
      name: data.name ?? current.name,
      parent_id: data.parent_id === undefined ? current.parent_id : data.parent_id ?? undefined,
      updated_at: new Date().toISOString(),
    };
    return this.categories[index];
  }

  async setActive(id: string) {
    return this.toggle(id, true);
  }

  async setInactive(id: string) {
    // Réplica del backend: no se desactiva una categoría con productos activos
    const hasActiveProducts = MOCK_PRODUCTS.some(
      (p) => p.category_id === id && p.is_active,
    );
    if (hasActiveProducts) {
      throw new Error('No se puede desactivar una categoría que tiene productos activos.');
    }
    return this.toggle(id, false);
  }

  private async toggle(id: string, isActive: boolean) {
    await new Promise((r) => setTimeout(r, 150));
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Categoría ${id} no encontrada`);

    this.categories[index] = { ...this.categories[index], is_active: isActive, updated_at: new Date().toISOString() };
    return this.categories[index];
  }
}
