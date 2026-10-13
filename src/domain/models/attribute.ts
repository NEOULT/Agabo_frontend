/**
 * 🏷️ Definición de atributo dinámico
 *
 * Cada comercio puede definir los atributos que necesita
 * para sus productos, agrupados por categoría.
 *
 * Ejemplo para una tienda de ropa:
 *   category: "Ropa"
 *   attributes: [
 *     { key: "talla",     label: "Talla",     type: "select", options: ["S","M","L","XL"] },
 *     { key: "color",     label: "Color",     type: "text" },
 *     { key: "material",  label: "Material",  type: "text" },
 *   ]
 *
 * Ejemplo para una tienda de alimentos:
 *   category: "Lácteos"
 *   attributes: [
 *     { key: "lote",         label: "Lote",         type: "text" },
 *     { key: "vencimiento",  label: "Fecha Venc.",  type: "date" },
 *     { key: "peso_neto",    label: "Peso Neto",    type: "text" },
 *   ]
 */
export type AttributeType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface AttributeDefinition {
  /** Identificador único del atributo (ej: 'talla', 'lote') */
  key: string;
  /** Etiqueta visible en la UI (ej: 'Talla', 'Lote') */
  label: string;
  /** Tipo de dato para renderizar el input correcto */
  type: AttributeType;
  /** Para tipo 'select', las opciones disponibles */
  options?: string[];
  /** Si el atributo es obligatorio al crear productos */
  required?: boolean;
  /** Orden de aparición en el formulario */
  order?: number;
}

/**
 * 📋 Configuración de atributos por categoría de producto
 *
 * Se guarda a nivel de comercio (no por sede).
 * Define qué campos extra aparecen al crear/editar productos
 * de una categoría específica.
 */
export interface CategoryAttributesConfig {
  category: string;
  attributes: AttributeDefinition[];
}

/**
 * 🆕 DTO para crear/actualizar la configuración de atributos
 */
export interface UpdateCategoryAttributesDTO {
  category: string;
  attributes: Omit<AttributeDefinition, 'key'>[];
}
