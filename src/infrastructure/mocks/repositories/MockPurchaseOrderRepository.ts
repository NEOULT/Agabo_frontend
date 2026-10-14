import type {
  IPurchaseOrderRepository,
  PurchaseOrderQueryParams,
  PurchaseOrderDetailQueryParams,
} from '@/domain/repositories';
import type { PurchaseOrder, PurchaseOrderDetail, CreatePurchaseOrderDTO } from '@/domain/models';
import { MOCK_COMPANY_ID } from '@/infrastructure/mocks/data';
import { ordersState } from './purchaseState';

/**
 * Mock de `purchases.purchase_order`. Replica las reglas del backend:
 * - Código de orden generado y único por empresa.
 * - Total e importes de línea calculados por el "backend".
 * - órdenes inmutables y con estado derivado de la recepción.
 */
export class MockPurchaseOrderRepository implements IPurchaseOrderRepository {
  private delay(ms = 200) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async getAll(params?: PurchaseOrderQueryParams) {
    let filtered = [...ordersState];

    if (params?.supplierId) filtered = filtered.filter((o) => o.supplier_id === params.supplierId);
    if (params?.branchId) filtered = filtered.filter((o) => o.branch_id === params.branchId);
    if (params?.code) {
      filtered = filtered.filter((o) => o.code.toLowerCase() === params.code!.toLowerCase());
    }
    if (params?.status) filtered = filtered.filter((o) => o.status === params.status);
    if (params?.productId) {
      filtered = filtered.filter((o) =>
        o.details.some((d) => d.product_id === params.productId),
      );
    }

    await this.delay();
    return { data: filtered, total: filtered.length };
  }

  async getById(id: string) {
    await this.delay(100);
    return ordersState.find((o) => o.id === id) ?? null;
  }

  async create(data: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
    await this.delay();

    if (data.details.length === 0) {
      throw new Error('La orden debe tener al menos una línea.');
    }

    const now = new Date().toISOString();
    const orderId = `order-${Date.now()}`;
    const sequence = String(ordersState.length + 1).padStart(4, '0');

    const details: PurchaseOrderDetail[] = data.details.map((line, index) => ({
      id: `detail-${Date.now()}-${index}`,
      order_id: orderId,
      product_id: line.product_id,
      product_unit_id: line.product_unit_id,
      quantity: line.quantity,
      unit_price: line.unit_price,
      // El backend calcula el importe de línea (RN-PUR-006)
      line_total: line.quantity * line.unit_price,
      created_at: now,
    }));

    const order: PurchaseOrder = {
      id: orderId,
      company_id: MOCK_COMPANY_ID,
      supplier_id: data.supplier_id,
      branch_id: data.branch_id,
      code: `OC-${sequence}`,
      total: details.reduce((sum, line) => sum + line.line_total, 0),
      note: data.note,
      status: 'pending',
      details,
      created_at: now,
    };

    ordersState.push(order);
    return order;
  }

  async getDetails(
    params?: PurchaseOrderDetailQueryParams,
  ): Promise<{ data: PurchaseOrderDetail[]; total: number }> {
    await this.delay(150);

    let details = ordersState.flatMap((order) => order.details);
    if (params?.orderId) details = details.filter((d) => d.order_id === params.orderId);
    if (params?.productId) details = details.filter((d) => d.product_id === params.productId);
    if (params?.productUnitId) {
      details = details.filter((d) => d.product_unit_id === params.productUnitId);
    }

    return { data: details, total: details.length };
  }
}
