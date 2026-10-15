import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { useInventory } from '@/application/hooks/useInventory';
import { useMovementTypes } from '@/application/hooks/useMovementTypes';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { useProducts } from '@/application/hooks/useProducts';
import { useLocations } from '@/application/hooks/useLocations';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { toast } from '@/application/stores/useToastStore';
import type { CreateMovementDetailDTO, Location } from '@/domain/models';

interface LineState {
  key: string;
  productId: string;
  quantity: string;
  originLocationId: string;
  destinationLocationId: string;
}

let lineCounter = 0;
function newLine(): LineState {
  lineCounter += 1;
  return {
    key: `line-${Date.now()}-${lineCounter}`,
    productId: '',
    quantity: '1',
    originLocationId: '',
    destinationLocationId: '',
  };
}

const PURPOSE_LABEL: Record<string, string> = {
  sale_out: 'salida por venta',
  purchase_in: 'entrada por compra',
};

/**
 * Registro de un movimiento de inventario (RF-INV-014).
 *
 * La dirección surge de los almacenes (RN-INV-007): solo destino es entrada,
 * solo origen es salida y ambos es transferencia. Cada línea lleva su producto,
 * cantidad y, opcionalmente, la ubicación de origen/destino dentro de su
 * almacén (RN-INV-011).
 */
export function MovementFormPage() {
  const navigate = useNavigate();
  const { createMovement } = useInventory();
  const { movementTypes, fetchMovementTypes } = useMovementTypes();
  const { warehouses, fetchWarehouses } = useWarehouses();
  const { products, fetchProducts } = useProducts();
  const { fetchLocations } = useLocations();
  const activeBranch = useBranchStore((s) => s.activeBranch);

  const [movementTypeId, setMovementTypeId] = React.useState('');
  const [originWarehouseId, setOriginWarehouseId] = React.useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [note, setNote] = React.useState('');
  const [lines, setLines] = React.useState<LineState[]>([newLine()]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [originLocations, setOriginLocations] = React.useState<Location[]>([]);
  const [destinationLocations, setDestinationLocations] = React.useState<Location[]>([]);

  React.useEffect(() => {
    fetchMovementTypes({ isActive: true });
    fetchProducts({ isActive: true });
  }, [fetchMovementTypes, fetchProducts]);

  React.useEffect(() => {
    fetchWarehouses({ branchId: activeBranch?.id || undefined });
  }, [fetchWarehouses, activeBranch?.id]);

  // Ubicaciones del almacén de origen / destino seleccionados
  React.useEffect(() => {
    if (!originWarehouseId) {
      setOriginLocations([]);
      return;
    }
    let cancelled = false;
    fetchLocations({ warehouseId: originWarehouseId, isActive: true }).then((data) => {
      if (!cancelled) setOriginLocations(data);
    });
    return () => {
      cancelled = true;
    };
  }, [originWarehouseId, fetchLocations]);

  React.useEffect(() => {
    if (!destinationWarehouseId) {
      setDestinationLocations([]);
      return;
    }
    let cancelled = false;
    fetchLocations({ warehouseId: destinationWarehouseId, isActive: true }).then((data) => {
      if (!cancelled) setDestinationLocations(data);
    });
    return () => {
      cancelled = true;
    };
  }, [destinationWarehouseId, fetchLocations]);

  const activeWarehouses = React.useMemo(
    () => warehouses.filter((w) => w.is_active),
    [warehouses],
  );

  const updateLine = (key: string, changes: Partial<LineState>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...changes } : line)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!movementTypeId) nextErrors.movementTypeId = 'Selecciona un tipo de movimiento.';
    if (!originWarehouseId && !destinationWarehouseId) {
      nextErrors.warehouses = 'Indica al menos un almacén de origen o de destino.';
    }
    if (originWarehouseId && destinationWarehouseId && originWarehouseId === destinationWarehouseId) {
      nextErrors.warehouses = 'El almacén de origen y el de destino deben ser distintos.';
    }

    const details: CreateMovementDetailDTO[] = [];
    lines.forEach((line, index) => {
      if (!line.productId) {
        nextErrors[`line-${index}`] = 'Selecciona un producto en cada línea.';
        return;
      }
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        nextErrors[`line-${index}`] = 'La cantidad debe ser mayor que cero.';
        return;
      }
      details.push({
        product_id: line.productId,
        quantity,
        origin_location_id: line.originLocationId || null,
        destination_location_id: line.destinationLocationId || null,
      });
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await createMovement({
        movement_type_id: movementTypeId,
        origin_warehouse_id: originWarehouseId || null,
        destination_warehouse_id: destinationWarehouseId || null,
        reference: reference.trim() || null,
        note: note.trim() || null,
        details,
      });
      toast.success('El movimiento fue registrado y las existencias se actualizaron.');
      navigate('/inventory/movements');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar el movimiento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <CardHeader>
        <CardTitle>Nuevo Movimiento</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/inventory/movements')}
        >
          Volver
        </Button>
      </CardHeader>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Cabecera del movimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tipo de movimiento"
              value={movementTypeId}
              onChange={(e) => setMovementTypeId(e.target.value)}
              options={movementTypes.map((t) => ({
                value: t.id,
                label: t.purpose ? `${t.name} (${PURPOSE_LABEL[t.purpose]})` : t.name,
              }))}
              placeholder="Selecciona un tipo"
              error={errors.movementTypeId}
              required
            />
            <Input
              label="Referencia"
              placeholder="Ej: TR-0001"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              helperText="Opcional. Documento que respalda el movimiento."
            />
            <Select
              label="Almacén de origen"
              value={originWarehouseId}
              onChange={(e) => setOriginWarehouseId(e.target.value)}
              options={[
                { value: '', label: 'Sin origen (solo entrada)' },
                ...activeWarehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
            <Select
              label="Almacén de destino"
              value={destinationWarehouseId}
              onChange={(e) => setDestinationWarehouseId(e.target.value)}
              options={[
                { value: '', label: 'Sin destino (solo salida)' },
                ...activeWarehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
          </div>

          {errors.warehouses && (
            <p className="text-sm text-semantic-danger-600">{errors.warehouses}</p>
          )}

          <Textarea
            label="Nota"
            placeholder="Detalle opcional del movimiento"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />

          {/* Líneas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-secondary">Líneas</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setLines((prev) => [...prev, newLine()])}
              >
                Agregar línea
              </Button>
            </div>

            {lines.map((line, index) => (
              <div
                key={line.key}
                className="rounded-lg border border-border-subtle p-4 space-y-3 bg-surface-secondary/40"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label="Producto"
                      value={line.productId}
                      onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                      options={products.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder="Selecciona un producto"
                      required
                    />
                    <Input
                      label="Cantidad"
                      type="number"
                      min={0}
                      step="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      required
                    />
                    {originWarehouseId && (
                      <Select
                        label="Ubicación de origen"
                        value={line.originLocationId}
                        onChange={(e) =>
                          updateLine(line.key, { originLocationId: e.target.value })
                        }
                        options={[
                          { value: '', label: 'Sin ubicación (opcional)' },
                          ...originLocations.map((l) => ({ value: l.id, label: l.name })),
                        ]}
                      />
                    )}
                    {destinationWarehouseId && (
                      <Select
                        label="Ubicación de destino"
                        value={line.destinationLocationId}
                        onChange={(e) =>
                          updateLine(line.key, { destinationLocationId: e.target.value })
                        }
                        options={[
                          { value: '', label: 'Sin ubicación (opcional)' },
                          ...destinationLocations.map((l) => ({ value: l.id, label: l.name })),
                        ]}
                      />
                    )}
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      className="mt-6 p-2 rounded-lg text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary transition-colors"
                      title="Quitar línea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {errors[`line-${index}`] && (
                  <p className="text-sm text-semantic-danger-600">{errors[`line-${index}`]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/inventory/movements')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Registrar movimiento
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
