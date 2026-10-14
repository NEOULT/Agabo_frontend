import type { IProductRepository, ProductQueryParams } from '@/domain/repositories';
import type {
  Product,
  ProductCode,
  ProductUnit,
  CreateProductDTO,
  UpdateProductDTO,
  CreateProductCodeDTO,
  UpdateProductCodeDTO,
  CreatePresentationDTO,
  UpdatePresentationDTO,
} from '@/domain/models';
import { MOCK_COMPANY_ID, MOCK_PRODUCTS, MOCK_UNITS } from '@/infrastructure/mocks/data';

/**
 * Mock del catálogo de productos. Replica las reglas del backend:
 * - Al crear se genera la presentación base (factor 1).
 * - El código de producto es único en la empresa.
 * - No se puede retirar el último código del producto.
 * - La presentación base no se desactiva con el producto activo.
 */
export class MockProductRepository implements IProductRepository {
  private products: Product[] = MOCK_PRODUCTS.map((p) => ({
    ...p,
    codes: [...p.codes],
    units: [...p.units],
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
      // El backend crea la presentación base automáticamente
      units: [
        {
          id: `punit-${Date.now()}`,
          product_id: productId,
          unit_id: data.base_unit_id,
          name: baseUnit.name,
          factor: 1,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
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

  // --- Presentaciones ------------------------------------------------------
  async createPresentation(data: CreatePresentationDTO): Promise<ProductUnit> {
    await this.delay();
    const index = this.findIndex(data.product_id);
    const product = this.products[index];

    const duplicated = product.units.some((u) => u.unit_id === data.unit_id);
    if (duplicated) throw new Error('El producto ya tiene una presentación con esa unidad.');

    const now = new Date().toISOString();
    const presentation: ProductUnit = {
      id: `punit-${Date.now()}`,
      product_id: product.id,
      unit_id: data.unit_id,
      name: data.name,
      factor: data.factor,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.products[index] = {
      ...product,
      units: [...product.units, presentation],
      updated_at: now,
    };
    return presentation;
  }

  async updatePresentation(id: string, data: UpdatePresentationDTO): Promise<ProductUnit> {
    await this.delay();
    const { productIndex, unitIndex } = this.findPresentation(id);
    const product = this.products[productIndex];

    const updated: ProductUnit = {
      ...product.units[unitIndex],
      name: data.name ?? product.units[unitIndex].name,
      factor: data.factor ?? product.units[unitIndex].factor,
      updated_at: new Date().toISOString(),
    };

    const units = [...product.units];
    units[unitIndex] = updated;
    this.products[productIndex] = { ...product, units, updated_at: new Date().toISOString() };
    return updated;
  }

  async setPresentationActive(id: string): Promise<ProductUnit> {
    return this.togglePresentation(id, true);
  }

  async setPresentationInactive(id: string): Promise<ProductUnit> {
    return this.togglePresentation(id, false);
  }

  private async togglePresentation(id: string, isActive: boolean): Promise<ProductUnit> {
    await this.delay(150);
    const { productIndex, unitIndex } = this.findPresentation(id);
    const product = this.products[productIndex];
    const presentation = product.units[unitIndex];

    // La presentación base no se desactiva mientras el producto esté activo
    if (
      !isActive &&
      product.is_active &&
      presentation.unit_id === product.base_unit_id &&
      presentation.factor === 1
    ) {
      throw new Error('La presentación base no se puede desactivar mientras el producto esté activo.');
    }

    const updated: ProductUnit = { ...presentation, is_active: isActive, updated_at: new Date().toISOString() };
    const units = [...product.units];
    units[unitIndex] = updated;
    this.products[productIndex] = { ...product, units, updated_at: new Date().toISOString() };
    return updated;
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

  private findPresentation(unitId: string): { productIndex: number; unitIndex: number } {
    for (let productIndex = 0; productIndex < this.products.length; productIndex += 1) {
      const unitIndex = this.products[productIndex].units.findIndex((u) => u.id === unitId);
      if (unitIndex !== -1) return { productIndex, unitIndex };
    }
    throw new Error(`Presentación ${unitId} no encontrada`);
  }
}
