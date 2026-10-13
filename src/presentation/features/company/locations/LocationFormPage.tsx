import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useLocations } from '@/application/hooks/useLocations';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength, matches } from '@/shared/utils/validations';

interface LocationFormValues {
  branch_id: string;
  warehouse_id: string;
  code: string;
  name: string;
  type: string;
}

const initialValues: LocationFormValues = {
  branch_id: '',
  warehouse_id: '',
  code: '',
  name: '',
  type: '',
};

type LocationFormErrors = Partial<Record<keyof LocationFormValues, string>>;

function validateForm(values: LocationFormValues): LocationFormErrors {
  const errors: LocationFormErrors = {};

  if (!values.warehouse_id) {
    errors.warehouse_id = 'Selecciona un almacén.';
  }

  const codeError = validate(values.code, [
    (v) => required(v, 'El código'),
    (v) => minLength(v, 1, 'El código'),
    (v) => maxLength(v, 50, 'El código'),
    (v) => matches(v, /^[A-Za-z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos.'),
  ]);
  if (codeError) errors.code = codeError;

  const nameError = validate(values.name, [
    (v) => required(v, 'El nombre'),
    (v) => minLength(v, 2, 'El nombre'),
    (v) => maxLength(v, 200, 'El nombre'),
  ]);
  if (nameError) errors.name = nameError;

  if (values.type.trim() && values.type.trim().length > 50) {
    errors.type = 'El tipo no puede superar 50 caracteres.';
  }

  return errors;
}

/**
 * Formulario de ubicaciones (crear / editar).
 *
 * - Crear: obligatorios almacén, código y nombre; el backend valida la
 *   unicidad del código dentro del almacén y que el almacén esté activo.
 * - Editar: solo nombre y tipo (RF-COM-024); el código NO es editable y el
 *   almacén no se puede cambiar (RF-COM-027).
 */
export function LocationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const { getLocation, createLocation, updateLocation } = useLocations();
  const { warehouses, fetchWarehouses } = useWarehouses();
  const branches = useBranchStore((s) => s.branches);
  const activeBranch = useBranchStore((s) => s.activeBranch);

  const activeBranches = React.useMemo(
    () => branches.filter((b) => b.is_active),
    [branches],
  );

  // Al crear, el almacén puede venir preseleccionado en la URL
  const warehouseFromUrl = searchParams.get('warehouse') ?? '';

  const [values, setValues] = React.useState<LocationFormValues>({
    ...initialValues,
    warehouse_id: warehouseFromUrl,
  });
  const [errors, setErrors] = React.useState<LocationFormErrors>({});
  const [isLoading, setIsLoading] = React.useState(isEdit);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Almacenes de la sucursal seleccionada (para crear)
  const selectedBranchId = values.branch_id || activeBranch?.id || '';

  React.useEffect(() => {
    if (isEdit || !selectedBranchId) return;
    fetchWarehouses({ branchId: selectedBranchId, isActive: true });
  }, [fetchWarehouses, selectedBranchId, isEdit]);

  React.useEffect(() => {
    if (isEdit) return;
    if (activeBranch?.is_active && !values.branch_id) {
      setValues((prev) => ({ ...prev, branch_id: activeBranch.id }));
    }
  }, [activeBranch, isEdit, values.branch_id]);

  React.useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    setIsLoading(true);

    getLocation(id)
      .then((location) => {
        if (cancelled) return;
        if (!location) {
          setLoadError('No se encontró la ubicación solicitada.');
          return;
        }
        setValues({
          branch_id: '',
          warehouse_id: location.warehouse_id,
          code: location.code,
          name: location.name,
          type: location.type ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error al cargar la ubicación.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, getLocation]);

  // En edición se muestran los datos del almacén como solo lectura
  const warehouse = warehouses.find((w) => w.id === values.warehouse_id);

  const handleChange = (field: keyof LocationFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    try {
      if (isEdit && id) {
        await updateLocation(id, {
          name: values.name.trim(),
          type: values.type.trim() || null,
        });
        toast.success(`La ubicación "${values.name.trim()}" fue actualizada.`);
      } else {
        await createLocation({
          warehouse_id: values.warehouse_id,
          code: values.code.trim().toUpperCase(),
          name: values.name.trim(),
          type: values.type.trim() || undefined,
        });
        toast.success(`La ubicación "${values.name.trim()}" fue creada.`);
      }
      navigate(`/company/locations${values.warehouse_id ? `?warehouse=${values.warehouse_id}` : ''}`);
    } catch (err) {
      // El backend devuelve mensajes específicos (código duplicado, padre inactivo...)
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la ubicación.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando ubicación..." />;
  }

  if (loadError) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">{loadError}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/company/locations')}>
          Volver a Ubicaciones
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Ubicación' : 'Nueva Ubicación'}</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() =>
            navigate(`/company/locations${values.warehouse_id ? `?warehouse=${values.warehouse_id}` : ''}`)
          }
        >
          Volver
        </Button>
      </CardHeader>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isEdit ? (
            <Input
              label="Almacén"
              value={warehouse ? `${warehouse.code} — ${warehouse.name}` : '—'}
              disabled
              helperText="Una ubicación no se puede mover a otro almacén."
            />
          ) : (
            <>
              <Select
                label="Sucursal"
                value={selectedBranchId}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, branch_id: e.target.value, warehouse_id: '' }));
                }}
                options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
                placeholder="Selecciona una sucursal"
                required
              />
              <Select
                label="Almacén"
                value={values.warehouse_id}
                onChange={handleChange('warehouse_id')}
                options={warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
                placeholder={warehouses.length === 0 ? 'No hay almacenes activos en esta sucursal' : 'Selecciona un almacén'}
                error={errors.warehouse_id}
                disabled={!selectedBranchId || warehouses.length === 0}
                required
              />
            </>
          )}

          <Input
            label="Código"
            placeholder="Ej: A3"
            value={values.code}
            onChange={handleChange('code')}
            error={errors.code}
            helperText={
              isEdit
                ? 'El código no se puede modificar después de crear la ubicación.'
                : 'Identificador único dentro del almacén. Solo letras, números y guiones.'
            }
            disabled={isEdit}
            required={!isEdit}
            maxLength={50}
          />

          <Input
            label="Nombre"
            placeholder="Ej: Estante A3"
            value={values.name}
            onChange={handleChange('name')}
            error={errors.name}
            required
            maxLength={200}
          />

          <Input
            label="Tipo"
            placeholder="Ej: almacenamiento, recepción, despacho, cuarentena"
            value={values.type}
            onChange={handleChange('type')}
            error={errors.type}
            helperText="Opcional. Dato descriptivo; el catálogo de tipos se definirá más adelante."
            maxLength={50}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                navigate(`/company/locations${values.warehouse_id ? `?warehouse=${values.warehouse_id}` : ''}`)
              }
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? 'Guardar cambios' : 'Crear ubicación'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
