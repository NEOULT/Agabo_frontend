import React from 'react';
import {
  ArrowLeftRight,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  Layers,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Wallet,
} from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Modal } from '@/presentation/components/ui/Modal';
import { Switch } from '@/presentation/components/ui/Switch';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { useAuthorizationCatalog } from '@/application/hooks/useAuthorizationCatalog';
import type { CatalogAction, CatalogModuleGroup, CatalogResourceGroup, Profile } from '@/domain/models';

interface AssignPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Perfil al que se le reemplazan los permisos. */
  profile: Profile | null;
  /** PUT /api/profiles/{id}/permissions — la lista enviada es la completa. */
  onSubmit: (permissionIds: string[]) => Promise<void>;
}

/**
 * Etiqueta de cada acción: es el "método" que se muestra en cada fila.
 * El backend entrega el código (`read`, `activate`, ...), la etiqueta es texto
 * de interfaz y coincide con la que usan los contratos de la vista de sesión.
 */
const ACTION_LABELS: Record<string, string> = {
  read: 'Ver',
  create: 'Crear',
  update: 'Modificar',
  delete: 'Borrar',
  replace: 'Reemplazar',
  activate: 'Habilitar',
  deactivate: 'Inhabilitar',
  reverse: 'Revertir',
  read_balance: 'Ver saldo',
  refresh_cache: 'Recargar',
  change_password: 'Cambiar clave',
  logout_all: 'Cerrar sesiones',
  assign_profiles: 'Asignar perfiles',
  assign_branches: 'Asignar sucursales',
  assign_permissions: 'Asignar permisos',
  update_branch_count: 'Ajustar cuota de sucursales',
};

/**
 * Acciones cuyo nombre ya dice sobre qué se actúa. Las de esta lista se
 * muestran solas; el resto se leen como "<acción> <recurso>"
 * ("Ver Sucursales", "Crear Almacenes").
 */
const STANDALONE_ACTIONS = new Set([
  'read_balance',
  'refresh_cache',
  'change_password',
  'logout_all',
  'assign_profiles',
  'assign_branches',
  'assign_permissions',
  'update_branch_count',
]);

/** Explicación breve de cada acción (texto de interfaz). */
const ACTION_DESCRIPTIONS: Record<string, string> = {
  read: 'Permite consultar la lista y el detalle.',
  create: 'Permite registrar nuevos datos.',
  update: 'Permite modificar los datos existentes.',
  delete: 'Permite eliminar.',
  replace: 'Permite reemplazar la información.',
  activate: 'Permite habilitar.',
  deactivate: 'Permite inhabilitar.',
  reverse: 'Permite revertir la operación.',
  read_balance: 'Permite consultar el saldo.',
  refresh_cache: 'Permite recargar el catálogo en memoria.',
  change_password: 'Permite cambiar la contraseña.',
  logout_all: 'Permite cerrar todas las sesiones del usuario.',
  assign_profiles: 'Permite asignar perfiles.',
  assign_branches: 'Permite asignar sucursales.',
  assign_permissions: 'Permite asignar permisos.',
  update_branch_count: 'Permite ajustar la cuota de sucursales.',
};

/** Icono de cada módulo, alineado con la navegación lateral. */
const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  company: Building2,
  security: ShieldCheck,
  catalog: Package,
  inventory: ArrowLeftRight,
  purchases: ShoppingCart,
  sales: Store,
  cash: Wallet,
  configuration: Settings,
  audit: ClipboardList,
};

const DEFAULT_MODULE_ICON = Layers;

/** Etiqueta de una acción; si es desconocida, se muestra el código. */
function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Explicación de una acción: la del catálogo si la trae, si no la genérica. */
function actionDescription(action: CatalogAction): string {
  const fromCatalog = action.permissions
    .map((permission) => permission.description?.trim())
    .find((description) => description);

  return fromCatalog ?? ACTION_DESCRIPTIONS[action.action] ?? '';
}

/** Ids de permiso que representa una acción (uno por endpoint del recurso). */
function actionPermissionIds(action: CatalogAction): string[] {
  return action.permissions.map((permission) => permission.id);
}

/** Acciones de un módulo, aplanadas a través de sus recursos. */
function moduleActions(module: CatalogModuleGroup): CatalogAction[] {
  return module.resources.flatMap((resource) => resource.actions);
}

/** Posición de una acción dentro de un recurso (Ver, Crear, Modificar, ...). */
const ACTION_ORDER = [
  'read',
  'create',
  'update',
  'delete',
  'replace',
  'activate',
  'deactivate',
  'reverse',
  'read_balance',
  'refresh_cache',
  'change_password',
  'logout_all',
  'assign_profiles',
  'assign_branches',
  'assign_permissions',
  'update_branch_count',
];

function sortActions(actions: CatalogAction[]): CatalogAction[] {
  return [...actions].sort((a, b) => {
    const rankA = ACTION_ORDER.indexOf(a.action);
    const rankB = ACTION_ORDER.indexOf(b.action);
    const order = (rankA === -1 ? ACTION_ORDER.length : rankA) -
      (rankB === -1 ? ACTION_ORDER.length : rankB);

    return order || a.action.localeCompare(b.action);
  });
}

/**
 * Asigna permisos a un perfil (RF-SEC-012).
 *
 * Dos paneles: a la izquierda los módulos del catálogo con su avance, a la
 * derecha las acciones del módulo elegido agrupadas por recurso, cada una con
 * un interruptor y su explicación breve.
 *
 * Un recurso puede tener varios endpoints para la misma acción (por ejemplo
 * listar y consultar por id, ambos `read`), así que un interruptor asigna o
 * retira todos sus permisos a la vez. Lo enviado es el conjunto completo: lo
 * que quede apagado se desasigna. Un perfil de sistema no puede quedarse sin
 * permisos (RF-SEC-014).
 */
export function AssignPermissionsModal({
  isOpen,
  onClose,
  profile,
  onSubmit,
}: AssignPermissionsModalProps) {
  const { modules, isLoading, error, fetchCatalog } = useAuthorizationCatalog();

  const [selected, setSelected] = React.useState<string[]>([]);
  const [selectedModuleCode, setSelectedModuleCode] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setSelected(profile?.permissions.map((permission) => permission.permission_uuid) ?? []);
    setSelectedModuleCode(null);
    setSearch('');
    setSaveError(null);
  }, [isOpen, profile]);

  // El catálogo se carga al abrir el modal, con una sola llamada
  React.useEffect(() => {
    if (isOpen) fetchCatalog();
  }, [isOpen, fetchCatalog]);

  const isActionSelected = React.useCallback(
    (action: CatalogAction) =>
      actionPermissionIds(action).some((permissionId) => selected.includes(permissionId)),
    [selected],
  );

  const term = search.trim().toLowerCase();

  // Módulos y recursos que coinciden con la búsqueda
  const visibleModules = React.useMemo(() => {
    if (!term) return modules;

    return modules
      .map((module) => ({
        ...module,
        resources: module.resources
          .map((resource) => ({
            ...resource,
            actions: resource.actions.filter((action) =>
              [actionLabel(action.action), action.action, ...action.permissions.flatMap((permission) => [permission.name, permission.description ?? ''])]
                .join(' ')
                .toLowerCase()
                .includes(term),
            ),
          }))
          .filter(
            (resource) =>
              resource.actions.length > 0 ||
              [resource.resource_name, resource.resource].join(' ').toLowerCase().includes(term),
          ),
      }))
      .filter(
        (module) =>
          module.resources.length > 0 || module.module_name.toLowerCase().includes(term),
      );
  }, [modules, term]);

  const selectedModule =
    visibleModules.find((module) => module.module_code === selectedModuleCode) ??
    visibleModules[0] ??
    null;

  const allActions = React.useMemo(() => modules.flatMap(moduleActions), [modules]);
  const selectedActions = allActions.filter(isActionSelected).length;
  // Cada acción puede agrupar varios permisos (listar + consultar por id).
  const totalPermissions = allActions.reduce(
    (total, action) => total + action.permissions.length,
    0,
  );

  const toggleAction = (action: CatalogAction) => {
    const ids = actionPermissionIds(action);
    const isSelected = isActionSelected(action);

    setSaveError(null);
    setSelected((prev) =>
      isSelected
        ? prev.filter((permissionId) => !ids.includes(permissionId))
        : [...new Set([...prev, ...ids])],
    );
  };

  const toggleModule = (module: CatalogModuleGroup) => {
    const actions = moduleActions(module);
    const ids = actions.flatMap(actionPermissionIds);
    const allSelected = actions.length > 0 && actions.every(isActionSelected);

    setSaveError(null);
    setSelected((prev) =>
      allSelected
        ? prev.filter((permissionId) => !ids.includes(permissionId))
        : [...new Set([...prev, ...ids])],
    );
  };

  const handleSubmit = async () => {
    // Un perfil de sistema no puede quedarse sin permisos (RF-SEC-014)
    if (profile?.is_system && selected.length === 0) {
      setSaveError(
        'Este es el perfil de sistema: no puede quedarse sin permisos. Selecciona al menos uno.',
      );
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSubmit(selected);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudieron asignar los permisos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={profile ? `Permisos de ${profile.name}` : 'Permisos'}
      subtitle="Configura qué acciones puede realizar este perfil en cada módulo. Lo que no marques queda desasignado."
      icon={<ShieldCheck className="h-5 w-5" />}
      size="3xl"
      disableBackdropClose={isSaving}
      footer={
        <>
          <span className="mr-auto text-xs text-text-tertiary">
            <span className="font-semibold text-text-primary">{selectedActions}</span>
            {allActions.length > 0 ? ` de ${allActions.length}` : ''} acciones
            {totalPermissions > allActions.length ? ` · ${totalPermissions} permisos` : ''}
          </span>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>
            Guardar permisos
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por módulo, recurso o acción..."
          debounceMs={0}
        />

        {isLoading && <LoadingSpinner label="Cargando catálogo de permisos..." />}

        {!isLoading && error && (
          <div className="rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
            {error}
          </div>
        )}

        {!isLoading && !error && visibleModules.length === 0 && (
          <p className="py-6 text-center text-sm text-text-tertiary">
            {term
              ? 'Ningún recurso coincide con la búsqueda.'
              : 'El catálogo de permisos está vacío.'}
          </p>
        )}

        {!isLoading && !error && selectedModule && (
          <div className="grid gap-4 md:h-[26rem] md:grid-cols-[15rem_1fr]">
            {/* Módulos */}
            <aside className="flex max-h-40 flex-col overflow-hidden rounded-xl border border-border-default md:max-h-none">
              <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
                <span className="text-sm font-semibold text-text-primary">Módulos</span>
                <span className="text-xs text-text-tertiary">
                  {modules.length} módulos · {allActions.length} acciones
                </span>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto p-2">
                {visibleModules.map((module) => {
                  const actions = moduleActions(module);
                  const selectedInModule = actions.filter(isActionSelected).length;
                  const Icon = MODULE_ICONS[module.module_code] ?? DEFAULT_MODULE_ICON;
                  const isCurrent = module.module_code === selectedModule.module_code;

                  return (
                    <button
                      key={module.module_code}
                      type="button"
                      onClick={() => setSelectedModuleCode(module.module_code)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        isCurrent ? 'bg-brand-50' : 'hover:bg-surface-secondary'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                          isCurrent ? 'bg-brand-100 text-brand-700' : 'bg-surface-tertiary text-text-muted'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-medium ${
                            isCurrent ? 'text-brand-800' : 'text-text-primary'
                          }`}
                        >
                          {module.module_name}
                        </span>
                        <span className="block text-xs text-text-tertiary">
                          {selectedInModule} de {actions.length} acciones
                        </span>
                      </span>

                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-muted" />
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Acciones del módulo */}
            <ModulePermissions
              module={selectedModule}
              isActionSelected={isActionSelected}
              onToggleAction={toggleAction}
              onToggleModule={() => toggleModule(selectedModule)}
              disabled={isSaving}
            />
          </div>
        )}

        {saveError && (
          <div className="rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
            {saveError}
          </div>
        )}
      </div>
    </Modal>
  );
}

interface ModulePermissionsProps {
  module: CatalogModuleGroup;
  isActionSelected: (action: CatalogAction) => boolean;
  onToggleAction: (action: CatalogAction) => void;
  onToggleModule: () => void;
  disabled: boolean;
}

/** Panel derecho: acciones del módulo elegido, agrupadas por recurso. */
function ModulePermissions({
  module,
  isActionSelected,
  onToggleAction,
  onToggleModule,
  disabled,
}: ModulePermissionsProps) {
  const actions = moduleActions(module);
  const selectedInModule = actions.filter(isActionSelected).length;
  const allSelected = actions.length > 0 && selectedInModule === actions.length;
  const Icon = MODULE_ICONS[module.module_code] ?? DEFAULT_MODULE_ICON;

  return (
    <section className="flex max-h-80 flex-col overflow-hidden rounded-xl border border-border-default md:max-h-none">
      <header className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-text-primary">{module.module_name}</h3>
          <p className="text-xs text-text-tertiary">
            {selectedInModule} de {actions.length} acciones
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant={allSelected ? 'secondary' : 'ghost'}
          className="ml-auto"
          disabled={disabled}
          leftIcon={allSelected ? undefined : <Check className="h-4 w-4" />}
          onClick={onToggleModule}
        >
          {allSelected ? 'Quitar todo' : 'Marcar todo'}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {module.resources.map((resource) => (
          <ResourceActions
            key={resource.resource}
            resource={resource}
            isActionSelected={isActionSelected}
            onToggleAction={onToggleAction}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  );
}

interface ResourceActionsProps {
  resource: CatalogResourceGroup;
  isActionSelected: (action: CatalogAction) => boolean;
  onToggleAction: (action: CatalogAction) => void;
  disabled: boolean;
}

/** Acciones de un recurso: el nombre y su explicación breve, sin más adornos. */
function ResourceActions({
  resource,
  isActionSelected,
  onToggleAction,
  disabled,
}: ResourceActionsProps) {
  const actions = sortActions(resource.actions);

  if (actions.length === 0) return null;

  return (
    <div className="py-1 first:pt-2">
      <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {resource.resource_name}
      </p>

      {actions.map((action) => {
        const checked = isActionSelected(action);
        const name = STANDALONE_ACTIONS.has(action.action)
          ? actionLabel(action.action)
          : `${actionLabel(action.action)} ${resource.resource_name}`;

        return (
          // La fila entera alterna; el interruptor detiene la propagación para
          // no alternar dos veces.
          <div
            key={action.action}
            onClick={() => !disabled && onToggleAction(action)}
            className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 hover:bg-surface-secondary"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{name}</p>
              <p className="text-xs text-text-tertiary">{actionDescription(action)}</p>
            </div>

            <span onClick={(event) => event.stopPropagation()}>
              <Switch
                checked={checked}
                onChange={() => onToggleAction(action)}
                disabled={disabled}
                label={name}
                title={action.permissions.map((permission) => permission.name).join(' · ')}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
