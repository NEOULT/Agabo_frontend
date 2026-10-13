import type {
  Supplier,
  CreateSupplierDTO,
  UpdateSupplierDTO,
  SupplierProduct,
  PurchaseOrder,
  CreatePurchaseOrderDTO,
} from '@/domain/models';
import type { PaginationParams, SearchParams } from '@/shared/types/common';

export interface ISupplierRepository {
  getAll(params?: PaginationParams & SearchParams): Promise<{ data: Supplier[]; total: number }>;
  getById(id: string): Promise<Supplier | null>;
  getProducts(supplierId: string): Promise<SupplierProduct[]>;
  create(data: CreateSupplierDTO): Promise<Supplier>;
  update(id: string, data: UpdateSupplierDTO): Promise<Supplier>;
  delete(id: string): Promise<void>;

  // Purchase orders
  getPurchaseOrders(params?: { supplierId?: string; branchId?: string }): Promise<PurchaseOrder[]>;
  createPurchaseOrder(data: CreatePurchaseOrderDTO): Promise<PurchaseOrder>;
  updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']): Promise<PurchaseOrder>;
}
