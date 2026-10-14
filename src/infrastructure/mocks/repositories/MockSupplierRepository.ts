import type { ISupplierRepository, SupplierQueryParams } from '@/domain/repositories';
import type { Supplier, CreateSupplierDTO, UpdateSupplierDTO } from '@/domain/models';
import { MOCK_COMPANY_ID, MOCK_SUPPLIERS } from '@/infrastructure/mocks/data';

/**
 * Mock del repositorio de proveedores. Replica las reglas del backend:
 * - No se eliminan proveedores: se activan/desactivan.
 */
export class MockSupplierRepository implements ISupplierRepository {
  private suppliers: Supplier[] = [...MOCK_SUPPLIERS];

  async getAll(params?: SupplierQueryParams) {
    let filtered = [...this.suppliers];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(search));
    }

    if (params?.taxId) {
      filtered = filtered.filter((s) => s.tax_id === params.taxId);
    }

    if (params?.isActive !== undefined) {
      filtered = filtered.filter((s) => s.is_active === params.isActive);
    }

    const total = filtered.length;

    await new Promise((r) => setTimeout(r, 200));
    return { data: filtered, total };
  }

  async getById(id: string) {
    await new Promise((r) => setTimeout(r, 100));
    return this.suppliers.find((s) => s.id === id) ?? null;
  }

  async create(data: CreateSupplierDTO) {
    await new Promise((r) => setTimeout(r, 200));

    const supplier: Supplier = {
      id: `supp-${Date.now()}`,
      company_id: MOCK_COMPANY_ID,
      name: data.name,
      tax_id: data.tax_id,
      email: data.email,
      phone: data.phone,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.suppliers.push(supplier);
    return supplier;
  }

  async update(id: string, data: UpdateSupplierDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.suppliers.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Proveedor con id ${id} no encontrado`);

    const current = this.suppliers[index];
    this.suppliers[index] = {
      ...current,
      name: data.name ?? current.name,
      // null limpia el campo opcional (comportamiento del backend)
      tax_id: data.tax_id === undefined ? current.tax_id : data.tax_id ?? undefined,
      email: data.email === undefined ? current.email : data.email ?? undefined,
      phone: data.phone === undefined ? current.phone : data.phone ?? undefined,
      updated_at: new Date().toISOString(),
    };
    return this.suppliers[index];
  }

  async setActive(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.suppliers.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Proveedor con id ${id} no encontrado`);

    this.suppliers[index] = { ...this.suppliers[index], is_active: true, updated_at: new Date().toISOString() };
    return this.suppliers[index];
  }

  async setInactive(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.suppliers.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Proveedor con id ${id} no encontrado`);

    this.suppliers[index] = { ...this.suppliers[index], is_active: false, updated_at: new Date().toISOString() };
    return this.suppliers[index];
  }
}
