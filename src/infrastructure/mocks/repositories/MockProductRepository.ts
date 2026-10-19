import type { IProductRepository, ProductQueryParams } from '@/domain/repositories';
import type {
  Product,
  ProductCode,
  CreateProductDTO,
  UpdateProductDTO,
  CreateProductCodeDTO,
  UpdateProductCodeDTO,
} from '@/domain/models';
import { MOCK_COMPANY_ID, MOCK_PRODUCTS, MOCK_UNITS } from '@/infrastructure/mocks/data';

/**
 * Mock del catálogo de productos. Replica las reglas del backend:
 * - El código de producto es único en la empresa.
 * - No se puede retirar el último código del producto.
 */
export class MockProductRepository implements IProductRepository {
  private products: Product[] = MOCK_PRODUCTS.map((p) => ({
    ...p,
    codes: [...p.codes],
  }));

  private delay(ms = 200) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // --- Productos -----------------------------------------------------------
  async getAll(params?: ProductQueryParams) {
    let filtered = [...this.products];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.codes.some((c) => c.code.toLowerCase().includes(search)),
      );
    }
    if (params?.categoryId) {
      filtered = filtered.filter((p) => p.category_id === params.categoryId);
    }
    if (params?.brandId) {
      filtered = filtered.filter((p) => p.brand_id === params.brandId);
    }
    if (params?.baseUnitId) {
      filtered = filtered.filter((p) => p.base_unit_id === params.baseUnitId);
    }
    if (params?.code) {
      const code = params.code.toLowerCase();
      filtered = filtered.filter((p) => p.codes.some((c) => c.code.toLowerCase() === code));
    }
    if (params?.isActive !== undefined) {
      filtered = filtered.filter((p) => p.is_active === params.isActive);
    }

    await this.delay();
    return { data: filtered, total: filtered.length };
  }

  async getById(id: string) {
    await this.delay(100);
    return this.products.find((p) => p.id === id) ?? null;
  }

  async create(data: CreateProductDTO) {
    await this.delay();

    const baseUnit = MOCK_UNITS.find((u) => u.id === data.base_unit_id);
    if (!baseUnit) throw new Error('La unidad base indicada no existe.');

    const productId = `prod-${Date.now()}`;
    const now = new Date().toISOString();

    const product: Product = {
      id: productId,
      company_id: MOCK_COMPANY_ID,
      category_id: data.category_id,
      brand_id: data.brand_id,
      base_unit_id: data.base_unit_id,
      name: data.name,
      description: data.description,
      is_active: true,
      created_at: now,
      updated_at: now,
      codes: [],
    };

    this.products.push(product);
    return product;
  }

  async update(id: string, data: UpdateProductDTO) {
    await this.delay();
    const index = this.findIndex(id);
    const current = this.products[index];

    this.products[index] = {
      ...current,
      name: data.name ?? current.name,
      description: data.description === undefined ? current.description : data.description ?? undefined,
      category_id: data.category_id === undefined ? current.category_id : data.category_id ?? undefined,
      brand_id: data.brand_id === undefined ? current.brand_id : data.brand_id ?? undefined,
      updated_at: new Date().toISOString(),
    };
    return this.products[index];
  }

  async setActive(id: string) {
    return this.toggleProduct(id, true);
  }

  async setInactive(id: string) {
    return this.toggleProduct(id, false);
  }

  private async toggleProduct(id: string, isActive: boolean) {
    await this.delay(150);
    const index = this.findIndex(id);
    this.products[index] = {
      ...this.products[index],
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };
    return this.products[index];
  }

  // --- Códigos -------------------------------------------------------------
  async createCode(data: CreateProductCodeDTO): Promise<ProductCode> {
    await this.delay();
    const index = this.findIndex(data.product_id);
    const product = this.products[index];

    const codeValue = data.code.toLowerCase();
    const duplicated = this.products.some((p) =>
      p.codes.some((c) => c.code.toLowerCase() === codeValue),
    );
    if (duplicated) throw new Error(`El código "${data.code}" ya existe en la empresa.`);

    const now = new Date().toISOString();
    const code: ProductCode = {
      id: `pcode-${Date.now()}`,
      company_id: MOCK_COMPANY_ID,
      product_id: product.id,
      code: data.code,
      type: data.type,
      is_primary: data.is_primary ?? false,
      created_at: now,
      updated_at: now,
    };

    let codes = [...product.codes];
    // Solo un código principal por producto
    if (code.is_primary) {
      codes = codes.map((c) => ({ ...c, is_primary: false }));
    }
    this.products[index] = {
      ...product,
      codes: [...codes, code],
      updated_at: now,
    };
    return code;
  }

  async updateCode(id: string, data: UpdateProductCodeDTO): Promise<ProductCode> {
    await this.delay();
    const { productIndex, codeIndex } = this.findCode(id);
    const product = this.products[productIndex];

    if (data.code !== undefined) {
      const value = data.code.toLowerCase();
      const duplicated = this.products.some((p) =>
        p.codes.some((c) => c.id !== id && c.code.toLowerCase() === value),
      );
      if (duplicated) throw new Error(`El código "${data.code}" ya existe en la empresa.`);
    }

    let codes = [...product.codes];
    if (data.is_primary) {
      codes = codes.map((c) => ({ ...c, is_primary: false }));
    }

    const updated: ProductCode = {
      ...codes[codeIndex],
      code: data.code ?? codes[codeIndex].code,
      type: data.type ?? codes[codeIndex].type,
      is_primary: data.is_primary ?? codes[codeIndex].is_primary,
      updated_at: new Date().toISOString(),
    };
    codes[codeIndex] = updated;

    this.products[productIndex] = { ...product, codes, updated_at: new Date().toISOString() };
    return updated;
  }

  async removeCode(id: string): Promise<void> {
    await this.delay();
    const { productIndex, codeIndex } = this.findCode(id);
    const product = this.products[productIndex];

    // El producto necesita al menos un código para usarse en otros schemas
    if (product.codes.length <= 1) {
      throw new Error('No se puede retirar el único código del producto.');
    }

    this.products[productIndex] = {
      ...product,
      codes: product.codes.filter((_, i) => i !== codeIndex),
      updated_at: new Date().toISOString(),
    };
  }

  // --- Utilidades ----------------------------------------------------------
  private findIndex(id: string): number {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Producto ${id} no encontrado`);
    return index;
  }

  private findCode(codeId: string): { productIndex: number; codeIndex: number } {
    for (let productIndex = 0; productIndex < this.products.length; productIndex += 1) {
      const codeIndex = this.products[productIndex].codes.findIndex((c) => c.id === codeId);
      if (codeIndex !== -1) return { productIndex, codeIndex };
    }
    throw new Error(`Código ${codeId} no encontrado`);
  }
}
