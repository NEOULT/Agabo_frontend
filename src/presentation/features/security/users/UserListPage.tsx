import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Pencil, Power, ShieldCheck, Store, KeyRound } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Select } from '@/presentation/components/ui/Select';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useUsers } from '@/application/hooks/useUsers';
import { useProfiles } from '@/application/hooks/useProfiles';
import { useBranches } from '@/application/hooks/useBranches';
import { useAuthStore } from '@/application/stores/useAuthStore';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { formatDateShort } from '@/shared/utils/format';
import { AssignProfilesModal } from './AssignProfilesModal';
import { AssignBranchesModal } from './AssignBranchesModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import type { SecurityUser } from '@/domain/models';

/**
 * Identidades de la empresa (security.user).
 *
 * Los usuarios no se eliminan: se activan/desactivan (RF-SEC-018). La
 * contraseña solo se restablece por su endpoint dedicado y los perfiles y
 * sucursales se reemplazan completos (RF-SEC-019 y RF-SEC-020).
 */
export function UserListPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { can } = usePermissions();
  const {
    users,
    isLoading,
    error,
    fetchUsers,
    activateUser,
    deactivateUser,
    resetUserPassword,
    assignProfiles,
    assignBranches,
  } = useUsers();
  const { profiles, fetchProfiles } = useProfiles();
  const { branches } = useBranches();

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; user: SecurityUser } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const [profilesTarget, setProfilesTarget] = React.useState<SecurityUser | null>(null);
  const [branchesTarget, setBranchesTarget] = React.useState<SecurityUser | null>(null);
  const [passwordTarget, setPasswordTarget] = React.useState<SecurityUser | null>(null);

  const canCreate = can('security.users:create');
  const canUpdate = can('security.users:update');
  const canAssignProfiles = can('security.users:assign_profiles');
  const canAssignBranches = can('security.users:assign_branches');
  const canResetPassword = can('security.users:change_password');
  const canSetActive = can('security.users:deactivate');

  React.useEffect(() => {
    // El listado solo filtra por estado y por coincidencia exacta de
    // usuario/correo, así que la búsqueda por texto se aplica en memoria.
    fetchUsers({ isActive: status === '' ? undefined : status === 'active' });
  }, [fetchUsers, status]);

  // Catálogos de apoyo: perfiles activos y sucursales de la empresa
  React.useEffect(() => {
    fetchProfiles({ isActive: true });
  }, [fetchProfiles]);

  const sortedUsers = React.useMemo(
    () =>
      [...users].sort((a, b) =>
        `${a.last_name ?? ''} ${a.first_name ?? ''}`
          .trim()
          .localeCompare(`${b.last_name ?? ''} ${b.first_name ?? ''}`.trim()),
      ),
    [users],
  );

  const visibleUsers = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sortedUsers;

    return sortedUsers.filter((user) =>
      [user.username, user.email, user.first_name, user.last_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [sortedUsers, search]);

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateUser(pendingAction.user.id);
        toast.success(`El usuario "${pendingAction.user.username}" fue desactivado.`);
      } else {
        await activateUser(pendingAction.user.id);
        toast.success(`El usuario "${pendingAction.user.username}" fue activado.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const branchName = (id: string) => branches.find((branch) => branch.id === id)?.name;

  const columns: TableColumn<SecurityUser>[] = [
    {
      key: 'username',
      header: 'Usuario',
      cell: (user) => (
        <div className="min-w-0">
          <p className="font-medium text-text-primary">
            {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
          </p>
          <p className="font-mono text-xs text-text-tertiary">{user.username}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Correo',
      cell: (user) => <span className="text-text-secondary">{user.email ?? '—'}</span>,
    },
    {
      key: 'profiles',
      header: 'Perfiles',
      cell: (user) =>
        user.profiles.length === 0 ? (
          <span className="text-xs text-text-muted">Sin perfiles</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {user.profiles.slice(0, 2).map((profile) => (
              <Badge key={profile.profile_uuid} variant="info">
                {profile.profile_name_text}
              </Badge>
            ))}
            {user.profiles.length > 2 && (
              <Badge variant="neutral">+{user.profiles.length - 2}</Badge>
            )}
          </div>
        ),
    },
    {
      key: 'branches',
      header: 'Sucursales',
      align: 'center',
      cell: (user) => (
        <span className="text-text-secondary" title={user.branches.map(branchName).join(', ')}>
          {user.branches.length}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Actualizado',
      cell: (user) => (
        <span className="text-text-tertiary">
          {formatDateShort(user.updated_at ?? user.created_at)}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (user) => (
        <Badge variant={user.is_active ? 'success' : 'neutral'}>
          {user.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (user) => {
        // El backend rechaza que un usuario desactive su propia cuenta (RF-SEC-018)
        const isSelf = user.id === currentUser?.id;

        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {canUpdate && (
              <button
                onClick={() => navigate(`/security/users/${user.id}/edit`)}
                className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
                title="Editar usuario"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canAssignProfiles && (
              <button
                onClick={() => setProfilesTarget(user)}
                className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
                title="Asignar perfiles"
              >
                <ShieldCheck className="h-4 w-4" />
              </button>
            )}
            {canAssignBranches && (
              <button
                onClick={() => setBranchesTarget(user)}
                className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
                title="Asignar sucursales"
              >
                <Store className="h-4 w-4" />
              </button>
            )}
            {canResetPassword && (
              <button
                onClick={() => setPasswordTarget(user)}
                className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
                title="Restablecer contraseña"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            )}
            {canSetActive && (
              <button
                onClick={() =>
                  setPendingAction({ type: user.is_active ? 'deactivate' : 'activate', user })
                }
                disabled={isSelf && user.is_active}
                className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  user.is_active
                    ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                    : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
                }`}
                title={
                  isSelf && user.is_active
                    ? 'No puedes desactivar tu propia cuenta'
                    : user.is_active
                      ? 'Desactivar usuario'
                      : 'Activar usuario'
                }
              >
                <Power className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <CardHeader>
        <CardTitle>Usuarios</CardTitle>
        {canCreate && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/security/users/new')}
          >
            Nuevo Usuario
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
              placeholder="Buscar por nombre, usuario o correo..."
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
          data={visibleUsers}
          rowKey={(user) => user.id}
          isLoading={isLoading}
          onRowClick={(user) => navigate(`/security/users/${user.id}/edit`)}
          emptyState={
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title={search || status ? 'Sin resultados' : 'No hay usuarios'}
              description={
                search || status
                  ? 'Ningún usuario coincide con el filtro aplicado.'
                  : 'Registra el primer usuario de tu empresa y asígnale perfiles y sucursales.'
              }
              action={
                !search && !status && canCreate ? (
                  <Button onClick={() => navigate('/security/users/new')}>+ Nuevo Usuario</Button>
                ) : undefined
              }
            />
          }
        />
      </Card>

      <AssignProfilesModal
        isOpen={profilesTarget !== null}
        onClose={() => setProfilesTarget(null)}
        user={profilesTarget}
        profiles={profiles}
        onSubmit={async (profileIds) => {
          if (!profilesTarget) return;
          const updated = await assignProfiles(profilesTarget.id, profileIds);
          toast.success(`Perfiles de "${updated.username}" actualizados.`);
        }}
      />

      <AssignBranchesModal
        isOpen={branchesTarget !== null}
        onClose={() => setBranchesTarget(null)}
        user={branchesTarget}
        branches={branches}
        onSubmit={async (branchIds) => {
          if (!branchesTarget) return;
          const updated = await assignBranches(branchesTarget.id, branchIds);
          toast.success(`Sucursales de "${updated.username}" actualizadas.`);
        }}
      />

      <ResetPasswordModal
        isOpen={passwordTarget !== null}
        onClose={() => setPasswordTarget(null)}
        user={passwordTarget}
        onSubmit={async (password) => {
          if (!passwordTarget) return;
          const updated = await resetUserPassword(passwordTarget.id, password);
          toast.success(
            `Contraseña de "${updated.username}" restablecida. Sus sesiones fueron revocadas.`,
          );
        }}
      />

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingAction?.type === 'deactivate' ? 'Desactivar usuario' : 'Activar usuario'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.user.username}"? No podrá iniciar sesión, pero conserva sus perfiles y su historial.`
            : `¿Activar "${pendingAction?.user.username}"? Volverá a poder iniciar sesión con sus perfiles actuales.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
