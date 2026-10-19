import type { IPurchaseReceiptRepository, PurchaseReceiptQueryParams } from '@/domain/repositories';
import type { PurchaseReceipt, CreatePurchaseReceiptDTO } from '@/domain/models';
import { MOCK_COMPANY_ID, MOCK_WAREHOUSES } from '@/infrastructure/mocks/data';
import { ordersState, receiptsState } from './purchaseState';

/**
 * Mock de `purchases.purchase_receipt`. Replica las reglas del backend:
 * - Una orden se recibe una sola vez (RN-PUR-010).
 * - El almacén debe existir y estar activo (RN-PUR-008/013).
 * - Al recibir, la orden pasa a estado 'received' (RN-PUR-017).
 */
export class MockPurchaseReceiptRepository implements IPurchaseReceiptRepository {
  private delay(ms = 200) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async getAll(params?: PurchaseReceiptQueryParams) {
    let filtered = [...receiptsState];

    if (params?.orderId) filtered = filtered.filter((r) => r.order_id === params.orderId);
    if (params?.warehouseId) filtered = filtered.filter((r) => r.warehouse_id === params.warehouseId);
    if (params?.code) {
      filtered = filtered.filter((r) => r.code.toLowerCase() === params.code!.toLowerCase());
    }

    await this.delay();
    return { data: filtered, total: filtered.length };
  }

  async getById(id: string) {
    await this.delay(100);
    return receiptsState.find((r) => r.id === id) ?? null;
  }

  async create(data: CreatePurchaseReceiptDTO): Promise<PurchaseReceipt> {
    await this.delay();

    const order = ordersState.find((o) => o.id === data.order_id);
    if (!order) throw new Error('La orden de compra no existe.');

    // Una orden se recibe una sola vez (RN-PUR-010)
    if (order.status === 'received') {
      throw new Error('Esta orden ya fue recibida.');
    }

    const warehouse = MOCK_WAREHOUSES.find((w) => w.id === data.warehouse_id);
    if (!warehouse) throw new Error('El almacén indicado no existe.');
    if (!warehouse.is_active) throw new Error('No se puede recibir mercancía en un almacén inactivo.');

    const now = new Date().toISOString();
    const receiptId = `receipt-${Date.now()}`;
    const sequence = String(receiptsState.length + 1).padStart(4, '0');

    const receipt: PurchaseReceipt = {
      id: receiptId,
      company_id: MOCK_COMPANY_ID,
      order_id: order.id,
      warehouse_id: data.warehouse_id,
      code: `REC-${sequence}`,
      note: data.note,
      created_at: now,
      // La recepción arrastra las líneas de la orden
      details: order.details.map((detail) => ({ ...detail })),
    };

    receiptsState.push(receipt);

    // Estado derivado: la orden pasa a recibida
    order.status = 'received';
    order.receipt_id = receiptId;

    return receipt;
  }
}
