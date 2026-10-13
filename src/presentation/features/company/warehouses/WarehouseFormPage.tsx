import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength, matches } from '@/shared/utils/validations';

interface WarehouseFormValues {
  branch_id: string;
  code: string;
  name: string;
  type: string;
}

const initialValues: WarehouseFormValues = { branch_id: '', code: '', name: '', type: '' };

type WarehouseFormErrors = Partial<Record<keyof WarehouseFormValues, string>>;

function validateForm(values: WarehouseFormValues): WarehouseFormErrors {
  const errors: WarehouseFormErrors = {};

  if (!values.branch_id) {
    errors.branch_id = 'Selecciona una sucursal.';
  }

  const codeError = validate(values.code, [
    (v) => required(v, 'El código'),
    (v) => minLength(v, 2, 'El código'),
    (v) => maxLength(v, 50, 'El código'),
    (v) => matches(v, /^[A-Za-z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos.'),
  ]);
  if (codeError) errors.code = codeError;

  const nameError = validate(values.name, [
    (v) => required(v, 'El nombre'),
    (v) => minLength(v, 3, 'El nombre'),
    (v) => maxLength(v, 200, 'El nombre'),
  ]);
  if (nameError) errors.name = nameError;

  if (values.type.trim() && values.type.trim().length > 50) {
    errors.type = 'El tipo no puede superar 50 caracteres.';
  }

  return errors;
}

/**
 * Formulario de almacenes (crear / editar).
 *
 * - Crear: obligatorios sucursal, código y nombre; el backend valida la
 *   unicidad del código dentro de la sucursal y que la sucursal esté activa.
 * - Editar: código, nombre y tipo son editables (RF-COM-018), pero la
 *   sucursal NO se puede cambiar (RF-COM-021).
 */
export function WarehouseFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { getWarehouse, createWarehouse, updateWarehouse } = useWarehouses();
  const branches = useBranchStore((s) => s.branches);
  const activeBranch = useBranchStore((s) => s.activeBranch);

  const activeBranches = React.useMemo(
    () => branches.filter((b) => b.is_active),
    [branches],
  );

  const [values, setValues] = React.useState<WarehouseFormValues>(initialValues);
  const [errors, setErrors] = React.useState<WarehouseFormErrors>({});
  const [isLoading, setIsLoading] = React.useState(isEdit);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isEdit) return;
    // Al crear, la sucursal activa del navbar es la opción por defecto
    if (activeBranch?.is_active && !values.branch_id) {
      setValues((prev) => ({ ...prev, branch_id: activeBranch.id }));
    }
  }, [activeBranch, isEdit, values.branch_id]);

  React.useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    setIsLoading(true);

    getWarehouse(id)
      .then((warehouse) => {
        if (cancelled) return;
        if (!warehouse) {
          setLoadError('No se encontró el almacén solicitado.');
          return;
        }
        setValues({
          branch_id: warehouse.branch_id,
          code: warehouse.code,
          name: warehouse.name,
          type: warehouse.type ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error al cargar el almacén.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, getWarehouse]);

  const handleChange = (field: keyof WarehouseFormValues) => (
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
        await updateWarehouse(id, {
          code: values.code.trim().toUpperCase(),
          name: values.name.trim(),
          type: values.type.trim() || null,
        });
        toast.success(`El almacén "${values.name.trim()}" fue actualizado.`);
      } else {
        await createWarehouse({
          branch_id: values.branch_id,
          code: values.code.trim().toUpperCase(),
          name: values.name.trim(),
          type: values.type.trim() || undefined,
        });
        toast.success(`El almacén "${values.name.trim()}" fue creado.`);
      }
      navigate('/company/warehouses');
    } catch (err) {
      // El backend devuelve mensajes específicos (código duplicado, padre inactivo...)
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el almacén.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando almacén..." />;
  }

  if (loadError) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">{loadError}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/company/warehouses')}>
          Volver a Almacenes
        </Button>
      </Card>
    );
  }

  const branchName = activeBranches.find((b) => b.id === values.branch_id)?.name;

  return (
    <div className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Almacén' : 'Nuevo Almacén'}</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/company/warehouses')}
        >
          Volver
        </Button>
      </CardHeader>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isEdit ? (
            <Input
              label="Sucursal"
              value={branchName ?? '—'}
              disabled
              helperText="Un almacén no se puede mover a otra sucursal."
            />
          ) : (
            <Select
              label="Sucursal"
              value={values.branch_id}
              onChange={handleChange('branch_id')}
              options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Selecciona una sucursal"
              error={errors.branch_id}
              required
            />
          )}

          <Input
            label="Código"
            placeholder="Ej: PRINCIPAL"
            value={values.code}
            onChange={handleChange('code')}
            error={errors.code}
            helperText="Identificador único dentro de la sucursal. Solo letras, números y guiones."
            required
            maxLength={50}
          />

          <Input
            label="Nombre"
            placeholder="Ej: Almacén Principal"
            value={values.name}
            onChange={handleChange('name')}
            error={errors.name}
            required
            maxLength={200}
          />

          <Input
            label="Tipo"
            placeholder="Ej: principal, tránsito, devoluciones, cuarentena"
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
              onClick={() => navigate('/company/warehouses')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? 'Guardar cambios' : 'Crear almacén'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
