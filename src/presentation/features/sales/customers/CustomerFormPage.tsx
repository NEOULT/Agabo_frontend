import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useCustomers } from '@/application/hooks/useCustomers';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength, isEmail } from '@/shared/utils/validations';

interface CustomerFormValues {
  name: string;
  tax_id: string;
  email: string;
  phone: string;
}

const initialValues: CustomerFormValues = { name: '', tax_id: '', email: '', phone: '' };

type CustomerFormErrors = Partial<Record<keyof CustomerFormValues, string>>;

function validateForm(values: CustomerFormValues): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

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
 * Formulario de clientes (crear / editar).
 *
 * - Crear: obligatorio el nombre; la empresa sale del token (RF-SAL-001).
 * - Editar: nombre y datos de contacto (RF-SAL-003).
 */
export function CustomerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { getCustomer, createCustomer, updateCustomer } = useCustomers();

  const [values, setValues] = React.useState<CustomerFormValues>(initialValues);
  const [errors, setErrors] = React.useState<CustomerFormErrors>({});
  const [isLoading, setIsLoading] = React.useState(isEdit);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    setIsLoading(true);

    getCustomer(id)
      .then((customer) => {
        if (cancelled) return;
        if (!customer) {
          setLoadError('No se encontró el cliente solicitado.');
          return;
        }
        setValues({
          name: customer.name,
          tax_id: customer.tax_id ?? '',
          email: customer.email ?? '',
          phone: customer.phone ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error al cargar el cliente.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, getCustomer]);

  const handleChange =
    (field: keyof CustomerFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      // Limpia el error del campo mientras se escribe
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
        await updateCustomer(id, {
          name: values.name.trim(),
          tax_id: values.tax_id.trim() || null,
          email: values.email.trim() || null,
          phone: values.phone.trim() || null,
        });
        toast.success(`El cliente "${values.name.trim()}" fue actualizado.`);
      } else {
        await createCustomer({
          name: values.name.trim(),
          tax_id: values.tax_id.trim() || undefined,
          email: values.email.trim() || undefined,
          phone: values.phone.trim() || undefined,
        });
        toast.success(`El cliente "${values.name.trim()}" fue creado.`);
      }
      navigate('/sales/customers');
    } catch (err) {
      // El backend devuelve mensajes específicos (datos inválidos...)
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando cliente..." />;
  }

  if (loadError) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">{loadError}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/sales/customers')}>
          Volver a Clientes
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/sales/customers')}
        >
          Volver
        </Button>
      </CardHeader>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Nombre"
            placeholder="Ej: Comercializadora del Norte"
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
            helperText="Opcional. Identificación fiscal del cliente."
            maxLength={50}
          />

          <Input
            label="Correo"
            placeholder="Ej: compras@cliente.com"
            value={values.email}
            onChange={handleChange('email')}
            error={errors.email}
            type="email"
            maxLength={200}
          />

          <Input
            label="Teléfono"
            placeholder="Ej: +57 300 5555555"
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
              onClick={() => navigate('/sales/customers')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
