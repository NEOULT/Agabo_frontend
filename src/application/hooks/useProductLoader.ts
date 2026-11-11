import { useCallback } from 'react';
import type { Product } from '@/domain/models';
import { useProducts } from './useProducts';
import { useStock } from './useStock';
import { usePriceProducts } from './usePriceProducts';
import {
  buildProductName,
  buildPurchaseDescription,
  type ProductNameParts,
  type PurchaseDescriptionParts,
} from '@/shared/utils/productLoad';

/** Datos de una carga de producto: catálogo + compra + inventario. */
export interface ProductLoadInput extends ProductNameParts, PurchaseDescriptionParts {
  base_unit_id: string;
  brand_id?: string;
  category_id?: string;
  /** SKU generado (marca + serial) o el que haya escrito la persona. */
  sku: string;
  /** Código de barras, opcional. */
  barcode?: string;
  /** Almacén y ubicación donde queda la existencia inicial. */
  warehouse_id?: string;
  location_id?: string;
  /** Existencia inicial (0 = no se registra stock). */
  stock: number;
  /** Lista de precios donde se guarda el precio unitario. */
  price_list_id?: string;
}

export interface ProductLoadResult {
  product: Product;
  /** Partes que fallaron después de crear el producto (códigos, stock, precio). */
  warnings: string[];
}

/**
 * Alta completa de un producto.
 *
 * El backend reparte la información en varias entidades, así que la carga se
 * hace en orden: producto → códigos (SKU y barras) → existencia → precio. Si
 * algo posterior falla, el producto ya creado se conserva y se devuelve el
 * aviso para no perder el trabajo ni ocultar el error.
 */
export function useProductLoader() {
  const { createProduct, createCode } = useProducts();
  const { createStock } = useStock();
  const { createPriceProduct } = usePriceProducts();

  const loadProduct = useCallback(
    async (input: ProductLoadInput): Promise<ProductLoadResult> => {
      const warnings: string[] = [];

      const product = await createProduct({
        name: buildProductName(input),
        base_unit_id: input.base_unit_id,
        brand_id: input.brand_id,
        category_id: input.category_id,
        description: buildPurchaseDescription(input),
      });

      try {
        await createCode({
          product_id: product.id,
          code: input.sku.trim(),
          type: 'sku',
          is_primary: true,
        });
      } catch (error) {
        warnings.push(
          `No se pudo guardar el SKU: ${
            error instanceof Error ? error.message : 'error desconocido'
          }.`,
        );
      }

      if (input.barcode?.trim()) {
        try {
          await createCode({
            product_id: product.id,
            code: input.barcode.trim(),
            type: 'barcode',
            is_primary: false,
          });
        } catch (error) {
          warnings.push(
            `No se pudo guardar el código de barras: ${
              error instanceof Error ? error.message : 'error desconocido'
            }.`,
          );
        }
      }

      if (input.stock > 0) {
        if (!input.warehouse_id) {
          warnings.push('No se registró el stock: falta el almacén.');
        } else {
          try {
            await createStock({
              product_id: product.id,
              warehouse_id: input.warehouse_id,
              location_id: input.location_id || null,
              quantity: input.stock,
            });
          } catch (error) {
            warnings.push(
              `No se pudo registrar el stock: ${
                error instanceof Error ? error.message : 'error desconocido'
              }.`,
            );
          }
        }
      }

      if (input.unitPrice !== undefined && input.unitPrice > 0) {
        if (!input.price_list_id) {
          warnings.push('No se registró el precio: falta la lista de precios.');
        } else {
          try {
            await createPriceProduct({
              price_list_id: input.price_list_id,
              product_id: product.id,
              price: input.unitPrice,
            });
          } catch (error) {
            warnings.push(
              `No se pudo registrar el precio: ${
                error instanceof Error ? error.message : 'error desconocido'
              }.`,
            );
          }
        }
      }

      return { product, warnings };
    },
    [createCode, createPriceProduct, createProduct, createStock],
  );

  return { loadProduct };
}
