import type { Product } from '@/domain/models/product';
import type { ProductCode, ProductUnit } from '@/domain/models/product';
import type { Unit } from '@/domain/models/unit';
import type { Category } from '@/domain/models/category';
import type { Brand } from '@/domain/models/brand';
import type { Supplier } from '@/domain/models/supplier';
import type { Branch } from '@/domain/models/branch';
import type { Warehouse } from '@/domain/models/warehouse';
import type { Location } from '@/domain/models/location';
import type { User } from '@/domain/models/user';
import type { PurchaseOrder } from '@/domain/models/purchase-order';
import type { PurchaseReceipt } from '@/domain/models/purchase-receipt';

export const MOCK_COMPANY_ID = 'company-001';

export const MOCK_BRANCHES: Branch[] = [
  {
    id: 'branch-001',
    company_id: MOCK_COMPANY_ID,
    name: 'Sucursal Centro',
    address: 'Calle 50 #45-20, Medellín',
    phone: '604 512 3456',
    is_active: true,
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'branch-002',
    company_id: MOCK_COMPANY_ID,
    name: 'Sucursal Norte',
    address: 'Av. 34 #80-15, Medellín',
    phone: '604 523 4567',
    is_active: true,
    created_at: '2024-03-01T08:00:00Z',
    updated_at: '2024-06-10T10:00:00Z',
  },
  {
    id: 'branch-003',
    company_id: MOCK_COMPANY_ID,
    name: 'Sucursal Sur',
    address: 'Calle 10 #20-30, Medellín',
    phone: '604 534 5678',
    is_active: false,
    created_at: '2024-05-20T08:00:00Z',
    updated_at: '2024-07-01T10:00:00Z',
  },
];

export const MOCK_WAREHOUSES: Warehouse[] = [
  {
    id: 'warehouse-001',
    branch_id: 'branch-001',
    name: 'Almacén Principal',
    type: 'principal',
    is_active: true,
    created_at: '2024-01-20T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'warehouse-002',
    branch_id: 'branch-001',
    name: 'Almacén de Devoluciones',
    type: 'devoluciones',
    is_active: true,
    created_at: '2024-02-10T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'warehouse-003',
    branch_id: 'branch-002',
    name: 'Almacén Principal Norte',
    type: 'principal',
    is_active: true,
    created_at: '2024-03-05T08:00:00Z',
    updated_at: '2024-06-10T10:00:00Z',
  },
];

export const MOCK_LOCATIONS: Location[] = [
  {
    id: 'location-001',
    warehouse_id: 'warehouse-001',
    code: 'A1',
    name: 'Estante A1',
    type: 'almacenamiento',
    is_active: true,
    created_at: '2024-01-25T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'location-002',
    warehouse_id: 'warehouse-001',
    code: 'A2',
    name: 'Estante A2',
    type: 'almacenamiento',
    is_active: true,
    created_at: '2024-01-25T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'location-003',
    warehouse_id: 'warehouse-001',
    code: 'RECEP',
    name: 'Zona de Recepción',
    type: 'recepcion',
    is_active: true,
    created_at: '2024-01-25T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'location-004',
    warehouse_id: 'warehouse-003',
    code: 'B1',
    name: 'Estante B1',
    type: 'almacenamiento',
    is_active: true,
    created_at: '2024-03-10T08:00:00Z',
    updated_at: '2024-06-10T10:00:00Z',
  },
];

// 📏 Unidades de medida (catalog.unit)
export const MOCK_UNITS: Unit[] = [
  {
    id: 'unit-001',
    company_id: MOCK_COMPANY_ID,
    name: 'Unidad',
    abbreviation: 'un',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'unit-002',
    company_id: MOCK_COMPANY_ID,
    name: 'Caja',
    abbreviation: 'cja',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'unit-003',
    company_id: MOCK_COMPANY_ID,
    name: 'Kilogramo',
    abbreviation: 'kg',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'unit-004',
    company_id: MOCK_COMPANY_ID,
    name: 'Litro',
    abbreviation: 'lt',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
];

// 🗂️ Categorías (catalog.category)
export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'category-001',
    company_id: MOCK_COMPANY_ID,
    name: 'Lácteos',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'category-002',
    company_id: MOCK_COMPANY_ID,
    name: 'Panadería',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'category-003',
    company_id: MOCK_COMPANY_ID,
    name: 'Granos',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'category-004',
    company_id: MOCK_COMPANY_ID,
    name: 'Aseo',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'category-005',
    company_id: MOCK_COMPANY_ID,
    name: 'Bebidas',
    is_active: false,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
];

// 🏷️ Marcas (catalog.brand)
export const MOCK_BRANDS: Brand[] = [
  {
    id: 'brand-001',
    company_id: MOCK_COMPANY_ID,
    name: 'Colanta',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'brand-002',
    company_id: MOCK_COMPANY_ID,
    name: 'Bimbo',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'brand-003',
    company_id: MOCK_COMPANY_ID,
    name: 'Diana',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
];

function mockCode(
  id: string,
  productId: string,
  code: string,
  isPrimary = true,
): ProductCode {
  return {
    id,
    company_id: MOCK_COMPANY_ID,
    product_id: productId,
    code,
    type: 'sku',
    is_primary: isPrimary,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  };
}

function mockPresentation(
  id: string,
  productId: string,
  unitId: string,
  name: string,
  factor: number,
  isActive = true,
): ProductUnit {
  return {
    id,
    product_id: productId,
    unit_id: unitId,
    name,
    factor,
    is_active: isActive,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  };
}

// 📦 Productos (catalog.product) con sus códigos y presentaciones
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    company_id: MOCK_COMPANY_ID,
    category_id: 'category-001',
    brand_id: 'brand-001',
    base_unit_id: 'unit-004',
    name: 'Leche Entera Colanta 1L',
    description: 'Leche entera pasteurizada en bolsa',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    codes: [mockCode('pcode-001', 'prod-001', 'LEC-001')],
    units: [
      mockPresentation('punit-001', 'prod-001', 'unit-004', 'Litro', 1),
      mockPresentation('punit-002', 'prod-001', 'unit-002', 'Caja x 12', 12),
    ],
  },
  {
    id: 'prod-002',
    company_id: MOCK_COMPANY_ID,
    category_id: 'category-002',
    brand_id: 'brand-002',
    base_unit_id: 'unit-001',
    name: 'Pan de Molde Bimbo Grande',
    description: 'Pan blanco de molde 500g',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    codes: [mockCode('pcode-002', 'prod-002', 'PAN-001')],
    units: [mockPresentation('punit-003', 'prod-002', 'unit-001', 'Unidad', 1)],
  },
  {
    id: 'prod-003',
    company_id: MOCK_COMPANY_ID,
    category_id: 'category-003',
    brand_id: 'brand-003',
    base_unit_id: 'unit-003',
    name: 'Arroz Diana 1kg',
    description: 'Arroz blanco tradicional',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    codes: [mockCode('pcode-003', 'prod-003', 'ARR-001')],
    units: [
      mockPresentation('punit-004', 'prod-003', 'unit-003', 'Kilogramo', 1),
      mockPresentation('punit-005', 'prod-003', 'unit-002', 'Bulto x 50kg', 50),
    ],
  },
  {
    id: 'prod-004',
    company_id: MOCK_COMPANY_ID,
    category_id: 'category-003',
    base_unit_id: 'unit-004',
    name: 'Aceite Premier 1L',
    description: 'Aceite vegetal',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    codes: [mockCode('pcode-004', 'prod-004', 'ACE-001')],
    units: [mockPresentation('punit-006', 'prod-004', 'unit-004', 'Litro', 1)],
  },
  {
    id: 'prod-005',
    company_id: MOCK_COMPANY_ID,
    category_id: 'category-004',
    base_unit_id: 'unit-001',
    name: 'Jabón Rey Azul',
    description: 'Jabón de lavar ropa en barra',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    codes: [mockCode('pcode-005', 'prod-005', 'JAB-001')],
    units: [mockPresentation('punit-007', 'prod-005', 'unit-001', 'Unidad', 1)],
  },
  {
    id: 'prod-006',
    company_id: MOCK_COMPANY_ID,
    // Sin categoría ni marca (ambos son opcionales) y producto inactivo
    base_unit_id: 'unit-001',
    name: 'Gaseosa Colombiana 2L',
    description: 'Gaseosa sabor colombiana',
    is_active: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    codes: [mockCode('pcode-006', 'prod-006', 'GAS-001')],
    units: [mockPresentation('punit-008', 'prod-006', 'unit-001', 'Unidad', 1)],
  },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-001',
    company_id: MOCK_COMPANY_ID,
    name: 'Distribuidora de Alimentos S.A.S.',
    tax_id: 'NIT-900123456-1',
    email: 'ventas@distalimentos.com',
    phone: '604 311 2233',
    is_active: true,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
  },
  {
    id: 'supp-002',
    company_id: MOCK_COMPANY_ID,
    name: 'Lácteos del Valle Ltda.',
    tax_id: 'NIT-800456789-2',
    email: 'ventas@lacteosvalle.com',
    phone: '602 422 3344',
    is_active: true,
    created_at: '2024-02-05T00:00:00Z',
    updated_at: '2024-06-10T00:00:00Z',
  },
  {
    id: 'supp-003',
    company_id: MOCK_COMPANY_ID,
    name: 'Aseo Total S.A.',
    email: 'contacto@aseototal.com',
    phone: '604 533 4455',
    is_active: false,
    created_at: '2024-03-15T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
];

export const MOCK_USERS: User[] = [
  {
    id: 'user-001',
    company_id: MOCK_COMPANY_ID,
    email: 'admin@agabo.com',
    name: 'Juan Admin',
    role: 'super_admin',
    branch_id: undefined,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    profiles: [
      {
        profile_uuid: 'profile-sistema',
        profile_name_text: 'Perfil de sistema',
        profile_is_system_bl: true,
      },
    ],
    branches: [],
  },
  {
    id: 'user-002',
    company_id: MOCK_COMPANY_ID,
    email: 'encargado@agabo.com',
    name: 'Carlos Sede Centro',
    role: 'branch_admin',
    branch_id: 'branch-001',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    profiles: [
      {
        profile_uuid: 'profile-encargado',
        profile_name_text: 'Encargado de sede',
        profile_is_system_bl: false,
      },
    ],
    branches: ['branch-001'],
  },
  {
    id: 'user-003',
    company_id: MOCK_COMPANY_ID,
    email: 'visor@agabo.com',
    name: 'María Visora',
    role: 'viewer',
    branch_id: 'branch-002',
    is_active: true,
    created_at: '2024-02-01T00:00:00Z',
    profiles: [
      {
        profile_uuid: 'profile-visor',
        profile_name_text: 'Visualizador',
        profile_is_system_bl: false,
      },
    ],
    branches: ['branch-002'],
  },
];

// 🧾 Órdenes de compra (purchases.purchase_order)
// La orden 002 ya está recibida: tiene recepción y estado 'received'.
export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'order-001',
    company_id: MOCK_COMPANY_ID,
    supplier_id: 'supp-001',
    branch_id: 'branch-001',
    code: 'OC-0001',
    total: 33600,
    note: 'Reposición de inventario.',
    status: 'pending',
    created_at: '2024-07-01T09:00:00Z',
    details: [
      {
        id: 'detail-001',
        order_id: 'order-001',
        product_id: 'prod-001',
        product_unit_id: 'punit-002',
        quantity: 10,
        unit_price: 2800,
        line_total: 28000,
        created_at: '2024-07-01T09:00:00Z',
      },
      {
        id: 'detail-002',
        order_id: 'order-001',
        product_id: 'prod-005',
        product_unit_id: 'punit-007',
        quantity: 20,
        unit_price: 280,
        line_total: 5600,
        created_at: '2024-07-01T09:00:00Z',
      },
    ],
  },
  {
    id: 'order-002',
    company_id: MOCK_COMPANY_ID,
    supplier_id: 'supp-002',
    branch_id: 'branch-002',
    code: 'OC-0002',
    total: 9000,
    status: 'received',
    receipt_id: 'receipt-001',
    created_at: '2024-06-15T10:30:00Z',
    details: [
      {
        id: 'detail-003',
        order_id: 'order-002',
        product_id: 'prod-003',
        product_unit_id: 'punit-004',
        quantity: 10,
        unit_price: 900,
        line_total: 9000,
        created_at: '2024-06-15T10:30:00Z',
      },
    ],
  },
];

// 📥 Recepciones de compra (purchases.purchase_receipt)
export const MOCK_PURCHASE_RECEIPTS: PurchaseReceipt[] = [
  {
    id: 'receipt-001',
    company_id: MOCK_COMPANY_ID,
    order_id: 'order-002',
    warehouse_id: 'warehouse-003',
    location_id: 'location-004',
    code: 'REC-0001',
    note: 'Mercancía en buen estado.',
    created_at: '2024-06-16T08:15:00Z',
    details: [
      {
        id: 'detail-003',
        order_id: 'order-002',
        product_id: 'prod-003',
        product_unit_id: 'punit-004',
        quantity: 10,
        unit_price: 900,
        line_total: 9000,
        created_at: '2024-06-15T10:30:00Z',
      },
    ],
  },
];
