/**
 * 📦 Producto — modelo base con atributos dinámicos
 *
 * Los campos fijos cubren lo común a cualquier producto.
 * Los `attributes` permiten que cada comercio agregue
 * sus propios campos sin modificar el código.
 *
 * Ejemplo:
 *   Ropa:     attributes = { talla: 'M', color: 'Rojo', material: 'Algodón' }
 *   Alimento: attributes = { lote: 'L-2024-001', vencimiento: '2024-12-31', peso_neto: '500g' }
 *   Electrónica: attributes = { marca: 'Samsung', modelo: 'Galaxy A54', garantia_meses: 12 }
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  purchase_price: number;
  sale_price: number;
  min_stock: number;
  unit: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // 🎯 Atributos dinámicos por comercio
  attributes: Record<string, string | number | boolean | null>;
}

export interface CreateProductDTO {
  sku: string;
  name: string;
  description?: string;
  category: string;
  purchase_price: number;
  sale_price: number;
  min_stock: number;
  unit: string;
  image_url?: string;
  attributes?: Record<string, string | number | boolean | null>;
}

export type UpdateProductDTO = Partial<CreateProductDTO>;

export interface ProductStock {
  product_id: string;
  branch_id: string;
  quantity: number;
  branch_name?: string;
}
