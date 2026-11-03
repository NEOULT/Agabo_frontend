/**
 * Detección de la tabla de una factura a partir de las líneas que devuelve el
 * OCR.
 *
 * El objetivo es no asumir nada del documento: no se conocen los encabezados ni
 * el orden de las columnas. Solo se usa la geometría del texto:
 *
 * 1. Todas las palabras se proyectan sobre el eje horizontal.
 * 2. Los espacios verticales que ninguna palabra ocupa (canales o *gutters*)
 *    separan una columna de otra.
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
const MIN_GUTTER_RATIO = 0.008;
/** Y al menos estos píxeles, para fotos pequeñas. */
const MIN_GUTTER_PX = 6;
/** Tope de filas para no bloquear la interfaz con documentos enormes. */
export const MAX_INVOICE_ROWS = 500;

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

    // Encabezados sueltos, totales y pies de página quedan fuera de la tabla:
    // una fila de producto siempre toca al menos dos columnas.
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

/** Posición (x) donde arranca cada columna detectada. */
function detectColumnStarts(lines: OcrLineBox[]): number[] {
  const intervals = lines
    .flatMap((line) => line.words.map((word) => ({ x0: word.x0, x1: word.x1 })))
    .sort((a, b) => a.x0 - b.x0);

  const pageLeft = intervals[0].x0;
  const pageRight = intervals.reduce((max, word) => Math.max(max, word.x1), intervals[0].x1);
  const minGutter = Math.max(MIN_GUTTER_PX, (pageRight - pageLeft) * MIN_GUTTER_RATIO);
  const threshold = gutterThreshold(lines, (pageRight - pageLeft) * MIN_GUTTER_RATIO);

  const starts: number[] = [pageLeft];
  let coveredUntil = intervals[0].x1;

  for (const word of intervals.slice(1)) {
    const gap = word.x0 - coveredUntil;
    if (gap > minGutter && gap > threshold) starts.push(coveredUntil);
    coveredUntil = Math.max(coveredUntil, word.x1);
  }

  return starts;
}

/**
 * Distancia mínima para considerar que un hueco separa columnas.
 *
 * Se mide en función del ancho medio de los caracteres: un espacio entre
 * palabras ocupa una fracción de carácter, mientras que el canal entre dos
 * columnas ocupa varios. Así el umbral se adapta a la resolución, al tamaño de
 * letra y al tipo de documento sin depender de píxeles fijos.
 */
function gutterThreshold(lines: OcrLineBox[], minGutter: number): number {
  const charWidths: number[] = [];

  for (const line of lines) {
    for (const word of line.words) {
      const characters = word.text.trim().length;
      const width = word.x1 - word.x0;
      if (characters >= 2 && width > 0) charWidths.push(width / characters);
    }
  }

  if (charWidths.length === 0) return minGutter;
  charWidths.sort((a, b) => a - b);

  const median = charWidths[Math.floor(charWidths.length / 2)];
  return Math.max(minGutter, median * 2);
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
