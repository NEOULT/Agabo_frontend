import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Product, Sale, PurchaseOrder, Stock } from '@/domain/models';
import {
  buildDailySeries,
  countByKey,
  mean,
  sum,
  sumByKey,
  toRankedList,
  type RankedItem,
  type SeriesPoint,
} from '@/shared/utils/metrics';

/** Rango ISO (límites) sobre el que se calculan las métricas. */
export interface MetricsRange {
  from: string;
  to: string;
}

/** Resumen del período para las ventas. */
export interface SalesMetrics {
  total: number;
  count: number;
  averageTicket: number;
  collected: number;
  pending: number;
  pendingCount: number;
}

export interface PurchaseMetrics {
  total: number;
  count: number;
  openCount: number;
  openAmount: number;
}

export interface InventoryMetrics {
  units: number;
  activeProducts: number;
  outOfStock: number;
  /** Productos con existencia, ordenados de menor a mayor. */
  lowStock: RankedItem[];
}

/**
 * Métricas del negocio para un período.
 *
 * Agrega del lado del cliente sobre los repositorios ya existentes (ventas,
 * compras, existencias y productos), sin un módulo de reportes en el backend:
 * para el volumen de un abasto es suficiente y evita duplicar la lógica de
 * negocio. Los cálculos puros viven en `shared/utils/metrics`.
 */
export function useMetrics(range: MetricsRange) {
  const {
    sales: saleRepo,
    purchaseOrders: orderRepo,
    stocks: stockRepo,
    products: productRepo,
  } = useRepositories();

  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [salesResult, ordersResult, stocksResult, productsResult] = await Promise.all([
        saleRepo.getAll({ fromDate: range.from, toDate: range.to }),
        orderRepo.getAll({ fromDate: range.from, toDate: range.to }),
        stockRepo.getAll({ isActive: true }),
        productRepo.getAll({ isActive: true }),
      ]);

      setSales(salesResult.data);
      setOrders(ordersResult.data);
      setStocks(stocksResult.data);
      setProducts(productsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las métricas');
    } finally {
      setIsLoading(false);
    }
  }, [saleRepo, orderRepo, stockRepo, productRepo, range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const productName = useMemo(() => {
    const map = new Map(products.map((product) => [product.id, product.name]));
    return (id: string) => map.get(id) ?? 'Producto sin nombre';
  }, [products]);

  const salesMetrics: SalesMetrics = useMemo(() => {
    const totals = sales.map((sale) => sale.total);
    return {
      total: sum(totals),
      count: sales.length,
      averageTicket: mean(totals),
      collected: sum(sales.map((sale) => sale.paid_amount)),
      pending: sum(sales.map((sale) => sale.balance)),
      pendingCount: sales.filter((sale) => sale.payment_status !== 'paid').length,
    };
  }, [sales]);

  const purchaseMetrics: PurchaseMetrics = useMemo(() => {
    const open = orders.filter((order) => order.status === 'pending');
    return {
      total: sum(orders.map((order) => order.total)),
      count: orders.length,
      openCount: open.length,
      openAmount: sum(open.map((order) => order.total)),
    };
  }, [orders]);

  const inventoryMetrics: InventoryMetrics = useMemo(() => {
    const quantityByProduct = sumByKey(
      stocks,
      (stock) => stock.product_id,
      (stock) => stock.quantity,
    );

    const withStock = products
      .map((product) => ({
        label: product.name,
        value: quantityByProduct.get(product.id) ?? 0,
      }))
      .sort((a, b) => a.value - b.value);

    return {
      units: sum(stocks.map((stock) => stock.quantity)),
      activeProducts: products.length,
      outOfStock: withStock.filter((item) => item.value <= 0).length,
      lowStock: withStock.filter((item) => item.value > 0).slice(0, 8),
    };
  }, [stocks, products]);

  const dailySales: SeriesPoint[] = useMemo(
    () =>
      buildDailySeries(
        sales,
        (sale) => sale.created_at,
        (sale) => sale.total,
        range.from,
        range.to,
      ),
    [sales, range.from, range.to],
  );

  const salesDetails = useMemo(() => sales.flatMap((sale) => sale.details), [sales]);

  const topProducts: RankedItem[] = useMemo(() => {
    const revenue = sumByKey(
      salesDetails,
      (detail) => detail.product_id,
      (detail) => detail.line_total,
    );
    const quantity = sumByKey(
      salesDetails,
      (detail) => detail.product_id,
      (detail) => detail.quantity,
    );

    return toRankedList(revenue, productName, {
      limit: 5,
      secondaryOf: (id) => `${quantity.get(id) ?? 0} u`,
    });
  }, [salesDetails, productName]);

  const paymentStatus: RankedItem[] = useMemo(() => {
    return [
      { label: 'Pagadas', value: 'paid' as const },
      { label: 'Parciales', value: 'partial' as const },
      { label: 'Pendientes', value: 'pending' as const },
    ].map(({ label, value }) => {
      const group = sales.filter((sale) => sale.payment_status === value);
      return { label, value: sum(group.map((sale) => sale.total)), secondary: `${group.length}` };
    });
  }, [sales]);

  const purchasesByStatus: RankedItem[] = useMemo(() => {
    const counts = countByKey(orders, (order) => order.status);
    return [
      {
        label: 'Recibidas',
        value: sum(orders.filter((o) => o.status === 'received').map((o) => o.total)),
        secondary: `${counts.get('received') ?? 0}`,
      },
      {
        label: 'Pendientes',
        value: sum(orders.filter((o) => o.status === 'pending').map((o) => o.total)),
        secondary: `${counts.get('pending') ?? 0}`,
      },
    ];
  }, [orders]);

  return {
    isLoading,
    error,
    refetch: load,
    salesMetrics,
    purchaseMetrics,
    inventoryMetrics,
    dailySales,
    topProducts,
    paymentStatus,
    purchasesByStatus,
  };
}
