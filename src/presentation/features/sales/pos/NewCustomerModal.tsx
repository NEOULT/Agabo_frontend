import React from 'react';
import { UserRound } from 'lucide-react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Button } from '@/presentation/components/ui/Button';
import { Input } from '@/presentation/components/ui/Input';
import { useCustomers } from '@/application/hooks/useCustomers';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength, isEmail } from '@/shared/utils/validations';
import type { Customer } from '@/domain/models';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Cliente creado, ya seleccionado en el POS. */
  onCreated: (customer: Customer) => void;
}

interface Values {
  name: string;
  tax_id: string;
  email: string;
  phone: string;
}

const initialValues: Values = { name: '', tax_id: '', email: '', phone: '' };

/**
 * Alta rápida de cliente desde el punto de venta (RF-SAL-001).
 *
 * Solo el nombre es obligatorio: permite registrar al cliente sin salir del
 * cobro (factura a nombre, crédito, cliente frecuente) y dejarlo seleccionado.
 */
export function NewCustomerModal({ isOpen, onClose, onCreated }: NewCustomerModalProps) {
  const { createCustomer } = useCustomers();

  const [values, setValues] = React.useState<Values>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Values, string>>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
      setErrors({});
    }
  }, [isOpen]);

  const handleChange =
    (field: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Partial<Record<keyof Values, string>> = {};
    const nameError = validate(values.name, [
      (v) => required(v, 'El nombre'),
      (v) => minLength(v, 3, 'El nombre'),
      (v) => maxLength(v, 200, 'El nombre'),
    ]);
    if (nameError) nextErrors.name = nameError;

    const emailError = isEmail(values.email);
    if (emailError) nextErrors.email = emailError;

    if (values.tax_id.trim() && values.tax_id.trim().length > 50) {
      nextErrors.tax_id = 'El RIF/NIT no puede superar 50 caracteres.';
    }
    if (values.phone.trim() && !/^[+0-9()\s-]{7,50}$/.test(values.phone.trim())) {
      nextErrors.phone = 'Ingresa un teléfono válido.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const customer = await createCustomer({
        name: values.name.trim(),
        tax_id: values.tax_id.trim() || undefined,
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
      });
      toast.success(`Cliente "${customer.name}" creado.`);
      onCreated(customer);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo cliente"
      subtitle="Se registra al cliente y queda seleccionado para esta venta."
      icon={<UserRound className="h-5 w-5" />}
      size="lg"
      disableBackdropClose={isSaving}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" form="new-customer-form" isLoading={isSaving}>
            Crear y usar
          </Button>
        </>
      }
    >
      <form id="new-customer-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Nombre"
          placeholder="Ej: Comercializadora del Norte"
          value={values.name}
          onChange={handleChange('name')}
          error={errors.name}
          autoFocus
          required
          maxLength={200}
        />
        <Input
          label="RIF / NIT"
          placeholder="Opcional"
          value={values.tax_id}
          onChange={handleChange('tax_id')}
          error={errors.tax_id}
          maxLength={50}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Correo"
            type="email"
            placeholder="Opcional"
            value={values.email}
            onChange={handleChange('email')}
            error={errors.email}
            maxLength={200}
          />
          <Input
            label="Teléfono"
            type="tel"
            placeholder="Opcional"
            value={values.phone}
            onChange={handleChange('phone')}
            error={errors.phone}
            maxLength={50}
          />
        </div>
      </form>
    </Modal>
  );
}
