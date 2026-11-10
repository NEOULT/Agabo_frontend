import React from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardPaste,
  FileText,
  ImageIcon,
  Plus,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';

import { Modal } from '@/presentation/components/ui/Modal';
import { Button } from '@/presentation/components/ui/Button';
import { Select } from '@/presentation/components/ui/Select';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { Badge } from '@/presentation/components/ui/Badge';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { useProducts } from '@/application/hooks/useProducts';
import { useUnits } from '@/application/hooks/useUnits';
import { recognizeInvoiceImage, type OcrProgress } from '@/infrastructure/ocr/invoiceOcr';
import {
  buildInvoiceTable,
  buildTableFromText,
  columnSamples,
  type InvoiceTable,
} from '@/shared/utils/invoiceTable';
import type { Unit } from '@/domain/models';

interface BulkProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'source' | 'upload' | 'text' | 'columns' | 'review' | 'result';

type ColumnRole = 'ignore' | 'code' | 'name';

interface ImportedRow {
  /** Índice de la fila en la tabla detectada. */
  index: number;
  code: string;
  name: string;
}

interface ImportFailure {
  label: string;
  message: string;
}

/** Nombres habituales de la unidad que se usa siempre en la carga masiva. */
const UNIT_ALIASES = ['unidad', 'unidades', 'und', 'unds', 'un', 'uni', 'ud', 'uds', 'u'];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/** Elige la unidad "unidad" (o la primera activa si no existe) para el lote. */
function pickBaseUnit(units: Unit[]): Unit | null {
  const aliasMatch = units.find(
    (unit) =>
      UNIT_ALIASES.includes(normalize(unit.name)) ||
      (unit.abbreviation ? UNIT_ALIASES.includes(normalize(unit.abbreviation)) : false),
  );

  return aliasMatch ?? units[0] ?? null;
}

function ocrStatusLabel(status: string): string {
  if (status === 'preprocessing') return 'Preparando la imagen…';
  if (status.includes('recogniz')) return 'Leyendo la factura…';
  if (status.includes('load') || status.includes('initializ')) return 'Preparando el lector…';
  return 'Procesando la imagen…';
}

/**
 * Carga masiva de productos. La información puede entrar de dos formas:
 *
 * 1. **Origen** — foto de la factura, o texto pegado / archivo `.txt` / `.csv`.
 * 2. **Columnas** — se detectan (por la geometría del OCR o por el separador
 *    del texto) y aquí se decide qué columna es el código (SKU) y cuál el
 *    nombre; el resto se descarta.
 * 3. **Revisión** — se eligen las filas y se confirma el alta.
 * 4. **Resultado** — resumen de lo creado y de los errores por fila.
 *
 * El OCR corre en el navegador: la foto no se sube a ningún servidor. La unidad
 * base siempre es "Unidad": marca y categoría se completan después, como en el
 * alta individual.
 */
export function BulkProductImportModal({ isOpen, onClose }: BulkProductImportModalProps) {
  const {
    createProductWithCode,
    products: catalogProducts,
    error: catalogError,
    fetchProducts,
  } = useProducts();
  const { units, fetchUnits } = useUnits();

  const [step, setStep] = React.useState<Step>('source');

  const [file, setFile] = React.useState<File | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [ocrError, setOcrError] = React.useState<string | null>(null);
  const [isReading, setIsReading] = React.useState(false);
  const [ocrProgress, setOcrProgress] = React.useState<OcrProgress | null>(null);
  const [table, setTable] = React.useState<InvoiceTable | null>(null);

  const [pastedText, setPastedText] = React.useState('');
  const [textError, setTextError] = React.useState<string | null>(null);

  const [codeColumn, setCodeColumn] = React.useState<number | ''>('');
  const [nameColumn, setNameColumn] = React.useState<number | ''>('');

  /** Filas de la revisión: ya editadas por la persona. */
  const [draftRows, setDraftRows] = React.useState<ImportedRow[]>([]);
  /** Filas que la persona desmarcó (las marcadas se derivan del estado). */
  const [excluded, setExcluded] = React.useState<Set<number>>(new Set());
  const [isCheckingCodes, setIsCheckingCodes] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState({ done: 0, total: 0 });
  const [result, setResult] = React.useState<{ created: number; failures: ImportFailure[] } | null>(
    null,
  );

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textFileInputRef = React.useRef<HTMLInputElement>(null);
  /** Identifica la lectura en curso para ignorar resultados de fotos anteriores. */
  const ocrRequestRef = React.useRef(0);
  /** Consecutivo de las filas agregadas a mano en la revisión. */
  const manualRowCounter = React.useRef(0);

  // Catálogo de apoyo: sirve para avisar de códigos que ya existen.
  React.useEffect(() => {
    if (!isOpen) return;

    void fetchUnits({ isActive: true });
    setIsCheckingCodes(true);
    void fetchProducts().finally(() => setIsCheckingCodes(false));
  }, [isOpen, fetchUnits, fetchProducts]);

  // Libera la vista previa al reemplazar la imagen o cerrar el modal.
  React.useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const reset = React.useCallback(() => {
    ocrRequestRef.current += 1;
    setStep('source');
    setFile(null);
    setImageUrl(null);
    setOcrError(null);
    setPastedText('');
    setTextError(null);
    setOcrProgress(null);
    setIsReading(false);
    setTable(null);
    setCodeColumn('');
    setNameColumn('');
    setDraftRows([]);
    setExcluded(new Set());
    setIsImporting(false);
    setImportProgress({ done: 0, total: 0 });
    setResult(null);
  }, []);

  const handleClose = () => {
    if (isImporting) return;
    reset();
    onClose();
  };

  const baseUnit = React.useMemo(() => pickBaseUnit(units), [units]);

  // Filas que el mapeo produce (sin código o nombre no hay producto).
  const mappedRows = React.useMemo<ImportedRow[]>(() => {
    if (!table || codeColumn === '' || nameColumn === '') return [];

    return table.rows.reduce<ImportedRow[]>((rows, row, index) => {
      const code = (row[codeColumn] ?? '').trim();
      const name = (row[nameColumn] ?? '').trim();
      if (!code || !name) return rows;

      rows.push({ index, code, name });
      return rows;
    }, []);
  }, [codeColumn, nameColumn, table]);

  /** Códigos que ya existen en el catálogo (en minúsculas). */
  const existingCodes = React.useMemo(() => {
    const codes = new Set<string>();
    for (const product of catalogProducts) {
      for (const code of product.codes) codes.add(code.code.trim().toLowerCase());
    }
    return codes;
  }, [catalogProducts]);

  /**
   * Problemas por fila: código vacío, ya existente en el catálogo o repetido
   * dentro del mismo lote. Las filas con problemas no se envían al backend.
   */
  const rowIssues = React.useMemo(() => {
    const times = new Map<string, number>();
    for (const row of draftRows) {
      const key = row.code.trim().toLowerCase();
      if (key) times.set(key, (times.get(key) ?? 0) + 1);
    }

    const issues = new Map<number, string>();

    for (const row of draftRows) {
      const code = row.code.trim();
      const name = row.name.trim();
      const key = code.toLowerCase();

      if (!code || !name) {
        issues.set(row.index, 'Completa el código y el nombre.');
        continue;
      }
      if (existingCodes.has(key)) {
        issues.set(row.index, 'Ese código ya existe en el catálogo.');
        continue;
      }
      if ((times.get(key) ?? 0) > 1) {
        issues.set(row.index, 'Código repetido en esta carga.');
      }
    }

    return issues;
  }, [draftRows, existingCodes]);

  const rowsToImport = React.useMemo(
    () =>
      draftRows
        .filter((row) => !rowIssues.has(row.index) && !excluded.has(row.index))
        .map((row) => ({ ...row, code: row.code.trim(), name: row.name.trim() })),
    [draftRows, excluded, rowIssues],
  );

  const goToReview = () => {
    setDraftRows(mappedRows);
    setExcluded(new Set());
    setStep('review');
  };

  const toggleRow = (index: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateRow = (index: number, field: 'code' | 'name', value: string) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.index === index ? { ...row, [field]: value } : row)),
    );
  };

  /** Agrega una fila vacía al final; su índice negativo no choca con las detectadas. */
  const addRow = () => {
    manualRowCounter.current += 1;
    setDraftRows((prev) => [...prev, { index: -manualRowCounter.current, code: '', name: '' }]);
  };

  /** Lee una imagen (elegida en el selector o pegada) y la pasa por el OCR. */
  const readImage = React.useCallback(async (picked: File) => {
    if (!picked.type.startsWith('image/')) {
      setOcrError('Selecciona una imagen (foto o captura de la factura).');
      return;
    }

    const requestId = ocrRequestRef.current + 1;
    ocrRequestRef.current = requestId;

    setFile(picked);
    setImageUrl(URL.createObjectURL(picked));
    setOcrError(null);
    setOcrProgress({ status: 'preprocessing', progress: 0 });
    setIsReading(true);

    try {
      const lines = await recognizeInvoiceImage(picked, setOcrProgress);
      if (ocrRequestRef.current !== requestId) return;

      const detected = buildInvoiceTable(lines);

      if (detected.columnCount < 2 || detected.rows.length === 0) {
        setOcrError(
          'No se reconocieron columnas con datos. Prueba con una foto más nítida, derecha y con la tabla completa dentro del encuadre.',
        );
        return;
      }

      setTable(detected);
      setCodeColumn('');
      setNameColumn('');
      setStep('columns');
    } catch (error) {
      if (ocrRequestRef.current !== requestId) return;
      setOcrError(
        error instanceof Error
          ? `No se pudo leer la imagen: ${error.message}`
          : 'No se pudo leer la imagen.',
      );
    } finally {
      if (ocrRequestRef.current === requestId) {
        setIsReading(false);
        setOcrProgress(null);
      }
    }
  }, []);

  // Pegar una captura o una foto desde el portapapeles arranca el mismo OCR.
  React.useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (event: ClipboardEvent) => {
      // Solo en el paso de la foto: en revisión, un pegado no debe borrar el trabajo.
      if (step !== 'source' && step !== 'upload') return;
      if (isReading || isImporting) return;

      const imageItem = Array.from(event.clipboardData?.items ?? []).find(
        (item) => item.kind === 'file' && item.type.startsWith('image/'),
      );
      const pasted = imageItem?.getAsFile();
      if (!pasted) return;

      event.preventDefault();
      setStep('upload');
      void readImage(pasted);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isImporting, isOpen, isReading, readImage, step]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    // Permite volver a elegir el mismo archivo.
    event.target.value = '';
    if (!picked) return;

    setStep('upload');
    await readImage(picked);
  };

  /** Carga un `.txt` / `.csv` en el área de texto para revisarlo antes de analizar. */
  const handleTextFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;

    try {
      const content = await picked.text();
      setPastedText(content);
      setTextError(null);
    } catch {
      setTextError('No se pudo leer el archivo. Verifica que sea un archivo de texto.');
    }
  };

  /** Detecta las columnas del texto pegado y pasa al mapeo. */
  const handleAnalyzeText = () => {
    const detected = buildTableFromText(pastedText);

    if (detected.columnCount < 2 || detected.rows.length === 0) {
      setTextError(
        'No se detectaron columnas con datos. Separa las columnas con tabulación, punto y coma, barra vertical o varios espacios, una fila por producto.',
      );
      return;
    }

    setTextError(null);
    setTable(detected);
    setCodeColumn('');
    setNameColumn('');
    setStep('columns');
  };

  const setColumnRole = (index: number, role: ColumnRole) => {
    if (role === 'code') {
      setCodeColumn(index);
      if (nameColumn === index) setNameColumn('');
      return;
    }

    if (role === 'name') {
      setNameColumn(index);
      if (codeColumn === index) setCodeColumn('');
      return;
    }

    if (codeColumn === index) setCodeColumn('');
    if (nameColumn === index) setNameColumn('');
  };

  const columnRole = (index: number): ColumnRole => {
    if (codeColumn === index) return 'code';
    if (nameColumn === index) return 'name';
    return 'ignore';
  };

  const handleImport = async () => {
    if (!baseUnit || rowsToImport.length === 0) return;

    setIsImporting(true);
    setImportProgress({ done: 0, total: rowsToImport.length });

    let created = 0;
    const failures: ImportFailure[] = [];

    for (const row of rowsToImport) {
      try {
        await createProductWithCode({ name: row.name, base_unit_id: baseUnit.id }, row.code);
        created += 1;
      } catch (error) {
        failures.push({
          label: `${row.code} · ${row.name}`,
          message: error instanceof Error ? error.message : 'No se pudo crear el producto.',
        });
      }

      setImportProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    setResult({ created, failures });
    setIsImporting(false);
    setStep('result');
  };

  const reviewColumns: TableColumn<ImportedRow>[] = [
    {
      key: 'selected',
      header: '',
      className: 'w-10',
      cell: (row) => {
        const hasIssue = rowIssues.has(row.index);

        return (
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            checked={!hasIssue && !excluded.has(row.index)}
            disabled={hasIssue}
            onChange={() => toggleRow(row.index)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Incluir ${row.code || 'fila'}`}
          />
        );
      },
    },
    {
      key: 'code',
      header: 'Código (SKU)',
      cell: (row) => {
        const issue = rowIssues.get(row.index);
        const position = draftRows.findIndex((item) => item.index === row.index) + 1;

        return (
          <div className="min-w-40">
            <input
              value={row.code}
              onChange={(event) => updateRow(row.index, 'code', event.target.value)}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Código de la fila ${position}`}
              className={`w-full rounded-md border bg-surface-primary px-2 py-1 font-mono text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                issue ? 'border-semantic-danger-300' : 'border-border-input'
              }`}
            />
            {issue && <p className="mt-1 text-xs text-semantic-danger-600">{issue}</p>}
          </div>
        );
      },
    },
    {
      key: 'name',
      header: 'Nombre',
      cell: (row) => (
        <input
          value={row.name}
          onChange={(event) => updateRow(row.index, 'name', event.target.value)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Nombre de la fila ${draftRows.findIndex((item) => item.index === row.index) + 1}`}
          className="w-full min-w-56 rounded-md border border-border-input bg-surface-primary px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      ),
    },
  ];

  const stepTitle = {
    source: 'Carga masiva de productos',
    upload: 'Carga masiva desde foto',
    text: 'Carga masiva desde texto',
    columns: 'Mapear columnas',
    review: 'Revisar productos',
    result: 'Resultado de la carga',
  }[step];

  const subtitle = {
    source: 'Elige cómo vas a pasar la información de la factura.',
    upload: 'Toma una foto de la factura y se extrae el texto para armar la tabla.',
    text: 'Pega la tabla o carga un archivo de texto; las columnas se detectan solas.',
    columns: 'Indica qué columna corresponde al código y cuál al nombre.',
    review: 'Desmarca lo que no quieras registrar. La unidad base se aplica a todo el lote.',
    result: 'Resumen del alta masiva.',
  }[step];

  const footer = (
    <>
      {step === 'source' && (
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
      )}

      {step === 'upload' && (
        <>
          <Button variant="secondary" onClick={reset} disabled={isReading}>
            Atrás
          </Button>
          <Button variant="ghost" onClick={handleClose} disabled={isReading}>
            Cancelar
          </Button>
        </>
      )}

      {step === 'text' && (
        <>
          <Button variant="secondary" onClick={reset}>
            Atrás
          </Button>
          <Button onClick={handleAnalyzeText} disabled={pastedText.trim().length === 0}>
            Analizar texto
          </Button>
        </>
      )}

      {step === 'columns' && (
        <>
          <Button
            variant="secondary"
            onClick={() => (file ? reset() : setStep('text'))}
            disabled={isReading}
          >
            Atrás
          </Button>
          <Button
            onClick={goToReview}
            disabled={codeColumn === '' || nameColumn === '' || mappedRows.length === 0}
          >
            Continuar
          </Button>
        </>
      )}

      {step === 'review' && (
        <>
          <Button variant="secondary" onClick={() => setStep('columns')}>
            Atrás
          </Button>
          <Button
            onClick={handleImport}
            isLoading={isImporting}
            disabled={rowsToImport.length === 0 || !baseUnit || isCheckingCodes}
          >
            Crear {rowsToImport.length} producto{rowsToImport.length === 1 ? '' : 's'}
          </Button>
        </>
      )}

      {step === 'result' && <Button onClick={handleClose}>Cerrar</Button>}
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={stepTitle}
      subtitle={subtitle}
      size="2xl"
      disableBackdropClose={isReading || isImporting}
      footer={footer}
    >
      {step === 'source' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setStep('upload')}
            className="flex h-full flex-col items-start gap-2 rounded-xl border border-border-default bg-surface-primary p-5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Camera className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-text-primary">Foto de la factura</span>
            <span className="text-xs text-text-tertiary">
              Se extrae el texto de la imagen con OCR, aquí mismo en el equipo. También puedes
              pegarla con Ctrl+V.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStep('text')}
            className="flex h-full flex-col items-start gap-2 rounded-xl border border-border-default bg-surface-primary p-5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ClipboardPaste className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-text-primary">
              Pegar texto o archivo
            </span>
            <span className="text-xs text-text-tertiary">
              Pega la tabla copiada o sube un archivo .txt/.csv con una fila por producto.
            </span>
          </button>
        </div>
      )}

      {step === 'text' && (
        <div className="space-y-4">
          <input
            ref={textFileInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            onChange={handleTextFile}
            className="hidden"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-text-secondary">
              Una fila por producto. Sirven tabulaciones, «;», «|» o dos o más espacios como
              separador.
            </p>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => textFileInputRef.current?.click()}
            >
              Cargar archivo
            </Button>
          </div>

          <Textarea
            label="Contenido"
            rows={10}
            value={pastedText}
            onChange={(event) => {
              setPastedText(event.target.value);
              if (textError) setTextError(null);
            }}
            placeholder={`CODIGO\tDESCRIPCION\tCANTIDAD
A123\tTornillo 1/4 x 2\t10
B456\tTuerca 5/16\t20`}
            className="font-mono text-xs"
            error={textError ?? undefined}
            helperText="Si la tabla viene con encabezado, también se detecta: después eliges qué columna es el código y cuál el nombre."
          />
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-input bg-surface-secondary/50 px-6 py-10 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Factura seleccionada"
                className="max-h-48 rounded-lg border border-border-subtle object-contain"
              />
            ) : (
              <ImageIcon className="h-10 w-10 text-text-muted" />
            )}

            <span className="mt-1 flex items-center gap-2 text-sm font-medium text-text-primary">
              {file ? <RotateCcw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {file ? 'Cambiar imagen' : 'Tomar foto o elegir imagen'}
            </span>
            <span className="text-xs text-text-tertiary">
              La imagen se procesa en este equipo; no se envía a ningún servidor.
            </span>
            <span className="text-xs text-text-tertiary">
              También puedes pegarla con Ctrl+V (⌘+V en Mac).
            </span>
          </button>

          {isReading && (
            <div className="space-y-2 rounded-lg border border-border-subtle bg-surface-secondary/50 px-4 py-3">
              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>{ocrStatusLabel(ocrProgress?.status ?? '')}</span>
                <span className="font-medium text-text-primary">
                  {Math.round((ocrProgress?.progress ?? 0) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width] duration-200"
                  style={{ width: `${Math.max(4, (ocrProgress?.progress ?? 0) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {ocrError && (
            <div className="rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
              {ocrError}
            </div>
          )}
        </div>
      )}

      {step === 'columns' && table && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Se detectaron <strong>{table.columnCount}</strong> columnas y{' '}
            <strong>{table.rows.length}</strong> filas. Elige qué representa cada una; lo que dejes
            en “Ignorar” se descarta.
          </p>

          <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
            {Array.from({ length: table.columnCount }, (_, index) => {
              const samples = columnSamples(table.rows, index);

              return (
                <div
                  key={index}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">Columna {index + 1}</p>
                    <p className="truncate text-xs text-text-tertiary">
                      {samples.length > 0 ? samples.join(' · ') : 'Sin datos'}
                    </p>
                  </div>

                  <div className="sm:w-52">
                    <Select
                      value={columnRole(index)}
                      onChange={(event) =>
                        setColumnRole(index, event.target.value as ColumnRole)
                      }
                      options={[
                        { value: 'ignore', label: 'Ignorar' },
                        { value: 'code', label: 'Código (SKU)' },
                        { value: 'name', label: 'Nombre' },
                      ]}
                      aria-label={`Rol de la columna ${index + 1}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {codeColumn !== '' && nameColumn !== '' && (
            <div className="flex items-center justify-between rounded-lg bg-surface-secondary/60 px-4 py-3 text-sm">
              <span className="text-text-secondary">Filas listas para revisar</span>
              <Badge variant="info">{mappedRows.length}</Badge>
            </div>
          )}
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <Badge variant="info">{rowsToImport.length} seleccionados</Badge>
            {rowIssues.size > 0 && (
              <Badge variant="warning">
                {rowIssues.size} con problema{rowIssues.size === 1 ? '' : 's'}
              </Badge>
            )}
            {isCheckingCodes && <span className="text-xs">Verificando códigos existentes…</span>}
            {baseUnit ? (
              <span>
                Unidad base: <strong className="text-text-primary">{baseUnit.name}</strong>
              </span>
            ) : (
              <span className="text-semantic-danger-700">
                No hay unidades de medida activas: crea una antes de cargar productos.
              </span>
            )}
          </div>

          {catalogError && (
            <p className="rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
              No se pudo verificar el catálogo de códigos: los que ya existan serán rechazados al
              crearlos.
            </p>
          )}

          {table && table.rows.length > mappedRows.length && (
            <p className="flex items-start gap-2 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
              <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              Se descartaron {table.rows.length - mappedRows.length} filas sin código o sin nombre.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-text-tertiary">
              Corrige el código o el nombre directamente en la tabla. Las filas con un código ya
              existente no se crean.
            </p>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={addRow}
            >
              Añadir fila
            </Button>
          </div>

          <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-border-subtle">
            <Table
              columns={reviewColumns}
              data={draftRows}
              rowKey={(row) => String(row.index)}
              onRowClick={(row) => {
                if (!rowIssues.has(row.index)) toggleRow(row.index);
              }}
            />
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-semantic-success-400 bg-semantic-success-50 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-semantic-success-700" />
            <p className="text-sm text-semantic-success-800">
              <strong>{result.created}</strong> producto{result.created === 1 ? '' : 's'} creado
              {result.created === 1 ? '' : 's'} con su código SKU.
            </p>
          </div>

          {result.failures.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-semantic-danger-700">
                {result.failures.length} fila{result.failures.length === 1 ? '' : 's'} con error
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 p-3 text-sm text-semantic-danger-700">
                {result.failures.map((failure) => (
                  <li key={failure.label}>
                    <span className="font-medium">{failure.label}</span>
                    <span className="block text-xs">{failure.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-text-tertiary">
            Completa marca y categoría de cada producto desde la lista de productos.
          </p>
        </div>
      )}

      {step === 'review' && isImporting && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>Creando productos…</span>
            <span className="font-medium text-text-primary">
              {importProgress.done}/{importProgress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-200"
              style={{
                width: `${importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
