import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { usePurchaseOrders } from '@/application/hooks/usePurchaseOrders';
import { useSuppliers } from '@/application/hooks/useSuppliers';
import { useProducts } from '@/application/hooks/useProducts';
import { useBranches } from '@/application/hooks/useBranches';
import { toast } from '@/application/stores/useToastStore';
import { formatCurrency } from '@/shared/utils/format';

interface LineDraft {
  /** Clave local para React (no se envía al backend). */
  key: string;
  product_id: string;
  quantity: string;
  unit_price: string;
}

function emptyLine(): LineDraft {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product_id: '',
    quantity: '1',
    unit_price: '0',
  };
}

/**
 * Registro de orden de compra (RF-PUR-005).
 *
 * El precio de compra lo informa el usuario (no se resuelve del catálogo).
 * El backend calcula los importes de línea y el total; aquí se muestran en
 * vivo para que el usuario vea el efecto antes de guardar.
 */
export function PurchaseOrderFormPage() {
  const navigate = useNavigate();
  const { createOrder } = usePurchaseOrders();
  const { suppliers, fetchSuppliers } = useSuppliers();
  const { products, fetchProducts } = useProducts();
  // Carga las sucursales al montar (el store no se hidrata solo)
  const { branches, activeBranch } = useBranches();

  const [supplierId, setSupplierId] = React.useState('');
  const [branchId, setBranchId] = React.useState('');
  const [note, setNote] = React.useState('');
  const [lines, setLines] = React.useState<LineDraft[]>([emptyLine()]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  const activeSuppliers = React.useMemo(() => suppliers.filter((s) => s.is_active), [suppliers]);
  const activeBranches = React.useMemo(() => branches.filter((b) => b.is_active), [branches]);
  const activeProducts = React.useMemo(() => products.filter((p) => p.is_active), [products]);

  React.useEffect(() => {
    fetchSuppliers({ isActive: true });
    fetchProducts({ isActive: true });
  }, [fetchSuppliers, fetchProducts]);

  // La sucursal activa del navbar es el destino por defecto
  React.useEffect(() => {
    if (activeBranch?.is_active && !branchId) setBranchId(activeBranch.id);
  }, [activeBranch, branchId]);

  const lineTotal = (line: LineDraft) => {
    const quantity = Number(line.quantity);
    const price = Number(line.unit_price);
    if (Number.isNaN(quantity) || Number.isNaN(price)) return 0;
    return quantity * price;
  };

  const orderTotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  const updateLine = (key: string, changes: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...changes } : line)));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next)
        .filter((k) => k.startsWith(key))
        .forEach((k) => delete next[k]);
      return next;
    });
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.key !== key)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors: Record<string, string> = {};
    if (!supplierId) validationErrors.supplier_id = 'Selecciona un proveedor.';
    if (!branchId) validationErrors.branch_id = 'Selecciona la sucursal de destino.';

    lines.forEach((line) => {
      if (!line.product_id) validationErrors[`${line.key}-product`] = 'Selecciona un producto.';
      const quantity = Number(line.quantity);
      if (Number.isNaN(quantity) || quantity <= 0) {
        validationErrors[`${line.key}-quantity`] = 'La cantidad debe ser mayor que cero.';
      }
      const price = Number(line.unit_price);
      if (Number.isNaN(price) || price < 0) {
        validationErrors[`${line.key}-price`] = 'El precio no puede ser negativo.';
      }
    });

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    try {
      const order = await createOrder({
        supplier_id: supplierId,
        branch_id: branchId,
        note: note.trim() || undefined,
        details: lines.map((line) => ({
          product_id: line.product_id,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
        })),
      });
      toast.success(`La orden ${order.code} fue registrada.`);
      navigate(`/purchases/orders/${order.id}`);
    } catch (err) {
      // El backend devuelve mensajes específicos (padre inactivo, referencia inválida...)
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar la orden.');
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = activeSuppliers.length > 0 && activeBranches.length > 0 && activeProducts.length > 0;

  return (
    <div>
      <CardHeader>
        <CardTitle>Nueva Orden de Compra</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/purchases/orders')}
        >
          Volver
        </Button>
      </CardHeader>

      {!canSubmit && (
        <div className="mb-4 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          Para registrar una orden necesitas al menos un proveedor activo, una sucursal activa y un
          producto activo.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Cabecera */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Proveedor"
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setErrors((prev) => ({ ...prev, supplier_id: '' }));
              }}
              options={activeSuppliers.map((s) => ({ value: s.id, label: s.name }))}
              placeholder={activeSuppliers.length === 0 ? 'No hay proveedores activos' : 'Selecciona un proveedor'}
              error={errors.supplier_id || undefined}
              required
            />
            <Select
              label="Sucursal destino"
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setErrors((prev) => ({ ...prev, branch_id: '' }));
              }}
              options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
              placeholder={activeBranches.length === 0 ? 'No hay sucursales activas' : 'Selecciona la sucursal'}
              error={errors.branch_id || undefined}
              required
            />
          </div>

          <div className="mt-4">
            <Textarea
              label="Nota"
              placeholder="Ej: Reposición de inventario."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              helperText="Opcional."
              maxLength={500}
            />
          </div>
        </Card>

        {/* Líneas */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Líneas de la orden</h3>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={addLine}
            >
              Agregar línea
            </Button>
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => {
              return (
                <div
                  key={line.key}
                  className="rounded-lg border border-border-subtle p-4 bg-surface-secondary"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-text-secondary">Línea {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length === 1}
                      className="p-1.5 rounded-lg text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Quitar línea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-7">
                      <Select
                        label="Producto"
                        value={line.product_id}
                        onChange={(e) => updateLine(line.key, { product_id: e.target.value })}
                        options={activeProducts.map((p) => ({ value: p.id, label: p.name }))}
                        placeholder="Selecciona un producto"
                        error={errors[`${line.key}-product`] || undefined}
                        required
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <Input
                        label="Cantidad"
                        type="number"
                        min="0.01"
                        step="any"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                        error={errors[`${line.key}-quantity`] || undefined}
                        required
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <Input
                        label="Precio unit."
                        type="number"
                        min="0"
                        step="any"
                        value={line.unit_price}
                        onChange={(e) => updateLine(line.key, { unit_price: e.target.value })}
                        error={errors[`${line.key}-price`] || undefined}
                        required
                      />
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-text-tertiary text-right">
                    Importe: <span className="font-medium text-text-secondary">{formatCurrency(lineTotal(line))}</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
            <span className="text-sm text-text-tertiary">Total de la orden:</span>
            <span className="text-lg font-bold text-text-primary">{formatCurrency(orderTotal)}</span>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/purchases/orders')} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving} disabled={!canSubmit}>
            Registrar orden
          </Button>
        </div>
      </form>
    </div>
  );
}
