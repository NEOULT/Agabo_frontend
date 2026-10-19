import type {
  IStockRepository,
  StockOverviewParams,
  StockQueryParams,
} from '@/domain/repositories';
import type { Stock, StockOverview, CreateStockDTO, UpdateStockDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toStock,
  toStockOverviewItem,
  toStockProductOption,
  toStockWarehouseOption,
  type ApiStock,
  type ApiStockListResponse,
  type ApiStockOverviewResponse,
} from './stock.mapper';

/**
 * Implementación REST de `inventory.stock` contra el backend Express
 * (ver `docs/schema-inventory/api-contract-stock.md` §2).
 *
 * Solo puede existir una existencia por producto y almacén (RN-INV-003).
 * No hay `delete`: se desactiva, y el backend lo rechaza si queda cantidad
 * mayor que cero.
 */
export class ApiStockRepository implements IStockRepository {
  async getAll(params?: StockQueryParams): Promise<{ data: Stock[]; total: number }> {
    try {
      const query: Record<string, string> = {};
      if (params?.productId) query.product_uuid = params.productId;
      if (params?.warehouseId) query.warehouse_uuid = params.warehouseId;
      if (params?.isActive !== undefined) query.stock_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiStockListResponse>('/stocks', { params: query });

      return { data: data.items.map(toStock), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getOverview(params?: StockOverviewParams): Promise<StockOverview> {
    try {
      const query: Record<string, string> = {};
      if (params?.productId) query.product_uuid = params.productId;
      if (params?.warehouseId) query.warehouse_uuid = params.warehouseId;
      if (params?.branchId) query.branch_uuid = params.branchId;
      if (params?.isActive !== undefined) query.stock_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiStockOverviewResponse>('/stocks/overview', {
        params: query,
      });

      return {
        items: data.items.map(toStockOverviewItem),
        products: data.products.map(toStockProductOption),
        warehouses: data.warehouses.map(toStockWarehouseOption),
      };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Stock | null> {
    try {
      const { data } = await api.get<ApiStockListResponse>('/stocks', {
        params: { stock_uuid: id },
      });
      const item = data.items[0];
      return item ? toStock(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateStockDTO): Promise<Stock> {
    try {
      const { data: created } = await api.post<ApiStock>('/stocks', {
        product_uuid: data.product_id,
        warehouse_uuid: data.warehouse_id,
        stock_quantity_num: data.quantity,
      });
      return toStock(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateStockDTO): Promise<Stock> {
    try {
      // product_uuid y warehouse_uuid no son editables (RF-INV-011).
      const payload: Record<string, number | string | null> = {};
      if (data.quantity !== undefined) payload.stock_quantity_num = data.quantity;

      const { data: updated } = await api.patch<ApiStock>(`/stocks/${id}`, payload);
      return toStock(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<Stock> {
    try {
      const { data } = await api.post<ApiStock>(`/stocks/${id}/activate`);
      return toStock(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<Stock> {
    try {
      const { data } = await api.post<ApiStock>(`/stocks/${id}/deactivate`);
      return toStock(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
