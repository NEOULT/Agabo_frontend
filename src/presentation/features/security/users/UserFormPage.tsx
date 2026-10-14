import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Input } from '@/presentation/components/ui/Input';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useUsers } from '@/application/hooks/useUsers';
import { toast } from '@/application/stores/useToastStore';
import {
  validate,
  required,
  minLength,
  maxLength,
  matches,
  isEmail,
  isStrongPassword,
  PASSWORD_POLICY,
} from '@/shared/utils/validations';

interface UserFormValues {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
}

const initialValues: UserFormValues = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
};

type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;

function validateForm(values: UserFormValues, isEdit: boolean): UserFormErrors {
  const errors: UserFormErrors = {};

  // La identidad (username) no se edita después de crear (RF-SEC-017)
  if (!isEdit) {
    const usernameError = validate(values.username, [
      (v) => required(v, 'El usuario'),
      (v) => minLength(v, 3, 'El usuario'),
      (v) => maxLength(v, 100, 'El usuario'),
      (v) => matches(v, /^[A-Za-z0-9._-]+$/, 'Solo letras, números, puntos, guiones y guiones bajos.'),
    ]);
    if (usernameError) errors.username = usernameError;

    const passwordError = isStrongPassword(values.password);
    if (passwordError) errors.password = passwordError;
  }

  const emailError = validate(values.email, [
    (v) => required(v, 'El correo'),
    (v) => isEmail(v),
    (v) => maxLength(v, 150, 'El correo'),
  ]);
  if (emailError) errors.email = emailError;

  const firstNameError = validate(values.first_name, [
    (v) => required(v, 'El nombre'),
    (v) => maxLength(v, 100, 'El nombre'),
  ]);
  if (firstNameError) errors.first_name = firstNameError;

  const lastNameError = validate(values.last_name, [
    (v) => required(v, 'El apellido'),
    (v) => maxLength(v, 100, 'El apellido'),
  ]);
  if (lastNameError) errors.last_name = lastNameError;

  if (values.phone.trim() && !/^[+0-9()\s-]{7,50}$/.test(values.phone.trim())) {
    errors.phone = 'Ingresa un teléfono válido.';
  }

  return errors;
}

/**
 * Formulario de usuarios (crear / editar).
 *
 * - Crear: identidad y contraseña inicial. El usuario queda activo, sin
 *   perfiles ni sucursales hasta que se le asignen.
 * - Editar: solo correo, nombres y teléfono; el usuario no cambia y la
 *   contraseña se restablece desde la lista (RF-SEC-005 y RF-SEC-017).
 */
export function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { getUser, createUser, updateUser } = useUsers();

  const [values, setValues] = React.useState<UserFormValues>(initialValues);
  const [errors, setErrors] = React.useState<UserFormErrors>({});
  const [isLoading, setIsLoading] = React.useState(isEdit);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    setIsLoading(true);

    getUser(id)
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          setLoadError('No se encontró el usuario solicitado.');
          return;
        }
        setValues({
          username: user.username,
          email: user.email ?? '',
          password: '',
          first_name: user.first_name ?? '',
          last_name: user.last_name ?? '',
          phone: user.phone ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Error al cargar el usuario.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, getUser]);

  const handleChange = (field: keyof UserFormValues) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
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
        await updateUser(id, {
          email: values.email.trim(),
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          phone: values.phone.trim() || null,
        });
        toast.success(`El usuario "${values.username}" fue actualizado.`);
      } else {
        await createUser({
          username: values.username.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          phone: values.phone.trim() || undefined,
        });
        toast.success(`El usuario "${values.username.trim()}" fue creado.`);
      }
      navigate('/security/users');
    } catch (err) {
      // El backend devuelve mensajes específicos (usuario o correo repetido...)
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el usuario.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando usuario..." />;
  }

  if (loadError) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">{loadError}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/security/users')}>
          Volver a Usuarios
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</CardTitle>
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/security/users')}
        >
          Volver
        </Button>
      </CardHeader>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Usuario"
            placeholder="Ej: ana.lopez"
            value={values.username}
            onChange={handleChange('username')}
            error={errors.username}
            helperText={
              isEdit
                ? 'El nombre de usuario no se puede modificar.'
                : 'Único en toda la plataforma. Solo letras, números, puntos y guiones.'
            }
            disabled={isEdit}
            required={!isEdit}
            maxLength={100}
            autoComplete="username"
          />

          {!isEdit && (
            <Input
              label="Contraseña inicial"
              type="password"
              value={values.password}
              onChange={handleChange('password')}
              error={errors.password}
              helperText={PASSWORD_POLICY.hint}
              autoComplete="new-password"
              maxLength={PASSWORD_POLICY.maxLength}
              required
            />
          )}

          <Input
            label="Correo"
            type="email"
            placeholder="Ej: ana.lopez@techstore.example"
            value={values.email}
            onChange={handleChange('email')}
            error={errors.email}
            required
            maxLength={150}
            autoComplete="email"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={values.first_name}
              onChange={handleChange('first_name')}
              error={errors.first_name}
              required
              maxLength={100}
            />
            <Input
              label="Apellido"
              value={values.last_name}
              onChange={handleChange('last_name')}
              error={errors.last_name}
              required
              maxLength={100}
            />
          </div>

          <Input
            label="Teléfono"
            type="tel"
            placeholder="Ej: +58 212 5555555"
            value={values.phone}
            onChange={handleChange('phone')}
            error={errors.phone}
            helperText="Opcional."
            maxLength={50}
          />

          {isEdit && (
            <p className="text-xs text-text-tertiary">
              La contraseña no se cambia aquí: usa “Restablecer contraseña” en la lista de usuarios.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/security/users')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
