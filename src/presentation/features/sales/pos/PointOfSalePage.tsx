import React from 'react';
import { Link } from 'react-router-dom';
import {
  Barcode,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  Warehouse,
  X,
} from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useProducts } from '@/application/hooks/useProducts';
import { useCustomers } from '@/application/hooks/useCustomers';
import { usePaymentMethods } from '@/application/hooks/usePaymentMethods';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { useBranches } from '@/application/hooks/useBranches';
import { useSales } from '@/application/hooks/useSales';
import { usePayments } from '@/application/hooks/usePayments';
import { usePrices } from '@/application/hooks/usePrices';
import { useStock } from '@/application/hooks/useStock';
import { usePermissions } from '@/application/hooks/usePermissions';
import { useCurrencies } from '@/application/hooks/useCurrencies';
import { toast } from '@/application/stores/useToastStore';
import { formatCurrency } from '@/shared/utils/format';
import { BASE_CURRENCY_FORMAT, convertFromBase, type CurrencyFormat } from '@/shared/config/currency';
import type { Currency, Product } from '@/domain/models';
import { NewCustomerModal } from './NewCustomerModal';
import { ParkedSalesModal } from './ParkedSalesModal';
import { CheckoutConfirmModal } from './CheckoutConfirmModal';
import { useParkedSalesStore, type ParkedSale } from '@/application/stores/useParkedSalesStore';

/**
 * El escáner carga su librería (ZXing) bajo demanda: así el POS abre liviano y
 * la dependencia de códigos de barras solo baja cuando el cajero escanea.
 */
const BarcodeScannerModal = React.lazy(() =>
  import('./BarcodeScannerModal').then((module) => ({ default: module.BarcodeScannerModal })),
);

interface CartLine {
  /** Clave local para React (no se envía al backend). */
  key: string;
  product_id: string;
  product_unit_id: string;
  product_name: string;
  unit_name: string;
  quantity: number;
  unit_price: number;
  /** Oculto con el "ojito": no cuenta en el total ni se cobra. */
  is_hidden: boolean;
}

/** Acción del POS que espera confirmación del cajero. */
interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'primary';
  run: () => void;
}

/** Resumen del cobro que se acaba de registrar. */
interface LastSale {
  id: string;
  code: string;
  total: number;
  paid: number;
  balance: number;
}

/** Paleta para el avatar del producto (variedad sin depender de imágenes). */
const AVATAR_COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-semantic-success-100 text-semantic-success-700',
  'bg-semantic-warning-100 text-semantic-warning-700',
  'bg-semantic-danger-100 text-semantic-danger-700',
];

function avatarClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function lineKey(productId: string, unitId: string): string {
  return `${productId}:${unitId}`;
}

let lineCounter = 0;
function nextLineKey(): string {
  lineCounter += 1;
  return `cart-${Date.now()}-${lineCounter}`;
}

let parkedCounter = 0;
function nextParkedId(): string {
  parkedCounter += 1;
  return `parked-${Date.now()}-${parkedCounter}`;
}

/** Presentación por defecto: la base si está activa, si no la primera activa. */
function defaultUnit(product: Product) {
  return (
    product.units.find((unit) => unit.is_active && unit.id === product.base_unit_id) ??
    product.units.find((unit) => unit.is_active)
  );
}

/**
 * Punto de venta (cobro rápido, RF-SAL-009/013).
 *
 * Una sola pantalla para atender el mostrador: **escanear** con la cámara o
 * buscar por nombre agrega el producto con su precio de catálogo, y **Cobrar**
 * registra la venta y su pago en el mismo paso. La sucursal es la activa y el
 * almacén de origen se autoselecciona, así que el cajero solo elige productos
 * y forma de pago. El cliente se puede dar de alta sin salir de aquí.
 *
 * Si el pago falla después de crear la venta, la venta queda **pendiente** y se
 * avisa para completarla desde el historial; el cobro no se pierde.
 */
export function PointOfSalePage() {
  const { products, fetchProducts } = useProducts();
  const { customers, fetchCustomers } = useCustomers();
  const { paymentMethods, fetchPaymentMethods } = usePaymentMethods();
  const { warehouses, fetchWarehouses } = useWarehouses();
  // Carga las sucursales al montar (el store no se hidrata solo)
  const { branches, activeBranch } = useBranches();
  const { createSale } = useSales();
  const { createPayment } = usePayments();
  const { getPrice, loadPrices, error: pricesError } = usePrices();
  const { fetchAvailability } = useStock();
  const { currencies, fetchCurrencies, error: currenciesError } = useCurrencies();
  const { parkedSales, parkSale, removeParkedSale } = useParkedSalesStore();

  const { can } = usePermissions();
  const canSell = can('sales.sales:create') && can('sales.payments:create');
  const canSeeHistory = can('sales.sales:read');
  const canCreateCustomer = can('sales.customers:create');

  const searchRef = React.useRef<HTMLInputElement>(null);

  const [branchId, setBranchId] = React.useState('');
  const [warehouseId, setWarehouseId] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [note, setNote] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [paymentMethodId, setPaymentMethodId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [amountEdited, setAmountEdited] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSale, setLastSale] = React.useState<LastSale | null>(null);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);
  const [isParkedOpen, setIsParkedOpen] = React.useState(false);
  const [pendingConfirm, setPendingConfirm] = React.useState<PendingConfirm | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  // Existencia del almacén de origen por producto, para avisar en la confirmación
  // del cobro. `null` = sin dato aún (si no hay permiso de inventario o falla la
  // consulta, el cobro sigue: el backend valida la existencia al registrar).
  const [availability, setAvailability] = React.useState<Record<string, number> | null>(null);
  const [isStockLoading, setIsStockLoading] = React.useState(false);
  // Moneda de visualización del POS (solo vista; el cobro siempre va en la base).
  // Vacío = todavía no cargaron las monedas del backend.
  const [displayCurrencyCode, setDisplayCurrencyCode] = React.useState('');
  // Moneda en que paga el cliente. Los precios y el total están en la moneda base
  // ($); en Venezuela el cobro normal es en Bs, así que se elige aquí.
  const [paymentCurrencyId, setPaymentCurrencyId] = React.useState('');

  const activeBranches = React.useMemo(() => branches.filter((b) => b.is_active), [branches]);
  const activeProducts = React.useMemo(() => products.filter((p) => p.is_active), [products]);
  const activeCustomers = React.useMemo(() => customers.filter((c) => c.is_active), [customers]);
  const activePaymentMethods = React.useMemo(
    () => paymentMethods.filter((m) => m.is_active),
    [paymentMethods],
  );

  // Monedas del backend: la base (`is_base`) y la elegida para visualizar.
  const activeCurrencies = React.useMemo(
    () => currencies.filter((c) => c.is_active),
    [currencies],
  );
  const baseCurrency = activeCurrencies.find((c) => c.is_base) ?? activeCurrencies[0];
  const selectedCurrency =
    activeCurrencies.find((c) => c.code === displayCurrencyCode) ?? baseCurrency;
  const baseFormat: CurrencyFormat = baseCurrency
    ? { symbol: baseCurrency.symbol, fractionDigits: baseCurrency.decimals }
    : BASE_CURRENCY_FORMAT;
  const isBaseDisplay = !selectedCurrency || selectedCurrency.is_base;

  // Moneda del cobro: la elegida por el cajero o, por defecto, la base.
  const paymentCurrency =
    activeCurrencies.find((c) => c.id === paymentCurrencyId) ?? baseCurrency;
  const isPaymentInBase = !paymentCurrency || paymentCurrency.is_base;

  /** Pinta un importe (dado en moneda base) en la moneda indicada. */
  const formatInCurrency = React.useCallback(
    (valueInBase: number, currency: Currency) =>
      formatCurrency(convertFromBase(valueInBase, currency.exchange_rate), {
        symbol: currency.symbol,
        fractionDigits: currency.decimals,
      }),
    [],
  );

  // Catálogo base del cobro
  React.useEffect(() => {
    fetchProducts({ isActive: true });
    fetchCustomers({ isActive: true });
    fetchPaymentMethods({ isActive: true });
    fetchCurrencies({ isActive: true });
  }, [fetchProducts, fetchCustomers, fetchPaymentMethods, fetchCurrencies]);

  // Selecciona la moneda base cuando llega del backend.
  React.useEffect(() => {
    if (!displayCurrencyCode && baseCurrency) setDisplayCurrencyCode(baseCurrency.code);
  }, [baseCurrency, displayCurrencyCode]);

  // Sucursal activa por defecto
  React.useEffect(() => {
    if (activeBranch?.is_active && !branchId) setBranchId(activeBranch.id);
  }, [activeBranch, branchId]);

  // Almacenes y precios de la sucursal
  React.useEffect(() => {
    if (!branchId) return;
    fetchWarehouses({ branchId, isActive: true });
    loadPrices(branchId);
  }, [branchId, fetchWarehouses, loadPrices]);

  // Almacén de origen: el primero activo de la sucursal
  React.useEffect(() => {
    if (warehouseId && warehouses.some((w) => w.id === warehouseId)) return;
    setWarehouseId(warehouses[0]?.id ?? '');
  }, [warehouses, warehouseId]);

  // Las líneas ocultas con el "ojito" quedan en el carrito pero no cuentan para
  // el total ni se cobran: sirven para cotizar sin quitar el producto.
  const saleLines = React.useMemo(() => cart.filter((line) => !line.is_hidden), [cart]);

  const total = React.useMemo(
    () => saleLines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0),
    [saleLines],
  );

  // Los importes se muestran en la moneda elegida (símbolo, decimales y tasa del
  // backend), pero la venta y el pago siempre viajan en la moneda base.
  const money = React.useCallback(
    (valueInBase: number) => {
      if (!selectedCurrency) return formatCurrency(valueInBase, BASE_CURRENCY_FORMAT);
      return formatCurrency(convertFromBase(valueInBase, selectedCurrency.exchange_rate), {
        symbol: selectedCurrency.symbol,
        fractionDigits: selectedCurrency.decimals,
      });
    },
    [selectedCurrency],
  );

  // El importe sigue el total salvo que el cajero lo haya editado a mano.
  React.useEffect(() => {
    if (!amountEdited) setAmount(total > 0 ? String(total) : '');
  }, [total, amountEdited]);

  const matches = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return activeProducts
      .filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          product.codes.some((code) => code.code.toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [activeProducts, search]);

  const productById = (id: string) => activeProducts.find((p) => p.id === id);

  const addProduct = (product: Product) => {
    const unit = defaultUnit(product);
    if (!unit) {
      toast.error(`"${product.name}" no tiene presentaciones activas.`);
      return;
    }

    const key = lineKey(product.id, unit.id);
    const catalogPrice = getPrice(product.id, unit.id) ?? 0;

    setCart((prev) => {
      const existing = prev.find((line) => lineKey(line.product_id, line.product_unit_id) === key);
      if (existing) {
        return prev.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          key: nextLineKey(),
          product_id: product.id,
          product_unit_id: unit.id,
          product_name: product.name,
          unit_name: unit.name,
          quantity: 1,
          unit_price: catalogPrice,
          is_hidden: false,
        },
      ];
    });

    setSearch('');
    setLastSale(null);
    searchRef.current?.focus();
  };

  /** Escaneo: busca el producto por código exacto y lo agrega. */
  const handleDetected = (code: string) => {
    const term = code.trim().toLowerCase();
    const product = activeProducts.find((p) =>
      p.codes.some((c) => c.code.toLowerCase() === term),
    );

    setIsScannerOpen(false);

    if (product) {
      addProduct(product);
      return;
    }

    setSearch(code);
    searchRef.current?.focus();
    toast.error(`Ningún producto tiene el código "${code}".`);
  };

  /** Enter en el buscador: agrega el mejor resultado (por nombre o código). */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (matches[0]) addProduct(matches[0]);
  };

  const updateLine = (key: string, changes: Partial<CartLine>) => {
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, ...changes } : line)));
  };

  const changeUnit = (line: CartLine, unitId: string) => {
    const product = productById(line.product_id);
    const unit = product?.units.find((u) => u.id === unitId);
    if (!unit) return;
    updateLine(line.key, {
      product_unit_id: unit.id,
      unit_name: unit.name,
      unit_price: getPrice(line.product_id, unit.id) ?? line.unit_price,
    });
  };

  const removeLine = (key: string) => setCart((prev) => prev.filter((line) => line.key !== key));

  /** Oculta/muestra una línea: oculta no cuenta en el total ni se cobra. */
  const toggleLineHidden = (key: string) =>
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, is_hidden: !line.is_hidden } : line)),
    );

  const clearSale = () => {
    setCart([]);
    setSearch('');
    setCustomerId('');
    setNote('');
    setPaymentMethodId('');
    setAmountEdited(false);
    searchRef.current?.focus();
  };

  /** Guarda el carrito actual como ticket en espera y deja el POS libre. */
  const applyParkSale = () => {
    const customer = activeCustomers.find((c) => c.id === customerId);
    const label = customer?.name ?? `Ticket ${parkedSales.length + 1}`;

    parkSale({
      id: nextParkedId(),
      label,
      created_at: new Date().toISOString(),
      customer_id: customerId,
      note,
      branch_id: branchId,
      warehouse_id: warehouseId,
      payment_method_id: paymentMethodId,
      lines: cart.map((line) => ({
        product_id: line.product_id,
        product_unit_id: line.product_unit_id,
        product_name: line.product_name,
        unit_name: line.unit_name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        is_hidden: line.is_hidden,
      })),
    });

    setCart([]);
    setSearch('');
    setCustomerId('');
    setNote('');
    setPaymentMethodId('');
    setAmount('');
    setAmountEdited(false);
    setLastSale(null);
    searchRef.current?.focus();
    toast.success(`"${label}" quedó en espera.`);
  };

  /** Carga un ticket en espera en el POS y lo retira de la lista. */
  const applyParkedSale = (sale: ParkedSale) => {
    setCart(sale.lines.map((line) => ({ ...line, key: nextLineKey() })));
    setCustomerId(sale.customer_id);
    setNote(sale.note);
    setPaymentMethodId(sale.payment_method_id);
    if (sale.branch_id) setBranchId(sale.branch_id);
    if (sale.warehouse_id) setWarehouseId(sale.warehouse_id);
    setAmountEdited(false);
    setLastSale(null);
    removeParkedSale(sale.id);
    setIsParkedOpen(false);
    searchRef.current?.focus();
    toast.success(`"${sale.label}" retomado.`);
  };

  const handleResume = (sale: ParkedSale) => {
    // Con un carrito a medias se confirma antes de descartarlo.
    if (cart.length > 0) {
      setPendingConfirm({
        title: 'Retomar ticket en espera',
        message: `El carrito actual tiene ${cart.length} línea(s) sin cobrar y se descartará al retomar "${sale.label}". ¿Continuar?`,
        confirmLabel: 'Retomar',
        variant: 'danger',
        run: () => applyParkedSale(sale),
      });
      return;
    }
    applyParkedSale(sale);
  };

  /** Pide confirmación antes de poner el ticket en espera. */
  const requestPark = () => {
    if (cart.length === 0) {
      toast.error('Agrega al menos un producto antes de ponerlo en espera.');
      return;
    }

    const customer = activeCustomers.find((c) => c.id === customerId);
    setPendingConfirm({
      title: 'Poner en espera',
      message: customer
        ? `Se guardará el ticket de "${customer.name}" y el POS quedará libre para atender a otro cliente.`
        : 'Se guardará el ticket actual y el POS quedará libre para atender a otro cliente.',
      confirmLabel: 'Poner en espera',
      variant: 'primary',
      run: applyParkSale,
    });
  };

  /** Pide confirmación antes de vaciar el carrito. */
  const requestClear = () =>
    setPendingConfirm({
      title: 'Vaciar carrito',
      message: 'Se quitarán todos los productos del carrito. Esta acción no se puede deshacer.',
      confirmLabel: 'Vaciar',
      variant: 'danger',
      run: clearSale,
    });

  /** Pide confirmación antes de quitar una línea (se puede pulsar sin querer). */
  const requestRemoveLine = (line: CartLine) =>
    setPendingConfirm({
      title: 'Quitar producto',
      message: `¿Quitar "${line.product_name}" del carrito?`,
      confirmLabel: 'Quitar',
      variant: 'danger',
      run: () => removeLine(line.key),
    });

  const confirmPending = () => {
    pendingConfirm?.run();
    setPendingConfirm(null);
  };

  const parsedAmount = Number(amount);
  const canConfirm =
    canSell &&
    saleLines.length > 0 &&
    !!branchId &&
    !!warehouseId &&
    !!paymentMethodId &&
    amount.trim() !== '' &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= total &&
    !isSaving;

  // Importe que entrega el cliente en la moneda del cobro, redondeado al céntimo
  // de esa moneda: viaja junto con la moneda y el backend congela la tasa.
  const paymentCurrencyAmount = React.useMemo(() => {
    if (!paymentCurrency || isPaymentInBase || parsedAmount <= 0) return undefined;
    const converted = convertFromBase(parsedAmount, paymentCurrency.exchange_rate);
    return Math.round((converted + Number.EPSILON) * 100) / 100;
  }, [isPaymentInBase, parsedAmount, paymentCurrency]);

  // Resumen del cobro en la moneda del cliente para la confirmación.
  const paymentInCurrencyView =
    !isPaymentInBase && paymentCurrency && parsedAmount > 0 && !Number.isNaN(parsedAmount)
      ? {
          code: paymentCurrency.code,
          amountLabel: formatInCurrency(parsedAmount, paymentCurrency),
          rateLabel: String(paymentCurrency.exchange_rate),
          baseSymbol: baseFormat.symbol,
        }
      : null;

  /** Trae la existencia del almacén de origen para la confirmación del cobro. */
  const loadAvailability = React.useCallback(async () => {
    if (!warehouseId) {
      setAvailability(null);
      return;
    }

    setIsStockLoading(true);
    setAvailability(null);
    try {
      setAvailability(await fetchAvailability(warehouseId, saleLines.map((l) => l.product_id)));
    } catch {
      // Sin permiso de inventario o sin red: no se bloquea el cobro, el backend
      // sigue siendo el que rechaza una venta sin existencia.
      setAvailability(null);
    } finally {
      setIsStockLoading(false);
    }
  }, [fetchAvailability, saleLines, warehouseId]);

  /** Valida el cobro y abre la confirmación con la lista de productos. */
  const requestCheckout = () => {
    if (saleLines.length === 0) {
      toast.error('Agrega al menos un producto.');
      return;
    }
    const lineWithoutPrice = saleLines.find((line) => !(line.unit_price > 0));
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
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('El importe debe ser mayor que cero.');
      return;
    }
    if (parsedAmount > total) {
      toast.error('El importe no puede superar el total de la venta.');
      return;
    }

    setIsCheckoutOpen(true);
    void loadAvailability();
  };

  /** Cobra de verdad: crea la venta y su pago. Se llama desde la confirmación. */
  const handleCheckout = async () => {
    setIsSaving(true);
    try {
      // 1) La venta: el backend calcula el total y genera el movimiento de salida.
      const sale = await createSale({
        branch_id: branchId,
        warehouse_id: warehouseId,
        customer_id: customerId || undefined,
        note: note.trim() || undefined,
        details: saleLines.map((line) => ({
          product_id: line.product_id,
          product_unit_id: line.product_unit_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
        })),
      });

      // 2) El pago en el mismo paso.
      try {
        await createPayment({
          sale_id: sale.id,
          payment_method_id: paymentMethodId,
          // El importe base es el que cuenta para el saldo de la venta; la moneda
          // elegida solo dice con qué pagó el cliente y a qué tasa.
          amount: parsedAmount,
          currency_id: paymentCurrency?.id,
          currency_amount: paymentCurrencyAmount,
        });
      } catch (paymentError) {
        // La venta ya existe: queda pendiente y se completa desde el historial.
        setCart([]);
        setAmountEdited(false);
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
        setIsCheckoutOpen(false);
        return;
      }

      clearSale();
      setLastSale({
        id: sale.id,
        code: sale.code,
        total: sale.total,
        paid: parsedAmount,
        balance: sale.total - parsedAmount,
      });
      toast.success(`Venta ${sale.code} cobrada.`);
      setIsCheckoutOpen(false);
    } catch (err) {
      // El backend devuelve mensajes específicos (stock insuficiente, sin precio,
      // padre inactivo, referencia inválida...). La confirmación sigue abierta
      // para corregir el carrito sin perder lo que se lleva el cliente.
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar la venta.');
      void loadAvailability();
    } finally {
      setIsSaving(false);
    }
  };

  // F2 cobra sin soltar el teclado
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (canConfirm) requestCheckout();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const branchName =
    activeBranches.find((b) => b.id === branchId)?.name ?? activeBranch?.name ?? '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Punto de venta</h1>
          <p className="text-sm text-text-tertiary">
            Escanea o busca un producto, ajusta el carrito y cobra.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsParkedOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border-input px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
          >
            <Clock className="h-4 w-4" />
            En espera
            {parkedSales.length > 0 && (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                {parkedSales.length}
              </span>
            )}
          </button>
          {canSeeHistory && (
            <Link
              to="/sales/history"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Ver historial →
            </Link>
          )}
        </div>
      </div>

      {pricesError && (
        <div className="mb-4 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          No se pudieron cargar los precios del catálogo ({pricesError}). Puedes escribir el precio
          de cada línea manualmente.
        </div>
      )}

      {currenciesError && (
        <div className="mb-4 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          No se pudieron cargar las monedas ({currenciesError}). Se muestra el cobro en la moneda
          base.
        </div>
      )}

      {lastSale && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-semantic-success-200 bg-semantic-success-50 px-4 py-3 text-sm text-semantic-success-800">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>
            Venta <span className="font-semibold">{lastSale.code}</span> cobrada por{' '}
            <span className="font-semibold">{money(lastSale.paid)}</span>
            {lastSale.balance > 0
              ? ` · saldo ${money(lastSale.balance)} (queda parcial)`
              : ' · pagada'}
            .{' '}
            <Link className="font-medium underline" to={`/sales/history/${lastSale.id}`}>
              Ver detalle
            </Link>
          </span>
          <button
            onClick={() => setLastSale(null)}
            className="ml-auto p-1 rounded-lg text-semantic-success-700 hover:bg-semantic-success-100"
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">
        {/* Carrito */}
        <Card padding="none" className="flex flex-col overflow-hidden">
          {/* Buscador + escáner */}
          <div className="p-4 border-b border-border-subtle space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  ref={searchRef}
                  autoFocus
                  leftIcon={<Search className="h-4 w-4" />}
                  placeholder="Buscar por nombre o escanear código y Enter…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  aria-label="Buscar producto"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                leftIcon={<Camera className="h-4 w-4" />}
                onClick={() => setIsScannerOpen(true)}
              >
                Escanear
              </Button>
            </div>

            {search.trim() !== '' && (
              <div className="rounded-xl border border-border-default overflow-hidden">
                {matches.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-text-tertiary">
                    Sin coincidencias para "{search.trim()}".
                  </p>
                ) : (
                  matches.map((product) => {
                    const unit = defaultUnit(product);
                    const price = unit ? getPrice(product.id, unit.id) : undefined;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-secondary transition-colors border-b border-border-subtle last:border-b-0"
                      >
                        <span
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${avatarClass(product.name)}`}
                        >
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {product.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            {product.codes[0] && (
                              <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                                <Barcode className="h-3 w-3" />
                                {product.codes[0].code}
                              </span>
                            )}
                            {unit && (
                              <span className="text-xs text-text-tertiary">· {unit.name}</span>
                            )}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-text-primary">
                          {price !== undefined ? money(price) : 'Sin precio'}
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <Plus className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Líneas */}
          {cart.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-12 w-12" />}
              title="Carrito vacío"
              description="Escanea con la cámara o busca un producto por nombre para agregarlo."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {cart.map((line) => {
                const product = productById(line.product_id);
                const unitOptions = (product?.units ?? [])
                  .filter((u) => u.is_active)
                  .map((u) => ({ value: u.id, label: `${u.name} (×${u.factor})` }));

                return (
                  <li
                    key={line.key}
                    className={`flex items-center gap-3 px-3 py-3 ${line.is_hidden ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${avatarClass(line.product_name)}`}
                    >
                      {line.product_name.charAt(0).toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {line.product_name}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <select
                          value={line.product_unit_id}
                          onChange={(e) => changeUnit(line, e.target.value)}
                          className="rounded-md border border-border-input bg-surface-primary px-2 py-0.5 text-xs text-text-secondary"
                          aria-label="Presentación"
                        >
                          {unitOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-text-tertiary">
                          {line.unit_price > 0 ? `${money(line.unit_price)} c/u` : 'sin precio'}
                        </span>
                        {line.is_hidden && (
                          <span className="text-xs font-medium text-semantic-warning-700">
                            No cuenta
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateLine(line.key, { quantity: Math.max(1, line.quantity - 1) })
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-input text-text-muted hover:text-text-primary hover:bg-surface-tertiary"
                        aria-label="Quitar una unidad"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, { quantity: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-14 rounded-lg border border-border-input bg-surface-primary px-2 py-1 text-center text-sm"
                        aria-label="Cantidad"
                      />
                      <button
                        type="button"
                        onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-input text-text-muted hover:text-text-primary hover:bg-surface-tertiary"
                        aria-label="Agregar una unidad"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Precio editable (siempre en moneda base) */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-muted">
                        {baseFormat.symbol}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(line.key, { unit_price: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-20 rounded-lg border border-border-input bg-surface-primary px-2 py-1 text-right text-sm"
                        aria-label="Precio unitario (moneda base)"
                      />
                    </div>

                    <span className="w-24 text-right text-sm font-semibold text-text-primary">
                      {money(line.quantity * line.unit_price)}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleLineHidden(line.key)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        line.is_hidden
                          ? 'text-semantic-warning-600 hover:bg-surface-tertiary'
                          : 'text-text-muted hover:text-brand-600 hover:bg-surface-tertiary'
                      }`}
                      aria-label={line.is_hidden ? 'Mostrar en el total' : 'Ocultar del total'}
                      title={line.is_hidden ? 'Mostrar en el total' : 'Ocultar del total'}
                    >
                      {line.is_hidden ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => requestRemoveLine(line)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary"
                      aria-label="Quitar del carrito"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {cart.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
              <span className="text-sm text-text-tertiary">
                {saleLines.reduce((sum, line) => sum + line.quantity, 0)} unidad(es)
                {cart.length > saleLines.length && ' · con ocultos'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={requestPark}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Poner en espera
                </button>
                <button
                  type="button"
                  onClick={requestClear}
                  className="text-sm text-text-tertiary hover:text-semantic-danger-600"
                >
                  Vaciar carrito
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Cobro */}
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Warehouse className="h-4 w-4 text-text-muted" />
              <span className="font-medium text-text-primary">{branchName}</span>
            </div>

            <Select
              label="Almacén de origen"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              placeholder={
                warehouses.length === 0 ? 'Sin almacenes activos' : 'Selecciona el almacén'
              }
            />

            <div className="space-y-1">
              <Select
                label="Cliente (opcional)"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={[
                  { value: '', label: 'Consumidor final' },
                  ...activeCustomers.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              {canCreateCustomer && (
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Nuevo cliente
                </button>
              )}
            </div>

            <Select
              label="Método de pago"
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              options={activePaymentMethods.map((m) => ({ value: m.id, label: m.name }))}
              placeholder={
                activePaymentMethods.length === 0
                  ? 'Sin métodos de pago activos'
                  : 'Selecciona el método'
              }
            />

            {activeCurrencies.length > 1 && (
              <Select
                label="Moneda de pago"
                value={paymentCurrency?.id ?? ''}
                onChange={(e) => setPaymentCurrencyId(e.target.value)}
                options={activeCurrencies.map((c) => ({
                  value: c.id,
                  label: `${c.code} (${c.symbol})${c.is_base ? ' · base' : ''}`,
                }))}
              />
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Importe recibido"
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountEdited(true);
                  }}
                  helperText={
                    !isPaymentInBase
                      ? `Se escribe en ${baseFormat.symbol} (moneda base): el equivalente en la moneda de pago sale de la tasa del catálogo.`
                      : undefined
                  }
                  error={
                    amount.trim() !== '' && parsedAmount > total
                      ? 'No puede superar el total.'
                      : undefined
                  }
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAmount(String(total));
                  setAmountEdited(false);
                }}
              >
                Exacto
              </Button>
            </div>

            {!isPaymentInBase && paymentCurrency && (
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
                El cliente paga {' '}
                <span className="font-semibold">
                  {formatInCurrency(
                    Number.isNaN(parsedAmount) ? 0 : parsedAmount,
                    paymentCurrency,
                  )}
                </span>
                {' '}en {paymentCurrency.code} · tasa {paymentCurrency.exchange_rate}{' '}
                {paymentCurrency.code} por {baseFormat.symbol} 1. El saldo de la venta queda en{' '}
                {baseFormat.symbol} (moneda base).
              </p>
            )}

            <Textarea
              label="Nota (opcional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="Ej: Entrega en mostrador."
            />

            {activeCurrencies.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-tertiary">Moneda</span>
                <div className="inline-flex rounded-lg border border-border-input p-0.5">
                  {activeCurrencies.map((currency) => (
                    <button
                      key={currency.code}
                      type="button"
                      onClick={() => setDisplayCurrencyCode(currency.code)}
                      aria-pressed={displayCurrencyCode === currency.code}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        displayCurrencyCode === currency.code
                          ? 'bg-brand-600 text-white'
                          : 'text-text-secondary hover:bg-surface-tertiary'
                      }`}
                    >
                      {currency.symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border-subtle pt-4">
              <span className="text-sm text-text-tertiary">Total</span>
              <span className="text-2xl font-bold text-text-primary">{money(total)}</span>
            </div>

            {!isBaseDisplay && selectedCurrency && (
              <p className="rounded-lg bg-surface-tertiary px-3 py-2 text-xs text-text-tertiary">
                Visualización en {selectedCurrency.symbol} · 1 {baseFormat.symbol} ={' '}
                {selectedCurrency.exchange_rate} {selectedCurrency.code}. El cobro se registra en{' '}
                {baseFormat.symbol} (moneda base).
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              leftIcon={<CreditCard className="h-5 w-5" />}
              onClick={requestCheckout}
              isLoading={isSaving}
              disabled={!canConfirm}
            >
              Cobrar ({money(parsedAmount > 0 ? parsedAmount : 0)})
            </Button>

            <p className="text-right text-xs text-text-tertiary">F2 = cobrar</p>
          </Card>

          {!canSell && (
            <p className="text-xs text-semantic-warning-700">
              No tienes permiso para registrar ventas y pagos.
            </p>
          )}

          {activeProducts.length === 0 && (
            <p className="text-xs text-text-tertiary">
              No hay productos activos. Créalos en Catálogo → Productos.
            </p>
          )}
        </div>
      </div>

      {isScannerOpen && (
        <React.Suspense fallback={null}>
          <BarcodeScannerModal
            isOpen
            onClose={() => setIsScannerOpen(false)}
            onDetected={handleDetected}
          />
        </React.Suspense>
      )}

      <NewCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCreated={(customer) => setCustomerId(customer.id)}
      />

      <ParkedSalesModal
        isOpen={isParkedOpen}
        onClose={() => setIsParkedOpen(false)}
        sales={parkedSales}
        formatAmount={money}
        onResume={handleResume}
        onRemove={removeParkedSale}
      />

      <CheckoutConfirmModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={handleCheckout}
        isLoading={isSaving}
        lines={saleLines}
        hiddenCount={cart.length - saleLines.length}
        total={total}
        amount={parsedAmount}
        customerName={activeCustomers.find((c) => c.id === customerId)?.name}
        formatAmount={money}
        availability={availability}
        isStockLoading={isStockLoading}
        paymentInCurrency={paymentInCurrencyView}
      />

      <ConfirmDialog
        isOpen={pendingConfirm !== null}
        onClose={() => setPendingConfirm(null)}
        onConfirm={confirmPending}
        title={pendingConfirm?.title ?? ''}
        message={pendingConfirm?.message ?? ''}
        confirmLabel={pendingConfirm?.confirmLabel ?? 'Confirmar'}
        variant={pendingConfirm?.variant ?? 'danger'}
      />
    </div>
  );
}
