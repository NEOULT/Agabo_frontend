import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Power, Tags, DollarSign, Ban } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Modal } from '@/presentation/components/ui/Modal';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { usePriceLists } from '@/application/hooks/usePriceLists';
import { usePriceProducts } from '@/application/hooks/usePriceProducts';
import { useProducts } from '@/application/hooks/useProducts';
import { useBranches } from '@/application/hooks/useBranches';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { formatCurrency } from '@/shared/utils/format';
import { validate, required, minLength, maxLength, isPositiveNumber } from '@/shared/utils/validations';
import type { PriceList, PriceProduct } from '@/domain/models';

interface PriceFormValues {
  product_id: string;
  product_unit_id: string;
  price: string;
}

const emptyPriceForm: PriceFormValues = { product_id: '', product_unit_id: '', price: '' };

/**
 * Precios de una lista (catalog.price_product).
 *
 * Un precio liga la lista con una presentación de un producto (RN-CAT-007: un
 * precio vigente por lista y presentación). Se edita el valor con PATCH y el
 * precio se retira con desactivación, nunca se elimina.
 *
 * El backend exige lista activa para asignar precios, y producto y
 * presentación activos para asignar o reactivar (`parent_inactive`).
 */
export function PriceListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    getPriceList,
    updatePriceList,
    activatePriceList,
    deactivatePriceList,
  } = usePriceLists();
  const {
    priceProducts,
    isLoading: isPricesLoading,
    error: pricesError,
    fetchPriceProducts,
    clearPriceProducts,
    createPriceProduct,
    updatePriceProduct,
    activatePriceProduct,
    deactivatePriceProduct,
  } = usePriceProducts();
  const { products, fetchProducts } = useProducts();
  const { branches } = useBranches();

  const [priceList, setPriceList] = React.useState<PriceList | null>(null);
  const [isLoadingList, setIsLoadingList] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  // --- Nombre de la lista ---------------------------------------------------
  const [listFormOpen, setListFormOpen] = React.useState(false);
  const [listName, setListName] = React.useState('');
  const [listNameError, setListNameError] = React.useState<string | undefined>(undefined);
  const [isSavingList, setIsSavingList] = React.useState(false);
  const [pendingListAction, setPendingListAction] = React.useState<'activate' | 'deactivate' | null>(
    null,
  );
  const [isListActionLoading, setIsListActionLoading] = React.useState(false);

  // --- Precios --------------------------------------------------------------
  /** `null` cerrado, `'create'` alta y un precio para editar su valor. */
  const [priceForm, setPriceForm] = React.useState<'create' | PriceProduct | null>(null);
  /** Búsqueda del selector de producto: no comparte estado con la tabla. */
  const [productSearch, setProductSearch] = React.useState('');
  const [priceValues, setPriceValues] = React.useState<PriceFormValues>(emptyPriceForm);
  const [priceFieldErrors, setPriceFieldErrors] = React.useState<
    Partial<Record<keyof PriceFormValues, string>>
  >({});
  const [isSavingPrice, setIsSavingPrice] = React.useState(false);
  const [pendingPriceAction, setPendingPriceAction] = React.useState<
    { type: 'activate' | 'deactivate'; priceProduct: PriceProduct } | null
  >(null);
  const [isPriceActionLoading, setIsPriceActionLoading] = React.useState(false);

  const { can } = usePermissions();
  const canUpdateList = can('catalog.price_lists:update');
  const canSetActiveList = can('catalog.price_lists:deactivate');
  const canCreatePrice = can('catalog.price_products:create');
  const canUpdatePrice = can('catalog.price_products:update');
  const canSetActivePrice = can('catalog.price_products:deactivate');

  React.useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setIsLoadingList(true);

    getPriceList(id)
      .then((list) => {
        if (cancelled) return;
        if (!list) {
          setLoadError('No se encontró la lista de precios solicitada.');
          return;
        }
        setPriceList(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error al cargar la lista de precios.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, getPriceList]);

  // Los precios guardan solo identificadores: los productos dan el nombre.
  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  React.useEffect(() => {
    if (!id) return;
    clearPriceProducts();
    fetchPriceProducts({ priceListId: id });
  }, [id, fetchPriceProducts, clearPriceProducts]);

  const findProduct = (productId: string) => products.find((p) => p.id === productId);
  const productName = (productId: string) => findProduct(productId)?.name ?? '—';
  const unitName = (productId: string, unitId: string) =>
    findProduct(productId)?.units.find((u) => u.id === unitId)?.name ?? '—';

  // --- Nombre de la lista: guardar -----------------------------------------
  const openListForm = () => {
    if (!priceList) return;
    setListName(priceList.name);
    setListNameError(undefined);
    setListFormOpen(true);
  };

  const handleSaveListName = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameError = validate(listName, [
      (v) => required(v, 'El nombre'),
      (v) => minLength(v, 3, 'El nombre'),
      (v) => maxLength(v, 200, 'El nombre'),
    ]);
    if (nameError) {
      setListNameError(nameError);
      return;
    }

    if (!priceList) return;

    setIsSavingList(true);
    try {
      const name = listName.trim();
      const updated = await updatePriceList(priceList.id, { name });
      setPriceList(updated);
      toast.success(`La lista "${name}" fue actualizada.`);
      setListFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la lista de precios.');
    } finally {
      setIsSavingList(false);
    }
  };

  const handleConfirmListAction = async () => {
    if (!pendingListAction || !priceList) return;

    setIsListActionLoading(true);
    try {
      const updated =
        pendingListAction === 'deactivate'
          ? await deactivatePriceList(priceList.id)
          : await activatePriceList(priceList.id);
      setPriceList(updated);
      toast.success(
        pendingListAction === 'deactivate'
          ? `La lista "${priceList.name}" fue desactivada.`
          : `La lista "${priceList.name}" fue activada.`,
      );
      setPendingListAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsListActionLoading(false);
    }
  };

  // --- Precios: alta --------------------------------------------------------
  const openCreatePrice = () => {
    setPriceValues(emptyPriceForm);
    setPriceFieldErrors({});
    setProductSearch('');
    setPriceForm('create');
  };

  const openEditPrice = (priceProduct: PriceProduct) => {
    setPriceValues({
      product_id: priceProduct.product_id,
      product_unit_id: priceProduct.product_unit_id,
      price: String(priceProduct.price),
    });
    setPriceFieldErrors({});
    setPriceForm(priceProduct);
  };

  const handleChangePrice =
    (field: keyof PriceFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setPriceValues((prev) => ({
        ...prev,
        [field]: value,
        // Al cambiar de producto, la presentación elegida deja de aplicar.
        ...(field === 'product_id' ? { product_unit_id: '' } : {}),
      }));
      if (priceFieldErrors[field]) {
        setPriceFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleSubmitPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !priceForm) return;

    const editingPrice = priceForm === 'create' ? null : priceForm;
    const errors: Partial<Record<keyof PriceFormValues, string>> = {};

    if (!editingPrice) {
      const productError = required(priceValues.product_id, 'El producto');
      if (productError) errors.product_id = productError;

      const unitError = required(priceValues.product_unit_id, 'La presentación');
      if (unitError) errors.product_unit_id = unitError;
    }

    const priceError = validate(priceValues.price, [
      (v) => required(v, 'El precio'),
      isPositiveNumber,
    ]);
    if (priceError) errors.price = priceError;

    setPriceFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingPrice(true);
    try {
      const price = Number(priceValues.price);

      if (editingPrice) {
        await updatePriceProduct(editingPrice.id, { price });
        toast.success('El precio fue actualizado.');
      } else {
        const created = await createPriceProduct({
          price_list_id: id,
          product_id: priceValues.product_id,
          product_unit_id: priceValues.product_unit_id,
          price,
        });
        toast.success(
          `Se asignó ${formatCurrency(created.price)} a "${productName(created.product_id)}".`,
        );
      }
      setPriceForm(null);
    } catch (err) {
      // El backend responde `price_product_already_exists`, `parent_inactive`
      // o `validation_error` con un mensaje claro.
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el precio.');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleConfirmPriceAction = async () => {
    if (!pendingPriceAction) return;

    setIsPriceActionLoading(true);
    try {
      if (pendingPriceAction.type === 'deactivate') {
        await deactivatePriceProduct(pendingPriceAction.priceProduct.id);
        toast.success('El precio fue retirado de la lista.');
      } else {
        await activatePriceProduct(pendingPriceAction.priceProduct.id);
        toast.success('El precio volvió a estar vigente.');
      }
      setPendingPriceAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsPriceActionLoading(false);
    }
  };

  // --- Filtros y opciones ---------------------------------------------------
  const visiblePrices = React.useMemo(() => {
    const term = search.trim().toLowerCase();

    return priceProducts.filter((p) => {
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;
      if (!term) return true;

      const product = productName(p.product_id).toLowerCase();
      const unit = unitName(p.product_id, p.product_unit_id).toLowerCase();
      return product.includes(term) || unit.includes(term);
    });
  }, [priceProducts, search, statusFilter, products]);

  const productTerm = productSearch.trim().toLowerCase();
  const activeProductOptions = products
    .filter((p) => p.is_active)
    .filter((p) => !productTerm || p.name.toLowerCase().includes(productTerm))
    .map((p) => ({ value: p.id, label: p.name }));

  const unitOptions = (findProduct(priceValues.product_id)?.units ?? [])
    .filter((u) => u.is_active)
    .map((u) => ({ value: u.id, label: u.name }));

  const columns: TableColumn<PriceProduct>[] = [
    {
      key: 'product_id',
      header: 'Producto',
      cell: (p) => <span className="font-medium text-text-primary">{productName(p.product_id)}</span>,
    },
    {
      key: 'product_unit_id',
      header: 'Presentación',
      cell: (p) => (
        <span className="text-text-secondary">{unitName(p.product_id, p.product_unit_id)}</span>
      ),
    },
    {
      key: 'price',
      header: 'Precio',
      align: 'right',
      cell: (p) => (
        <span className="font-medium tabular-nums text-text-primary">{formatCurrency(p.price)}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (p) => (
        <Badge variant={p.is_active ? 'success' : 'neutral'}>
          {p.is_active ? 'Vigente' : 'Retirado'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdatePrice && (
            <button
              onClick={() => openEditPrice(p)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar precio"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActivePrice && (
            <button
              onClick={() =>
                setPendingPriceAction({
                  type: p.is_active ? 'deactivate' : 'activate',
                  priceProduct: p,
                })
              }
              className={`p-2 rounded-lg transition-colors ${
                p.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={p.is_active ? 'Retirar precio' : 'Reactivar precio'}
            >
              {p.is_active ? <Ban className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </button>
          )}
        </div>
      ),
    },
  ];

  if (isLoadingList) {
    return <LoadingSpinner label="Cargando lista de precios..." />;
  }

  if (loadError || !priceList) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">
          {loadError ?? 'No se encontró la lista de precios solicitada.'}
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => navigate('/catalog/price-lists')}
        >
          Volver a Listas de precios
        </Button>
      </Card>
    );
  }

  const hasFilters = Boolean(search || statusFilter);
  /** Nombre del producto del precio pendiente, para el diálogo de confirmación. */
  const pendingPriceName = pendingPriceAction
    ? productName(pendingPriceAction.priceProduct.product_id)
    : '';

  return (
    <div>
      <CardHeader>
        <CardTitle>Precios de la lista</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/catalog/price-lists')}
          >
            Volver
          </Button>
          {canCreatePrice && (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreatePrice}
              disabled={!priceList.is_active}
              title={
                priceList.is_active
                  ? undefined
                  : 'Activa la lista para asignar precios nuevos.'
              }
            >
              Asignar Precio
            </Button>
          )}
        </div>
      </CardHeader>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold text-text-primary">{priceList.name}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-text-tertiary">
              <span>
                Sucursal: {branches.find((b) => b.id === priceList.branch_id)?.name ?? '—'}
              </span>
              <Badge variant={priceList.is_active ? 'success' : 'neutral'}>
                {priceList.is_active ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
            {!priceList.is_active && (
              <p className="mt-2 text-sm text-semantic-warning-700">
                La lista está inactiva: no se aplica a nuevas ventas ni admite precios nuevos.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canUpdateList && (
              <Button
                variant="secondary"
                leftIcon={<Pencil className="h-4 w-4" />}
                onClick={openListForm}
              >
                Editar nombre
              </Button>
            )}
            {canSetActiveList && (
              <Button
                variant={priceList.is_active ? 'danger' : 'secondary'}
                leftIcon={<Power className="h-4 w-4" />}
                onClick={() =>
                  setPendingListAction(priceList.is_active ? 'deactivate' : 'activate')
                }
              >
                {priceList.is_active ? 'Desactivar' : 'Activar'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {pricesError && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {pricesError}
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por producto o presentación..."
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'active', label: 'Vigentes' },
                { value: 'inactive', label: 'Retirados' },
              ]}
              placeholder="Todos los estados"
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={visiblePrices}
          rowKey={(p) => p.id}
          isLoading={isPricesLoading}
          emptyState={
            <EmptyState
              icon={<DollarSign className="h-12 w-12" />}
              title={hasFilters ? 'Sin resultados' : 'La lista no tiene precios'}
              description={
                hasFilters
                  ? 'No se encontraron precios que coincidan con la búsqueda.'
                  : 'Asigna el precio de cada producto y presentación para venderlos en esta sucursal.'
              }
              action={
                !hasFilters && canCreatePrice && priceList.is_active ? (
                  <Button onClick={openCreatePrice}>+ Asignar Precio</Button>
                ) : undefined
              }
            />
          }
        />
      </Card>

      {/* Alta de precio */}
      <Modal
        isOpen={priceForm === 'create'}
        onClose={() => setPriceForm(null)}
        title="Asignar Precio"
        subtitle={priceList.name}
        icon={<Tags className="h-5 w-5" />}
        size="lg"
        disableBackdropClose={isSavingPrice}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPriceForm(null)} disabled={isSavingPrice}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitPrice} isLoading={isSavingPrice}>
              Asignar precio
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitPrice} className="space-y-4" noValidate>
          <Input
            label="Buscar producto"
            placeholder="Filtra la lista de productos..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            helperText="Solo aparecen productos activos."
          />

          <Select
            label="Producto"
            value={priceValues.product_id}
            onChange={handleChangePrice('product_id')}
            options={activeProductOptions}
            placeholder="Selecciona un producto"
            error={priceFieldErrors.product_id}
            required
          />

          <Select
            label="Presentación"
            value={priceValues.product_unit_id}
            onChange={handleChangePrice('product_unit_id')}
            options={unitOptions}
            placeholder={
              priceValues.product_id ? 'Selecciona una presentación' : 'Elige un producto primero'
            }
            error={priceFieldErrors.product_unit_id}
            helperText="Cada presentación tiene su propio precio (RN-CAT-007)."
            disabled={!priceValues.product_id}
            required
          />

          <Input
            label="Precio"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Ej: 15000"
            value={priceValues.price}
            onChange={handleChangePrice('price')}
            error={priceFieldErrors.price}
            helperText="En la moneda de la empresa. No puede ser negativo."
            required
          />
        </form>
      </Modal>

      {/* Edición del valor */}
      <Modal
        isOpen={priceForm !== null && priceForm !== 'create'}
        onClose={() => setPriceForm(null)}
        title="Editar Precio"
        subtitle={
          priceForm !== null && priceForm !== 'create'
            ? `${productName(priceForm.product_id)} — ${unitName(priceForm.product_id, priceForm.product_unit_id)}`
            : undefined
        }
        icon={<DollarSign className="h-5 w-5" />}
        disableBackdropClose={isSavingPrice}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPriceForm(null)} disabled={isSavingPrice}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitPrice} isLoading={isSavingPrice}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitPrice} className="space-y-4" noValidate>
          <Input
            label="Precio"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={priceValues.price}
            onChange={handleChangePrice('price')}
            error={priceFieldErrors.price}
            helperText="El producto y la presentación no se pueden cambiar; retira el precio y asigna uno nuevo."
            required
          />
        </form>
      </Modal>

      {/* Nombre de la lista */}
      <Modal
        isOpen={listFormOpen}
        onClose={() => setListFormOpen(false)}
        title="Editar Lista de Precios"
        disableBackdropClose={isSavingList}
        footer={
          <>
            <Button variant="secondary" onClick={() => setListFormOpen(false)} disabled={isSavingList}>
              Cancelar
            </Button>
            <Button onClick={handleSaveListName} isLoading={isSavingList}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveListName} className="space-y-4" noValidate>
          <Input
            label="Nombre"
            value={listName}
            onChange={(e) => {
              setListName(e.target.value);
              if (listNameError) setListNameError(undefined);
            }}
            error={listNameError}
            helperText="La sucursal de la lista no se puede cambiar."
            required
            maxLength={200}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={pendingListAction !== null}
        onClose={() => setPendingListAction(null)}
        onConfirm={handleConfirmListAction}
        isLoading={isListActionLoading}
        variant={pendingListAction === 'deactivate' ? 'danger' : 'primary'}
        title={pendingListAction === 'deactivate' ? 'Desactivar lista' : 'Activar lista'}
        message={
          pendingListAction === 'deactivate'
            ? `¿Desactivar "${priceList.name}"? Dejará de aplicarse a nuevas ventas, pero conserva sus precios e historial.`
            : `¿Activar "${priceList.name}"? Volverá a aplicarse a las ventas de su sucursal.`
        }
        confirmLabel={pendingListAction === 'deactivate' ? 'Desactivar' : 'Activar'}
      />

      <ConfirmDialog
        isOpen={pendingPriceAction !== null}
        onClose={() => setPendingPriceAction(null)}
        onConfirm={handleConfirmPriceAction}
        isLoading={isPriceActionLoading}
        variant={pendingPriceAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingPriceAction?.type === 'deactivate' ? 'Retirar precio' : 'Reactivar precio'}
        message={
          pendingPriceAction?.type === 'deactivate'
            ? `¿Retirar el precio de "${pendingPriceName}" en esta lista? El precio conserva su historial pero deja de aplicarse a nuevas ventas.`
            : `¿Reactivar el precio de "${pendingPriceName}"? El producto, la presentación y la lista deben estar activos.`
        }
        confirmLabel={pendingPriceAction?.type === 'deactivate' ? 'Retirar' : 'Reactivar'}
      />
    </div>
  );
}
