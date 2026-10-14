import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useProfiles } from '@/application/hooks/useProfiles';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, maxLength } from '@/shared/utils/validations';

interface ProfileFormValues {
  name: string;
  description: string;
}

const initialValues: ProfileFormValues = { name: '', description: '' };

type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>;

function validateForm(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  const nameError = validate(values.name, [
    (v) => required(v, 'El nombre'),
    (v) => maxLength(v, 100, 'El nombre'),
  ]);
  if (nameError) errors.name = nameError;

  if (values.description.trim().length > 255) {
    errors.description = 'La descripción no puede superar 255 caracteres.';
  }

  return errors;
}

/**
 * Formulario de perfiles (crear / editar).
 *
 * - Crear: obligatorio el nombre. El perfil queda activo y sin permisos hasta
 *   que se le asignen.
 * - Editar: solo nombre y descripción (RF-SEC-011). El estado se cambia desde
 *   la lista.
 */
export function ProfileFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { getProfile, createProfile, updateProfile } = useProfiles();

  const [values, setValues] = React.useState<ProfileFormValues>(initialValues);
  const [errors, setErrors] = React.useState<ProfileFormErrors>({});
  const [isLoading, setIsLoading] = React.useState(isEdit);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isSystemProfile, setIsSystemProfile] = React.useState(false);

  React.useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    setIsLoading(true);

    getProfile(id)
      .then((profile) => {
        if (cancelled) return;
        if (!profile) {
          setLoadError('No se encontró el perfil solicitado.');
          return;
        }
        setValues({
          name: profile.name,
          description: profile.description ?? '',
        });
        setIsSystemProfile(profile.is_system);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error al cargar el perfil.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, getProfile]);

  const handleChange = (field: keyof ProfileFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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
        await updateProfile(id, {
          name: values.name.trim(),
          description: values.description.trim() || null,
        });
        toast.success(`El perfil "${values.name.trim()}" fue actualizado.`);
      } else {
        await createProfile({
          name: values.name.trim(),
          description: values.description.trim() || undefined,
        });
        toast.success(`El perfil "${values.name.trim()}" fue creado. Asígnale permisos.`);
      }
      navigate('/security/profiles');
    } catch (err) {
      // El backend devuelve mensajes específicos (nombre inválido, etc.)
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando perfil..." />;
  }

  if (loadError) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">{loadError}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/security/profiles')}>
          Volver a Perfiles
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Perfil' : 'Nuevo Perfil'}</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/security/profiles')}
        >
          Volver
        </Button>
      </CardHeader>

      {isSystemProfile && (
        <div className="mb-4 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          Este es el perfil de sistema: concentra todos los permisos y el backend rechaza
          desactivarlo o dejarlo sin permisos.
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Nombre"
            placeholder="Ej: Supervisor de sucursal"
            value={values.name}
            onChange={handleChange('name')}
            error={errors.name}
            required
            maxLength={100}
          />

          <Textarea
            label="Descripción"
            placeholder="Ej: Consulta y opera el inventario de su sucursal."
            value={values.description}
            onChange={handleChange('description')}
            error={errors.description}
            helperText="Opcional."
            maxLength={255}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/security/profiles')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? 'Guardar cambios' : 'Crear perfil'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
