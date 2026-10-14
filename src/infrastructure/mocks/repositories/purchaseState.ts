import type { PurchaseOrder } from '@/domain/models/purchase-order';
import type { PurchaseReceipt } from '@/domain/models/purchase-receipt';
import { MOCK_PURCHASE_ORDERS, MOCK_PURCHASE_RECEIPTS } from '@/infrastructure/mocks/data';

/**
 * Estado mutable compartido por los mocks de compras.
 *
 * En el backend real, registrar una recepción cambia el estado derivado de la
 * orden (RN-PUR-017). Como los mocks de órdenes y recepciones son clases
 * separadas, comparten estas referencias para reproducir ese efecto: al
 * recibir una orden, su estado pasa a 'received' y aparece en su `receipt_id`.
 */
export const ordersState: PurchaseOrder[] = MOCK_PURCHASE_ORDERS.map((order) => ({
  ...order,
  details: order.details.map((detail) => ({ ...detail })),
}));

export const receiptsState: PurchaseReceipt[] = MOCK_PURCHASE_RECEIPTS.map((receipt) => ({
  ...receipt,
  details: receipt.details.map((detail) => ({ ...detail })),
}));
