import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useSuppliers } from '@/application/hooks/useSuppliers';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength, matches, isEmail } from '@/shared/utils/validations';

interface SupplierFormValues {
  code: string;
  name: string;
  tax_id: string;
  email: string;
  phone: string;
}

const initialValues: SupplierFormValues = { code: '', name: '', tax_id: '', email: '', phone: '' };

type SupplierFormErrors = Partial<Record<keyof SupplierFormValues, string>>;

function validateForm(values: SupplierFormValues, isEdit: boolean): SupplierFormErrors {
  const errors: SupplierFormErrors = {};

  // El código solo se define al crear: en edición no es editable (RF-PUR-003)
  if (!isEdit) {
    const codeError = validate(values.code, [
      (v) => required(v, 'El código'),
      (v) => minLength(v, 2, 'El código'),
      (v) => maxLength(v, 50, 'El código'),
      (v) => matches(v, /^[A-Za-z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos.'),
    ]);
    if (codeError) errors.code = codeError;
  }

  const nameError = validate(values.name, [
    (v) => required(v, 'El nombre'),
    (v) => minLength(v, 3, 'El nombre'),
    (v) => maxLength(v, 200, 'El nombre'),
  ]);
  if (nameError) errors.name = nameError;

  if (values.tax_id.trim() && values.tax_id.trim().length > 50) {
    errors.tax_id = 'El RIF/NIT no puede superar 50 caracteres.';
  }

  const emailError = isEmail(values.email);
  if (emailError) errors.email = emailError;
  else if (values.email.trim().length > 200) {
    errors.email = 'El correo no puede superar 200 caracteres.';
  }

  if (values.phone.trim() && !/^[+0-9()\s-]{7,50}$/.test(values.phone.trim())) {
    errors.phone = 'Ingresa un teléfono válido.';
  }

  return errors;
}

/**
 * Formulario de proveedores (crear / editar).
 *
 * - Crear: obligatorios código y nombre; el backend valida la unicidad del
 *   código dentro de la empresa.
 * - Editar: solo nombre, RIF/NIT, correo y teléfono; el código no es
 *   editable (RF-PUR-003).
 */
export function SupplierFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { getSupplier, createSupplier, updateSupplier } = useSuppliers();

  const [values, setValues] = React.useState<SupplierFormValues>(initialValues);
  const [errors, setErrors] = React.useState<SupplierFormErrors>({});
  const [isLoading, setIsLoading] = React.useState(isEdit);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    setIsLoading(true);

    getSupplier(id)
      .then((supplier) => {
        if (cancelled) return;
        if (!supplier) {
          setLoadError('No se encontró el proveedor solicitado.');
          return;
        }
        setValues({
          code: supplier.code,
          name: supplier.name,
          tax_id: supplier.tax_id ?? '',
          email: supplier.email ?? '',
          phone: supplier.phone ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error al cargar el proveedor.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, getSupplier]);

  const handleChange = (field: keyof SupplierFormValues) => (
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
        await updateSupplier(id, {
          name: values.name.trim(),
          tax_id: values.tax_id.trim() || null,
          email: values.email.trim() || null,
          phone: values.phone.trim() || null,
        });
        toast.success(`El proveedor "${values.name.trim()}" fue actualizado.`);
      } else {
        await createSupplier({
          code: values.code.trim().toUpperCase(),
          name: values.name.trim(),
          tax_id: values.tax_id.trim() || undefined,
          email: values.email.trim() || undefined,
          phone: values.phone.trim() || undefined,
        });
        toast.success(`El proveedor "${values.name.trim()}" fue creado.`);
      }
      navigate('/suppliers');
    } catch (err) {
      // El backend devuelve mensajes específicos (código duplicado, etc.)
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el proveedor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando proveedor..." />;
  }

  if (loadError) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">{loadError}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/suppliers')}>
          Volver a Proveedores
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/suppliers')}
        >
          Volver
        </Button>
      </CardHeader>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Código"
            placeholder="Ej: PRV-0001"
            value={values.code}
            onChange={handleChange('code')}
            error={errors.code}
            helperText={
              isEdit
                ? 'El código no se puede modificar después de crear el proveedor.'
                : 'Identificador único del proveedor en tu empresa. Solo letras, números y guiones.'
            }
            disabled={isEdit}
            required={!isEdit}
            maxLength={50}
          />

          <Input
            label="Nombre"
            placeholder="Ej: Distribuidora de Alimentos S.A.S."
            value={values.name}
            onChange={handleChange('name')}
            error={errors.name}
            required
            maxLength={200}
          />

          <Input
            label="RIF / NIT"
            placeholder="Ej: NIT-900123456-1"
            value={values.tax_id}
            onChange={handleChange('tax_id')}
            error={errors.tax_id}
            helperText="Opcional. Identificador fiscal del proveedor."
            maxLength={50}
          />

          <Input
            label="Correo"
            placeholder="Ej: ventas@proveedor.com"
            value={values.email}
            onChange={handleChange('email')}
            error={errors.email}
            type="email"
            maxLength={200}
          />

          <Input
            label="Teléfono"
            placeholder="Ej: +58 212 5555555"
            value={values.phone}
            onChange={handleChange('phone')}
            error={errors.phone}
            type="tel"
            maxLength={50}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/suppliers')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
