import type { IProductRepository, ProductQueryParams } from '@/domain/repositories/IProductRepository';
import type { Product, CreateProductDTO, UpdateProductDTO } from '@/domain/models';
import { MOCK_PRODUCTS, MOCK_STOCK, MOCK_BRANCHES } from '@/infrastructure/mocks/data';

export class MockProductRepository implements IProductRepository {
  private products: Product[] = [...MOCK_PRODUCTS];

  async getAll(params?: ProductQueryParams) {
    let filtered = [...this.products];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search),
      );
    }

    if (params?.category) {
      filtered = filtered.filter((p) => p.category === params.category);
    }

    if (params?.isActive !== undefined) {
      filtered = filtered.filter((p) => p.is_active === params.isActive);
    }

    const total = filtered.length;

    if (params?.page && params?.limit) {
      const start = (params.page - 1) * params.limit;
      filtered = filtered.slice(start, start + params.limit);
    }

    // Simular delay de red
    await new Promise((r) => setTimeout(r, 200));

    return { data: filtered, total };
  }

  async getById(id: string) {
    await new Promise((r) => setTimeout(r, 100));
    return this.products.find((p) => p.id === id) ?? null;
  }

  async getStockByBranch(productId: string) {
    await new Promise((r) => setTimeout(r, 100));
    const stockMap = MOCK_STOCK[productId];
    if (!stockMap) return [];

    return MOCK_BRANCHES
      .filter((b) => b.is_active)
      .map((b) => ({
        product_id: productId,
        branch_id: b.id,
        quantity: stockMap[b.id] ?? 0,
        branch_name: b.name,
      }));
  }

  async create(data: CreateProductDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      ...data,
      attributes: data.attributes ?? {},
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.products.push(newProduct);
    return newProduct;
  }

  async update(id: string, data: UpdateProductDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Producto con id ${id} no encontrado`);

    this.products[index] = {
      ...this.products[index],
      ...data,
      attributes: data.attributes ?? this.products[index].attributes,
      updated_at: new Date().toISOString(),
    };
    return this.products[index];
  }

  async delete(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    this.products = this.products.filter((p) => p.id !== id);
  }
}
