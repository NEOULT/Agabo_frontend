import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useProducts } from '@/application/hooks/useProducts';
import { useCategories } from '@/application/hooks/useCategories';
import { useBrands } from '@/application/hooks/useBrands';
import { useUnits } from '@/application/hooks/useUnits';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength } from '@/shared/utils/validations';

interface FormValues {
  name: string;
  description: string;
  category_id: string;
  brand_id: string;
  base_unit_id: string;
}

const emptyForm: FormValues = {
  name: '',
  description: '',
  category_id: '',
  brand_id: '',
  base_unit_id: '',
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

/**
 * Formulario de producto (crear / editar).
 *
 * - Crear: obligatorios nombre y unidad base. El backend genera
 *   automáticamente la presentación base sobre esa unidad.
 * - Editar: solo nombre, descripción, categoría y marca (RF-CAT-015); la
 *   unidad base NO es editable.
 */
export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { getProduct, createProduct, updateProduct } = useProducts();
  const { categories, fetchCategories } = useCategories();
  const { brands, fetchBrands } = useBrands();
  const { units, fetchUnits } = useUnits();

  const [values, setValues] = React.useState<FormValues>(emptyForm);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isLoading, setIsLoading] = React.useState(isEdit);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Catálogos de apoyo: solo activos para poder asignarlos
  React.useEffect(() => {
    fetchCategories({ isActive: true });
    fetchBrands({ isActive: true });
    fetchUnits({ isActive: true });
  }, [fetchCategories, fetchBrands, fetchUnits]);

  React.useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    setIsLoading(true);

    getProduct(id)
      .then((product) => {
        if (cancelled) return;
        if (!product) {
          setLoadError('No se encontró el producto solicitado.');
          return;
        }
        setValues({
          name: product.name,
          description: product.description ?? '',
          category_id: product.category_id ?? '',
          brand_id: product.brand_id ?? '',
          base_unit_id: product.base_unit_id,
        });
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
  }, [id, isEdit, getProduct]);

  const handleChange = (field: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors: FormErrors = {};
    const nameError = validate(values.name, [
      (v) => required(v, 'El nombre'),
      (v) => minLength(v, 2, 'El nombre'),
      (v) => maxLength(v, 200, 'El nombre'),
    ]);
    if (nameError) validationErrors.name = nameError;

    if (!isEdit && !values.base_unit_id) {
      validationErrors.base_unit_id = 'Selecciona la unidad base.';
    }
    if (values.description.trim().length > 500) {
      validationErrors.description = 'La descripción no puede superar 500 caracteres.';
    }

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    try {
      if (isEdit && id) {
        await updateProduct(id, {
          name: values.name.trim(),
          description: values.description.trim() || null,
          category_id: values.category_id || null,
          brand_id: values.brand_id || null,
        });
        toast.success(`El producto "${values.name.trim()}" fue actualizado.`);
        navigate(`/catalog/products/${id}`);
      } else {
        const product = await createProduct({
          name: values.name.trim(),
          base_unit_id: values.base_unit_id,
          description: values.description.trim() || undefined,
          category_id: values.category_id || undefined,
          brand_id: values.brand_id || undefined,
        });
        toast.success(`El producto "${values.name.trim()}" fue creado.`);
        // Al detalle para que agregue códigos y presentaciones
        navigate(`/catalog/products/${product.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando producto..." />;
  }

  if (loadError) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">{loadError}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/catalog/products')}>
          Volver a Productos
        </Button>
      </Card>
    );
  }

  const noUnits = !isEdit && units.length === 0;

  return (
    <div className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate(isEdit && id ? `/catalog/products/${id}` : '/catalog/products')}
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
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Nombre"
            placeholder="Ej: Laptop Lenovo ThinkPad T14"
            value={values.name}
            onChange={handleChange('name')}
            error={errors.name}
            required
            maxLength={200}
          />

          <Textarea
            label="Descripción"
            placeholder="Descripción opcional del producto"
            value={values.description}
            onChange={handleChange('description')}
            error={errors.description}
            maxLength={500}
          />

          <Select
            label="Categoría"
            value={values.category_id}
            onChange={handleChange('category_id')}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Sin categoría"
            helperText="Opcional."
          />

          <Select
            label="Marca"
            value={values.brand_id}
            onChange={handleChange('brand_id')}
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
            placeholder="Sin marca"
            helperText="Opcional."
          />

          {isEdit ? (
            <Input
              label="Unidad base"
              value={units.find((u) => u.id === values.base_unit_id)?.name ?? '—'}
              disabled
              helperText="La unidad base no se puede cambiar después de crear el producto."
            />
          ) : (
            <Select
              label="Unidad base"
              value={values.base_unit_id}
              onChange={handleChange('base_unit_id')}
              options={units.map((u) => ({
                value: u.id,
                label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
              }))}
              placeholder="Selecciona la unidad base"
              error={errors.base_unit_id}
              helperText="Determina la medida de las existencias. No se puede cambiar luego."
              required
            />
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEdit && id ? `/catalog/products/${id}` : '/catalog/products')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving} disabled={noUnits}>
              {isEdit ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
