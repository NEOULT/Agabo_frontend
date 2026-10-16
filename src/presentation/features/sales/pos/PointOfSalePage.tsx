import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Clock, CreditCard, Search, ShoppingCart, UserPlus, Warehouse } from 'lucide-react';
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
import { usePrices } from '@/application/hooks/usePrices';
import { useCurrencies } from '@/application/hooks/useCurrencies';
import { usePermissions } from '@/application/hooks/usePermissions';
import { useParkedTickets } from '@/application/hooks/pos/useParkedTickets';
import { usePosCart } from '@/application/hooks/pos/usePosCart';
import { usePosCheckout } from '@/application/hooks/pos/usePosCheckout';
import { usePosCurrency } from '@/application/hooks/pos/usePosCurrency';
import type {
  CartLine,
  ParkedTicketSnapshot,
  PosPendingConfirm,
} from '@/application/hooks/pos/pos.types';
import { findByExactCode, searchProducts } from '@/application/hooks/pos/pos.utils';
import { toast } from '@/application/stores/useToastStore';
import type { Product } from '@/domain/models';
import { NewCustomerModal } from './NewCustomerModal';
import { ParkedSalesModal } from './ParkedSalesModal';
import { CheckoutConfirmModal } from './CheckoutConfirmModal';
import { PosAlerts } from './PosAlerts';
import { PosCartLineRow } from './PosCartLineRow';
import { PosProductResult } from './PosProductResult';
import type { ParkedSale } from '@/application/stores/useParkedSalesStore';

/**
 * El escáner carga su librería (ZXing) bajo demanda: así el POS abre liviano y
 * la dependencia de códigos de barras solo baja cuando el cajero escanea.
 */
const BarcodeScannerModal = React.lazy(() =>
  import('./BarcodeScannerModal').then((module) => ({ default: module.BarcodeScannerModal })),
);

/**
 * Punto de venta (cobro rápido, RF-SAL-009/013).
 *
 * Una sola pantalla para atender el mostrador: **escanear** con la cámara o
 * buscar por nombre agrega el producto con su precio de catálogo, y **Cobrar**
 * registra la venta y su pago en el mismo paso. La sucursal es la activa y el
 * almacén de origen se autoselecciona, así que el cajero solo elige productos
 * y forma de pago. El cliente se puede dar de alta sin salir de aquí.
 *
 * La pantalla compone: el carrito (`usePosCart`), las monedas (`usePosCurrency`),
 * el cobro (`usePosCheckout`) y los tickets en espera (`useParkedTickets`) viven
 * en sus propios hooks; aquí solo queda la sesión de mostrador y el marcado.
 */
export function PointOfSalePage() {
  const { products, fetchProducts } = useProducts();
  const { customers, fetchCustomers } = useCustomers();
  const { paymentMethods, fetchPaymentMethods } = usePaymentMethods();
  const { warehouses, fetchWarehouses } = useWarehouses();
  // Carga las sucursales al montar (el store no se hidrata solo)
  const { branches, activeBranch } = useBranches();
  const { getPrice, loadPrices, error: pricesError } = usePrices();
  const { currencies, fetchCurrencies, error: currenciesError } = useCurrencies();

  const { can } = usePermissions();
  const canSell = can('sales.sales:create') && can('sales.payments:create');
  const canSeeHistory = can('sales.sales:read');
  const canCreateCustomer = can('sales.customers:create');

  const searchRef = React.useRef<HTMLInputElement>(null);

  // Sesión de mostrador: lo que no pertenece a ningún dominio extraído.
  const [branchId, setBranchId] = React.useState('');
  const [warehouseId, setWarehouseId] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [note, setNote] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [paymentMethodId, setPaymentMethodId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [amountEdited, setAmountEdited] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);
  const [isParkedOpen, setIsParkedOpen] = React.useState(false);
  const [pendingConfirm, setPendingConfirm] = React.useState<PosPendingConfirm | null>(null);

  const activeBranches = React.useMemo(() => branches.filter((b) => b.is_active), [branches]);
  const activeProducts = React.useMemo(() => products.filter((p) => p.is_active), [products]);
  const activeCustomers = React.useMemo(() => customers.filter((c) => c.is_active), [customers]);
  const activePaymentMethods = React.useMemo(
    () => paymentMethods.filter((m) => m.is_active),
    [paymentMethods],
  );

  const {
    activeCurrencies,
    baseFormat,
    displayCurrencyCode,
    setDisplayCurrencyCode,
    selectedCurrency,
    isBaseDisplay,
    paymentCurrency,
    setPaymentCurrencyId,
    isPaymentInBase,
    money,
    formatInCurrency,
    toPaymentCurrencyAmount,
    toPaymentInCurrencyView,
  } = usePosCurrency(currencies);

  const {
    lines: cartLines,
    billable: billableLines,
    total,
    itemsCount,
    addProduct,
    updateLine,
    changeUnit,
    removeLine,
    toggleLineHidden,
    clear: clearCart,
    restore: restoreCart,
  } = usePosCart({ getPrice });

  const parsedAmount = Number(amount);
  const paymentCurrencyAmount = toPaymentCurrencyAmount(parsedAmount);
  const paymentInCurrencyView = toPaymentInCurrencyView(parsedAmount);

  /** Limpia el cobro y deja el POS listo para el siguiente cliente. */
  const resetSession = React.useCallback(() => {
    clearCart();
    setSearch('');
    setCustomerId('');
    setNote('');
    setPaymentMethodId('');
    setAmount('');
    setAmountEdited(false);
    searchRef.current?.focus();
  }, [clearCart]);

  const {
    isSaving,
    canConfirm,
    isConfirmOpen,
    openConfirm,
    closeConfirm,
    confirmCheckout,
    lastSale,
    dismissLastSale,
    availability,
    isStockLoading,
  } = usePosCheckout({
    lines: billableLines,
    total,
    amount: parsedAmount,
    branchId,
    warehouseId,
    customerId,
    note,
    paymentMethodId,
    paymentCurrencyId: paymentCurrency?.id ?? '',
    paymentCurrencyAmount,
    canSell,
    // La venta ya existe pero el pago falló: se libera el carrito y se completa
    // desde el historial.
    onSaleWithoutPayment: () => {
      clearCart();
      setAmountEdited(false);
    },
    onSaleCompleted: resetSession,
  });

  const buildSnapshot = React.useCallback(
    (): ParkedTicketSnapshot => ({
      lines: cartLines,
      customer_id: customerId,
      customer_name: activeCustomers.find((c) => c.id === customerId)?.name,
      note,
      branch_id: branchId,
      warehouse_id: warehouseId,
      payment_method_id: paymentMethodId,
    }),
    [activeCustomers, branchId, cartLines, customerId, note, paymentMethodId, warehouseId],
  );

  const restoreSnapshot = React.useCallback(
    (sale: ParkedSale) => {
      restoreCart(sale.lines);
      setCustomerId(sale.customer_id);
      setNote(sale.note);
      setPaymentMethodId(sale.payment_method_id);
      if (sale.branch_id) setBranchId(sale.branch_id);
      if (sale.warehouse_id) setWarehouseId(sale.warehouse_id);
      setAmountEdited(false);
      dismissLastSale();
      setIsParkedOpen(false);
      searchRef.current?.focus();
    },
    [dismissLastSale, restoreCart],
  );

  const { parkedSales, parkCurrent, resume: resumeParked, removeParked } = useParkedTickets({
    buildSnapshot,
    restoreSnapshot,
    resetSession,
  });

  // Catálogo base del cobro
  React.useEffect(() => {
    fetchProducts({ isActive: true });
    fetchCustomers({ isActive: true });
    fetchPaymentMethods({ isActive: true });
    fetchCurrencies({ isActive: true });
  }, [fetchProducts, fetchCustomers, fetchPaymentMethods, fetchCurrencies]);

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

  // El importe sigue el total salvo que el cajero lo haya editado a mano.
  React.useEffect(() => {
    if (!amountEdited) setAmount(total > 0 ? String(total) : '');
  }, [total, amountEdited]);

  // F2 cobra sin soltar el teclado
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (canConfirm) openConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const matches = React.useMemo(() => searchProducts(activeProducts, search), [activeProducts, search]);

  const productById = (id: string) => activeProducts.find((p) => p.id === id);

  const handleAddProduct = (product: Product) => {
    if (!addProduct(product)) {
      toast.error(`"${product.name}" no tiene presentaciones activas.`);
      return;
    }

    setSearch('');
    dismissLastSale();
    searchRef.current?.focus();
  };

  /** Escaneo: busca el producto por código exacto y lo agrega. */
  const handleDetected = (code: string) => {
    const product = findByExactCode(activeProducts, code);

    setIsScannerOpen(false);

    if (product) {
      handleAddProduct(product);
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
    if (matches[0]) handleAddProduct(matches[0]);
  };

  const handleChangeUnit = (line: CartLine, unitId: string) => {
    const unit = productById(line.product_id)?.units.find((u) => u.id === unitId);
    if (!unit) return;
    changeUnit(line, unit);
  };

  /** Retoma un ticket en espera y avisa. */
  const resumeTicket = (sale: ParkedSale) => {
    resumeParked(sale);
    toast.success(`"${sale.label}" retomado.`);
  };

  const handleResume = (sale: ParkedSale) => {
    // Con un carrito a medias se confirma antes de descartarlo.
    if (cartLines.length > 0) {
      setPendingConfirm({
        title: 'Retomar ticket en espera',
        message: `El carrito actual tiene ${cartLines.length} línea(s) sin cobrar y se descartará al retomar "${sale.label}". ¿Continuar?`,
        confirmLabel: 'Retomar',
        variant: 'danger',
        run: () => resumeTicket(sale),
      });
      return;
    }
    resumeTicket(sale);
  };

  /** Guarda el carrito actual como ticket en espera y avisa. */
  const parkCurrentTicket = () => {
    const label = parkCurrent();
    toast.success(`"${label}" quedó en espera.`);
  };

  /** Pide confirmación antes de poner el ticket en espera. */
  const requestPark = () => {
    if (cartLines.length === 0) {
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
      run: parkCurrentTicket,
    });
  };

  /** Pide confirmación antes de vaciar el carrito. */
  const requestClear = () =>
    setPendingConfirm({
      title: 'Vaciar carrito',
      message: 'Se quitarán todos los productos del carrito. Esta acción no se puede deshacer.',
      confirmLabel: 'Vaciar',
      variant: 'danger',
      run: resetSession,
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

  const branchName =
    activeBranches.find((b) => b.id === branchId)?.name ?? activeBranch?.name ?? '—';

  return (
    // En escritorio la pantalla ocupa exactamente el alto visible (navbar 4rem +
    // padding del `main` 3rem), así que el scroll deja de ser global y pasa a
    // vivir dentro de cada panel. En móvil conserva su alto natural.
    <div className="flex flex-col lg:h-[calc(100vh-7rem)]">
      <div className="mb-4 flex flex-shrink-0 items-center justify-between gap-4">
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

      {/* Los avisos no se comprimen: el alto lo ceden los paneles con scroll */}
      <div className="flex-shrink-0">
        <PosAlerts
          pricesError={pricesError}
          currenciesError={currenciesError}
          lastSale={lastSale}
          onDismissLastSale={dismissLastSale}
          formatAmount={money}
        />
      </div>

      {/* Dos paneles de alto acotado: catálogo (izquierda) y cobro (derecha) */}
      <div className="grid flex-1 grid-cols-1 gap-6 lg:min-h-0 lg:grid-cols-[1fr_20rem]">
        {/* Carrito */}
        <Card
          padding="none"
          className="flex min-h-0 flex-col overflow-hidden"
        >
          {/* Buscador + escáner */}
          <div className="flex-shrink-0 space-y-3 border-b border-border-subtle p-4">
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
              <div className="scrollbar-thin max-h-64 overflow-y-auto rounded-xl border border-border-default">
                {matches.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-text-tertiary">
                    Sin coincidencias para "{search.trim()}".
                  </p>
                ) : (
                  matches.map((product) => (
                    <PosProductResult
                      key={product.id}
                      product={product}
                      getPrice={getPrice}
                      formatAmount={money}
                      onSelect={handleAddProduct}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Líneas — su propio scroll: el resumen de abajo queda siempre visible */}
          {cartLines.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <EmptyState
                icon={<ShoppingCart className="h-12 w-12" />}
                title="Carrito vacío"
                description="Escanea con la cámara o busca un producto por nombre para agregarlo."
              />
            </div>
          ) : (
            <ul className="scrollbar-thin min-h-0 flex-1 divide-y divide-border-subtle overflow-y-auto">
              {cartLines.map((line) => (
                <PosCartLineRow
                  key={line.key}
                  line={line}
                  product={productById(line.product_id)}
                  baseSymbol={baseFormat.symbol}
                  formatAmount={money}
                  onChangeUnit={handleChangeUnit}
                  onQuantityChange={(current, quantity) =>
                    updateLine(current.key, { quantity })
                  }
                  onUnitPriceChange={(current, unitPrice) =>
                    updateLine(current.key, { unit_price: unitPrice })
                  }
                  onToggleHidden={(current) => toggleLineHidden(current.key)}
                  onRemove={requestRemoveLine}
                />
              ))}
            </ul>
          )}

          {cartLines.length > 0 && (
            <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
              <span className="text-sm text-text-tertiary">
                {itemsCount} unidad(es)
                {cartLines.length > billableLines.length && ' · con ocultos'}
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

        {/* Cobro — su propio scroll; el `p-1` evita que la sombra quede cortada */}
        <div className="scrollbar-thin min-h-0 space-y-4 lg:-m-1 lg:overflow-y-auto lg:p-1">
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
                El cliente paga{' '}
                <span className="font-semibold">
                  {formatInCurrency(Number.isNaN(parsedAmount) ? 0 : parsedAmount, paymentCurrency)}
                </span>{' '}
                en {paymentCurrency.code} · tasa {paymentCurrency.exchange_rate}{' '}
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
              onClick={openConfirm}
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
        onRemove={removeParked}
      />

      <CheckoutConfirmModal
        isOpen={isConfirmOpen}
        onClose={closeConfirm}
        onConfirm={confirmCheckout}
        isLoading={isSaving}
        lines={billableLines}
        hiddenCount={cartLines.length - billableLines.length}
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
