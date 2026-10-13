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
