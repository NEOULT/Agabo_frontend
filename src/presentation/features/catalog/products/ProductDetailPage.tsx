import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Power, Trash2, Star, Layers, Barcode } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Modal } from '@/presentation/components/ui/Modal';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useProducts } from '@/application/hooks/useProducts';
import { useCategories } from '@/application/hooks/useCategories';
import { useBrands } from '@/application/hooks/useBrands';
import { useUnits } from '@/application/hooks/useUnits';
import { toast } from '@/application/stores/useToastStore';
import { formatDate } from '@/shared/utils/format';
import { validate, required, minLength, maxLength, isPositiveNumber } from '@/shared/utils/validations';
import type { ProductCode, ProductUnit } from '@/domain/models';

/**
 * Detalle del producto: datos generales, presentaciones y códigos.
 *
 * Las presentaciones (product_unit) y los códigos (product_code) se
 * administran aquí, que es donde tiene sentido su ciclo de vida.
 */
export function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    selectedProduct,
    getProduct,
    createCode,
    updateCode,
    removeCode,
    createPresentation,
    updatePresentation,
    activatePresentation,
    deactivatePresentation,
  } = useProducts();
  const { categories, fetchCategories } = useCategories();
  const { brands, fetchBrands } = useBrands();
  const { units, fetchUnits } = useUnits();

  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Estado de los modales de códigos
  const [codeFormOpen, setCodeFormOpen] = React.useState(false);
  const [editingCode, setEditingCode] = React.useState<ProductCode | null>(null);
  const [codeValues, setCodeValues] = React.useState({ code: '', type: 'sku', is_primary: false });
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [codeToRemove, setCodeToRemove] = React.useState<ProductCode | null>(null);

  // Estado de los modales de presentaciones
  const [presentationFormOpen, setPresentationFormOpen] = React.useState(false);
  const [editingPresentation, setEditingPresentation] = React.useState<ProductUnit | null>(null);
  const [presentationValues, setPresentationValues] = React.useState({
    unit_id: '',
    name: '',
    factor: '1',
  });
  const [presentationErrors, setPresentationErrors] = React.useState<
    Partial<Record<'unit_id' | 'name' | 'factor', string>>
  >({});
  const [pendingPresentation, setPendingPresentation] = React.useState<
    { type: 'activate' | 'deactivate'; presentation: ProductUnit } | null
  >(null);

  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchUnits();
  }, [fetchCategories, fetchBrands, fetchUnits]);

  React.useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setIsLoading(true);

    getProduct(id)
      .then((product) => {
        if (cancelled) return;
        if (!product) setLoadError('No se encontró el producto solicitado.');
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error al cargar el producto.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // getProduct es estable (useCallback sobre el repositorio singleton)
  }, [id, getProduct]);

  if (isLoading) {
    return <LoadingSpinner label="Cargando producto..." />;
  }

  if (loadError || !selectedProduct || selectedProduct.id !== id) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">
          {loadError ?? 'No se encontró el producto solicitado.'}
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/catalog/products')}>
          Volver a Productos
        </Button>
      </Card>
    );
  }

  const product = selectedProduct;
  const productId = product.id;
  const categoryName = categories.find((c) => c.id === product.category_id)?.name;
  const brandName = brands.find((b) => b.id === product.brand_id)?.name;
  const baseUnitName = units.find((u) => u.id === product.base_unit_id)?.name;
  const unitName = (unitId: string) => units.find((u) => u.id === unitId)?.name ?? '—';

  // --- Códigos -------------------------------------------------------------
  const openCreateCode = () => {
    setEditingCode(null);
    setCodeValues({ code: '', type: 'sku', is_primary: product.codes.length === 0 });
    setCodeError(null);
    setCodeFormOpen(true);
  };

  const openEditCode = (code: ProductCode) => {
    setEditingCode(code);
    setCodeValues({ code: code.code, type: code.type, is_primary: code.is_primary });
    setCodeError(null);
    setCodeFormOpen(true);
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validate(codeValues.code, [
      (v) => required(v, 'El código'),
      (v) => maxLength(v, 50, 'El código'),
    ]);
    setCodeError(error);
    if (error) return;

    setIsSaving(true);
    try {
      if (editingCode) {
        await updateCode(productId, editingCode.id, {
          code: codeValues.code.trim(),
          type: codeValues.type as ProductCode['type'],
          is_primary: codeValues.is_primary,
        });
        toast.success(`El código "${codeValues.code.trim()}" fue actualizado.`);
      } else {
        await createCode({
          product_id: productId,
          code: codeValues.code.trim(),
          type: codeValues.type as ProductCode['type'],
          is_primary: codeValues.is_primary,
        });
        toast.success(`El código "${codeValues.code.trim()}" fue agregado.`);
      }
      setCodeFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el código.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveCode = async () => {
    if (!codeToRemove) return;
    setIsSaving(true);
    try {
      await removeCode(productId, codeToRemove.id);
      toast.success(`El código "${codeToRemove.code}" fue retirado.`);
      setCodeToRemove(null);
    } catch (err) {
      // El backend rechaza retirar el último código (`last_code_cannot_be_removed`)
      toast.error(err instanceof Error ? err.message : 'No se pudo retirar el código.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Presentaciones ------------------------------------------------------
  const openCreatePresentation = () => {
    setEditingPresentation(null);
    setPresentationValues({ unit_id: '', name: '', factor: '1' });
    setPresentationErrors({});
    setPresentationFormOpen(true);
  };

  const openEditPresentation = (presentation: ProductUnit) => {
    setEditingPresentation(presentation);
    setPresentationValues({
      unit_id: presentation.unit_id,
      name: presentation.name,
      factor: String(presentation.factor),
    });
    setPresentationErrors({});
    setPresentationFormOpen(true);
  };

  const handleSubmitPresentation = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<'unit_id' | 'name' | 'factor', string>> = {};
    if (!editingPresentation && !presentationValues.unit_id) {
      errors.unit_id = 'Selecciona la unidad de la presentación.';
    }
    const nameError = validate(presentationValues.name, [
      (v) => required(v, 'El nombre'),
      (v) => minLength(v, 2, 'El nombre'),
      (v) => maxLength(v, 100, 'El nombre'),
    ]);
    if (nameError) errors.name = nameError;

    const factorError = validate(presentationValues.factor, [
      (v) => required(v, 'El factor'),
      (v) => isPositiveNumber(v),
      (v) => (Number(v) > 0 ? null : 'El factor debe ser mayor que cero.'),
    ]);
    if (factorError) errors.factor = factorError;

    setPresentationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      if (editingPresentation) {
        await updatePresentation(productId, editingPresentation.id, {
          name: presentationValues.name.trim(),
          factor: Number(presentationValues.factor),
        });
        toast.success(`La presentación "${presentationValues.name.trim()}" fue actualizada.`);
      } else {
        await createPresentation({
          product_id: productId,
          unit_id: presentationValues.unit_id,
          name: presentationValues.name.trim(),
          factor: Number(presentationValues.factor),
        });
        toast.success(`La presentación "${presentationValues.name.trim()}" fue creada.`);
      }
      setPresentationFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la presentación.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmPresentation = async () => {
    if (!pendingPresentation) return;
    setIsSaving(true);
    try {
      if (pendingPresentation.type === 'deactivate') {
        await deactivatePresentation(productId, pendingPresentation.presentation.id);
        toast.success(`La presentación "${pendingPresentation.presentation.name}" fue desactivada.`);
      } else {
        await activatePresentation(productId, pendingPresentation.presentation.id);
        toast.success(`La presentación "${pendingPresentation.presentation.name}" fue activada.`);
      }
      setPendingPresentation(null);
    } catch (err) {
      // El backend rechaza desactivar la presentación base (`base_presentation_required`)
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <CardHeader>
        <div>
          <CardTitle>{product.name}</CardTitle>
          <p className="mt-1 text-sm text-text-tertiary">
            {categoryName ?? 'Sin categoría'} · {brandName ?? 'Sin marca'} · Unidad base: {baseUnitName ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={product.is_active ? 'success' : 'neutral'}>
            {product.is_active ? 'Activo' : 'Inactivo'}
          </Badge>
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/catalog/products')}
          >
            Volver
          </Button>
          <Button onClick={() => navigate(`/catalog/products/${product.id}/edit`)}>
            Editar producto
          </Button>
        </div>
      </CardHeader>

      {/* Datos generales */}
      <Card>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-text-tertiary">Descripción</dt>
            <dd className="text-text-primary">{product.description ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Unidad base</dt>
            <dd className="text-text-primary">{baseUnitName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Creado</dt>
            <dd className="text-text-primary">{formatDate(product.created_at)}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Última modificación</dt>
            <dd className="text-text-primary">{formatDate(product.updated_at)}</dd>
          </div>
        </dl>
      </Card>

      {/* Códigos */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Barcode className="h-5 w-5 text-text-tertiary" />
            <h3 className="text-lg font-semibold text-text-primary">Códigos</h3>
          </div>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateCode}>
            Agregar código
          </Button>
        </div>

        {product.codes.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            Este producto no tiene códigos. Agrega al menos un SKU para poder usarlo en otros módulos.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {product.codes.map((code) => (
              <li key={code.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-text-primary">{code.code}</span>
                  <Badge variant="neutral">{code.type === 'sku' ? 'SKU' : 'Código de barras'}</Badge>
                  {code.is_primary && (
                    <span className="inline-flex items-center gap-1 text-xs text-brand-600">
                      <Star className="h-3 w-3" /> Principal
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditCode(code)}
                    className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
                    title="Editar código"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCodeToRemove(code)}
                    className="p-2 rounded-lg text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary transition-colors"
                    title="Retirar código"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Presentaciones */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-text-tertiary" />
            <h3 className="text-lg font-semibold text-text-primary">Presentaciones</h3>
          </div>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreatePresentation}>
            Agregar presentación
          </Button>
        </div>

        {product.units.length === 0 ? (
          <p className="text-sm text-text-tertiary">Este producto no tiene presentaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Factor
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {product.units.map((presentation) => {
                  const isBase =
                    presentation.unit_id === product.base_unit_id && presentation.factor === 1;
                  return (
                    <tr key={presentation.id}>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">
                        {presentation.name}
                        {isBase && (
                          <span className="ml-2 text-xs text-text-tertiary">(base)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {unitName(presentation.unit_id)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-text-secondary">
                        {presentation.factor}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={presentation.is_active ? 'success' : 'neutral'}>
                          {presentation.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditPresentation(presentation)}
                            className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
                            title="Editar presentación"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setPendingPresentation({
                                type: presentation.is_active ? 'deactivate' : 'activate',
                                presentation,
                              })
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              presentation.is_active
                                ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                                : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
                            }`}
                            title={presentation.is_active ? 'Desactivar presentación' : 'Activar presentación'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: código */}
      <Modal
        isOpen={codeFormOpen}
        onClose={() => setCodeFormOpen(false)}
        title={editingCode ? 'Editar Código' : 'Agregar Código'}
        size="sm"
        disableBackdropClose={isSaving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCodeFormOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCode} isLoading={isSaving}>
              {editingCode ? 'Guardar' : 'Agregar'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitCode} className="space-y-4" noValidate>
          <Input
            label="Código"
            placeholder="Ej: LAP-001"
            value={codeValues.code}
            onChange={(e) => {
              setCodeValues((prev) => ({ ...prev, code: e.target.value }));
              setCodeError(null);
            }}
            error={codeError ?? undefined}
            helperText="Único dentro de la empresa."
            required
            maxLength={50}
          />
          <Select
            label="Tipo"
            value={codeValues.type}
            onChange={(e) => setCodeValues((prev) => ({ ...prev, type: e.target.value }))}
            options={[
              { value: 'sku', label: 'SKU' },
              { value: 'barcode', label: 'Código de barras' },
            ]}
          />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={codeValues.is_primary}
              onChange={(e) => setCodeValues((prev) => ({ ...prev, is_primary: e.target.checked }))}
              className="h-4 w-4 rounded border-border-input text-brand-600 focus:ring-brand-500"
            />
            Marcar como código principal
          </label>
        </form>
      </Modal>

      {/* Modal: presentación */}
      <Modal
        isOpen={presentationFormOpen}
        onClose={() => setPresentationFormOpen(false)}
        title={editingPresentation ? 'Editar Presentación' : 'Agregar Presentación'}
        disableBackdropClose={isSaving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPresentationFormOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitPresentation} isLoading={isSaving}>
              {editingPresentation ? 'Guardar' : 'Agregar'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitPresentation} className="space-y-4" noValidate>
          {editingPresentation ? (
            <Input
              label="Unidad"
              value={unitName(presentationValues.unit_id)}
              disabled
              helperText="La unidad de la presentación no se puede cambiar."
            />
          ) : (
            <Select
              label="Unidad"
              value={presentationValues.unit_id}
              onChange={(e) => setPresentationValues((prev) => ({ ...prev, unit_id: e.target.value }))}
              options={units
                .filter((u) => u.is_active && !product.units.some((pu) => pu.unit_id === u.id))
                .map((u) => ({ value: u.id, label: u.name }))}
              placeholder="Selecciona la unidad"
              error={presentationErrors.unit_id}
              helperText="Un producto no puede repetir la misma unidad en dos presentaciones."
              required
            />
          )}
          <Input
            label="Nombre"
            placeholder="Ej: Caja x 12"
            value={presentationValues.name}
            onChange={(e) => setPresentationValues((prev) => ({ ...prev, name: e.target.value }))}
            error={presentationErrors.name}
            required
            maxLength={100}
          />
          <Input
            label="Factor"
            type="number"
            min="1"
            placeholder="Ej: 12"
            value={presentationValues.factor}
            onChange={(e) => setPresentationValues((prev) => ({ ...prev, factor: e.target.value }))}
            error={presentationErrors.factor}
            helperText="Cantidad de unidades base que contiene esta presentación."
            required
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={codeToRemove !== null}
        onClose={() => setCodeToRemove(null)}
        onConfirm={handleRemoveCode}
        isLoading={isSaving}
        title="Retirar código"
        message={`¿Retirar el código "${codeToRemove?.code}"? Esta acción no se puede deshacer. Un producto debe conservar al menos un código.`}
        confirmLabel="Retirar"
      />

      <ConfirmDialog
        isOpen={pendingPresentation !== null}
        onClose={() => setPendingPresentation(null)}
        onConfirm={handleConfirmPresentation}
        isLoading={isSaving}
        variant={pendingPresentation?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingPresentation?.type === 'deactivate' ? 'Desactivar presentación' : 'Activar presentación'}
        message={
          pendingPresentation?.type === 'deactivate'
            ? `¿Desactivar "${pendingPresentation.presentation.name}"? La presentación base no se puede desactivar mientras el producto esté activo.`
            : `¿Activar "${pendingPresentation?.presentation.name}"?`
        }
        confirmLabel={pendingPresentation?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
