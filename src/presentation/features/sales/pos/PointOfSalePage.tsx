import React from 'react';
import { Link } from 'react-router-dom';
import {
  Barcode,
  Camera,
  CheckCircle2,
  CreditCard,
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
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useProducts } from '@/application/hooks/useProducts';
import { useCustomers } from '@/application/hooks/useCustomers';
import { usePaymentMethods } from '@/application/hooks/usePaymentMethods';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { useBranches } from '@/application/hooks/useBranches';
import { useSales } from '@/application/hooks/useSales';
import { usePayments } from '@/application/hooks/usePayments';
import { usePrices } from '@/application/hooks/usePrices';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { formatCurrency } from '@/shared/utils/format';
import type { Product } from '@/domain/models';
import { NewCustomerModal } from './NewCustomerModal';

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

  const activeBranches = React.useMemo(() => branches.filter((b) => b.is_active), [branches]);
  const activeProducts = React.useMemo(() => products.filter((p) => p.is_active), [products]);
  const activeCustomers = React.useMemo(() => customers.filter((c) => c.is_active), [customers]);
  const activePaymentMethods = React.useMemo(
    () => paymentMethods.filter((m) => m.is_active),
    [paymentMethods],
  );

  // Catálogo base del cobro
  React.useEffect(() => {
    fetchProducts({ isActive: true });
    fetchCustomers({ isActive: true });
    fetchPaymentMethods({ isActive: true });
  }, [fetchProducts, fetchCustomers, fetchPaymentMethods]);

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

  const total = React.useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity * line.unit_price, 0),
    [cart],
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

  const clearSale = () => {
    setCart([]);
    setSearch('');
    setCustomerId('');
    setNote('');
    setPaymentMethodId('');
    setAmountEdited(false);
    searchRef.current?.focus();
  };

  const parsedAmount = Number(amount);
  const canConfirm =
    canSell &&
    cart.length > 0 &&
    !!branchId &&
    !!warehouseId &&
    !!paymentMethodId &&
    amount.trim() !== '' &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= total &&
    !isSaving;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Agrega al menos un producto.');
      return;
    }
    const lineWithoutPrice = cart.find((line) => !(line.unit_price > 0));
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

    setIsSaving(true);
    try {
      // 1) La venta: el backend calcula el total y genera el movimiento de salida.
      const sale = await createSale({
        branch_id: branchId,
        warehouse_id: warehouseId,
        customer_id: customerId || undefined,
        note: note.trim() || undefined,
        details: cart.map((line) => ({
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
          amount: parsedAmount,
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
    } catch (err) {
      // El backend devuelve mensajes específicos (stock insuficiente, sin precio,
      // padre inactivo, referencia inválida...)
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar la venta.');
    } finally {
      setIsSaving(false);
    }
  };

  // F2 cobra sin soltar el teclado
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (canConfirm) handleCheckout();
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
        {canSeeHistory && (
          <Link
            to="/sales/history"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Ver historial →
          </Link>
        )}
      </div>

      {pricesError && (
        <div className="mb-4 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          No se pudieron cargar los precios del catálogo ({pricesError}). Puedes escribir el precio
          de cada línea manualmente.
        </div>
      )}

      {lastSale && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-semantic-success-200 bg-semantic-success-50 px-4 py-3 text-sm text-semantic-success-800">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>
            Venta <span className="font-semibold">{lastSale.code}</span> cobrada por{' '}
            <span className="font-semibold">{formatCurrency(lastSale.paid)}</span>
            {lastSale.balance > 0
              ? ` · saldo ${formatCurrency(lastSale.balance)} (queda parcial)`
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
                          {price !== undefined ? formatCurrency(price) : 'Sin precio'}
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
                  <li key={line.key} className="flex items-center gap-3 px-3 py-3">
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
                          {line.unit_price > 0 ? `${formatCurrency(line.unit_price)} c/u` : 'sin precio'}
                        </span>
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

                    {/* Precio editable */}
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.unit_price}
                      onChange={(e) =>
                        updateLine(line.key, { unit_price: Math.max(0, Number(e.target.value)) })
                      }
                      className="w-20 rounded-lg border border-border-input bg-surface-primary px-2 py-1 text-right text-sm"
                      aria-label="Precio unitario"
                    />

                    <span className="w-24 text-right text-sm font-semibold text-text-primary">
                      {formatCurrency(line.quantity * line.unit_price)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
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
                {cart.reduce((sum, line) => sum + line.quantity, 0)} unidad(es)
              </span>
              <button
                type="button"
                onClick={clearSale}
                className="text-sm text-text-tertiary hover:text-semantic-danger-600"
              >
                Vaciar carrito
              </button>
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

            <Textarea
              label="Nota (opcional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="Ej: Entrega en mostrador."
            />

            <div className="flex items-center justify-between border-t border-border-subtle pt-4">
              <span className="text-sm text-text-tertiary">Total</span>
              <span className="text-2xl font-bold text-text-primary">{formatCurrency(total)}</span>
            </div>

            <Button
              className="w-full"
              size="lg"
              leftIcon={<CreditCard className="h-5 w-5" />}
              onClick={handleCheckout}
              isLoading={isSaving}
              disabled={!canConfirm}
            >
              Cobrar ({formatCurrency(parsedAmount > 0 ? parsedAmount : 0)})
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
    </div>
  );
}
