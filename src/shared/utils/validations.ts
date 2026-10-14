/**
 * Validaciones de formularios reutilizables.
 *
 * Cada validación devuelve `string | null`: null significa "válido",
 * cualquier string es el mensaje de error a mostrar en el campo.
 */

export function required(value: string, label = 'Este campo'): string | null {
  return value.trim().length > 0 ? null : `${label} es obligatorio.`;
}

export function minLength(value: string, min: number, label = 'Este campo'): string | null {
  return value.trim().length >= min
    ? null
    : `${label} debe tener al menos ${min} caracteres.`;
}

export function maxLength(value: string, max: number, label = 'Este campo'): string | null {
  return value.trim().length <= max
    ? null
    : `${label} no puede superar ${max} caracteres.`;
}

export function isEmail(value: string): string | null {
  if (!value.trim()) return null; // vacío: usar required() aparte
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(value.trim()) ? null : 'Ingresa un correo válido.';
}

export function isNumber(value: string): string | null {
  if (!value.trim()) return null;
  return !Number.isNaN(Number(value)) ? null : 'Debe ser un número válido.';
}

export function isPositiveNumber(value: string): string | null {
  const numberError = isNumber(value);
  if (numberError) return numberError;
  if (!value.trim()) return null;
  return Number(value) >= 0 ? null : 'Debe ser un número positivo.';
}

export function isInteger(value: string): string | null {
  if (!value.trim()) return null;
  return Number.isInteger(Number(value)) ? null : 'Debe ser un número entero.';
}

export function matches(value: string, pattern: RegExp, message: string): string | null {
  return pattern.test(value.trim()) ? null : message;
}

/**
 * Política de contraseña del backend (RN-SEC-004): mínimo 8 caracteres, con
 * una mayúscula, una minúscula y un símbolo. El máximo de 72 respeta el
 * límite de bcrypt.
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 72,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).+$/,
  hint: 'Mínimo 8 caracteres, con una mayúscula, una minúscula y un símbolo',
};

/** Valida una contraseña contra la política del backend (RN-SEC-004). */
export function isStrongPassword(value: string): string | null {
  if (value.length < PASSWORD_POLICY.minLength) {
    return `La contraseña debe tener al menos ${PASSWORD_POLICY.minLength} caracteres`;
  }
  if (value.length > PASSWORD_POLICY.maxLength) {
    return `La contraseña no puede superar ${PASSWORD_POLICY.maxLength} caracteres`;
  }
  if (!PASSWORD_POLICY.pattern.test(value)) {
    return 'La contraseña debe incluir una mayúscula, una minúscula y un símbolo';
  }
  return null;
}

/**
 * Ejecuta varias validaciones sobre un valor y devuelve el primer error
 * encontrado (o null si todas pasan).
 */
export function validate(
  value: string,
  validators: Array<(value: string) => string | null>,
): string | null {
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  return null;
}

/**
 * Valida un objeto de campos contra un mapa de validadores por campo.
 * Devuelve un objeto con los errores por campo; vacío si todo es válido.
 */
export function validateFields<T extends Record<string, string>>(
  values: T,
  validators: Partial<Record<keyof T, Array<(value: string) => string | null>>>,
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};

  for (const [field, fieldValidators] of Object.entries(validators) as Array<
    [keyof T, Array<(value: string) => string | null>]
  >) {
    const error = validate(values[field], fieldValidators);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
}
