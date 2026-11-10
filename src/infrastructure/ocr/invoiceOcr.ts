import type { PSM, createWorker } from 'tesseract.js';
import type { OcrLineBox } from '@/shared/utils/invoiceTable';

/** Progreso del OCR: etapa en curso y avance de 0 a 1. */
export interface OcrProgress {
  status: string;
  progress: number;
}

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

/** Estructura mínima que se usa del resultado de Tesseract. */
interface OcrWordResult {
  text?: string;
  bbox?: { x0?: number; x1?: number };
}

interface OcrLineResult {
  bbox?: { y0?: number; y1?: number };
  words?: OcrWordResult[];
}

interface OcrBlockResult {
  paragraphs?: { lines?: OcrLineResult[] }[];
}

/** Lado máximo que se manda al OCR: más resolución no aporta y consume memoria. */
const MAX_OCR_SIDE = 2000;
/** Por debajo de esto el texto queda muy pequeño; se amplía hasta el doble. */
const MIN_OCR_SIDE = 1200;

let workerPromise: Promise<TesseractWorker> | null = null;
let progressListener: ((progress: OcrProgress) => void) | null = null;

/**
 * Extrae TODO el texto de una foto de factura y devuelve sus líneas con la
 * posición de cada palabra.
 *
 * El motor (Tesseract) corre en el navegador, así que la imagen no sale del
 * equipo. La primera vez descarga el modelo de español y el runtime Wasm desde
 * el CDN del proyecto (después quedan en caché). El worker se reutiliza entre
 * reconocimientos para no pagar esa descarga dos veces.
 *
 * Antes de reconocer, la imagen se endereza según su orientación EXIF, se
 * reescala y se le estira el contraste: las fotos de móvil llegan giradas o
 * sobredimensionadas, y eso es lo que más ensucia el OCR.
 *
 * No se interpreta nada aquí: la geometría se resuelve después en
 * `buildInvoiceTable`, que detecta las columnas.
 */
export async function recognizeInvoiceImage(
  image: Blob | File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrLineBox[]> {
  progressListener = onProgress ?? null;

  try {
    progressListener?.({ status: 'preprocessing', progress: 0 });
    const prepared = await prepareImage(image);
    const worker = await getWorker();
    const result = await worker.recognize(prepared, {}, { blocks: true });
    return extractLines(result.data.blocks);
  } catch (error) {
    // Un worker que falló puede quedar inservible; se descarta para que el
    // siguiente intento arranque limpio en vez de repetir el mismo error.
    await discardWorker();
    throw new Error(describeOcrError(error));
  } finally {
    progressListener = null;
  }
}

/**
 * Endereza, reescala y normaliza el contraste de la foto antes del OCR.
 *
 * Si el navegador no puede decodificar la imagen (por ejemplo un HEIC en
 * Chrome), se devuelve el original y decide el motor OCR.
 */
async function prepareImage(image: Blob | File): Promise<Blob | File> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return image;

  let bitmap: ImageBitmap;
  try {
    // `from-image` aplica la orientación EXIF: la foto del móvil no llega girada.
    bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' });
  } catch {
    return image;
  }

  try {
    const scale = targetScale(bitmap.width, bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return image;

    context.drawImage(bitmap, 0, 0, width, height);

    const pixels = context.getImageData(0, 0, width, height);
    enhanceGrayscale(pixels.data);
    context.putImageData(pixels, 0, 0);

    return await canvasToBlob(canvas);
  } catch {
    return image;
  } finally {
    bitmap.close();
  }
}

/** Escala para dejar el lado mayor dentro de [MIN_OCR_SIDE, MAX_OCR_SIDE]. */
function targetScale(width: number, height: number): number {
  const longest = Math.max(width, height);
  if (longest > MAX_OCR_SIDE) return MAX_OCR_SIDE / longest;
  if (longest < MIN_OCR_SIDE) return Math.min(2, MIN_OCR_SIDE / longest);
  return 1;
}

/**
 * Pasa la imagen a gris y estira el contraste entre los percentiles 2 y 98.
 *
 * Tesseract binariza por su cuenta, así que no se fuerza blanco y negro: se
 * conservan los grises intermedios (el antialiasing del texto) y se recuperan
 * los tickets descoloridos. La ganancia se limita a 3× para no amplificar ruido.
 */
function enhanceGrayscale(data: Uint8ClampedArray): void {
  const histogram = new Uint32Array(256);
  const pixelCount = data.length / 4;

  for (let index = 0; index < data.length; index += 4) {
    const gray = (data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114) | 0;
    data[index] = gray;
    histogram[gray] += 1;
  }

  const low = percentile(histogram, pixelCount, 0.02);
  const high = percentile(histogram, pixelCount, 0.98);
  const range = high - low;
  const gain = range > 16 ? Math.min(3, 255 / range) : 1;

  const lookup = new Uint8ClampedArray(256);
  for (let value = 0; value < 256; value += 1) {
    lookup[value] = range > 16 ? Math.round((value - low) * gain) : value;
  }

  for (let index = 0; index < data.length; index += 4) {
    const gray = lookup[data[index]];
    data[index] = gray;
    data[index + 1] = gray;
    data[index + 2] = gray;
  }
}

/** Valor de luminancia por debajo del cual queda la fracción indicada. */
function percentile(histogram: Uint32Array, total: number, fraction: number): number {
  const target = total * fraction;
  let seen = 0;

  for (let value = 0; value < 256; value += 1) {
    seen += histogram[value];
    if (seen >= target) return value;
  }

  return 255;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('no se pudo preparar la imagen.'));
    }, 'image/png');
  });
}

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(({ createWorker }) =>
        createWorker('spa', undefined, {
          logger: (message) => {
            progressListener?.({
              status: message.status,
              progress: Number.isFinite(message.progress) ? message.progress : 0,
            });
          },
        }),
      )
      .then(async (worker) => {
        await worker.setParameters({
          // Una factura es un bloque uniforme de líneas: así el OCR no reparte
          // cada columna en un bloque distinto y conserva las coordenadas.
          tessedit_pageseg_mode: '6' as PSM,
          preserve_interword_spaces: '1',
          // Evita que Tesseract estime una resolución absurda tras reescalar.
          user_defined_dpi: '300',
        });
        return worker;
      })
      .catch((error: unknown) => {
        // Si falló la carga (p. ej. sin red), se reintenta en el próximo intento.
        workerPromise = null;
        throw error;
      });
  }

  return workerPromise;
}

/** Cierra y olvida el worker actual; el próximo reconocimiento crea otro. */
async function discardWorker(): Promise<void> {
  const pending = workerPromise;
  workerPromise = null;
  if (!pending) return;

  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    // El worker ya estaba roto: no hay nada que liberar.
  }
}

/** Traduce los fallos habituales del OCR a algo accionable. */
function describeOcrError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/heic|unsupported|decode|invalid image|format/i.test(message)) {
    return 'el formato de la imagen no es compatible. Usa una foto JPG o PNG.';
  }
  if (/memory|alloc|buffer|out of range/i.test(message)) {
    return 'la imagen es demasiado grande para este equipo. Prueba con una foto más pequeña.';
  }
  if (/fetch|network|worker|cors|import|loading|load\b/i.test(message)) {
    return 'no se pudo cargar el motor de OCR. Revisa la conexión a internet e inténtalo de nuevo.';
  }

  return message || 'el OCR falló sin dar detalles.';
}

/** Aplana la jerarquía bloques → párrafos → líneas del resultado de Tesseract. */
function extractLines(blocks: OcrBlockResult[] | null | undefined): OcrLineBox[] {
  if (!Array.isArray(blocks)) return [];

  const lines: OcrLineBox[] = [];

  for (const block of blocks) {
    for (const paragraph of block?.paragraphs ?? []) {
      for (const line of paragraph?.lines ?? []) {
        const words = (line?.words ?? [])
          .map((word) => ({
            text: word.text ?? '',
            x0: word.bbox?.x0 ?? 0,
            x1: word.bbox?.x1 ?? 0,
          }))
          .filter((word) => word.text.trim().length > 0);

        if (words.length === 0) continue;

        lines.push({
          y0: line.bbox?.y0 ?? 0,
          y1: line.bbox?.y1 ?? 0,
          words,
        });
      }
    }
  }

  return lines;
}
