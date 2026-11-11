/**
 * Detección de la tabla de una factura a partir de las líneas que devuelve el
 * OCR.
 *
 * El objetivo es no asumir nada del documento: no se conocen los encabezados ni
 * el orden de las columnas. Solo se usa la geometría del texto:
 *
 * 1. Todas las palabras se proyectan sobre el eje horizontal.
 * 2. Un canal (o *gutter*) es una franja vertical donde casi ninguna fila tiene
 *    texto. Ese canal separa una columna de otra.
 * 3. Cada palabra se asigna a la columna donde empieza.
 *
 * El resultado es una matriz de texto; qué columna representa el código y cuál
 * el nombre lo decide la persona en el paso de mapeo.
 */

/** Palabra reconocida por OCR con su caja delimitadora horizontal. */
export interface OcrWordBox {
  text: string;
  x0: number;
  x1: number;
}

/** Línea de texto reconocida por OCR con sus palabras y posición vertical. */
export interface OcrLineBox {
  words: OcrWordBox[];
  y0: number;
  y1: number;
}

export interface InvoiceTable {
  /** Cantidad de columnas detectadas (0 si no hay texto). */
  columnCount: number;
  /** Filas útiles: una por línea de la tabla, con una celda por columna. */
  rows: string[][];
  /** Encabezado detectado, alineado por columna ('' si no hay). */
  headers: string[];
  /** Texto completo del documento, para extraer datos de la cabecera. */
  rawText: string;
}

/** Papeles que puede cumplir una columna de la factura. */
export type ColumnRole = 'code' | 'name' | 'barcode' | 'quantity' | 'price';

/** Índice de columna asignado a cada papel (null si no se detectó). */
export type ColumnRoles = Record<ColumnRole, number | null>;

/** Datos de cabecera del documento que interesan al alta de productos. */
export interface InvoiceMeta {
  invoiceNumber?: string;
}

/** Un canal debe ocupar al menos este % del ancho del texto de la página. */
const MIN_GUTTER_RATIO = 0.004;
/** Y al menos estos píxeles, para fotos pequeñas. */
const MIN_GUTTER_PX = 4;
/** Tope de columnas: más que esto suele ser texto partido, no una tabla. */
const MAX_COLUMNS = 12;
/** Fracción de filas que puede invadir un canal sin dejar de serlo. */
const GUTTER_ROW_TOLERANCE = 0.1;
/** Tope de filas para no bloquear la interfaz con documentos enormes. */
export const MAX_INVOICE_ROWS = 500;

/** Encabezados habituales de cada papel de columna. */
const HEADER_PATTERNS: Record<ColumnRole, RegExp> = {
  barcode: /(c[oó]digo\s*(de\s*)?barras|\bbarras\b|\bean\b|\bupc\b|\bbarcode\b)/i,
  code: /^(c[oó]digo|c[oó]d\.?|sku|referencia|ref\.?|art[ií]culo|item|cve|clave)\b/i,
  name: /(descripci[oó]n|producto|nombre|detalle|concepto)/i,
  quantity: /^(cant(idad)?\.?|unidades?|unds?|pzas?|piezas?|unid\.?|ctd)\b/i,
  price: /(precio|unitario|p\.?\s*unit|vr\.?\s*unit|costo)/i,
};
const TOTALS_PATTERN =
  /^(total|subtotal|iva|impuesto|descuento|recargo|flete|env[ií]o|base(\s+imponible)?|efectivo|cambio|saldo|redondeo|propina)\b/i;
const META_PATTERN =
  /^(factura|fecha|cliente|nit|c[eé]dula|tel[eé]fono|direcci[oó]n|vendedor|cajero|forma\s+de\s+pago|remisi[oó]n)\b/i;

/**
 * Construye la tabla de la factura. Las líneas se ordenan por altura y las
 * palabras por posición; las líneas que solo continúan el texto de la fila
 * anterior (descripciones que se parten en dos) se unen a ella. El encabezado
 * no se devuelve como producto: se guarda aparte para deducir qué es cada
 * columna.
 */
export function buildInvoiceTable(lines: OcrLineBox[]): InvoiceTable {
  const sortedLines = lines
    .map((line) => ({
      ...line,
      words: line.words
        .filter((word) => word.text.trim().length > 0)
        .sort((a, b) => a.x0 - b.x0),
    }))
    .filter((line) => line.words.length > 0)
    .sort((a, b) => a.y0 - b.y0 || a.words[0].x0 - b.words[0].x0);

  const rawText = sortedLines
    .map((line) => line.words.map((word) => word.text).join(' '))
    .join('\n');

  if (sortedLines.length === 0) {
    return { columnCount: 0, rows: [], headers: [], rawText: '' };
  }

  const columnStarts = detectColumnStarts(sortedLines);
  const columnCount = columnStarts.length;

  const rows: string[][] = [];
  let headers: string[] | null = null;
  let previous: { y1: number; height: number; rowIndex: number } | null = null;

  for (const line of sortedLines) {
    const cells = new Array<string>(columnCount).fill('');

    for (const word of line.words) {
      cells[columnIndexAt(columnStarts, word.x0)] += `${word.text} `;
    }

    const trimmed = cells.map((cell) => cell.trim());
    const filled = trimmed.filter((cell) => cell.length > 0).length;
    if (filled === 0) continue;

    if (!headers && isHeaderCells(trimmed)) {
      headers = trimmed;
      continue;
    }

    // Encabezados, totales y datos del documento no son productos: si entran,
    // se crean como filas basura que hay que desmarcar a mano.
    if (isNonProductRow(trimmed, filled)) continue;

    // Continuación de la descripción de la fila anterior: misma columna y
    // separación vertical corta respecto a la línea previa.
    if (filled === 1 && previous && rows[previous.rowIndex]) {
      const index = trimmed.findIndex((cell) => cell.length > 0);
      const target = rows[previous.rowIndex];
      const gap = line.y0 - previous.y1;
      const isContinuation = gap <= Math.max(2, previous.height * 0.6);

      if (isContinuation && target[index]?.length > 0) {
        target[index] = `${target[index]} ${trimmed[index]}`.trim();
        previous = {
          y1: line.y1,
          height: Math.max(1, line.y1 - line.y0),
          rowIndex: previous.rowIndex,
        };
        continue;
      }
    }

    // Una fila de producto siempre toca al menos dos columnas.
    if (filled < 2) continue;

    rows.push(trimmed);
    if (rows.length >= MAX_INVOICE_ROWS) break;

    previous = {
      y1: line.y1,
      height: Math.max(1, line.y1 - line.y0),
      rowIndex: rows.length - 1,
    };
  }

  return { columnCount, rows, headers: headers ?? [], rawText };
}

/** Descarta la fila si es encabezado de tabla, total o dato del documento. */
function isNonProductRow(cells: string[], filled: number): boolean {
  if (isHeaderCells(cells)) return true;

  const texts = cells.filter((cell) => cell.length > 0);
  const first = texts[0] ?? '';

  // «Total 1200» o «IVA 19%»: importes del pie, no productos.
  if (filled <= 3 && TOTALS_PATTERN.test(first)) return true;

  // «Fecha 12/10/2026», «Cliente ...»: cabecera del documento.
  if (filled <= 2 && META_PATTERN.test(first)) return true;

  return false;
}

/**
 * Fila de encabezado: al menos dos celdas se llaman como un dato de producto
 * (código, descripción, cantidad, precio, código de barras…).
 */
function isHeaderCells(cells: string[]): boolean {
  let matches = 0;

  for (const cell of cells) {
    if (cell.trim() && headerRole(cell)) matches += 1;
  }

  return matches >= 2;
}

/** Papel que sugiere el texto de un encabezado. */
function headerRole(text: string): ColumnRole | null {
  const value = normalizeHeader(text);
  if (!value) return null;

  if (HEADER_PATTERNS.barcode.test(value)) return 'barcode';
  if (HEADER_PATTERNS.code.test(value)) return 'code';
  if (HEADER_PATTERNS.name.test(value)) return 'name';
  if (HEADER_PATTERNS.quantity.test(value)) return 'quantity';
  // «Total» e «importe» son el importe de la línea, no el precio unitario.
  if (HEADER_PATTERNS.price.test(value) && !/\b(total|importe)\b/.test(value)) return 'price';

  return null;
}

function normalizeHeader(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Posición (x) donde arranca cada columna detectada.
 *
 * Se proyectan las palabras de todas las filas sobre el eje horizontal y se
 * buscan franjas donde casi ninguna fila tiene texto. A diferencia de recorrer
 * las palabras en orden, una sola palabra larga no puede tapar un canal: no
 * borra el canal, solo suma una fila de cobertura, y se tolera hasta un 10 % de
 * las filas. El corte se coloca al **final** del canal, donde arranca la
 * columna siguiente: un nombre largo que se estira hacia la derecha no se
 * reparte entre dos columnas.
 */
function detectColumnStarts(lines: OcrLineBox[]): number[] {
  const words = lines.flatMap((line, row) =>
    line.words.map((word) => ({ x0: word.x0, x1: word.x1, row })),
  );

  if (words.length === 0) return [];

  const pageLeft = words.reduce((min, word) => Math.min(min, word.x0), words[0].x0);
  const pageRight = words.reduce((max, word) => Math.max(max, word.x1), words[0].x1);
  const rowCount = lines.length;
  const charWidth = medianCharWidth(lines);

  // Con una sola fila no hay alineación vertical que detectar.
  if (rowCount < 2 || pageRight - pageLeft < charWidth * 4) return [pageLeft];

  const minGutter = Math.max(
    MIN_GUTTER_PX,
    charWidth * 1.2,
    (pageRight - pageLeft) * MIN_GUTTER_RATIO,
  );

  // Se mide en franjas de un cuarto de carácter: suficiente resolución para no
  // perder canales estrechos, sin recorrer la imagen píxel a píxel.
  const binSize = Math.max(1, Math.round(charWidth / 4));
  const binCount = Math.max(1, Math.ceil((pageRight - pageLeft) / binSize));
  const binAt = (x: number) =>
    Math.min(binCount - 1, Math.max(0, Math.floor((x - pageLeft) / binSize)));

  // Filas distintas que tienen tinta en cada franja.
  const rowCoverage = new Int32Array(binCount);
  const rowBins = new Uint8Array(binCount);

  for (const line of lines) {
    rowBins.fill(0);
    for (const word of line.words) {
      const from = binAt(word.x0);
      const to = binAt(word.x1);
      for (let bin = from; bin <= to; bin += 1) rowBins[bin] = 1;
    }
    for (let bin = 0; bin < binCount; bin += 1) {
      if (rowBins[bin]) rowCoverage[bin] += 1;
    }
  }

  const allowedRows = Math.max(1, Math.floor(rowCount * GUTTER_ROW_TOLERANCE));
  const minSideRows = Math.min(rowCount, Math.max(2, Math.ceil(rowCount * 0.1)));
  // Una columna de un solo dígito es legítima: el lateral solo debe ser algo
  // más ancho que la mitad de un carácter.
  const minSideWidth = Math.max(6, charWidth / 2);

  const boundaries: number[] = [];
  const pending: Array<{ left: number; right: number }> = [
    { left: pageLeft, right: pageRight },
  ];

  while (pending.length > 0 && boundaries.length < MAX_COLUMNS - 1) {
    const region = pending.shift();
    if (!region) break;

    const fromBin = binAt(region.left);
    const toBin = binAt(region.right);
    const gutters: Array<{ start: number; end: number; cut: number; width: number }> = [];
    let runStart = -1;

    for (let bin = fromBin; bin <= toBin + 1; bin += 1) {
      const isGutter = bin <= toBin && rowCoverage[bin] <= allowedRows;

      if (isGutter && runStart < 0) runStart = bin;

      if (!isGutter && runStart >= 0) {
        const width = (bin - runStart) * binSize;
        // Un canal pegado al borde de la región es el que ya separó al padre.
        if (width >= minGutter && runStart > fromBin && bin - 1 < toBin) {
          gutters.push({
            start: runStart,
            end: bin,
            cut: cutInsideGutter(rowCoverage, runStart, bin, binSize, minGutter),
            width,
          });
        }
        runStart = -1;
      }
    }

    // El canal más ancho separa los grupos de columnas más evidentes.
    gutters.sort((a, b) => b.width - a.width);

    for (const gutter of gutters) {
      const boundary = refineBoundary(
        pageLeft + gutter.cut * binSize,
        words,
        region,
        binSize * 2,
      );

      if (boundary - region.left < minSideWidth || region.right - boundary < minSideWidth) {
        continue;
      }

      // A cada lado del corte debe haber texto de varias filas: así un espacio
      // ancho dentro de una descripción no inventa una columna.
      const leftRows = new Set<number>();
      const rightRows = new Set<number>();

      for (const word of words) {
        if (word.x0 < region.left || word.x0 > region.right) continue;
        if (word.x0 < boundary) leftRows.add(word.row);
        else rightRows.add(word.row);
      }

      if (leftRows.size < minSideRows || rightRows.size < minSideRows) continue;

      boundaries.push(boundary);
      pending.push(
        { left: region.left, right: boundary },
        { left: boundary, right: region.right },
      );
      break;
    }
  }

  boundaries.sort((a, b) => a - b);
  return [pageLeft, ...boundaries];
}

/**
 * Ajusta el corte al inicio de la primera palabra de la columna siguiente.
 *
 * El corte sale de franjas de píxeles, así que puede quedar unos píxeles a la
 * derecha del texto real y mandar la primera palabra a la columna anterior. Se
 * mueve solo hacia la izquierda y como mucho una franja o dos.
 */
function refineBoundary(
  boundary: number,
  words: Array<{ x0: number }>,
  region: { left: number; right: number },
  tolerance: number,
): number {
  let firstStart = Number.POSITIVE_INFINITY;

  for (const word of words) {
    if (word.x0 < region.left || word.x0 > region.right) continue;
    if (word.x0 >= boundary - tolerance && word.x0 < firstStart) firstStart = word.x0;
  }

  return Number.isFinite(firstStart) && firstStart < boundary ? firstStart : boundary;
}

/**
 * Punto de corte dentro de un canal.
 *
 * Un canal puede tener algo de tinta de una sola fila (un nombre largo que se
 * estira). El corte se pone en el final del último hueco **vacío** del canal:
 * así queda justo donde arranca la columna siguiente, sin partir la palabra
 * larga anterior ni dejar fuera el número más ancho de la columna siguiente.
 */
function cutInsideGutter(
  rowCoverage: Int32Array,
  start: number,
  end: number,
  binSize: number,
  minGutter: number,
): number {
  let emptyStart = -1;
  let cut = end;

  for (let bin = start; bin < end; bin += 1) {
    const isEmpty = rowCoverage[bin] === 0;

    if (isEmpty && emptyStart < 0) emptyStart = bin;

    if (!isEmpty && emptyStart >= 0) {
      if ((bin - emptyStart) * binSize >= minGutter) cut = bin;
      emptyStart = -1;
    }
  }

  if (emptyStart >= 0 && (end - emptyStart) * binSize >= minGutter) cut = end;

  return cut;
}

/** Ancho mediano de un carácter: base de todos los umbrales en píxeles. */
function medianCharWidth(lines: OcrLineBox[]): number {
  const charWidths: number[] = [];

  for (const line of lines) {
    for (const word of line.words) {
      const characters = word.text.trim().length;
      const width = word.x1 - word.x0;
      if (characters >= 2 && width > 0) charWidths.push(width / characters);
    }
  }

  if (charWidths.length === 0) return 10;
  charWidths.sort((a, b) => a - b);
  return Math.max(1, charWidths[Math.floor(charWidths.length / 2)]);
}

/** Última columna cuyo inicio no supera la posición de la palabra. */
function columnIndexAt(starts: number[], x: number): number {
  let index = 0;
  for (let i = 0; i < starts.length; i += 1) {
    if (x >= starts[i]) index = i;
  }
  return index;
}

/**
 * Arma la misma tabla a partir de texto plano: pegado desde el portapapeles o
 * leído de un archivo `.txt` / `.csv`.
 *
 * Al no haber geometría, las columnas se deducen del separador más usado en el
 * documento (tabulación, barra vertical, punto y coma o dos o más espacios) y la
 * cantidad de columnas es la más frecuente entre las líneas. Las líneas con otra
 * forma —títulos, totales, pies— se descartan solas.
 */
export function buildTableFromText(text: string): InvoiceTable {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { columnCount: 0, rows: [], headers: [], rawText: text };
  }

  const split = pickTextSplitter(lines);
  const parsed = lines
    .map((line) => split(line).map((cell) => cell.trim().replace(/\s+/g, ' ')))
    .filter((cells) => cells.some((cell) => cell.length > 0));

  // La fila de encabezado no es un producto: se guarda aparte y se excluye del
  // conteo de columnas para que no desplace la moda.
  const headerRow = parsed.find((cells) => isHeaderCells(cells)) ?? null;
  const dataRows = headerRow ? parsed.filter((cells) => cells !== headerRow) : parsed;

  const occurrences = new Map<number, number>();
  for (const cells of dataRows) {
    occurrences.set(cells.length, (occurrences.get(cells.length) ?? 0) + 1);
  }

  let columnCount = 0;
  let bestCount = 0;
  for (const [count, times] of occurrences) {
    if (count < 2) continue;
    if (times > bestCount || (times === bestCount && count < columnCount)) {
      columnCount = count;
      bestCount = times;
    }
  }

  if (columnCount < 2) {
    return { columnCount: Math.max(columnCount, 1), rows: [], headers: [], rawText: text };
  }

  const headers = headerRow
    ? Array.from({ length: columnCount }, (_, index) => headerRow[index]?.trim() ?? '')
    : [];

  return {
    columnCount,
    headers,
    rawText: text,
    rows: dataRows
      .filter((cells) => cells.length === columnCount)
      .slice(0, MAX_INVOICE_ROWS),
  };
}

/** Elige el separador de columnas presente en al menos la mitad de las líneas. */
function pickTextSplitter(lines: string[]): (line: string) => string[] {
  const majority = Math.ceil(lines.length / 2);

  if (lines.filter((line) => line.includes('\t')).length >= majority) {
    return (line) => line.split('\t');
  }
  if (lines.filter((line) => line.includes('|')).length >= majority) {
    return (line) => line.split('|');
  }
  if (lines.filter((line) => line.includes(';')).length >= majority) {
    return (line) => line.split(';');
  }

  return (line) => line.split(/\s{2,}/);
}

/** Primeras celdas con contenido de una columna, para vista previa del mapeo. */
export function columnSamples(rows: string[][], column: number, limit = 3): string[] {
  const samples: string[] = [];

  for (const row of rows) {
    const value = row[column]?.trim();
    if (!value || samples.includes(value)) continue;
    samples.push(value);
    if (samples.length >= limit) break;
  }

  return samples;
}

/** Perfil de una columna: suficiente para adivinar su papel sin encabezado. */
interface ColumnProfile {
  index: number;
  filled: number;
  filledRatio: number;
  textRatio: number;
  numericRatio: number;
  integerRatio: number;
  decimalRatio: number;
  currencyRatio: number;
  longDigitRatio: number;
  uniqueRatio: number;
  avgLetters: number;
  avgLength: number;
  avgValue: number;
  unitRatio: number;
}

/** Celda que solo contiene un número (con moneda o unidad opcional). */
const NUMBER_CELL =
  /^[\s$€]*[-+]?[\d.,\s]+(?:\s*(?:und|uds?|un|uni|pzas?|piezas?|kg|g|lb|l|ml))?[\s]*$/i;

const UNIT_IN_CELL = /(^|\s)(und|uds?|un|uni|pzas?|piezas?|kg|g|lb|l|ml)(\.|\s|$)/i;

const BARCODE_CELL = /^\d{8,}$/;

function profileColumn(rows: string[][], index: number): ColumnProfile {
  const sample = rows.slice(0, 40);
  const unique = new Set<string>();

  let filled = 0;
  let text = 0;
  let numeric = 0;
  let integer = 0;
  let decimal = 0;
  let currency = 0;
  let longDigits = 0;
  let units = 0;
  let letters = 0;
  let totalLength = 0;
  let sum = 0;

  for (const row of sample) {
    const raw = row[index]?.trim() ?? '';
    if (!raw) continue;

    filled += 1;
    unique.add(raw.toLowerCase());
    totalLength += raw.length;

    const letterCount = (raw.match(/[a-záéíóúüñ]/gi) ?? []).length;
    letters += letterCount;
    if (letterCount > 0) text += 1;
    if (UNIT_IN_CELL.test(raw)) units += 1;
    if (/[$€]/.test(raw)) currency += 1;
    if (BARCODE_CELL.test(raw.replace(/[\s-]/g, ''))) longDigits += 1;

    if (NUMBER_CELL.test(raw)) {
      const value = parseInvoiceNumber(raw);
      if (value !== null) {
        numeric += 1;
        sum += value;
        if (Number.isInteger(value)) integer += 1;
        if (/[.,]\d{1,2}\s*$/.test(raw)) decimal += 1;
      }
    }
  }

  const total = Math.max(1, sample.length);
  const filledSafe = Math.max(1, filled);

  return {
    index,
    filled,
    filledRatio: filled / total,
    textRatio: text / filledSafe,
    numericRatio: numeric / total,
    integerRatio: numeric > 0 ? integer / numeric : 0,
    decimalRatio: numeric > 0 ? decimal / numeric : 0,
    currencyRatio: currency / filledSafe,
    longDigitRatio: longDigits / filledSafe,
    uniqueRatio: unique.size / filledSafe,
    avgLetters: letters / filledSafe,
    avgLength: totalLength / filledSafe,
    avgValue: numeric > 0 ? sum / numeric : 0,
    unitRatio: units / filledSafe,
  };
}

/**
 * Deduce qué columna es cada cosa combinando dos señales:
 *
 * 1. El **encabezado**, cuando el documento lo trae (código, descripción,
 *    cantidad, precio unitario, código de barras…).
 * 2. El **contenido**, cuando no hay encabezado o quedan papeles sin asignar:
 *    los códigos de barras son cadenas largas de dígitos, las cantidades suelen
 *    ser enteros pequeños, los precios llevan decimales o moneda y el nombre es
 *    la columna con más letras.
 *
 * Es una propuesta: la persona puede corregirla en el paso de mapeo.
 */
export function detectColumnRoles(table: InvoiceTable): ColumnRoles {
  const roles: ColumnRoles = {
    code: null,
    name: null,
    barcode: null,
    quantity: null,
    price: null,
  };
  const used = new Set<number>();

  for (let index = 0; index < table.headers.length; index += 1) {
    const role = headerRole(table.headers[index] ?? '');
    if (!role || roles[role] !== null || used.has(index)) continue;
    roles[role] = index;
    used.add(index);
  }

  const profiles = Array.from({ length: table.columnCount }, (_, index) =>
    profileColumn(table.rows, index),
  ).filter((profile) => profile.filled > 0 && !used.has(profile.index));

  const take = (candidates: ColumnProfile[], score: (profile: ColumnProfile) => number) => {
    let best: ColumnProfile | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const candidate of candidates) {
      const value = score(candidate);
      if (value > bestScore) {
        bestScore = value;
        best = candidate;
      }
    }

    return bestScore > 0 ? best : null;
  };

  const assign = (role: ColumnRole, profile: ColumnProfile) => {
    roles[role] = profile.index;
    used.add(profile.index);
  };

  const available = () => profiles.filter((profile) => !used.has(profile.index));

  // 1. Código de barras: dígitos largos en la mayoría de las filas.
  if (roles.barcode === null) {
    const barcode = take(available(), (profile) =>
      profile.longDigitRatio >= 0.5
        ? profile.longDigitRatio * 2 + profile.uniqueRatio
        : -1,
    );
    if (barcode) assign('barcode', barcode);
  }

  // 2. Nombre: la columna con más letras por celda.
  if (roles.name === null) {
    const name = take(available(), (profile) =>
      profile.textRatio >= 0.5 && profile.avgLetters >= 3
        ? profile.avgLetters * (0.5 + profile.textRatio)
        : -1,
    );
    if (name) assign('name', name);
  }

  // 3. Precio y cantidad entre las columnas numéricas restantes. Con una sola
  //    columna numérica se asume precio, salvo que la celda traiga unidades.
  const numericColumns = available().filter((profile) => profile.numericRatio >= 0.4);

  if (numericColumns.length === 1) {
    const only = numericColumns[0];
    if (roles.quantity === null && roles.price === null) {
      if (only.unitRatio >= 0.4 && only.avgValue <= 1000) assign('quantity', only);
      else assign('price', only);
    }
  } else if (numericColumns.length >= 2) {
    if (roles.quantity === null) {
      const quantity = take(numericColumns, (profile) => {
        if (profile.integerRatio < 0.6) return -1;
        const small = profile.avgValue <= 1000 ? 1 : 0;
        const unitBonus = profile.unitRatio >= 0.2 ? 1.5 : 0;
        return (
          profile.integerRatio * 2 +
          unitBonus +
          small +
          (1 - Math.min(profile.avgValue / 10000, 1))
        );
      });
      if (quantity) assign('quantity', quantity);
    }

    if (roles.price === null) {
      const price = take(available(), (profile) => {
        if (profile.numericRatio < 0.4) return -1;
        return (
          (profile.decimalRatio + profile.currencyRatio) * 3 +
          Math.min(profile.avgValue / 10000, 1) * 1.5 +
          (1 - profile.index / Math.max(1, table.columnCount)) * 0.3
        );
      });
      if (price) assign('price', price);
    }
  }

  // 4. Código: columna corta, repetible, con valores distintos en cada fila.
  if (roles.code === null) {
    const code = take(available(), (profile) => {
      if (profile.filledRatio < 0.4 || profile.uniqueRatio < 0.5) return -1;
      return (
        profile.uniqueRatio * 1.5 +
        (profile.avgLength <= 30 ? 1 : 0) +
        (profile.textRatio < 0.9 ? 0.5 : 0) +
        (1 - profile.index / Math.max(1, table.columnCount)) * 0.5
      );
    });
    if (code) assign('code', code);
  }

  return roles;
}

/**
 * Extrae el número de factura del texto del documento.
 *
 * Solo se acepta cuando viene rotulado («Factura Nº …», «Nº factura …»): sin
 * esa etiqueta cualquier número de la cabecera podría confundirse con la
 * factura, así que se deja vacío para que lo escriba la persona.
 */
export function detectInvoiceMeta(rawText: string): InvoiceMeta {
  const text = rawText.replace(/\r/g, '');

  const patterns = [
    /(?:factura|fra\.?|comprobante|recibo)[^\n]{0,30}?(?:(?:n[°ºo.]*|nro\.?)(?!\w)|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})/i,
    /(?:(?:n[°ºo.]*|nro\.?)(?!\w)|#)\s*(?:de\s*)?(?:la\s*)?factura[^\n]{0,10}?[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const value = match?.[1]?.replace(/[.,;:]+$/, '');
    if (value && /\d/.test(value)) return { invoiceNumber: value.toUpperCase() };
  }

  return {};
}

/**
 * Interpreta números de factura con separadores de miles y decimales.
 *
 * En una misma factura conviven «12.500,00», «12,500.00» y «12500». Se toma
 * como decimal el último separador cuando deja uno o dos dígitos; si deja tres,
 * se asume separador de miles (formato español/colombiano habitual).
 */
export function parseInvoiceNumber(
  raw: string,
  options?: { integer?: boolean },
): number | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, '');
  if (!/\d/.test(cleaned)) return null;

  const sign = cleaned.startsWith('-') ? -1 : 1;
  const digits = cleaned.replace(/-/g, '');

  if (options?.integer) {
    const value = Number(digits.replace(/[.,]/g, ''));
    return Number.isFinite(value) ? sign * value : null;
  }

  const lastComma = digits.lastIndexOf(',');
  const lastDot = digits.lastIndexOf('.');
  let normalized = digits;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    normalized = digits.split(thousands).join('').replace(decimal, '.');
  } else if (lastComma >= 0 || lastDot >= 0) {
    const separator = lastComma >= 0 ? ',' : '.';
    const parts = digits.split(separator);
    const decimals = parts[parts.length - 1] ?? '';

    if (decimals.length === 0) {
      normalized = parts.slice(0, -1).join('');
    } else if (decimals.length <= 2) {
      normalized = `${parts.slice(0, -1).join('')}.${decimals}`;
    } else if (decimals.length === 3) {
      normalized = parts.join('');
    } else {
      normalized = `${parts.slice(0, -1).join('')}.${decimals}`;
    }
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? sign * value : null;
}

/** Deja el código de barras sin espacios ni guiones cuando es numérico. */
export function cleanBarcode(raw: string): string {
  const compact = raw.trim().replace(/[\s-]/g, '');
  return /^\d{8,}$/.test(compact) ? compact : raw.trim();
}
