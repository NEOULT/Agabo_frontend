import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePayments } from '@/application/hooks/usePayments';
import { useSales } from '@/application/hooks/useSales';
import { useStock } from '@/application/hooks/useStock';
import { toast } from '@/application/stores/useToastStore';
import type { CartLine, PosLastSale, PosStockLevels } from './pos.types';
import { toSaleDetails } from './pos.utils';

interface UsePosCheckoutOptions {
  /** Líneas que se cobran (sin las ocultas). */
  lines: CartLine[];
  total: number;
  /** Importe del cobro, en moneda base. */
  amount: number;
  branchId: string;
  warehouseId: string;
  customerId: string;
  note: string;
  paymentMethodId: string;
  /** Moneda en que paga el cliente (vacío = moneda base). */
  paymentCurrencyId: string;
  /** Importe entregado en esa moneda; el backend congela la tasa. */
  paymentCurrencyAmount?: number;
  /** El usuario puede registrar ventas y pagos. */
  canSell: boolean;
  /** Venta registrada pero sin pago: se completa desde el historial. */
  onSaleWithoutPayment: () => void;
  /** Venta registrada y cobrada: el POS queda libre. */
  onSaleCompleted: () => void;
}

/**
 * Cobro del punto de venta.
 *
 * Reúne las tres cosas que pasan al cobrar: validar lo que se va a llevar el
 * cliente, avisar de la existencia del almacén de origen y registrar la venta
 * con su pago. La pantalla solo entrega los datos y muestra el resultado.
 */
export function usePosCheckout({
  lines,
  total,
  amount,
  branchId,
  warehouseId,
  customerId,
  note,
  paymentMethodId,
  paymentCurrencyId,
  paymentCurrencyAmount,
  canSell,
  onSaleWithoutPayment,
  onSaleCompleted,
}: UsePosCheckoutOptions) {
  const { createSale } = useSales();
  const { createPayment } = usePayments();
  const { fetchAvailableStock } = useStock();

  const [isSaving, setIsSaving] = useState(false);
  const [lastSale, setLastSale] = useState<PosLastSale | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // Existencia del almacén de origen por producto, con desglose por ubicación.
  // `null` = sin dato todavía (sin permiso de inventario o falla la consulta):
  // no bloquea el cobro, el backend sigue validando la existencia al registrar
  // la venta.
  const [stockLevels, setStockLevels] = useState<PosStockLevels | null>(null);
  const [isStockLoading, setIsStockLoading] = useState(false);

  /** Cantidad disponible por producto (suma de las ubicaciones del almacén). */
  const availability = useMemo<Record<string, number> | null>(() => {
    if (!stockLevels) return null;

    return Object.fromEntries(
      Object.entries(stockLevels).map(([productId, level]) => [productId, level.total]),
    );
  }, [stockLevels]);

  const canConfirm =
    canSell &&
    lines.length > 0 &&
    !!branchId &&
    !!warehouseId &&
    !!paymentMethodId &&
    amount > 0 &&
    amount <= total &&
    !isSaving;

  /** Trae la existencia del almacén de origen (POS, confirmación y cobro). */
  const loadAvailability = useCallback(async () => {
    if (!warehouseId) {
      setStockLevels(null);
      return;
    }

    setIsStockLoading(true);
    try {
      setStockLevels(await fetchAvailableStock(warehouseId));
    } catch {
      setStockLevels(null);
    } finally {
      setIsStockLoading(false);
    }
  }, [fetchAvailableStock, warehouseId]);

  // Al cambiar de almacén se refresca la existencia: el POS muestra la cantidad
  // de cada producto antes de cobrar, no solo al abrir la confirmación.
  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  /** Valida el cobro y abre la confirmación con la lista de productos. */
  const requestCheckout = useCallback(() => {
    if (lines.length === 0) {
      toast.error('Agrega al menos un producto.');
      return;
    }
    const lineWithoutPrice = lines.find((line) => !(line.unit_price > 0));
    if (lineWithoutPrice) {
      toast.error(`Asigna un precio a "${lineWithoutPrice.product_name}".`);
      return;
    }
    if (!warehouseId) {
      toast.error('No hay un almacén de origen activo en esta sucursal.');
      return;
    }
    if (!paymentMethodId) {
      toast.error('Selecciona el método de pago.');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('El importe debe ser mayor que cero.');
      return;
    }
    if (amount > total) {
      toast.error('El importe no puede superar el total de la venta.');
      return;
    }

    setIsConfirmOpen(true);
    void loadAvailability();
  }, [amount, lines, loadAvailability, paymentMethodId, total, warehouseId]);

  /** Cobra: registra la venta y su pago. Se llama desde la confirmación. */
  const confirmCheckout = useCallback(async () => {
    setIsSaving(true);
    try {
      // Sin existencias cargadas (permiso o consulta fallida) se intenta de
      // nuevo antes de cobrar: la ubicación de cada línea depende de ellas.
      const levels =
        stockLevels ??
        (await fetchAvailableStock(warehouseId).catch(() => null));

      // 1) La venta: el backend calcula el total y genera el movimiento de salida.
      //    Cada línea se imputa a la ubicación del almacén de donde sale.
      const sale = await createSale({
        branch_id: branchId,
        warehouse_id: warehouseId,
        customer_id: customerId || undefined,
        note: note.trim() || undefined,
        details: toSaleDetails(lines, levels),
      });

      // 2) El pago en el mismo paso.
      try {
        await createPayment({
          sale_id: sale.id,
          payment_method_id: paymentMethodId,
          // El importe base es el que cuenta para el saldo de la venta; la moneda
          // elegida solo dice con qué pagó el cliente y a qué tasa.
          amount,
          currency_id: paymentCurrencyId || undefined,
          currency_amount: paymentCurrencyAmount,
        });
      } catch (paymentError) {
        // La venta ya existe: queda pendiente y se completa desde el historial.
        onSaleWithoutPayment();
        setLastSale({
          id: sale.id,
          code: sale.code,
          total: sale.total,
          paid: 0,
          balance: sale.total,
        });
        toast.error(
          `La venta ${sale.code} quedó registrada pendiente: ${
            paymentError instanceof Error ? paymentError.message : 'no se pudo registrar el pago'
          }`,
        );
        setIsConfirmOpen(false);
        // La venta ya descontó existencia aunque el pago haya fallado.
        void loadAvailability();
        return;
      }

      onSaleCompleted();
      setLastSale({
        id: sale.id,
        code: sale.code,
        total: sale.total,
        paid: amount,
        balance: sale.total - amount,
      });
      toast.success(`Venta ${sale.code} cobrada.`);
      setIsConfirmOpen(false);
      // La venta descontó existencia: el POS debe mostrar la cantidad nueva.
      void loadAvailability();
    } catch (err) {
      // El backend devuelve mensajes específicos (stock insuficiente, sin precio,
      // padre inactivo, referencia inválida...). La confirmación sigue abierta
      // para corregir el carrito sin perder lo que se lleva el cliente.
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar la venta.');
      void loadAvailability();
    } finally {
      setIsSaving(false);
    }
  }, [
    amount,
    branchId,
    createPayment,
    createSale,
    customerId,
    fetchAvailableStock,
    lines,
    loadAvailability,
    note,
    onSaleCompleted,
    onSaleWithoutPayment,
    paymentCurrencyAmount,
    paymentCurrencyId,
    paymentMethodId,
    stockLevels,
    warehouseId,
  ]);

  const closeConfirm = useCallback(() => setIsConfirmOpen(false), []);
  const dismissLastSale = useCallback(() => setLastSale(null), []);

  return {
    isSaving,
    canConfirm,
    isConfirmOpen,
    openConfirm: requestCheckout,
    closeConfirm,
    confirmCheckout,
    lastSale,
    dismissLastSale,
    availability,
    isStockLoading,
    reloadAvailability: loadAvailability,
  };
}
