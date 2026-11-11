import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { SearchableSelect } from '@/presentation/components/ui/SearchableSelect';
import { Modal } from '@/presentation/components/ui/Modal';
import { useProducts } from '@/application/hooks/useProducts';
import { useCategories } from '@/application/hooks/useCategories';
import { useBrands } from '@/application/hooks/useBrands';
import { useUnits } from '@/application/hooks/useUnits';
import { useSuppliers } from '@/application/hooks/useSuppliers';
import { useLocations } from '@/application/hooks/useLocations';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { usePriceLists } from '@/application/hooks/usePriceLists';
import { useProductLoader } from '@/application/hooks/useProductLoader';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength } from '@/shared/utils/validations';
import {
  brandPrefix,
  buildProductName,
  nextSku,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
} from '@/shared/utils/productLoad';

interface FormValues {
  barcode: string;
  sku: string;
  name: string;
  supplier_code: string;
  category_id: string;
  brand_id: string;
  base_unit_id: string;
  description: string;
  supplier_id: string;
  location_id: string;
  warehouse_id: string;
  quantity: string;
  stock: string;
  unit_price: string;
  price_list_id: string;
  invoice_number: string;
  picking_number: string;
}

const emptyForm: FormValues = {
  barcode: '',
  sku: '',
  name: '',
  supplier_code: '',
  category_id: '',
  brand_id: '',
  base_unit_id: '',
  description: '',
  supplier_id: '',
  location_id: '',
  warehouse_id: '',
  quantity: '',
  stock: '',
  unit_price: '',
  price_list_id: '',
  invoice_number: '',
  picking_number: '',
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

function toNumber(raw: string): number {
  const value = Number(raw.replace(',', '.').trim());
  return Number.isFinite(value) ? value : NaN;
}

/** Código sugerido para una ubicación nueva a partir de su nombre. */
function suggestLocationCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);
}

/**
 * Alta de producto (RF-CAT-001) con los datos que acompañan a la carga real de
 * mercancía.
 *
 * Además de los datos del catálogo (nombre, marca, categoría y unidad base),
 * aquí se captura lo que viene en la factura: código de barras, código del
 * proveedor, proveedor, ubicación, existencia inicial, precio unitario, número
 * de factura y número de picking. El SKU se propone solo (marca + serial
 * ascendente) y se puede corregir.
 *
 * El backend reparte esos datos: producto, códigos, existencias y precios. La
 * creación se hace en ese orden desde `useProductLoader`; si un paso posterior
 * falla, el producto queda creado y se avisa qué faltó.
 */
export function ProductFormPage() {
  const navigate = useNavigate();

  const { products, fetchProducts } = useProducts();
  const { categories, fetchCategories, createCategory } = useCategories();
  const { brands, fetchBrands, createBrand } = useBrands();
  const { units, fetchUnits } = useUnits();
  const { suppliers, fetchSuppliers, createSupplier } = useSuppliers();
  const { locations, fetchLocations, createLocation } = useLocations();
  const { warehouses, fetchWarehouses } = useWarehouses();
  const { priceLists, fetchPriceLists } = usePriceLists();
  const { loadProduct } = useProductLoader();
  const activeBranch = useBranchStore((s) => s.activeBranch);

  const [values, setValues] = React.useState<FormValues>(emptyForm);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSaving, setIsSaving] = React.useState(false);

  const [isCreatingBrand, setIsCreatingBrand] = React.useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = React.useState(false);

  const [locationDraft, setLocationDraft] = React.useState<{
    name: string;
    code: string;
    warehouse_id: string;
  } | null>(null);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [isSavingLocation, setIsSavingLocation] = React.useState(false);

  /** Mientras no se edite el stock a mano, sigue la cantidad de unidades. */
  const [stockTouched, setStockTouched] = React.useState(false);

  // Catálogos de apoyo: solo activos para poder asignarlos.
  React.useEffect(() => {
    fetchCategories({ isActive: true });
    fetchBrands({ isActive: true });
    fetchUnits({ isActive: true });
    fetchSuppliers({ isActive: true });
    fetchLocations({ isActive: true });
    // Los códigos existentes hacen falta para calcular el serial del SKU.
    fetchProducts();
  }, [
    fetchCategories,
    fetchBrands,
    fetchUnits,
    fetchSuppliers,
    fetchLocations,
    fetchProducts,
  ]);

  React.useEffect(() => {
    fetchPriceLists({
      branchId: activeBranch?.id || undefined,
      isActive: true,
    });
  }, [fetchPriceLists, activeBranch?.id]);

  React.useEffect(() => {
    fetchWarehouses({ branchId: activeBranch?.id || undefined });
  }, [fetchWarehouses, activeBranch?.id]);

  const activeWarehouses = React.useMemo(
    () => warehouses.filter((warehouse) => warehouse.is_active),
    [warehouses],
  );

  // Almacén por defecto: el primero activo de la sucursal.
  React.useEffect(() => {
    if (values.warehouse_id || activeWarehouses.length === 0) return;
    setValues((prev) => ({ ...prev, warehouse_id: activeWarehouses[0].id }));
  }, [activeWarehouses, values.warehouse_id]);

  // Lista de precios por defecto: la primera activa de la sucursal.
  React.useEffect(() => {
    if (values.price_list_id || priceLists.length === 0) return;
    setValues((prev) => ({ ...prev, price_list_id: priceLists[0].id }));
  }, [priceLists, values.price_list_id]);

  const selectedBrand = brands.find((brand) => brand.id === values.brand_id);
  const selectedCategory = categories.find((category) => category.id === values.category_id);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === values.supplier_id);

  const catalogCodes = React.useMemo(
    () => products.flatMap((product) => product.codes.map((code) => code.code)),
    [products],
  );

  const quantity = values.quantity.trim() ? toNumber(values.quantity) : 0;
  const stock = values.stock.trim() ? toNumber(values.stock) : quantity;
  const unitPrice = values.unit_price.trim() ? toNumber(values.unit_price) : undefined;

  // SKU propuesto: prefijo de la marca + siguiente serial del catálogo.
  React.useEffect(() => {
    const prefix = brandPrefix(selectedBrand?.name);
    setValues((prev) => {
      const sku = nextSku(prefix, catalogCodes);
      return prev.sku === sku ? prev : { ...prev, sku };
    });
  }, [selectedBrand?.name, catalogCodes]);

  const composedName = buildProductName({
    brand: selectedBrand?.name,
    category: selectedCategory?.name,
    name: values.name,
    supplierCode: values.supplier_code,
    quantity: Number.isFinite(quantity) ? quantity : undefined,
  });

  const visibleLocations = React.useMemo(
    () =>
      locations.filter(
        (location) =>
          location.is_active &&
          (!values.warehouse_id || location.warehouse_id === values.warehouse_id),
      ),
    [locations, values.warehouse_id],
  );

  const handleChange =
    (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  /** La cantidad arrastra al stock mientras el stock no se haya tocado. */
  const handleQuantityChange = (raw: string) => {
    setValues((prev) => ({
      ...prev,
      quantity: raw,
      stock: stockTouched ? prev.stock : raw,
    }));
    if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: undefined }));
  };

  const handleLocationChange = (locationId: string) => {
    const location = locations.find((item) => item.id === locationId);
    setValues((prev) => ({
      ...prev,
      location_id: locationId,
      warehouse_id: location?.warehouse_id ?? prev.warehouse_id,
    }));
  };

  const handleCreateBrand = async (name: string) => {
    setIsCreatingBrand(true);
    try {
      const brand = await createBrand({ name });
      setValues((prev) => ({ ...prev, brand_id: brand.id }));
      toast.success(`La marca "${brand.name}" fue creada.`);
      setErrors((prev) => ({ ...prev, brand_id: undefined }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la marca.');
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleCreateCategory = async (name: string) => {
    setIsCreatingCategory(true);
    try {
      const category = await createCategory({ name });
      setValues((prev) => ({ ...prev, category_id: category.id }));
      toast.success(`La categoría "${category.name}" fue creada.`);
      setErrors((prev) => ({ ...prev, category_id: undefined }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la categoría.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateSupplier = async (name: string) => {
    setIsCreatingSupplier(true);
    try {
      const supplier = await createSupplier({ name });
      setValues((prev) => ({ ...prev, supplier_id: supplier.id }));
      toast.success(`El proveedor "${supplier.name}" fue creado.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el proveedor.');
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const openLocationDraft = (name: string) => {
    const warehouseId = values.warehouse_id || activeWarehouses[0]?.id || '';
    setLocationDraft({ name, code: suggestLocationCode(name), warehouse_id: warehouseId });
    setLocationError(null);
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationDraft) return;

    if (!locationDraft.warehouse_id) {
      setLocationError('Selecciona el almacén de la ubicación.');
      return;
    }
    if (!locationDraft.code.trim() || !locationDraft.name.trim()) {
      setLocationError('Completa el código y el nombre de la ubicación.');
      return;
    }

    setIsSavingLocation(true);
    try {
      const location = await createLocation({
        warehouse_id: locationDraft.warehouse_id,
        code: locationDraft.code.trim(),
        name: locationDraft.name.trim(),
      });
      setValues((prev) => ({
        ...prev,
        location_id: location.id,
        warehouse_id: location.warehouse_id,
      }));
      toast.success(`La ubicación "${location.name}" fue creada.`);
      setLocationDraft(null);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'No se pudo crear la ubicación.');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors: FormErrors = {};

    const nameError = validate(values.name, [
      (v) => required(v, 'El nombre del producto'),
      (v) => minLength(v, 2, 'El nombre del producto'),
      (v) => maxLength(v, PRODUCT_NAME_MAX_LENGTH, 'El nombre del producto'),
    ]);
    if (nameError) validationErrors.name = nameError;

    if (!values.brand_id) {
      validationErrors.brand_id = 'Selecciona o crea la marca.';
    }
    if (!values.base_unit_id) {
      validationErrors.base_unit_id = 'Selecciona la unidad base.';
    }

    const sku = values.sku.trim();
    if (!sku) {
      validationErrors.sku = 'El código SKU es obligatorio.';
    } else if (catalogCodes.some((code) => code.trim().toLowerCase() === sku.toLowerCase())) {
      validationErrors.sku = 'Ese SKU ya existe en el catálogo.';
    }

    const barcode = values.barcode.trim();
    if (
      barcode &&
      catalogCodes.some((code) => code.trim().toLowerCase() === barcode.toLowerCase())
    ) {
      validationErrors.barcode = 'Ese código de barras ya está registrado.';
    }

    if (composedName.length > PRODUCT_NAME_MAX_LENGTH) {
      validationErrors.name = `El nombre compuesto no puede superar ${PRODUCT_NAME_MAX_LENGTH} caracteres.`;
    }

    if (values.quantity.trim() && (!Number.isFinite(quantity) || quantity < 0)) {
      validationErrors.quantity = 'La cantidad debe ser un número mayor o igual a cero.';
    }
    if (!Number.isFinite(stock) || stock < 0) {
      validationErrors.stock = 'El stock debe ser un número mayor o igual a cero.';
    }
    if (stock > 0 && !values.warehouse_id) {
      validationErrors.stock = 'Para registrar stock selecciona un almacén.';
    }

    if (unitPrice !== undefined && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
      validationErrors.unit_price = 'El precio debe ser un número mayor o igual a cero.';
    }
    if (unitPrice !== undefined && unitPrice > 0 && !values.price_list_id) {
      validationErrors.unit_price =
        'No hay una lista de precios activa. Crea una en Catálogo → Listas de precios.';
    }

    // La descripción final incluye el resumen de la compra.
    const purchaseChars = [
      selectedSupplier ? `Proveedor: ${selectedSupplier.name}` : '',
      values.supplier_code.trim() ? `Código proveedor: ${values.supplier_code.trim()}` : '',
      values.invoice_number.trim() ? `Factura: ${values.invoice_number.trim()}` : '',
      values.picking_number.trim() ? `Picking: ${values.picking_number.trim()}` : '',
      unitPrice && unitPrice > 0 ? `Precio unitario: ${unitPrice}` : '',
      quantity > 0 ? `Unidades: ${quantity}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    if (
      values.description.trim().length +
        (purchaseChars ? purchaseChars.length + 12 : 0) >
      PRODUCT_DESCRIPTION_MAX_LENGTH
    ) {
      validationErrors.description = `La descripción no puede superar ${PRODUCT_DESCRIPTION_MAX_LENGTH} caracteres (incluidos los datos de la compra).`;
    }

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    try {
      const { product, warnings } = await loadProduct({
        name: values.name.trim(),
        brand: selectedBrand?.name,
        brand_id: values.brand_id,
        category: selectedCategory?.name,
        category_id: values.category_id || undefined,
        supplierCode: values.supplier_code.trim() || undefined,
        quantity: quantity > 0 ? quantity : undefined,
        base_unit_id: values.base_unit_id,
        sku,
        barcode: barcode || undefined,
        description: values.description.trim() || undefined,
        supplierName: selectedSupplier?.name,
        invoiceNumber: values.invoice_number.trim() || undefined,
        pickingNumber: values.picking_number.trim() || undefined,
        unitPrice: unitPrice && unitPrice > 0 ? unitPrice : undefined,
        price_list_id: values.price_list_id || undefined,
        warehouse_id: values.warehouse_id || undefined,
        location_id: values.location_id || undefined,
        stock,
      });

      toast.success(`El producto "${product.name}" fue creado.`);
      if (warnings.length > 0) {
        toast.info(`El producto se creó con pendientes: ${warnings.join(' ')}`);
      }
      navigate(`/catalog/products/${product.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const noUnits = units.length === 0;

  return (
    <div className="max-w-3xl">
      <CardHeader>
        <CardTitle>Nuevo Producto</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/catalog/products')}
        >
          Volver
        </Button>
      </CardHeader>

      {noUnits && (
        <div className="mb-4 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          Necesitas al menos una unidad de medida activa antes de crear productos.{' '}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => navigate('/catalog/units')}
          >
            Ir a Unidades
          </button>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          {/* Identificación */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Identificación</h3>
              <p className="text-xs text-text-tertiary">
                El SKU se propone con la marca y un serial ascendente; puedes corregirlo.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Código SKU"
                value={values.sku}
                onChange={handleChange('sku')}
                error={errors.sku}
                placeholder="ASF01"
                helperText={`Marca + serial ascendente (${brandPrefix(selectedBrand?.name)}01, ${brandPrefix(selectedBrand?.name)}02…).`}
                required
                maxLength={50}
              />

              <Input
                label="Código de barras"
                value={values.barcode}
                onChange={handleChange('barcode')}
                error={errors.barcode}
                placeholder="Opcional"
                helperText="Se usa para escanear el producto en el punto de venta."
                maxLength={50}
              />
            </div>
          </section>

          {/* Producto */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Producto</h3>
              <p className="text-xs text-text-tertiary">
                El nombre final se arma con marca, categoría, nombre, código del proveedor y
                cantidad de unidades.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SearchableSelect
                label="Marca"
                value={values.brand_id}
                onChange={(brandId) => {
                  setValues((prev) => ({ ...prev, brand_id: brandId }));
                  setErrors((prev) => ({ ...prev, brand_id: undefined }));
                }}
                options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
                placeholder="Busca o crea una marca"
                emptyText="Sin marcas activas"
                error={errors.brand_id}
                helperText="Si no está, créala desde el buscador."
                required
                onCreate={(name) => void handleCreateBrand(name)}
                createLabel="Crear marca «{query}»"
                isCreating={isCreatingBrand}
              />

              <SearchableSelect
                label="Categoría"
                value={values.category_id}
                onChange={(value) => {
                  setValues((prev) => ({ ...prev, category_id: value }));
                  setErrors((prev) => ({ ...prev, category_id: undefined }));
                }}
                options={[
                  { value: '', label: 'Sin categoría' },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                placeholder="Busca o crea una categoría"
                emptyText="Sin categorías activas"
                helperText="Opcional. Se usa en el nombre final."
                onCreate={(name) => void handleCreateCategory(name)}
                createLabel="Crear categoría «{query}»"
                isCreating={isCreatingCategory}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre del producto"
                placeholder="Ej: Martillo de uña 16 oz"
                value={values.name}
                onChange={handleChange('name')}
                error={errors.name}
                required
                maxLength={PRODUCT_NAME_MAX_LENGTH}
              />

              <Input
                label="Código del proveedor"
                placeholder="Ej: 12345"
                value={values.supplier_code}
                onChange={handleChange('supplier_code')}
                helperText="Cómo identifica el proveedor este producto."
                maxLength={50}
              />
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-secondary/50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Nombre final del producto
              </p>
              <p className="mt-1 break-words text-sm font-medium text-text-primary">
                {composedName || 'Completa la marca y el nombre para verlo aquí.'}
              </p>
            </div>
          </section>

          {/* Compra e inventario */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Compra e inventario</h3>
              <p className="text-xs text-text-tertiary">
                El proveedor, la factura y el picking se guardan en la descripción del producto.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SearchableSelect
                label="Proveedor"
                value={values.supplier_id}
                onChange={(supplierId) => setValues((prev) => ({ ...prev, supplier_id: supplierId }))}
                options={[
                  { value: '', label: 'Sin proveedor' },
                  ...suppliers.map((supplier) => ({
                    value: supplier.id,
                    label: supplier.name,
                    description: supplier.tax_id,
                  })),
                ]}
                placeholder="Busca o crea un proveedor"
                emptyText="Sin proveedores activos"
                helperText="Opcional. Si no está, créalo desde el buscador."
                onCreate={(name) => void handleCreateSupplier(name)}
                createLabel="Crear proveedor «{query}»"
                isCreating={isCreatingSupplier}
              />

              <div className="space-y-4">
                <Select
                  label="Almacén"
                  value={values.warehouse_id}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      warehouse_id: e.target.value,
                      location_id: '',
                    }))
                  }
                  options={activeWarehouses.map((warehouse) => ({
                    value: warehouse.id,
                    label: warehouse.name,
                  }))}
                  placeholder={
                    activeWarehouses.length === 0 ? 'Sin almacenes activos' : 'Selecciona un almacén'
                  }
                  helperText="Define dónde queda la existencia y filtra las ubicaciones."
                />

                <SearchableSelect
                  label="Ubicación"
                  value={values.location_id}
                  onChange={handleLocationChange}
                  options={[
                    { value: '', label: 'Sin ubicación específica' },
                    ...visibleLocations.map((location) => ({
                      value: location.id,
                      label: `${location.code} · ${location.name}`,
                      description: location.type,
                    })),
                  ]}
                  placeholder="Busca o crea una ubicación"
                  emptyText={
                    values.warehouse_id
                      ? 'Sin ubicaciones en este almacén'
                      : 'Selecciona un almacén primero'
                  }
                  helperText="Opcional. Si no está, créala desde el buscador."
                  disabled={!values.warehouse_id}
                  onCreate={openLocationDraft}
                  createLabel="Crear ubicación «{query}»"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Cantidad de unidades"
                type="number"
                min={0}
                step="1"
                value={values.quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                error={errors.quantity}
                helperText="Se usa en el nombre y como stock inicial."
              />

              <Input
                label="Stock actual"
                type="number"
                min={0}
                step="any"
                value={values.stock}
                onChange={(e) => {
                  setStockTouched(true);
                  setValues((prev) => ({ ...prev, stock: e.target.value }));
                  if (errors.stock) setErrors((prev) => ({ ...prev, stock: undefined }));
                }}
                error={errors.stock}
                placeholder={values.quantity || '0'}
                helperText="Existencia inicial que queda en la ubicación."
              />

              <Input
                label="Precio unitario"
                type="number"
                min={0}
                step="0.01"
                value={values.unit_price}
                onChange={handleChange('unit_price')}
                error={errors.unit_price}
                placeholder="Opcional"
                helperText={
                  priceLists.length > 0
                    ? 'Se guarda en la lista de precios seleccionada.'
                    : 'No hay listas de precios activas.'
                }
              />

              <div className="space-y-1">
                <Select
                  label="Lista de precios"
                  value={values.price_list_id}
                  onChange={handleChange('price_list_id')}
                  options={priceLists.map((list) => ({ value: list.id, label: list.name }))}
                  placeholder={
                    priceLists.length === 0 ? 'Sin listas activas' : 'Selecciona una lista'
                  }
                  helperText={
                    priceLists.length === 0
                      ? 'Sin listas activas para la sucursal.'
                      : 'Donde se registra el precio unitario.'
                  }
                />
                {priceLists.length === 0 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-brand-600 underline"
                    onClick={() => navigate('/catalog/price-lists')}
                  >
                    Crear lista de precios
                  </button>
                )}
              </div>

              <Input
                label="Número de factura"
                value={values.invoice_number}
                onChange={handleChange('invoice_number')}
                placeholder="Opcional"
                maxLength={60}
              />

              <Input
                label="Número de picking"
                value={values.picking_number}
                onChange={handleChange('picking_number')}
                placeholder="Opcional"
                maxLength={60}
              />
            </div>
          </section>

          {/* Catálogo */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Catálogo</h3>
              <p className="text-xs text-text-tertiary">
                La unidad base no se puede cambiar después de crear el producto.
              </p>
            </div>

            <Select
              label="Unidad base"
              value={values.base_unit_id}
              onChange={handleChange('base_unit_id')}
              options={units.map((unit) => ({
                value: unit.id,
                label: unit.abbreviation ? `${unit.name} (${unit.abbreviation})` : unit.name,
              }))}
              placeholder="Selecciona la unidad base"
              error={errors.base_unit_id}
              helperText="Determina la medida de las existencias. No se puede cambiar luego."
              required
            />

            <Textarea
              label="Descripción"
              placeholder="Descripción opcional del producto"
              value={values.description}
              onChange={handleChange('description')}
              error={errors.description}
              maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
              helperText="Al guardar se le agregan los datos de la compra (proveedor, factura, picking, precio y unidades)."
            />
          </section>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/catalog/products')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving} disabled={noUnits}>
              Crear producto
            </Button>
          </div>
        </form>
      </Card>

      {/* Alta rápida de ubicación desde el buscador */}
      <Modal
        isOpen={locationDraft !== null}
        onClose={() => {
          if (isSavingLocation) return;
          setLocationDraft(null);
        }}
        title="Nueva ubicación"
        subtitle="Se crea dentro del almacén seleccionado y queda elegida en el formulario."
        icon={<MapPin className="h-5 w-5" />}
        size="md"
        disableBackdropClose={isSavingLocation}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setLocationDraft(null)}
              disabled={isSavingLocation}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateLocation}
              isLoading={isSavingLocation}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Crear ubicación
            </Button>
          </>
        }
      >
        {locationDraft && (
          <div className="space-y-4">
            <Select
              label="Almacén"
              value={locationDraft.warehouse_id}
              onChange={(e) =>
                setLocationDraft((prev) =>
                  prev ? { ...prev, warehouse_id: e.target.value } : prev,
                )
              }
              options={activeWarehouses.map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.name,
              }))}
              placeholder="Selecciona un almacén"
              required
            />

            <Input
              label="Nombre"
              value={locationDraft.name}
              onChange={(e) => {
                const name = e.target.value;
                setLocationDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        name,
                        code: prev.code || suggestLocationCode(name),
                      }
                    : prev,
                );
              }}
              required
              maxLength={100}
            />

            <Input
              label="Código"
              value={locationDraft.code}
              onChange={(e) =>
                setLocationDraft((prev) =>
                  prev ? { ...prev, code: e.target.value.toUpperCase() } : prev,
                )
              }
              helperText="Único dentro del almacén."
              required
              maxLength={20}
            />

            {locationError && (
              <p className="rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-3 py-2 text-sm text-semantic-danger-700">
                {locationError}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
