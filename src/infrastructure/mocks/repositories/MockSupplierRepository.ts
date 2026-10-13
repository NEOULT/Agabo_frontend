import type { ISupplierRepository } from '@/domain/repositories';
import type {
  Supplier,
  CreateSupplierDTO,
  UpdateSupplierDTO,
  SupplierProduct,
  PurchaseOrder,
  CreatePurchaseOrderDTO,
} from '@/domain/models';
import { MOCK_SUPPLIERS } from '@/infrastructure/mocks/data';

export class MockSupplierRepository implements ISupplierRepository {
  private suppliers: Supplier[] = [...MOCK_SUPPLIERS.map((s) => ({
    ...s,
    contact_name: s.contact_name || '',
    email: s.email || '',
    phone: s.phone || '',
    is_active: s.is_active ?? true,
  }))];

  private purchaseOrders: PurchaseOrder[] = [];

  async getAll(params?: { page?: number; limit?: number; search?: string }) {
    let filtered = [...this.suppliers];

    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.business_name.toLowerCase().includes(search) ||
          s.contact_name.toLowerCase().includes(search),
      );
    }

    const total = filtered.length;
    if (params?.page && params?.limit) {
      const start = (params.page - 1) * params.limit;
      filtered = filtered.slice(start, start + params.limit);
    }

    await new Promise((r) => setTimeout(r, 200));
    return { data: filtered, total };
  }

  async getById(id: string) {
    await new Promise((r) => setTimeout(r, 100));
    return this.suppliers.find((s) => s.id === id) ?? null;
  }

  async getProducts(_supplierId: string) {
    await new Promise((r) => setTimeout(r, 150));
    return [] as SupplierProduct[];
  }

  async create(data: CreateSupplierDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const newSupplier: Supplier = {
      id: `supp-${Date.now()}`,
      ...data,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.suppliers.push(newSupplier);
    return newSupplier;
  }

  async update(id: string, data: UpdateSupplierDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const index = this.suppliers.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Proveedor con id ${id} no encontrado`);
    this.suppliers[index] = { ...this.suppliers[index], ...data, updated_at: new Date().toISOString() };
    return this.suppliers[index];
  }

  async delete(id: string) {
    await new Promise((r) => setTimeout(r, 200));
    this.suppliers = this.suppliers.filter((s) => s.id !== id);
  }

  async getPurchaseOrders() {
    return this.purchaseOrders;
  }

  async createPurchaseOrder(data: CreatePurchaseOrderDTO) {
    await new Promise((r) => setTimeout(r, 200));
    const order: PurchaseOrder = {
      id: `po-${Date.now()}`,
      ...data,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.purchaseOrders.push(order);
    return order;
  }

  async updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']) {
    await new Promise((r) => setTimeout(r, 150));
    const order = this.purchaseOrders.find((o) => o.id === id);
    if (!order) throw new Error(`Orden de compra ${id} no encontrada`);
    order.status = status;
    order.updated_at = new Date().toISOString();
    return order;
  }
}
