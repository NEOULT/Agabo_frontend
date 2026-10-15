import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Power, Trash2, Star } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { Modal } from '@/presentation/components/ui/Modal';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useProducts } from '@/application/hooks/useProducts';
import { useCategories } from '@/application/hooks/useCategories';
import { useBrands } from '@/application/hooks/useBrands';
import { useUnits } from '@/application/hooks/useUnits';
import { usePermissions } from '@/application/hooks/usePermissions';
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
    updateProduct,
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

  const { can } = usePermissions();
  const canUpdate = can('catalog.products:update');

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

  // Códigos y presentaciones alternan dentro de la misma tarjeta (tabs)
  const [activeTab, setActiveTab] = React.useState<'codes' | 'presentations'>('codes');

  // Edición en línea de los datos generales (RF-CAT-015)
  const [isEditingInfo, setIsEditingInfo] = React.useState(false);
  const [infoValues, setInfoValues] = React.useState({
    name: '',
    description: '',
    category_id: '',
    brand_id: '',
  });
  const [infoErrors, setInfoErrors] = React.useState<
    Partial<Record<'name' | 'description', string>>
  >({});

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

  // Los campos del formulario están siempre en el DOM (deshabilitados en modo
  // lectura); se sincronizan con el producto salvo mientras se está editando.
  // Al cancelar o guardar, isEditingInfo pasa a false y esto restaura los valores.
  React.useEffect(() => {
    if (!selectedProduct || isEditingInfo) return;
    setInfoValues({
      name: selectedProduct.name,
      description: selectedProduct.description ?? '',
      category_id: selectedProduct.category_id ?? '',
      brand_id: selectedProduct.brand_id ?? '',
    });
  }, [selectedProduct, isEditingInfo]);

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

  // --- Datos generales (edición en línea) ----------------------------------
  // Los values ya están sincronizados con el producto (effect de arriba), así
  // que aquí solo se desbloquea la edición.
  const startEditInfo = () => {
    setInfoErrors({});
    setIsEditingInfo(true);
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<'name' | 'description', string>> = {};
    const nameError = validate(infoValues.name, [
      (v) => required(v, 'El nombre'),
      (v) => minLength(v, 2, 'El nombre'),
      (v) => maxLength(v, 200, 'El nombre'),
    ]);
    if (nameError) errors.name = nameError;
    if (infoValues.description.trim().length > 500) {
      errors.description = 'La descripción no puede superar 500 caracteres.';
    }

    setInfoErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      await updateProduct(productId, {
        name: infoValues.name.trim(),
        description: infoValues.description.trim() || null,
        category_id: infoValues.category_id || null,
        brand_id: infoValues.brand_id || null,
      });
      toast.success('Los datos del producto fueron actualizados.');
      setIsEditingInfo(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.');
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
        </div>
      </CardHeader>

      {/* Fila superior: los datos del producto conviven con los códigos para
          aprovechar el ancho; las presentaciones quedan arriba, debajo. */}
      {/* Sin items-start: ambas tarjetas se estiran a la misma altura, por más
          códigos que tenga el producto. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos generales: se editan aquí mismo, sin salir del detalle.
            flex-col + flex-1 hace que el panel acompañe la altura de Códigos. */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Datos del producto</h3>
            {/* invisible (no condicional) para que el header no cambie de altura */}
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={startEditInfo}
              className={!canUpdate || isEditingInfo ? 'invisible' : ''}
            >
              Editar
            </Button>
          </div>

          {/* Estructura única en el DOM: los campos solo alternan entre
              deshabilitados (lectura) y editables. La altura no cambia nunca. */}
          <form onSubmit={handleSaveInfo} className="flex flex-1 flex-col" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm flex-1 content-between">
              <Input
                label="Nombre"
                value={infoValues.name}
                onChange={(e) => {
                  setInfoValues((prev) => ({ ...prev, name: e.target.value }));
                  if (infoErrors.name) setInfoErrors((prev) => ({ ...prev, name: undefined }));
                }}
                error={infoErrors.name}
                disabled={!isEditingInfo}
                required
                maxLength={200}
              />
              <Select
                label="Categoría"
                value={infoValues.category_id}
                onChange={(e) =>
                  setInfoValues((prev) => ({ ...prev, category_id: e.target.value }))
                }
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Sin categoría"
                disabled={!isEditingInfo}
              />
              <Select
                label="Marca"
                value={infoValues.brand_id}
                onChange={(e) => setInfoValues((prev) => ({ ...prev, brand_id: e.target.value }))}
                options={brands.map((b) => ({ value: b.id, label: b.name }))}
                placeholder="Sin marca"
                disabled={!isEditingInfo}
              />
              <Input
                label="Unidad base"
                value={baseUnitName ?? '—'}
                disabled
                title="La unidad base no se puede cambiar después de crear el producto."
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Descripción"
                  placeholder="Descripción opcional del producto"
                  value={infoValues.description}
                  onChange={(e) => {
                    setInfoValues((prev) => ({ ...prev, description: e.target.value }));
                    if (infoErrors.description) {
                      setInfoErrors((prev) => ({ ...prev, description: undefined }));
                    }
                  }}
                  error={infoErrors.description}
                  disabled={!isEditingInfo}
                  maxLength={500}
                />
              </div>
              <div>
                <p className="text-text-tertiary">Creado</p>
                <p className="text-text-primary">{formatDate(product.created_at)}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Última modificación</p>
                <p className="text-text-primary">{formatDate(product.updated_at)}</p>
              </div>
              {/* Reserva su espacio en modo lectura: la tarjeta no cambia de altura */}
              <div
                className={`sm:col-span-2 flex items-center justify-end gap-3 pt-1 ${
                  isEditingInfo ? '' : 'invisible'
                }`}
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setInfoErrors({});
                    setIsEditingInfo(false);
                  }}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  Guardar cambios
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Códigos y presentaciones alternan en la misma tarjeta */}
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div
              className="inline-flex rounded-lg border border-border-subtle bg-surface-secondary p-1"
              role="tablist"
              aria-label="Códigos y presentaciones"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'codes'}
                onClick={() => setActiveTab('codes')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'codes'
                    ? 'bg-surface-primary text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                Códigos ({product.codes.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'presentations'}
                onClick={() => setActiveTab('presentations')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'presentations'
                    ? 'bg-surface-primary text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                Presentaciones ({product.units.length})
              </button>
            </div>
            {activeTab === 'codes' ? (
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateCode}>
                Agregar código
              </Button>
            ) : (
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={openCreatePresentation}
              >
                Agregar presentación
              </Button>
            )}
          </div>

          {activeTab === 'codes' ? (
            product.codes.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                Este producto no tiene códigos. Agrega al menos un SKU para poder usarlo en otros
                módulos.
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {product.codes.map((code) => (
                  <li key={code.id} className="flex items-center justify-between gap-2 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-sm text-text-primary">{code.code}</span>
                      <Badge variant="neutral">
                        {code.type === 'sku' ? 'SKU' : 'Código de barras'}
                      </Badge>
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
            )
          ) : product.units.length === 0 ? (
            <p className="text-sm text-text-tertiary">
              Este producto no tiene presentaciones registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      Unidad
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      Factor
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
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
                        <td className="px-3 py-3 text-sm font-medium text-text-primary">
                          {presentation.name}
                          {isBase && (
                            <span className="ml-2 text-xs text-text-tertiary">(base)</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-text-secondary">
                          {unitName(presentation.unit_id)}
                        </td>
                        <td className="px-3 py-3 text-sm text-right text-text-secondary">
                          {presentation.factor}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant={presentation.is_active ? 'success' : 'neutral'}>
                            {presentation.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
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
      </div>

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
