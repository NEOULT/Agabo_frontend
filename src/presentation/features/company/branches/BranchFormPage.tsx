import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useBranches } from '@/application/hooks/useBranches';
import { useAuthStore } from '@/application/stores/useAuthStore';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength, matches } from '@/shared/utils/validations';

interface BranchFormValues {
  code: string;
  name: string;
  address: string;
  phone: string;
}

const initialValues: BranchFormValues = { code: '', name: '', address: '', phone: '' };

type BranchFormErrors = Partial<Record<keyof BranchFormValues, string>>;

function validateForm(values: BranchFormValues, isEdit: boolean): BranchFormErrors {
  const errors: BranchFormErrors = {};

  // El código solo se define al crear: en edición no es editable (RF-COM-015)
  if (!isEdit) {
    const codeError = validate(values.code, [
      (v) => required(v, 'El código'),
      (v) => minLength(v, 2, 'El código'),
      (v) => maxLength(v, 20, 'El código'),
      (v) => matches(v, /^[A-Za-z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos.'),
    ]);
    if (codeError) errors.code = codeError;
  }

  const nameError = validate(values.name, [
    (v) => required(v, 'El nombre'),
    (v) => minLength(v, 3, 'El nombre'),
    (v) => maxLength(v, 100, 'El nombre'),
  ]);
  if (nameError) errors.name = nameError;

  if (values.phone.trim() && !/^[+0-9()\s-]{7,20}$/.test(values.phone.trim())) {
    errors.phone = 'Ingresa un teléfono válido.';
  }

  return errors;
}

/**
 * Formulario de sucursales (crear / editar).
 *
 * - Crear: obligatorios código y nombre; el backend valida la unicidad del
 *   código y la cuota de sucursales activas de la empresa.
 * - Editar: solo nombre, dirección y teléfono; el código y la empresa no se
 *   modifican (RF-COM-012 / RF-COM-015).
 */
export function BranchFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { getBranch, createBranch, updateBranch } = useBranches();
  const companyId = useAuthStore((s) => s.user?.company_id);

  const [values, setValues] = React.useState<BranchFormValues>(initialValues);
  const [errors, setErrors] = React.useState<BranchFormErrors>({});
  const [isLoading, setIsLoading] = React.useState(isEdit);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    setIsLoading(true);

    getBranch(id)
      .then((branch) => {
        if (cancelled) return;
        if (!branch) {
          setLoadError('No se encontró la sucursal solicitada.');
          return;
        }
        setValues({
          code: branch.code,
          name: branch.name,
          address: branch.address ?? '',
          phone: branch.phone ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error al cargar la sucursal.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, getBranch]);

  const handleChange = (field: keyof BranchFormValues) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    // Limpia el error del campo mientras se escribe
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(values, isEdit);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    try {
      if (isEdit && id) {
        await updateBranch(id, {
          name: values.name.trim(),
          address: values.address.trim() || null,
          phone: values.phone.trim() || null,
        });
        toast.success(`La sucursal "${values.name.trim()}" fue actualizada.`);
      } else {
        if (!companyId) {
          toast.error('No se pudo identificar tu empresa. Inicia sesión de nuevo.');
          return;
        }
        await createBranch({
          company_id: companyId,
          code: values.code.trim().toUpperCase(),
          name: values.name.trim(),
          address: values.address.trim() || undefined,
          phone: values.phone.trim() || undefined,
        });
        toast.success(`La sucursal "${values.name.trim()}" fue creada.`);
      }
      navigate('/company/branches');
    } catch (err) {
      // El backend devuelve mensajes específicos (código duplicado, cuota...)
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la sucursal.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando sucursal..." />;
  }

  if (loadError) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">{loadError}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/company/branches')}>
          Volver a Sucursales
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Sucursal' : 'Nueva Sucursal'}</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/company/branches')}
        >
          Volver
        </Button>
      </CardHeader>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Código"
            placeholder="Ej: CENTRO"
            value={values.code}
            onChange={handleChange('code')}
            error={errors.code}
            helperText={
              isEdit
                ? 'El código no se puede modificar después de crear la sucursal.'
                : 'Identificador único dentro de la empresa. Solo letras, números y guiones.'
            }
            disabled={isEdit}
            required={!isEdit}
            maxLength={20}
          />

          <Input
            label="Nombre"
            placeholder="Ej: Sucursal Centro"
            value={values.name}
            onChange={handleChange('name')}
            error={errors.name}
            required
            maxLength={100}
          />

          <Input
            label="Dirección"
            placeholder="Ej: Calle 50 #45-20"
            value={values.address}
            onChange={handleChange('address')}
            error={errors.address}
          />

          <Input
            label="Teléfono"
            placeholder="Ej: +58 212 5555555"
            value={values.phone}
            onChange={handleChange('phone')}
            error={errors.phone}
            type="tel"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/company/branches')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? 'Guardar cambios' : 'Crear sucursal'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
