import type { Product } from '@/domain/models/product';
import type { Supplier } from '@/domain/models/supplier';
import type { Branch } from '@/domain/models/branch';
import type { Warehouse } from '@/domain/models/warehouse';
import type { Location } from '@/domain/models/location';
import type { User } from '@/domain/models/user';
import type { Movement } from '@/domain/models/movement';
import type { CategoryAttributesConfig } from '@/domain/models/attribute';

export const MOCK_COMPANY_ID = 'company-001';

export const MOCK_BRANCHES: Branch[] = [
  {
    id: 'branch-001',
    company_id: MOCK_COMPANY_ID,
    code: 'CENTRO',
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
    code: 'NORTE',
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
    code: 'SUR',
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
    code: 'PRINCIPAL',
    name: 'Almacén Principal',
    type: 'principal',
    is_active: true,
    created_at: '2024-01-20T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'warehouse-002',
    branch_id: 'branch-001',
    code: 'DEVOLUCIONES',
    name: 'Almacén de Devoluciones',
    type: 'devoluciones',
    is_active: true,
    created_at: '2024-02-10T08:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'warehouse-003',
    branch_id: 'branch-002',
    code: 'PRINCIPAL',
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

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'LEC-001',
    name: 'Leche Entera Colanta 1L',
    description: 'Leche entera pasteurizada en bolsa',
    category: 'Lácteos',
    purchase_price: 2800,
    sale_price: 3600,
    min_stock: 50,
    unit: 'unidad',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    attributes: { lote: 'L-2024-06', vencimiento: '2024-08-15', origen: 'Antioquia' },
  },
  {
    id: 'prod-002',
    sku: 'PAN-001',
    name: 'Pan Bimbo Grande',
    description: 'Pan de molde blanco 500g',
    category: 'Panadería',
    purchase_price: 4500,
    sale_price: 5800,
    min_stock: 20,
    unit: 'unidad',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    attributes: { peso_neto: '500g', conservacion: 'Lugar fresco' },
  },
  {
    id: 'prod-003',
    sku: 'ARR-001',
    name: 'Arroz Diana 1kg',
    description: 'Arroz blanco tradicional',
    category: 'Granos',
    purchase_price: 3200,
    sale_price: 4200,
    min_stock: 100,
    unit: 'kilogramo',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    attributes: { empaque: 'Bolsa', origen: 'Tolima', lote: 'ARR-2024-01' },
  },
  {
    id: 'prod-004',
    sku: 'ACE-001',
    name: 'Aceite Premier 1L',
    description: 'Aceite vegetal',
    category: 'Granos',
    purchase_price: 6800,
    sale_price: 8500,
    min_stock: 30,
    unit: 'litro',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    attributes: { marca: 'Premier', volumen: '1L', envase: 'Plástico' },
  },
  {
    id: 'prod-005',
    sku: 'JAB-001',
    name: 'Jabón Rey Azul',
    description: 'Jabón de lavar ropa',
    category: 'Aseo',
    purchase_price: 1200,
    sale_price: 1800,
    min_stock: 80,
    unit: 'unidad',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    attributes: { fragancia: 'Original', peso: '250g', tipo: 'Barra' },
  },
  {
    id: 'prod-006',
    sku: 'GAS-001',
    name: 'Gaseosa Colombiana 2L',
    description: 'Gaseosa sabor colombiana',
    category: 'Bebidas',
    purchase_price: 3200,
    sale_price: 4500,
    min_stock: 40,
    unit: 'unidad',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    attributes: { sabor: 'Colombiana', volumen: '2L', retornable: true },
  },
  // 👕 Nuevo producto en categoría Ropa — atributos totalmente distintos
  {
    id: 'prod-007',
    sku: 'CAM-001',
    name: 'Camiseta Cuello Redondo Algodón',
    description: 'Camiseta básica 100% algodón, manga corta, costuras reforzadas',
    category: 'Ropa',
    purchase_price: 18500,
    sale_price: 34900,
    min_stock: 15,
    unit: 'unidad',
    is_active: true,
    created_at: '2024-11-01T00:00:00Z',
    updated_at: '2024-11-20T00:00:00Z',
    attributes: {
      talla: 'M',
      color: 'Negro',
      material: 'Algodón 100%',
      temporada: 'Primavera/Verano',
      genero: 'Unisex',
      lavado: '30°C max',
    },
  },
];

// 🏷️ Configuración de atributos dinámicos por categoría
export const MOCK_CATEGORY_ATTRIBUTES: CategoryAttributesConfig[] = [
  {
    category: 'Lácteos',
    attributes: [
      { key: 'lote', label: 'Lote', type: 'text', required: true, order: 1 },
      { key: 'vencimiento', label: 'Fecha de Vencimiento', type: 'date', required: true, order: 2 },
      { key: 'origen', label: 'Origen', type: 'text', order: 3 },
      { key: 'tipo_leche', label: 'Tipo de Leche', type: 'select', options: ['Entera', 'Deslactosada', 'Descremada', 'Semidescremada'], order: 4 },
    ],
  },
  {
    category: 'Panadería',
    attributes: [
      { key: 'peso_neto', label: 'Peso Neto', type: 'text', order: 1 },
      { key: 'conservacion', label: 'Conservación', type: 'text', order: 2 },
      { key: 'libre_gluten', label: 'Libre de Gluten', type: 'boolean', order: 3 },
    ],
  },
  {
    category: 'Bebidas',
    attributes: [
      { key: 'sabor', label: 'Sabor', type: 'text', required: true, order: 1 },
      { key: 'volumen', label: 'Volumen', type: 'text', order: 2 },
      { key: 'retornable', label: 'Retornable', type: 'boolean', order: 3 },
      { key: 'carbohidratos', label: 'Carbohidratos (g)', type: 'number', order: 4 },
    ],
  },
  {
    category: 'Aseo',
    attributes: [
      { key: 'fragancia', label: 'Fragancia', type: 'text', order: 1 },
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['Barra', 'Líquido', 'Polvo', 'Crema'], order: 2 },
      { key: 'peso', label: 'Peso', type: 'text', order: 3 },
      { key: 'biodegradable', label: 'Biodegradable', type: 'boolean', order: 4 },
    ],
  },
  {
    category: 'Granos',
    attributes: [
      { key: 'empaque', label: 'Tipo de Empaque', type: 'select', options: ['Bolsa', 'Caja', 'Granel'], order: 1 },
      { key: 'origen', label: 'Origen', type: 'text', order: 2 },
      { key: 'lote', label: 'Lote', type: 'text', order: 3 },
    ],
  },
  {
    category: 'Ropa',
    attributes: [
      { key: 'talla', label: 'Talla', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], required: true, order: 1 },
      { key: 'color', label: 'Color', type: 'text', required: true, order: 2 },
      { key: 'material', label: 'Material', type: 'text', order: 3 },
      { key: 'genero', label: 'Género', type: 'select', options: ['Masculino', 'Femenino', 'Unisex', 'Infantil'], order: 4 },
      { key: 'temporada', label: 'Temporada', type: 'text', order: 5 },
      { key: 'lavado', label: 'Instrucciones de Lavado', type: 'text', order: 6 },
    ],
  },
];

export const MOCK_STOCK: Record<string, Record<string, number>> = {
  'prod-001': { 'branch-001': 120, 'branch-002': 80, 'branch-003': 0 },
  'prod-002': { 'branch-001': 35, 'branch-002': 15, 'branch-003': 0 },
  'prod-003': { 'branch-001': 200, 'branch-002': 150, 'branch-003': 0 },
  'prod-004': { 'branch-001': 25, 'branch-002': 40, 'branch-003': 0 },
  'prod-005': { 'branch-001': 150, 'branch-002': 90, 'branch-003': 0 },
  'prod-006': { 'branch-001': 60, 'branch-002': 45, 'branch-003': 0 },
};

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-001',
    company_id: MOCK_COMPANY_ID,
    code: 'PRV-0001',
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
    code: 'PRV-0002',
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
    code: 'PRV-0003',
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
        profile_code_text: 'SISTEMA',
        profile_name_text: 'Perfil de sistema',
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
        profile_code_text: 'ENCARGADO',
        profile_name_text: 'Encargado de sede',
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
        profile_code_text: 'VISOR',
        profile_name_text: 'Visualizador',
      },
    ],
    branches: ['branch-002'],
  },
];

export const MOCK_MOVEMENTS: Movement[] = [];
