import React from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardPaste,
  FileText,
  ImageIcon,
  MapPin,
  Plus,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';

import { Modal } from '@/presentation/components/ui/Modal';
import { Button } from '@/presentation/components/ui/Button';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { SearchableSelect } from '@/presentation/components/ui/SearchableSelect';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { Badge } from '@/presentation/components/ui/Badge';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { useProducts } from '@/application/hooks/useProducts';
import { useUnits } from '@/application/hooks/useUnits';
import { useBrands } from '@/application/hooks/useBrands';
import { useCategories } from '@/application/hooks/useCategories';
import { useSuppliers } from '@/application/hooks/useSuppliers';
import { useLocations } from '@/application/hooks/useLocations';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { usePriceLists } from '@/application/hooks/usePriceLists';
import { useProductLoader } from '@/application/hooks/useProductLoader';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { toast } from '@/application/stores/useToastStore';
import { recognizeInvoiceImage, type OcrProgress } from '@/infrastructure/ocr/invoiceOcr';
import {
  buildInvoiceTable,
  buildTableFromText,
  cleanBarcode,
  columnSamples,
  detectColumnRoles,
  detectInvoiceMeta,
  parseInvoiceNumber,
  type ColumnRole as InvoiceColumnRole,
  type InvoiceTable,
} from '@/shared/utils/invoiceTable';
import {
  brandPrefix,
  buildProductName,
  nextSku,
  PRODUCT_NAME_MAX_LENGTH,
} from '@/shared/utils/productLoad';
import type { Unit } from '@/domain/models';

interface BulkProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'source' | 'upload' | 'text' | 'columns' | 'review' | 'result';

type ColumnRole = 'ignore' | InvoiceColumnRole;

interface ImportedRow {
  /** Índice de la fila en la tabla detectada. */
  index: number;
  /** Código con el que el proveedor identifica el producto. */
  code: string;
  /** Nombre propio, sin marca, categoría ni cantidad. */
  name: string;
  /** SKU generado (marca + serial) para esta fila. */
  sku: string;
  /** Marca de la fila; si está vacía se usa la marca del lote. */
  brandId: string;
  quantity: string;
  price: string;
  barcode: string;
}

interface ImportFailure {
  label: string;
  message: string;
}

/** Código sugerido para una ubicación nueva a partir de su nombre. */
function suggestLocationCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);
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
 *    del texto) y se propone qué columna es cada cosa: código del proveedor,
 *    nombre, cantidad, precio unitario y código de barras. La propuesta sale
 *    del encabezado y, si no lo hay, del contenido; se puede corregir.
 * 3. **Revisión** — se completan los datos de la factura (marca, categoría,
 *    proveedor, ubicación, precio, nº de factura y nº de picking), se ajustan
 *    cantidad, código de barras y SKU por fila, y se confirma el alta.
 * 4. **Resultado** — resumen de lo creado, los avisos y los errores por fila.
 *
 * El OCR corre en el navegador: la foto no se sube a ningún servidor. El SKU se
 * genera con la marca y un serial ascendente; el nombre final se compone con
 * marca, categoría, nombre, código del proveedor y cantidad, igual que en el
 * alta individual. La unidad base del lote es "Unidad".
 */
export function BulkProductImportModal({ isOpen, onClose }: BulkProductImportModalProps) {
  const { products: catalogProducts, error: catalogError, fetchProducts } = useProducts();
  const { units, fetchUnits } = useUnits();
  const { brands, fetchBrands, createBrand } = useBrands();
  const { categories, fetchCategories, createCategory } = useCategories();
  const { suppliers, fetchSuppliers, createSupplier } = useSuppliers();
  const { locations, fetchLocations, createLocation } = useLocations();
  const { warehouses, fetchWarehouses } = useWarehouses();
  const { priceLists, fetchPriceLists } = usePriceLists();
  const { loadProduct } = useProductLoader();
  const activeBranch = useBranchStore((s) => s.activeBranch);

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
  const [barcodeColumn, setBarcodeColumn] = React.useState<number | ''>('');
  const [quantityColumn, setQuantityColumn] = React.useState<number | ''>('');
  const [priceColumn, setPriceColumn] = React.useState<number | ''>('');

  /** Filas de la revisión: ya editadas por la persona. */
  const [draftRows, setDraftRows] = React.useState<ImportedRow[]>([]);
  /** Filas que la persona desmarcó (las marcadas se derivan del estado). */
  const [excluded, setExcluded] = React.useState<Set<number>>(new Set());
  const [isCheckingCodes, setIsCheckingCodes] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState({ done: 0, total: 0 });
  const [result, setResult] = React.useState<{
    created: number;
    failures: ImportFailure[];
    warnings: string[];
  } | null>(null);

  // Datos que comparten todas las filas del lote (los de la factura).
  const [batchBrandId, setBatchBrandId] = React.useState('');
  const [batchCategoryId, setBatchCategoryId] = React.useState('');
  const [batchSupplierId, setBatchSupplierId] = React.useState('');
  const [batchWarehouseId, setBatchWarehouseId] = React.useState('');
  const [batchLocationId, setBatchLocationId] = React.useState('');
  const [batchInvoice, setBatchInvoice] = React.useState('');
  const [batchPicking, setBatchPicking] = React.useState('');
  const [batchPriceListId, setBatchPriceListId] = React.useState('');
  const [batchErrors, setBatchErrors] = React.useState<Record<string, string | undefined>>({});

  const [isCreatingBrand, setIsCreatingBrand] = React.useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = React.useState(false);
  const [locationDraft, setLocationDraft] = React.useState<{
    name: string;
    code: string;
    warehouse_id: string;
  } | null>(null);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [isSavingLocation, setIsSavingLocation] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textFileInputRef = React.useRef<HTMLInputElement>(null);
  /** Identifica la lectura en curso para ignorar resultados de fotos anteriores. */
  const ocrRequestRef = React.useRef(0);
  /** Consecutivo de las filas agregadas a mano en la revisión. */
  const manualRowCounter = React.useRef(0);

  // Catálogos de apoyo: sirven para completar cada fila y avisar de códigos
  // que ya existen en el catálogo.
  React.useEffect(() => {
    if (!isOpen) return;

    void fetchUnits({ isActive: true });
    void fetchBrands({ isActive: true });
    void fetchCategories({ isActive: true });
    void fetchSuppliers({ isActive: true });
    void fetchLocations({ isActive: true });
    setIsCheckingCodes(true);
    void fetchProducts().finally(() => setIsCheckingCodes(false));
  }, [
    isOpen,
    fetchUnits,
    fetchBrands,
    fetchCategories,
    fetchSuppliers,
    fetchLocations,
    fetchProducts,
  ]);

  React.useEffect(() => {
    if (!isOpen) return;
    void fetchWarehouses({ branchId: activeBranch?.id || undefined });
    void fetchPriceLists({ branchId: activeBranch?.id || undefined, isActive: true });
  }, [isOpen, activeBranch?.id, fetchWarehouses, fetchPriceLists]);

  const activeWarehouses = React.useMemo(
    () => warehouses.filter((warehouse) => warehouse.is_active),
    [warehouses],
  );

  const activeLocations = React.useMemo(
    () => locations.filter((location) => location.is_active),
    [locations],
  );

  // Almacén y lista de precios por defecto del lote.
  React.useEffect(() => {
    if (!batchWarehouseId && activeWarehouses.length > 0) {
      setBatchWarehouseId(activeWarehouses[0].id);
    }
  }, [activeWarehouses, batchWarehouseId]);

  React.useEffect(() => {
    if (!batchPriceListId && priceLists.length > 0) {
      setBatchPriceListId(priceLists[0].id);
    }
  }, [priceLists, batchPriceListId]);

  const brandNameOf = React.useCallback(
    (brandId: string) => brands.find((brand) => brand.id === brandId)?.name,
    [brands],
  );

  const batchCategoryName = categories.find((category) => category.id === batchCategoryId)?.name;
  const batchSupplierName = suppliers.find((supplier) => supplier.id === batchSupplierId)?.name;

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
    setBarcodeColumn('');
    setQuantityColumn('');
    setPriceColumn('');
    setDraftRows([]);
    setExcluded(new Set());
    setIsImporting(false);
    setImportProgress({ done: 0, total: 0 });
    setResult(null);
    setBatchBrandId('');
    setBatchCategoryId('');
    setBatchSupplierId('');
    setBatchLocationId('');
    setBatchInvoice('');
    setBatchPicking('');
    setBatchErrors({});
    setLocationDraft(null);
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

    const cell = (row: string[], column: number | '') =>
      column === '' ? '' : (row[column] ?? '').trim();

    return table.rows.reduce<ImportedRow[]>((rows, row, index) => {
      const code = cell(row, codeColumn);
      const name = cell(row, nameColumn);
      if (!code || !name) return rows;

      const quantity = parseInvoiceNumber(cell(row, quantityColumn));
      const price = parseInvoiceNumber(cell(row, priceColumn));

      rows.push({
        index,
        code,
        name,
        sku: '',
        brandId: batchBrandId,
        quantity: quantity === null ? '' : String(quantity),
        price: price === null ? '' : String(price),
        barcode: cleanBarcode(cell(row, barcodeColumn)),
      });
      return rows;
    }, []);
  }, [
    barcodeColumn,
    batchBrandId,
    codeColumn,
    nameColumn,
    priceColumn,
    quantityColumn,
    table,
  ]);

  /** Códigos que ya existen en el catálogo (en minúsculas). */
  const existingCodes = React.useMemo(() => {
    const codes = new Set<string>();
    for (const product of catalogProducts) {
      for (const code of product.codes) codes.add(code.code.trim().toLowerCase());
    }
    return codes;
  }, [catalogProducts]);

  /** Códigos ya usados, para calcular el serial de cada SKU. */
  const catalogCodeList = React.useMemo(
    () => catalogProducts.flatMap((product) => product.codes.map((code) => code.code)),
    [catalogProducts],
  );

  /**
   * Reasigna los SKU del lote en orden: el serial más alto del catálogo (y de
   * las filas anteriores) más uno. Se recalcula cuando cambia una marca.
   */
  const assignSkus = React.useCallback(
    (
      rows: ImportedRow[],
      existing: string[],
      /** Permite resolver el nombre de una marca recién creada (aún sin estado). */
      resolveBrandName?: (brandId: string) => string | undefined,
    ): ImportedRow[] => {
      const taken = [...existing];
      const resolve = resolveBrandName ?? brandNameOf;

      return rows.map((row) => {
        const prefix = brandPrefix(resolve(row.brandId));
        const sku = nextSku(prefix, taken);
        taken.push(sku);
        return { ...row, sku };
      });
    },
    [brandNameOf],
  );

  /**
   * Problemas por fila: datos incompletos, código del proveedor repetido en el
   * lote, cantidades o precios inválidos, nombre demasiado largo o SKU ya
   * existente. Las filas con problemas no se envían al backend.
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
      if ((times.get(key) ?? 0) > 1) {
        issues.set(row.index, 'Código del proveedor repetido en esta carga.');
        continue;
      }

      const quantity = Number(row.quantity.replace(',', '.'));
      if (!Number.isFinite(quantity) || quantity < 0) {
        issues.set(row.index, 'La cantidad debe ser un número mayor o igual a cero.');
        continue;
      }

      if (row.price.trim()) {
        const price = Number(row.price.replace(',', '.'));
        if (!Number.isFinite(price) || price < 0) {
          issues.set(row.index, 'El precio debe ser un número mayor o igual a cero.');
          continue;
        }
      }

      const composed = buildProductName({
        brand: brandNameOf(row.brandId),
        category: batchCategoryName,
        name,
        supplierCode: code,
        quantity,
      });
      if (composed.length > PRODUCT_NAME_MAX_LENGTH) {
        issues.set(row.index, `El nombre compuesto supera ${PRODUCT_NAME_MAX_LENGTH} caracteres.`);
        continue;
      }

      if (!row.sku.trim()) {
        issues.set(row.index, 'El SKU está vacío.');
        continue;
      }
      if (existingCodes.has(row.sku.trim().toLowerCase())) {
        issues.set(row.index, 'El SKU generado ya existe en el catálogo.');
      }
    }

    return issues;
  }, [batchBrandId, batchCategoryName, brandNameOf, draftRows, existingCodes]);

  const rowsToImport = React.useMemo(
    () =>
      draftRows
        .filter((row) => !rowIssues.has(row.index) && !excluded.has(row.index))
        .map((row) => ({
          ...row,
          code: row.code.trim(),
          name: row.name.trim(),
          sku: row.sku.trim(),
          barcode: row.barcode.trim(),
          quantityNum: Number(row.quantity.replace(',', '.')),
          priceNum: row.price.trim() ? Number(row.price.replace(',', '.')) : undefined,
        })),
    [draftRows, excluded, rowIssues],
  );

  const goToReview = () => {
    setDraftRows(assignSkus(mappedRows, catalogCodeList));
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

  const updateRow = (index: number, changes: Partial<ImportedRow>) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.index === index ? { ...row, ...changes } : row)),
    );
  };

  /** Cambiar la marca de una fila regenera los SKU de todo el lote. */
  const changeRowBrand = (index: number, brandId: string) => {
    setDraftRows((prev) =>
      assignSkus(
        prev.map((row) => (row.index === index ? { ...row, brandId } : row)),
        catalogCodeList,
      ),
    );
  };

  /** La marca del lote se aplica a todas las filas y refresca los SKU. */
  const changeBatchBrand = (brandId: string, brandNameOverride?: string) => {
    setBatchBrandId(brandId);
    setDraftRows((prev) =>
      assignSkus(
        prev.map((row) => ({ ...row, brandId })),
        catalogCodeList,
        brandNameOverride
          ? (id) => (id === brandId ? brandNameOverride : brandNameOf(id))
          : undefined,
      ),
    );
  };

  /** Agrega una fila vacía al final; su índice negativo no choca con las detectadas. */
  const addRow = () => {
    manualRowCounter.current += 1;

    setDraftRows((prev) => {
      const taken = [...catalogCodeList, ...prev.map((row) => row.sku).filter(Boolean)];
      const sku = nextSku(brandPrefix(brandNameOf(batchBrandId)), taken);

      return [
        ...prev,
        {
          index: -manualRowCounter.current,
          code: '',
          name: '',
          sku,
          brandId: batchBrandId,
          quantity: '',
          price: '',
          barcode: '',
        },
      ];
    });
  };

  /**
   * Carga la tabla detectada y propone los papeles de cada columna. El número
   * de factura solo se rellena si el documento lo trae rotulado.
   */
  const applyDetectedTable = React.useCallback((detected: InvoiceTable) => {
    const roles = detectColumnRoles(detected);

    setTable(detected);
    setCodeColumn(roles.code ?? '');
    setNameColumn(roles.name ?? '');
    setBarcodeColumn(roles.barcode ?? '');
    setQuantityColumn(roles.quantity ?? '');
    setPriceColumn(roles.price ?? '');

    const invoice = detectInvoiceMeta(detected.rawText).invoiceNumber;
    if (invoice) setBatchInvoice((prev) => prev || invoice);
  }, []);

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

      applyDetectedTable(detected);
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
    applyDetectedTable(detected);
    setStep('columns');
  };

  const setColumnRole = (index: number, role: ColumnRole) => {
    // Cada columna tiene un solo papel: al cambiarlo se libera el anterior.
    if (codeColumn === index) setCodeColumn('');
    if (nameColumn === index) setNameColumn('');
    if (barcodeColumn === index) setBarcodeColumn('');
    if (quantityColumn === index) setQuantityColumn('');
    if (priceColumn === index) setPriceColumn('');

    if (role === 'code') setCodeColumn(index);
    else if (role === 'name') setNameColumn(index);
    else if (role === 'barcode') setBarcodeColumn(index);
    else if (role === 'quantity') setQuantityColumn(index);
    else if (role === 'price') setPriceColumn(index);
  };

  const columnRole = (index: number): ColumnRole => {
    if (codeColumn === index) return 'code';
    if (nameColumn === index) return 'name';
    if (barcodeColumn === index) return 'barcode';
    if (quantityColumn === index) return 'quantity';
    if (priceColumn === index) return 'price';
    return 'ignore';
  };

  const handleImport = async () => {
    if (!baseUnit || rowsToImport.length === 0) return;

    const errors: Record<string, string> = {};
    if (rowsToImport.some((row) => row.quantityNum > 0) && !batchWarehouseId) {
      errors.warehouse = 'Selecciona el almacén donde entra la mercancía.';
    }
    if (rowsToImport.some((row) => (row.priceNum ?? 0) > 0) && !batchPriceListId) {
      errors.priceList = 'Selecciona la lista de precios o quita el precio unitario.';
    }
    setBatchErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsImporting(true);
    setImportProgress({ done: 0, total: rowsToImport.length });

    let created = 0;
    const failures: ImportFailure[] = [];
    const warnings: string[] = [];

    for (const row of rowsToImport) {
      try {
        const { warnings: rowWarnings } = await loadProduct({
          name: row.name,
          brand: brandNameOf(row.brandId),
          brand_id: row.brandId || undefined,
          category: batchCategoryName,
          category_id: batchCategoryId || undefined,
          supplierCode: row.code,
          quantity: row.quantityNum > 0 ? row.quantityNum : undefined,
          base_unit_id: baseUnit.id,
          sku: row.sku,
          barcode: row.barcode || undefined,
          supplierName: batchSupplierName,
          invoiceNumber: batchInvoice.trim() || undefined,
          pickingNumber: batchPicking.trim() || undefined,
          unitPrice: row.priceNum && row.priceNum > 0 ? row.priceNum : undefined,
          price_list_id: batchPriceListId || undefined,
          warehouse_id: batchWarehouseId || undefined,
          location_id: batchLocationId || undefined,
          stock: row.quantityNum,
        });
        created += 1;
        for (const warning of rowWarnings) {
          warnings.push(`${row.sku} · ${row.name}: ${warning}`);
        }
      } catch (error) {
        failures.push({
          label: `${row.code} · ${row.name}`,
          message: error instanceof Error ? error.message : 'No se pudo crear el producto.',
        });
      }

      setImportProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    setResult({ created, failures, warnings });
    setIsImporting(false);
    setStep('result');
  };

  const handleCreateBrand = async (name: string) => {
    setIsCreatingBrand(true);
    try {
      const brand = await createBrand({ name });
      changeBatchBrand(brand.id, brand.name);
      toast.success(`La marca "${brand.name}" fue creada.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la marca.');
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleCreateCategory = async (name: string) => {
    setIsCreatingCategory(true);
    try {
      const category = await createCategory({ name });
      setBatchCategoryId(category.id);
      toast.success(`La categoría "${category.name}" fue creada.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la categoría.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateSupplier = async (name: string) => {
    setIsCreatingSupplier(true);
    try {
      const supplier = await createSupplier({ name });
      setBatchSupplierId(supplier.id);
      toast.success(`El proveedor "${supplier.name}" fue creado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el proveedor.');
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const openLocationDraft = (name: string) => {
    setLocationDraft({
      name,
      code: suggestLocationCode(name),
      warehouse_id: batchWarehouseId || activeWarehouses[0]?.id || '',
    });
    setLocationError(null);
  };

  const handleCreateLocation = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!locationDraft) return;

    if (!locationDraft.warehouse_id) {
      setLocationError('Selecciona el almacén de la ubicación.');
      return;
    }
    if (!locationDraft.code.trim() || !locationDraft.name.trim()) {
      setLocationError('Completa el código y el nombre de la ubicación.');
      return;
    }

    setIsSavingLocation(true);
    try {
      const location = await createLocation({
        warehouse_id: locationDraft.warehouse_id,
        code: locationDraft.code.trim(),
        name: locationDraft.name.trim(),
      });
      setBatchWarehouseId(location.warehouse_id);
      setBatchLocationId(location.id);
      toast.success(`La ubicación "${location.name}" fue creada.`);
      setLocationDraft(null);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'No se pudo crear la ubicación.');
    } finally {
      setIsSavingLocation(false);
    }
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
      key: 'sku',
      header: 'SKU',
      cell: (row) => (
        <input
          value={row.sku}
          onChange={(event) => updateRow(row.index, { sku: event.target.value })}
          onClick={(event) => event.stopPropagation()}
          aria-label={`SKU de la fila ${row.index}`}
          className="w-24 rounded-md border border-border-input bg-surface-primary px-2 py-1 font-mono text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      ),
    },
    {
      key: 'code',
      header: 'Cód. proveedor',
      cell: (row) => {
        const issue = rowIssues.get(row.index);
        const position = draftRows.findIndex((item) => item.index === row.index) + 1;

        return (
          <div className="min-w-28">
            <input
              value={row.code}
              onChange={(event) => updateRow(row.index, { code: event.target.value })}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Código del proveedor de la fila ${position}`}
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
      cell: (row) => {
        const composed = buildProductName({
          brand: brandNameOf(row.brandId),
          category: batchCategoryName,
          name: row.name,
          supplierCode: row.code,
          quantity: Number(row.quantity.replace(',', '.')) || undefined,
        });

        return (
          <div className="min-w-56">
            <input
              value={row.name}
              onChange={(event) => updateRow(row.index, { name: event.target.value })}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Nombre de la fila ${draftRows.findIndex((item) => item.index === row.index) + 1}`}
              className="w-full rounded-md border border-border-input bg-surface-primary px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="mt-1 truncate text-xs text-text-tertiary" title={composed}>
              {composed || '—'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'brandId',
      header: 'Marca',
      cell: (row) => (
        <div onClick={(event) => event.stopPropagation()} className="min-w-32">
          <Select
            size="sm"
            value={row.brandId}
            onChange={(event) => changeRowBrand(row.index, event.target.value)}
            options={[
              { value: '', label: 'Sin marca' },
              ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
            ]}
            aria-label={`Marca de la fila ${row.index}`}
          />
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Cant.',
      cell: (row) => (
        <input
          type="number"
          min={0}
          step="1"
          value={row.quantity}
          onChange={(event) => updateRow(row.index, { quantity: event.target.value })}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Cantidad de la fila ${row.index}`}
          className="w-20 rounded-md border border-border-input bg-surface-primary px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      ),
    },
    {
      key: 'price',
      header: 'Precio unit.',
      cell: (row) => (
        <input
          type="number"
          min={0}
          step="0.01"
          value={row.price}
          placeholder="Opcional"
          onChange={(event) => updateRow(row.index, { price: event.target.value })}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Precio unitario de la fila ${row.index}`}
          className="w-24 rounded-md border border-border-input bg-surface-primary px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-text-muted"
        />
      ),
    },
    {
      key: 'barcode',
      header: 'Cód. barras',
      cell: (row) => (
        <input
          value={row.barcode}
          placeholder="Opcional"
          onChange={(event) => updateRow(row.index, { barcode: event.target.value })}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Código de barras de la fila ${row.index}`}
          className="w-32 rounded-md border border-border-input bg-surface-primary px-2 py-1 font-mono text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-text-muted"
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
            <strong>{table.rows.length}</strong> filas. Asignamos cada columna por su encabezado o
            su contenido; revisa la propuesta y corrige lo que haga falta. Lo que dejes en
            “Ignorar” se descarta.
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

                  <div className="sm:w-60">
                    <Select
                      value={columnRole(index)}
                      onChange={(event) =>
                        setColumnRole(index, event.target.value as ColumnRole)
                      }
                      options={[
                        { value: 'ignore', label: 'Ignorar' },
                        { value: 'code', label: 'Código del proveedor' },
                        { value: 'name', label: 'Nombre' },
                        { value: 'barcode', label: 'Código de barras' },
                        { value: 'quantity', label: 'Cantidad' },
                        { value: 'price', label: 'Precio unitario' },
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

          {/* Datos de la factura: se aplican a todo el lote. */}
          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-secondary/40 p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Datos de la carga</p>
              <p className="text-xs text-text-tertiary">
                Se aplican a todas las filas y quedan en la descripción de cada producto. La marca
                se puede cambiar por fila en la tabla.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SearchableSelect
                label="Marca"
                value={batchBrandId}
                onChange={changeBatchBrand}
                options={[
                  { value: '', label: 'Sin marca' },
                  ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
                ]}
                placeholder="Busca o crea"
                emptyText="Sin marcas"
                onCreate={(name) => void handleCreateBrand(name)}
                createLabel="Crear marca «{query}»"
                isCreating={isCreatingBrand}
              />

              <SearchableSelect
                label="Categoría"
                value={batchCategoryId}
                onChange={setBatchCategoryId}
                options={[
                  { value: '', label: 'Sin categoría' },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                placeholder="Busca o crea una categoría"
                emptyText="Sin categorías activas"
                onCreate={(name) => void handleCreateCategory(name)}
                createLabel="Crear categoría «{query}»"
                isCreating={isCreatingCategory}
              />

              <SearchableSelect
                label="Proveedor"
                value={batchSupplierId}
                onChange={setBatchSupplierId}
                options={[
                  { value: '', label: 'Sin proveedor' },
                  ...suppliers.map((supplier) => ({
                    value: supplier.id,
                    label: supplier.name,
                    description: supplier.tax_id,
                  })),
                ]}
                placeholder="Busca o crea"
                emptyText="Sin proveedores"
                onCreate={(name) => void handleCreateSupplier(name)}
                createLabel="Crear proveedor «{query}»"
                isCreating={isCreatingSupplier}
              />

              <Select
                label="Almacén"
                value={batchWarehouseId}
                onChange={(event) => {
                  setBatchWarehouseId(event.target.value);
                  setBatchLocationId('');
                  setBatchErrors((prev) => ({ ...prev, warehouse: undefined }));
                }}
                options={activeWarehouses.map((warehouse) => ({
                  value: warehouse.id,
                  label: warehouse.name,
                }))}
                placeholder={activeWarehouses.length === 0 ? 'Sin almacenes' : 'Selecciona'}
                error={batchErrors.warehouse}
              />

              <SearchableSelect
                label="Ubicación"
                value={batchLocationId}
                onChange={setBatchLocationId}
                options={[
                  { value: '', label: 'Sin ubicación específica' },
                  ...activeLocations
                    .filter(
                      (location) =>
                        !batchWarehouseId || location.warehouse_id === batchWarehouseId,
                    )
                    .map((location) => ({
                      value: location.id,
                      label: `${location.code} · ${location.name}`,
                      description: location.type,
                    })),
                ]}
                placeholder="Busca o crea"
                emptyText="Sin ubicaciones"
                disabled={!batchWarehouseId}
                onCreate={openLocationDraft}
                createLabel="Crear ubicación «{query}»"
              />

              <Select
                label="Lista de precios"
                value={batchPriceListId}
                onChange={(event) => {
                  setBatchPriceListId(event.target.value);
                  setBatchErrors((prev) => ({ ...prev, priceList: undefined }));
                }}
                options={priceLists.map((list) => ({ value: list.id, label: list.name }))}
                placeholder={priceLists.length === 0 ? 'Sin listas' : 'Selecciona'}
                error={batchErrors.priceList}
              />

              <Input
                label="Nº factura"
                value={batchInvoice}
                onChange={(event) => setBatchInvoice(event.target.value)}
                placeholder="Opcional"
                maxLength={60}
              />

              <Input
                label="Nº picking"
                value={batchPicking}
                onChange={(event) => setBatchPicking(event.target.value)}
                placeholder="Opcional"
                maxLength={60}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-text-tertiary">
              Corrige código, nombre, marca, cantidad o precio en la tabla. Las filas con un problema
              no se crean.
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

          {result.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-semantic-warning-800">
                {result.warnings.length} aviso{result.warnings.length === 1 ? '' : 's'} de la carga
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 p-3 text-sm text-semantic-warning-800">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

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

      {/* Alta rápida de ubicación desde el buscador del lote */}
      <Modal
        isOpen={locationDraft !== null}
        onClose={() => {
          if (isSavingLocation) return;
          setLocationDraft(null);
        }}
        title="Nueva ubicación"
        subtitle="Se crea dentro del almacén del lote y queda elegida en la carga."
        icon={<MapPin className="h-5 w-5" />}
        size="md"
        disableBackdropClose={isSavingLocation}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setLocationDraft(null)}
              disabled={isSavingLocation}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleCreateLocation()}
              isLoading={isSavingLocation}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Crear ubicación
            </Button>
          </>
        }
      >
        {locationDraft && (
          <div className="space-y-4">
            <Select
              label="Almacén"
              value={locationDraft.warehouse_id}
              onChange={(event) =>
                setLocationDraft((prev) =>
                  prev ? { ...prev, warehouse_id: event.target.value } : prev,
                )
              }
              options={activeWarehouses.map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.name,
              }))}
              placeholder="Selecciona un almacén"
              required
            />

            <Input
              label="Nombre"
              value={locationDraft.name}
              onChange={(event) => {
                const name = event.target.value;
                setLocationDraft((prev) =>
                  prev
                    ? { ...prev, name, code: prev.code || suggestLocationCode(name) }
                    : prev,
                );
              }}
              required
              maxLength={100}
            />

            <Input
              label="Código"
              value={locationDraft.code}
              onChange={(event) =>
                setLocationDraft((prev) =>
                  prev ? { ...prev, code: event.target.value.toUpperCase() } : prev,
                )
              }
              helperText="Único dentro del almacén."
              required
              maxLength={20}
            />

            {locationError && (
              <p className="rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-3 py-2 text-sm text-semantic-danger-700">
                {locationError}
              </p>
            )}
          </div>
        )}
      </Modal>
    </Modal>
  );
}
