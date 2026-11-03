import type { createWorker } from 'tesseract.js';
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
 * No se interpreta nada aquí: la geometría se resuelve después en
 * `buildInvoiceTable`, que detecta las columnas.
 */
export async function recognizeInvoiceImage(
  image: Blob | File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrLineBox[]> {
  progressListener = onProgress ?? null;

  try {
    const worker = await getWorker();
    const result = await worker.recognize(image, {}, { blocks: true });
    return extractLines(result.data.blocks);
  } finally {
    progressListener = null;
  }
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
      .catch((error: unknown) => {
        // Si falló la carga (p. ej. sin red), se reintenta en el próximo intento.
        workerPromise = null;
        throw error;
      });
  }

  return workerPromise;
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
