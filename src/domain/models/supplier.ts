export interface Supplier {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierDTO {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
}

export type UpdateSupplierDTO = Partial<CreateSupplierDTO>;

export interface SupplierProduct {
  supplier_id: string;
  product_id: string;
  price: number;
  lead_time_days?: number;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  branch_id: string;
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
}

export interface CreatePurchaseOrderDTO {
  supplier_id: string;
  branch_id: string;
  items: Omit<PurchaseOrderItem, 'product_name'>[];
  notes?: string;
}
