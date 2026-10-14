import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShieldCheck, Pencil, Power, KeyRound, Lock } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Select } from '@/presentation/components/ui/Select';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useProfiles } from '@/application/hooks/useProfiles';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { formatDateShort } from '@/shared/utils/format';
import { AssignPermissionsModal } from './AssignPermissionsModal';
import type { Profile } from '@/domain/models';

/**
 * Perfiles de la empresa (security.profile).
 *
 * Un perfil agrupa permisos y se asigna a los usuarios: los permisos efectivos
 * de un usuario son la unión de los de sus perfiles activos (RN-SEC-006).
 * Los perfiles no se eliminan: se activan/desactivan.
 */
export function ProfileListPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const {
    profiles,
    isLoading,
    error,
    fetchProfiles,
    activateProfile,
    deactivateProfile,
    assignPermissions,
  } = useProfiles();

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; profile: Profile } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);
  const [permissionsTarget, setPermissionsTarget] = React.useState<Profile | null>(null);

  const canCreate = can('security.profiles:create');
  const canUpdate = can('security.profiles:update');
  const canAssignPermissions = can('security.profiles:assign_permissions');
  const canSetActive = can('security.profiles:deactivate');

  React.useEffect(() => {
    // El listado filtra por nombre en el backend y por estado
    fetchProfiles({
      name: search || undefined,
      isActive: status === '' ? undefined : status === 'active',
    });
  }, [fetchProfiles, search, status]);

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateProfile(pendingAction.profile.id);
        toast.success(`El perfil "${pendingAction.profile.name}" fue desactivado.`);
      } else {
        await activateProfile(pendingAction.profile.id);
        toast.success(`El perfil "${pendingAction.profile.name}" fue activado.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<Profile>[] = [
    {
      key: 'name',
      header: 'Perfil',
      cell: (profile) => (
        <div className="min-w-0">
          <p className="font-medium text-text-primary">{profile.name}</p>
          {profile.description && (
            <p className="text-xs text-text-tertiary truncate max-w-[320px]">
              {profile.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'permissions',
      header: 'Permisos',
      align: 'center',
      cell: (profile) => (
        <span className="text-text-secondary">{profile.permissions.length}</span>
      ),
    },
    {
      key: 'is_system',
      header: 'Tipo',
      align: 'center',
      cell: (profile) =>
        profile.is_system ? (
          <Badge variant="warning">Sistema</Badge>
        ) : (
          <Badge variant="neutral">Personalizado</Badge>
        ),
    },
    {
      key: 'updated_at',
      header: 'Actualizado',
      cell: (profile) => (
        <span className="text-text-tertiary">{formatDateShort(profile.updated_at)}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (profile) => (
        <Badge variant={profile.is_active ? 'success' : 'neutral'}>
          {profile.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (profile) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canUpdate && (
            <button
              onClick={() => navigate(`/security/profiles/${profile.id}/edit`)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar perfil"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canAssignPermissions && (
            <button
              onClick={() => setPermissionsTarget(profile)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Asignar permisos"
            >
              <KeyRound className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() =>
                setPendingAction({
                  type: profile.is_active ? 'deactivate' : 'activate',
                  profile,
                })
              }
              // Un perfil de sistema está protegido (RF-SEC-014)
              disabled={profile.is_system && profile.is_active}
              className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                profile.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={
                profile.is_system && profile.is_active
                  ? 'El perfil de sistema no puede desactivarse'
                  : profile.is_active
                    ? 'Desactivar perfil'
                    : 'Activar perfil'
              }
            >
              <Power className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <CardHeader>
        <CardTitle>Perfiles</CardTitle>
        {canCreate && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/security/profiles/new')}
          >
            Nuevo Perfil
          </Button>
        )}
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:max-w-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre de perfil..."
            />
          </div>
          <div className="w-full sm:max-w-xs">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'active', label: 'Activos' },
                { value: 'inactive', label: 'Inactivos' },
              ]}
              placeholder="Todos los estados"
              aria-label="Filtrar por estado"
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={profiles}
          rowKey={(profile) => profile.id}
          isLoading={isLoading}
          onRowClick={(profile) => navigate(`/security/profiles/${profile.id}/edit`)}
          emptyState={
            <EmptyState
              icon={<ShieldCheck className="h-12 w-12" />}
              title={search || status ? 'Sin resultados' : 'No hay perfiles'}
              description={
                search || status
                  ? 'Ningún perfil coincide con el filtro aplicado.'
                  : 'Crea un perfil, asígnale permisos y luego dáselo a tus usuarios.'
              }
              action={
                !search && !status && canCreate ? (
                  <Button onClick={() => navigate('/security/profiles/new')}>+ Nuevo Perfil</Button>
                ) : undefined
              }
            />
          }
        />
      </Card>

      <div className="mt-4 flex items-start gap-2 text-xs text-text-tertiary">
        <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Los permisos efectivos de un usuario son la unión de los de sus perfiles activos. Un
          perfil desactivado deja de aportar permisos sin cambiar las asignaciones.
        </span>
      </div>

      <AssignPermissionsModal
        isOpen={permissionsTarget !== null}
        onClose={() => setPermissionsTarget(null)}
        profile={permissionsTarget}
        onSubmit={async (permissionIds) => {
          if (!permissionsTarget) return;
          const updated = await assignPermissions(permissionsTarget.id, permissionIds);
          toast.success(
            `Permisos de "${updated.name}" actualizados (${updated.permissions.length}).`,
          );
        }}
      />

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingAction?.type === 'deactivate' ? 'Desactivar perfil' : 'Activar perfil'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.profile.name}"? Dejará de aportar permisos a sus usuarios, pero las asignaciones se conservan.`
            : `¿Activar "${pendingAction?.profile.name}"? Volverá a aportar sus permisos a los usuarios que lo tengan asignado.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
