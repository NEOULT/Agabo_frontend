import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { usePaymentMethods } from '@/application/hooks/usePaymentMethods';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength } from '@/shared/utils/validations';

/**
 * Formulario de métodos de pago (crear / editar).
 *
 * El nombre y la comision son editables (RF-SAL-005/RF-SAL-007); la empresa sale
 * del token. La comision se expresa como fraccion de la venta, entre 0 y 1.
 */
export function PaymentMethodFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { getPaymentMethod, createPaymentMethod, updatePaymentMethod } = usePaymentMethods();

  const [name, setName] = React.useState('');
  const [commissionRate, setCommissionRate] = React.useState('0');
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [commissionError, setCommissionError] = React.useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(isEdit);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    setIsLoading(true);

    getPaymentMethod(id)
      .then((paymentMethod) => {
        if (cancelled) return;
        if (!paymentMethod) {
          setLoadError('No se encontró el método de pago solicitado.');
          return;
        }
        setName(paymentMethod.name);
        setCommissionRate(String(paymentMethod.commission_rate));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error al cargar el método de pago.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, getPaymentMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameError = validate(name, [
      (v) => required(v, 'El nombre'),
      (v) => minLength(v, 3, 'El nombre'),
      (v) => maxLength(v, 200, 'El nombre'),
    ]);
    if (nameError) {
      setError(nameError);
      return;
    }

    const rate = commissionRate.trim() === '' ? 0 : Number(commissionRate);
    if (Number.isNaN(rate) || rate < 0 || rate > 1) {
      setCommissionError('La comisión debe ser un número entre 0 y 1.');
      return;
    }
    setCommissionError(undefined);

    setIsSaving(true);
    try {
      const trimmed = name.trim();
      if (isEdit && id) {
        await updatePaymentMethod(id, { name: trimmed, commission_rate: rate });
        toast.success(`El método "${trimmed}" fue actualizado.`);
      } else {
        await createPaymentMethod({ name: trimmed, commission_rate: rate });
        toast.success(`El método "${trimmed}" fue creado.`);
      }
      navigate('/sales/payment-methods');
    } catch (err) {
      // El backend devuelve mensajes específicos (datos inválidos...)
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el método de pago.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando método de pago..." />;
  }

  if (loadError) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">{loadError}</p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => navigate('/sales/payment-methods')}
        >
          Volver a Métodos de pago
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/sales/payment-methods')}
        >
          Volver
        </Button>
      </CardHeader>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Nombre"
            placeholder="Ej: Tarjeta de crédito"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(undefined);
            }}
            error={error}
            helperText="Es la forma en que el cliente paga la venta."
            required
            maxLength={200}
          />

          <Input
            label="Comisión"
            type="number"
            min="0"
            max="1"
            step="0.0001"
            placeholder="Ej: 0.035"
            value={commissionRate}
            onChange={(e) => {
              setCommissionRate(e.target.value);
              if (commissionError) setCommissionError(undefined);
            }}
            error={commissionError}
            helperText="Fracción de la venta que asume el vendedor, entre 0 y 1. Ej: 0.035 = 3,5 %."
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/sales/payment-methods')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? 'Guardar cambios' : 'Crear método'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
