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

/** Encabezados y pies que no son productos y conviene descartar solos. */
const HEADER_CODE_PATTERN = /^(c[oó]digo|c[oó]d\.?|sku|referencia|ref\.?|art[ií]culo|item)\b/i;
const HEADER_NAME_PATTERN = /(descripci[oó]n|producto|nombre|detalle|concepto)/i;
const TOTALS_PATTERN =
  /^(total|subtotal|iva|impuesto|descuento|recargo|flete|env[ií]o|base(\s+imponible)?|efectivo|cambio|saldo|redondeo|propina)\b/i;
const META_PATTERN =
  /^(factura|fecha|cliente|nit|c[eé]dula|tel[eé]fono|direcci[oó]n|vendedor|cajero|forma\s+de\s+pago|remisi[oó]n)\b/i;

/**
 * Construye la tabla de la factura. Las líneas se ordenan por altura y las
 * palabras por posición; las líneas que solo continúan el texto de la fila
 * anterior (descripciones que se parten en dos) se unen a ella.
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

  if (sortedLines.length === 0) return { columnCount: 0, rows: [] };

  const columnStarts = detectColumnStarts(sortedLines);
  const columnCount = columnStarts.length;

  const rows: string[][] = [];
  let previous: { y1: number; height: number; rowIndex: number } | null = null;

  for (const line of sortedLines) {
    const cells = new Array<string>(columnCount).fill('');

    for (const word of line.words) {
      cells[columnIndexAt(columnStarts, word.x0)] += `${word.text} `;
    }

    const trimmed = cells.map((cell) => cell.trim());
    const filled = trimmed.filter((cell) => cell.length > 0).length;
    if (filled === 0) continue;

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

  return { columnCount, rows };
}

/** Descarta la fila si es encabezado de tabla, total o dato del documento. */
function isNonProductRow(cells: string[], filled: number): boolean {
  const texts = cells.filter((cell) => cell.length > 0);

  const isHeader =
    texts.some((text) => HEADER_CODE_PATTERN.test(text)) &&
    texts.some((text) => HEADER_NAME_PATTERN.test(text));
  if (isHeader) return true;

  const first = texts[0] ?? '';

  // «Total 1200» o «IVA 19%»: importes del pie, no productos.
  if (filled <= 3 && TOTALS_PATTERN.test(first)) return true;

  // «Fecha 12/10/2026», «Cliente ...»: cabecera del documento.
  if (filled <= 2 && META_PATTERN.test(first)) return true;

  return false;
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

  if (lines.length === 0) return { columnCount: 0, rows: [] };

  const split = pickTextSplitter(lines);
  const parsed = lines
    .map((line) => split(line).map((cell) => cell.trim().replace(/\s+/g, ' ')))
    .filter((cells) => cells.some((cell) => cell.length > 0));

  const occurrences = new Map<number, number>();
  for (const cells of parsed) {
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

  if (columnCount < 2) return { columnCount: Math.max(columnCount, 1), rows: [] };

  return {
    columnCount,
    rows: parsed
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
